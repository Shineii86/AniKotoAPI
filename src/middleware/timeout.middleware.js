/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — timeout.middleware.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Caps the time a single request may spend in flight. When REQUEST_TIMEOUT
 *   elapses without a response, a 408 JSON payload is returned so slow
 *   clients fail fast instead of hanging until their own socket timeout.
 *
 * @exports
 *   requestTimeout — Express middleware function
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

// ══════════════════════════════════════════════════════════════
// REQUEST TIMEOUT MIDDLEWARE
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Request timeout middleware (30 seconds) ----
/**
 * Arms a per-request timeout (REQUEST_TIMEOUT env, default 30s).
 * Only fires when headers have not been sent yet, so it never races a
 * response that is already streaming.
 *
 * @param {object} req  - Express request object
 * @param {object} res  - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 *
 * @example
 *   REQUEST_TIMEOUT=15000 node server.js
 *   app.use(requestTimeout);
 */
const requestTimeout = (req, res, next) => {
  const timeout = parseInt(process.env.REQUEST_TIMEOUT, 10) || 30000;
  req.setTimeout(timeout, () => {
    if (!res.headersSent) {
      res.status(408).json({ success: false, message: "Request timeout" });
    }
  });
  next();
};

export { requestTimeout };

// ══════════════════════════════════════════════════════════════ END: timeout.middleware.js
