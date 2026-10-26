/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — streamResolver.controller.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Controller for stream URL resolution and quality detection.
 *   Resolves actual video URLs (m3u8/mp4) from embed player URLs
 *   and parses available quality options.
 *
 * @exports
 *   getResolvedStream - Express route handler for GET /api/stream/resolve
 *   getStreamQualities - Express route handler for GET /api/stream/qualities
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import { resolveStreamUrl, parseM3u8Qualities } from "../extractors/streamResolver.extractor.js";
import { extractStreamInfo } from "../extractors/streamInfo.extractor.js";
import { getCache, setCache, TTL } from "../helper/cache.helper.js";

// ══════════════════════════════════════════════════════════════
// CONTROLLER: RESOLVE STREAM
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Resolve actual video stream URL from link ID ----
/**
 * Handles GET /api/stream/resolve requests. Resolves the actual
 * video stream URL (m3u8/mp4) from a server link ID.
 *
 * @param {object} req - Express request object
 * @param {string} req.query.id - Server link ID
 * @param {string} req.query.slug - Anime slug (used to establish session)
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Sends JSON response with resolved stream URL
 *
 * @example
 *   GET /api/stream/resolve?id=abc123&slug=one-piece-odmau
 *   Response: { success: true, results: { url, qualities, type } }
 *
 * @throws {400} If 'id' query parameter is missing
 */
const getResolvedStream = async (req, res, next) => {
  try {
    const { id, slug } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, message: "Link ID is required" });
    }
    const cacheKey = `resolved_${id}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, results: cached });
    }

    // NOTE: First get the embed URL from the link ID (with session establishment)
    const streamInfo = await extractStreamInfo(id, slug);
    if (!streamInfo.url) {
      return res.status(404).json({ success: false, message: "Stream URL not found for this link ID" });
    }

    // NOTE: Resolve the actual video URL from the embed page
    const resolved = await resolveStreamUrl(streamInfo.url);
    const result = {
      linkId: id,
      embedUrl: streamInfo.url,
      ...resolved,
      skipData: streamInfo.skipData || resolved.skipData,
    };

    setCache(cacheKey, result, TTL.stream);
    res.json({ success: true, results: result });
  } catch (error) {
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════
// CONTROLLER: STREAM QUALITIES
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Available quality options for a stream URL ----
/**
 * Handles GET /api/stream/qualities requests. Parses an M3U8
 * playlist URL to return available quality options.
 *
 * @param {object} req - Express request object
 * @param {string} req.query.url - M3U8 playlist URL
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Sends JSON response with quality options
 *
 * @example
 *   GET /api/stream/qualities?url=https://example.com/master.m3u8
 *   Response: { success: true, results: [{ label: "720p", url: "..." }] }
 *
 * @throws {400} If 'url' query parameter is missing
 */
const getStreamQualities = async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: "M3U8 URL is required" });
    }
    const cacheKey = `qualities_${url}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, results: cached });
    }

    // NOTE: strict mode — a non-playlist body is a 415, a fetch failure a 502;
    // returning qualities:[] for a URL that isn't HLS hides the real problem
    const qualities = await parseM3u8Qualities(url, { strict: true });
    const result = {
      url,
      totalQualities: qualities.length,
      qualities,
    };

    setCache(cacheKey, result, TTL.stream);
    res.json({ success: true, results: result });
  } catch (error) {
    next(error);
  }
};

export { getResolvedStream, getStreamQualities };

// ══════════════════════════════════════════════════════════════ END: streamResolver.controller.js
