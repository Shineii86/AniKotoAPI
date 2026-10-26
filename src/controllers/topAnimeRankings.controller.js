/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — topAnimeRankings.controller.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Controller for top anime rankings. Returns ranked anime list
 *   with support for day, week, and month sort modes.
 *
 * @exports
 *   getTopAnimeRankings - Express route handler for GET /api/top-rankings
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import { extractTopAnimeRankings, VALID_SORTS } from "../extractors/topAnimeRankings.extractor.js";
import { getCache, setCache, TTL } from "../helper/cache.helper.js";
import { jsonError } from "../helper/response.helper.js";

// ══════════════════════════════════════════════════════════════
// CONTROLLER: TOP ANIME RANKINGS
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Top anime rankings endpoint ----
/**
 * Handles GET /api/top-rankings requests. Returns ranked anime list
 * with support for top (all-time) and newest sort modes.
 *
 * @param {object} req - Express request object
 * @param {string} [req.query.sort="day"] - Sort mode: "day", "week", or "month"
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Sends JSON response with ranked anime list
 *
 * @example
 *   GET /api/top-rankings?sort=day
 *   Response: { success: true, results: [{ rank: 1, title: "...", ... }] }
 */
const getTopAnimeRankings = async (req, res, next) => {
  try {
    const { sort = "day" } = req.query;

    // NOTE: Reject unknown windows instead of silently falling back to day —
    // every sort value must map to exactly one ranking tab
    if (!VALID_SORTS.includes(sort)) {
      return jsonError(res, `Invalid sort: ${sort} (expected ${VALID_SORTS.join(", ")})`, 400);
    }

    const cacheKey = `top_rankings_${sort}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, results: cached });
    }
    const data = await extractTopAnimeRankings(sort);
    setCache(cacheKey, data, TTL.trending);
    res.json({ success: true, results: data });
  } catch (error) {
    next(error);
  }
};

export { getTopAnimeRankings };

// ══════════════════════════════════════════════════════════════ END: topAnimeRankings.controller.js
