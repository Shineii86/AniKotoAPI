/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — validation.middleware.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Route-level guards that normalise path parameters and reject malformed
 *   query values with a 400 before any controller or upstream request runs.
 *   Keeps user input from ever being interpolated raw into an upstream URL.
 *
 * @exports
 *   validateParam, validateQueryParam, validatePageQuery
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import { validateSlug, validateLetter, validatePage, validateQueryWord } from "../helper/validation.helper.js";

// ══════════════════════════════════════════════════════════════
// PATH PARAMETER GUARD
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Validated path parameter ----
/**
 * Builds a middleware that validates `req.params[name]` with `validator`.
 * On success the normalised value is written back onto req.params so
 * controllers always see clean input; on failure the request short-circuits
 * with 400 and never reaches the scraper.
 *
 * @param {string} name - Path parameter name (e.g. "id", "letter")
 * @param {Function} validator - Validator returning value|null
 * @param {string} [label] - Human name used in the error message
 * @returns {Function} Express middleware
 *
 * @example
 *   app.get("/api/seasons/:id", validateParam("id", validateSlug), handler);
 *   // GET /api/seasons/../../etc → 400 Invalid id parameter
 */
const validateParam = (name, validator, label = name) => (req, res, next) => {
  const value = validator(req.params[name]);
  if (value === null || value === undefined) {
    return res.status(400).json({ success: false, message: `Invalid ${label} parameter` });
  }
  req.params[name] = value;
  next();
};

// ---- FEATURE: Pre-built slug guard for anime/category slugs ----
const validateSlugParam = (name = "id") => validateParam(name, validateSlug, "slug");

// ---- FEATURE: Pre-built letter guard for the A-Z listing ----
const validateLetterParam = (name = "letter") => validateParam(name, validateLetter, "letter");

// ══════════════════════════════════════════════════════════════
// QUERY PARAMETER GUARDS
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Optional validated query value ----
/**
 * Validates `req.query[name]` when it is present. Absent values pass
 * through untouched so the parameter stays optional; present-but-invalid
 * values return 400.
 *
 * @param {string} name - Query parameter name
 * @param {Function} validator - Validator returning value|null
 * @param {string} [label] - Human name used in the error message
 * @returns {Function} Express middleware
 *
 * @example
 *   app.get("/api/search", validateQueryParam("keyword", validateQueryWord), handler);
 */
const validateQueryParam = (name, validator, label = name) => (req, res, next) => {
  const raw = req.query[name];
  if (raw === undefined || raw === "") return next();
  const value = validator(raw);
  if (value === null || value === undefined) {
    return res.status(400).json({ success: false, message: `Invalid ${label} parameter` });
  }
  req.query[name] = value;
  next();
};

// ---- FEATURE: Global pagination guard ----
/**
 * Normalises `?page=` across the whole API: non-integers, zero/negative
 * values and pages beyond 500 are rejected with 400, valid pages are
 * coerced to an integer so downstream `parseInt` is always a no-op.
 *
 * @param {object} req  - Express request object
 * @param {object} res  - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 *
 * @example
 *   GET /api/most-popular?page=2   → page becomes number 2
 *   GET /api/most-popular?page=abc → 400
 */
const validatePageQuery = (req, res, next) => {
  const page = validatePage(req.query.page);
  if (page === null) {
    return res.status(400).json({
      success: false,
      message: "Invalid page parameter (expected an integer between 1 and 500)",
    });
  }
  req.query.page = page;
  next();
};

export { validateParam, validateSlugParam, validateLetterParam, validateQueryParam, validatePageQuery };

// ══════════════════════════════════════════════════════════════ END: validation.middleware.js
