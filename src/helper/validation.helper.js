/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — validation.helper.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Input validation and sanitization primitives shared by the route layer.
 *   Every validator is a total function: it returns either a normalised,
 *   safe string (or number) or null when the input is malformed. Used to
 *   block path traversal, junk keys that would be interpolated into upstream
 *   URLs, and unbounded pagination values.
 *
 * @exports
 *   validateSlug, validateLetter, validatePage, validateQueryWord
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

// ══════════════════════════════════════════════════════════════
// VALIDATORS
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Permitted characters for URL slugs ----
// NOTE: Matches the slug shape AniKoto itself uses (e.g. one-piece-odmau)
const SLUG_REGEX = /^[a-zA-Z0-9_-]+$/;

// ---- FEATURE: A-Z listing letters (plus the site's "other"/"all" buckets) ----
const LETTER_REGEX = /^(?:[a-zA-Z0-9]|other|all)$/;

// ---- FEATURE: Bounded pagination range ----
const MAX_PAGE = 500;

// ---- FEATURE: Slug validator (anime ids, category values, path params) ----
/**
 * Validates and normalises an anime/category slug.
 * Rejects empty strings, oversized input, traversal sequences and anything
 * outside [a-zA-Z0-9_-] before it can be interpolated into an upstream URL.
 *
 * @param {*} value - Raw value (usually req.params / req.query)
 * @returns {string|null} Trimmed slug, or null when invalid
 *
 * @example
 *   validateSlug("one-piece-odmau"); // "one-piece-odmau"
 *   validateSlug("../etc/passwd");   // null
 */
const validateSlug = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) return null;
  if (trimmed.includes("..") || trimmed.includes("/") || trimmed.includes("\\")) return null;
  if (trimmed.toLowerCase().includes("%2e")) return null;
  if (!SLUG_REGEX.test(trimmed)) return null;
  return trimmed;
};

// ---- FEATURE: A-Z letter validator ----
/**
 * Validates an A-Z listing letter. Accepts single alphanumerics plus the
 * site's special `other` and `all` buckets (case-insensitive match, but the
 * original casing is preserved — the upstream page is linked as `/az-list/A`).
 *
 * @param {*} value - Raw letter from the path
 * @returns {string|null} Trimmed letter, or null
 *
 * @example
 *   validateLetter("A");  // "A"
 *   validateLetter("zz"); // null
 */
const validateLetter = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!LETTER_REGEX.test(trimmed)) return null;
  return trimmed;
};

// ---- FEATURE: Pagination validator ----
/**
 * Parses and bounds a page number to the safe range [1, 500].
 * Non-numeric input falls back to the default instead of erroring, because
 * `page` is a display concern — only an out-of-range page is worth rejecting.
 *
 * @param {*} value - Raw page value
 * @param {number} [defaultPage=1] - Returned when value is missing/NaN
 * @param {number} [maxPage=500] - Upper bound
 * @returns {number|null} Page number, or null when the raw value is present but unusable
 *
 * @example
 *   validatePage("2");     // 2
 *   validatePage("1e9");   // null (beyond maxPage)
 *   validatePage(undefined); // 1
 */
const validatePage = (value, defaultPage = 1, maxPage = MAX_PAGE) => {
  if (value === undefined || value === null || value === "") return defaultPage;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  if (parsed > maxPage) return null;
  return parsed;
};

// ---- FEATURE: Generic query word validator ----
/**
 * Validates a free-form query value that is echoed into an upstream path
 * (keyword, tab, sort key, ...). Allows letters, digits, spaces, dashes,
 * underscores and dots; rejects anything that could escape into a URL path.
 *
 * @param {*} value - Raw query value
 * @param {number} [maxLength=256] - Maximum accepted length
 * @returns {string|null} Trimmed value, or null
 *
 * @example
 *   validateQueryWord("naruto ");      // "naruto"
 *   validateQueryWord("../../admin");  // null
 */
const validateQueryWord = (value, maxLength = 256) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  if (!/^[a-zA-Z0-9 _.\-]+$/.test(trimmed)) return null;
  if (trimmed.includes("..")) return null;
  return trimmed;
};

export { validateSlug, validateLetter, validatePage, validateQueryWord };

// ══════════════════════════════════════════════════════════════ END: validation.helper.js
