/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — securityHeaders.middleware.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Applies the hardening response headers (frame options, MIME sniffing,
 *   XSS, referrer policy, permissions policy, CSP, HSTS) to every response
 *   served by the API and the static site.
 *
 * @exports
 *   addSecurityHeaders — Express middleware function
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

// ══════════════════════════════════════════════════════════════
// SECURITY HEADER MIDDLEWARE
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Security headers ----
/**
 * Sets the browser-hardening headers on every response.
 * HSTS is only meaningful over TLS but is harmless on plain HTTP (the
 * browser ignores it until a TLS response carries it).
 *
 * @param {object} req  - Express request object
 * @param {object} res  - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 *
 * @example
 *   app.use(addSecurityHeaders);
 *   // Response headers include X-Frame-Options: DENY, CSP, HSTS, ...
 */
const addSecurityHeaders = (req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  next();
};

export { addSecurityHeaders };

// ══════════════════════════════════════════════════════════════ END: securityHeaders.middleware.js
