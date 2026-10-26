/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — sanitizeJson.middleware.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Express middleware that cleans every JSON response at the single
 *   outbound boundary:
 *
 *     1. Decodes HTML entities (&amp;, &#39;, &nbsp, &NBSP 1999 …) that
 *        upstream HTML fragments leak into titles/descriptions.
 *     2. Collapses horizontal whitespace runs and trims string values.
 *     3. Normalizes stringified numeric ids (animeId "958" → 958) so
 *        every endpoint returns consistent types.
 *
 *   Wraps res.json() the same way creatorInfo.js does, so controllers
 *   stay untouched.
 *
 * @exports
 *   sanitizeJson — Express middleware function
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

// ══════════════════════════════════════════════════════════════
// ENTITY TABLE
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Named entity map (common markup + punctuation) ----
// NOTE: Upstream sends "&nbsp" without a semicolon ("&NBSP 1999"), so the
// regex below allows a missing terminator as long as no word char follows.
const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  nbsp: "\u00a0", ensp: "\u2002", emsp: "\u2003", thinsp: "\u2009",
  hellip: "…", mdash: "—", ndash: "–",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  sbquo: "‚", bdquo: "„",
  copy: "©", reg: "®", trade: "™",
  middot: "·", bull: "•", deg: "°",
  times: "×", divide: "÷",
  laquo: "«", raquo: "»",
  sect: "§", para: "¶", permil: "‰",
  euro: "€", pound: "£", yen: "¥", cent: "¢",
  dagger: "†", Dagger: "‡",
  prime: "′", Prime: "″",
  larr: "←", rarr: "→", uarr: "↑", darr: "↓",
  harr: "↔", rArr: "⇒",
  infin: "∞", ne: "≠", le: "≤", ge: "≥",
  alpha: "α", beta: "β", gamma: "γ", delta: "δ",
  pi: "π", omega: "ω", mu: "μ",
};

// ---- FEATURE: Combined entity regex ----
// #x… / #… allow a missing semicolon when the next char is not alphanumeric;
// named entities do the same, so "&nbspword" stays literal while "&NBSP 1999"
// decodes.
const ENTITY_REGEX = /&(?:#x([0-9a-fA-F]+)|#(\d+)|([a-zA-Z]+))(?:;|(?![0-9a-zA-Z]))/g;

// ══════════════════════════════════════════════════════════════
// STRING CLEANERS
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: HTML entity decoder ----
/**
 * Decodes HTML entities in a string. Unknown entities are left as-is.
 *
 * @param {string} value - Raw string
 * @returns {string} Decoded string
 */
const decodeEntities = (value) =>
  value.replace(ENTITY_REGEX, (match, hex, dec, name) => {
    if (hex || dec) {
      const codePoint = parseInt(hex || dec, hex ? 16 : 10);
      if (
        Number.isFinite(codePoint) &&
        codePoint > 0 &&
        codePoint <= 0x10ffff &&
        !(codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return match;
        }
      }
      return match;
    }
    // NOTE: Exact match first (HTML entities are case-sensitive: &dagger; ≠
    // &Dagger;), then lowercase fallback for upstream's non-standard "&NBSP"
    const decoded = NAMED_ENTITIES[name] ?? NAMED_ENTITIES[name.toLowerCase()];
    return decoded === undefined ? match : decoded;
  });

// ---- FEATURE: Whitespace normalizer ----
/**
 * Collapses horizontal whitespace runs (spaces, tabs, NBSP) and trims
 * the ends of the string. Newlines are preserved for long descriptions.
 *
 * @param {string} value - Raw string
 * @returns {string} Normalized string
 */
const normalizeWhitespace = (value) =>
  value.replace(/[ \t\r\u00a0\u2002\u2003\u2009\f\v]{2,}/g, " ").trim();

// ---- FEATURE: Full string pipeline ----
/**
 * Runs the complete string cleanup: entities → whitespace.
 *
 * @param {string} value - Raw string
 * @returns {string} Cleaned string
 */
const cleanString = (value) => normalizeWhitespace(decodeEntities(value));

// ---- FEATURE: Numeric id normalization ----
// NOTE: slug/id are deliberately NOT listed — "id" is opaque upstream and
// slug must stay a string. Only known numeric identity keys are coerced.
const NUMERIC_ID_KEYS = new Set([
  "animeId", "malId", "anilistId", "mal_id", "anilist_id",
]);

// ══════════════════════════════════════════════════════════════
// PAYLOAD WALKER
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Recursive payload sanitizer ----
/**
 * Walks a JSON payload and applies the cleaners to every string value.
 * Numeric id keys get string→number normalization.
 *
 * @param {*} node - Current payload node (object/array/string/primitive)
 * @param {string|null} key - Parent key of this node (for id coercion)
 * @returns {*} Sanitized node (new object/array when needed)
 */
const sanitizeNode = (node, key = null) => {
  if (typeof node === "string") {
    if (key && NUMERIC_ID_KEYS.has(key) && /^\d{1,15}$/.test(node)) {
      const asNumber = Number(node);
      if (Number.isSafeInteger(asNumber)) return asNumber;
    }
    return cleanString(node);
  }
  if (Array.isArray(node)) {
    return node.map((item) => sanitizeNode(item, null));
  }
  if (node && typeof node === "object") {
    const out = {};
    for (const [childKey, value] of Object.entries(node)) {
      out[childKey] = sanitizeNode(value, childKey);
    }
    return out;
  }
  return node;
};

// ══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Response sanitizer middleware ----
/**
 * Express middleware that patches res.json() so every payload passes
 * through the sanitizer before it hits the wire.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Passes control forward
 * @returns {void}
 *
 * @example
 *   app.use(sanitizeJson);
 *   res.json({ title: "Tom &amp; Jerry", animeId: "958" });
 *   // → { title: "Tom & Jerry", animeId: 958 }
 */
const sanitizeJson = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (data) => {
    try {
      return originalJson(sanitizeNode(data));
    } catch {
      // NOTE: Sanitizer must never break a response — fall back to raw payload
      return originalJson(data);
    }
  };

  next();
};

export { sanitizeJson, cleanString, decodeEntities };
// ══════════════════════════════════════════════════════════════ END: sanitizeJson.middleware.js
