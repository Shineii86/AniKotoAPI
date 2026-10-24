/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — response.helper.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Canonical success / error envelope helpers. Every endpoint responds with
 *   one of these two shapes so consumers can parse responses generically.
 *
 * @exports
 *   jsonResponse, jsonError
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

// ══════════════════════════════════════════════════════════════
// RESPONSE WRAPPERS
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Standardized JSON response wrapper ----
/**
 * Wraps data in a standardized success JSON response.
 *
 * @param {object} res - Express response object
 * @param {*} data - The data to return in the response
 * @param {number} status - HTTP status code (default: 200)
 *
 * @example
 *   jsonResponse(res, { title: "One Piece" });
 *   // { success: true, results: { title: "One Piece" } }
 */
const jsonResponse = (res, data, status = 200) =>
  res.status(status).json({ success: true, results: data });

// ---- FEATURE: Standardized error response wrapper ----
/**
 * Returns a standardized error JSON response.
 *
 * @param {object} res - Express response object
 * @param {string} message - Error message to return (default: "Internal server error")
 * @param {number} status - HTTP status code (default: 500)
 *
 * @example
 *   jsonError(res, "Keyword is required", 400);
 *   // { success: false, message: "Keyword is required" }
 */
const jsonError = (res, message = "Internal server error", status = 500) =>
  res.status(status).json({ success: false, message });

export { jsonResponse, jsonError };

// ══════════════════════════════════════════════════════════════ END: response.helper.js
