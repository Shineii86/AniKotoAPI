/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — requestId.middleware.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Assigns a unique UUID to every incoming request and mirrors it on
 *   the X-Request-Id response header so clients and log aggregators can
 *   correlate a response with a server-side error line.
 *
 * @exports
 *   assignRequestId — Express middleware function
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import crypto from "crypto";

// ══════════════════════════════════════════════════════════════
// REQUEST ID MIDDLEWARE
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Unique request ID for debugging ----
/**
 * Attaches req.id (UUID v4) and echoes it as X-Request-Id.
 * The ID is used by the global error handler to link stack traces
 * to the response the client actually received.
 *
 * @param {object} req  - Express request object
 * @param {object} res  - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 *
 * @example
 *   app.use(assignRequestId);
 *   // Response header: X-Request-Id: 5f1d8b3c-...
 */
const assignRequestId = (req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
};

export { assignRequestId };

// ══════════════════════════════════════════════════════════════ END: requestId.middleware.js
