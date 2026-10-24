/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — rateLimit.middleware.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Fixed-window per-client rate limiter. Counts requests per IP inside a
 *   sliding window, returns 429 with Retry-After when the budget is spent,
 *   and exposes X-RateLimit-* headers on every response. A background sweep
 *   evicts idle IPs so the map cannot grow unbounded.
 *
 * @exports
 *   createRateLimiter — Factory returning the configured middleware
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

// ══════════════════════════════════════════════════════════════
// RATE LIMITER FACTORY
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Rate limiting (configurable, default 100 requests per minute per IP) ----
/**
 * Creates the rate-limit middleware.
 *
 * NOTE: Behind a reverse proxy (Render, Vercel, nginx) Express sees the
 * proxy's address unless `trust proxy` is set on the app — without it every
 * visitor shares one bucket and the whole API gets rate-limited together.
 * server.js therefore sets `trust proxy` from the TRUST_PROXY env var.
 *
 * @param {object}  [options]
 * @param {number}  [options.limit=100]   - Requests allowed per window
 * @param {number}  [options.windowMs=60000] - Window length in ms
 * @param {number}  [options.sweepMs=300000] - Idle-entry sweep interval in ms
 * @returns {Function} Express middleware
 *
 * @example
 *   app.use(createRateLimiter({ limit: 100, windowMs: 60000 }));
 */
const createRateLimiter = ({ limit, windowMs, sweepMs } = {}) => {
  const RATE_LIMIT = limit || parseInt(process.env.RATE_LIMIT, 10) || 100;
  const RATE_WINDOW = windowMs || parseInt(process.env.RATE_WINDOW, 10) || 60000;
  const RATE_CLEANUP_INTERVAL = sweepMs || 300000;

  const requestCounts = new Map();

  // ---- FEATURE: Rate limiter cleanup interval (every 5 minutes) ----
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of requestCounts.entries()) {
      const validTimestamps = timestamps.filter((t) => now - t < RATE_WINDOW);
      if (validTimestamps.length === 0) {
        requestCounts.delete(ip);
      } else {
        requestCounts.set(ip, validTimestamps);
      }
    }
  }, RATE_CLEANUP_INTERVAL).unref?.();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    if (!requestCounts.has(ip)) {
      requestCounts.set(ip, []);
    }
    const timestamps = requestCounts.get(ip).filter((t) => now - t < RATE_WINDOW);
    requestCounts.set(ip, timestamps);
    if (timestamps.length >= RATE_LIMIT) {
      return res.status(429).json({
        success: false,
        message: "Rate limit exceeded. Try again later.",
        retryAfter: Math.ceil((timestamps[0] + RATE_WINDOW - now) / 1000),
      });
    }
    timestamps.push(now);
    res.setHeader("X-RateLimit-Limit", RATE_LIMIT);
    res.setHeader("X-RateLimit-Remaining", RATE_LIMIT - timestamps.length);
    next();
  };
};

export { createRateLimiter };

// ══════════════════════════════════════════════════════════════ END: rateLimit.middleware.js
