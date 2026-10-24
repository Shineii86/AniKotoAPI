/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — cors.middleware.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Single unified CORS middleware. Validates the request Origin against
 *   the ALLOWED_ORIGINS allowlist, answers preflight OPTIONS requests and
 *   stamps the standard CORS response headers.
 *
 * @exports
 *   createCorsMiddleware — Factory returning the configured middleware
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

// ══════════════════════════════════════════════════════════════
// CORS MIDDLEWARE FACTORY
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Origin allowlist enforcement ----
/**
 * Builds the CORS middleware from the ALLOWED_ORIGINS environment list.
 * Behaviour matrix:
 *   - unset or contains "*"      → every origin is echoed back (open API)
 *   - "https://a.com,https://b.com" → only listed origins are echoed back;
 *     unlisted origins get no ACAO header, so the browser blocks them
 *   - non-browser clients (no Origin header) → unaffected
 *
 * @param {string[]|undefined} allowedOrigins - Parsed ALLOWED_ORIGINS list
 * @returns {Function} Express middleware
 *
 * @example
 *   app.use(createCorsMiddleware(process.env.ALLOWED_ORIGINS?.split(",")));
 */
const createCorsMiddleware = (allowedOrigins) => (req, res, next) => {
  const origin = req.headers.origin;

  if (!allowedOrigins || allowedOrigins.includes("*") || (origin && allowedOrigins.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
};

export { createCorsMiddleware };

// ══════════════════════════════════════════════════════════════ END: cors.middleware.js
