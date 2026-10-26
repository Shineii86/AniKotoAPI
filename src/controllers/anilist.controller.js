/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — anilist.controller.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Controllers for the AniList enrichment endpoints. Unlike the scraping
 *   endpoints these talk to a stable public GraphQL API, so they are cheap,
 *   cacheable and unaffected by the origin site's Cloudflare challenges.
 *
 * @exports
 *   getAnilistAnime, getAnilistSeasonChart
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import { getAnilistMedia, getAnilistSeason, resolveAnilistIdFromMal } from "../helper/anilist.helper.js";

// ══════════════════════════════════════════════════════════════
// CONTROLLER: ANILIST ANIME METADATA
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: AniList enrichment endpoint ----
/**
 * Handles GET /api/anilist/:id requests. Accepts an AniList ID in the path
 * or a MAL ID via ?mal= and returns rich metadata: synopsis, genres, scores,
 * studios, characters, relations and recommendations.
 *
 * @param {object} req - Express request object
 * @param {string} [req.params.id] - AniList media ID
 * @param {string} [req.query.mal] - MAL ID alternative to the path ID
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Sends JSON response with AniList metadata
 *
 * @example
 *   GET /api/anilist/21
 *   GET /api/anilist?mal=21
 *   Response: { success: true, results: { id, title, genres, ... } }
 *
 * @throws {400} If neither an AniList ID nor ?mal= is supplied
 * @throws {404} If AniList has no such media
 * @throws {502} If AniList itself is unreachable
 */
const getAnilistAnime = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { mal } = req.query;

    // NOTE: ?mal= lets MAL-first clients skip the path ID entirely —
    // resolveAnilistIdFromMal is a cached lookup, so this stays cheap
    let anilistId = /^\d+$/.test(String(id || "")) ? parseInt(id, 10) : 0;
    if (!anilistId && mal !== undefined) {
      if (!/^\d+$/.test(String(mal))) {
        return res.status(400).json({ success: false, message: "Invalid MAL ID parameter" });
      }
      const resolved = await resolveAnilistIdFromMal(mal);
      if (resolved) anilistId = parseInt(resolved, 10);
    }

    if (!anilistId) {
      return res.status(400).json({
        success: false,
        message: "AniList ID is required in the path (/anilist/:id) or via ?mal=",
      });
    }

    const media = await getAnilistMedia(anilistId);
    if (!media) {
      return res.status(404).json({ success: false, message: "Anime not found on AniList" });
    }

    res.json({ success: true, results: media });
  } catch (error) {
    // NOTE: AniList outages surface as 502 so clients can retry, never as 500
    if (/Invalid AniList ID/i.test(error.message)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    // NOTE: The helper throws "not found" instead of returning null — a
    // missing anime is a 404, not a gateway failure
    if (/not found/i.test(error.message)) {
      return res.status(404).json({ success: false, message: "Anime not found on AniList" });
    }
    res.status(502).json({ success: false, message: `AniList lookup failed: ${error.message}` });
  }
};

// ══════════════════════════════════════════════════════════════
// CONTROLLER: ANILIST SEASON CHART
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: AniList seasonal chart endpoint ----
/**
 * Handles GET /api/anilist/season requests. Returns the most popular anime
 * of a season, defaulting to the current season/year.
 *
 * @param {object} req - Express request object
 * @param {string} [req.query.season] - WINTER | SPRING | SUMMER | FALL
 * @param {number|string} [req.query.year] - Season year
 * @param {number|string} [req.query.page] - Page number (1-500)
 * @param {number|string} [req.query.perPage] - Items per page (1-50)
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Sends JSON response with the seasonal chart
 *
 * @example
 *   GET /api/anilist/season?season=WINTER&year=2026&page=1
 *   Response: { success: true, results: { season, year, media: [...] } }
 *
 * @throws {400} If season/year are out of range
 * @throws {502} If AniList itself is unreachable
 */
const getAnilistSeasonChart = async (req, res, next) => {
  try {
    const { season, year, page, perPage } = req.query;
    const chart = await getAnilistSeason({ season, year, page, perPage });
    res.json({ success: true, results: chart });
  } catch (error) {
    if (/Invalid (season|year|page)/i.test(error.message)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(502).json({ success: false, message: `AniList lookup failed: ${error.message}` });
  }
};

export { getAnilistAnime, getAnilistSeasonChart };

// ══════════════════════════════════════════════════════════════ END: anilist.controller.js
