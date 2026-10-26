/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — streamInfo.controller.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Controller for streaming information. Provides stream URLs,
 *   available servers, and mapped server data for episode playback.
 *   Three endpoints for different streaming data needs.
 *
 * @exports
 *   getStreamInfo - Express route handler for GET /api/stream
 *   getServerList - Express route handler for GET /api/servers
 *   getMapperServers - Express route handler for GET /api/mapper-servers
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import { extractStreamInfo, extractServerList, extractMapperServers } from "../extractors/streamInfo.extractor.js";
import { getCache, setCache, TTL } from "../helper/cache.helper.js";

// ══════════════════════════════════════════════════════════════
// CONTROLLER: STREAM INFO
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Stream URL and metadata endpoint ----
/**
 * Handles GET /api/stream requests. Returns stream URL and
 * metadata for a specific episode link ID.
 *
 * @param {object} req - Express request object
 * @param {string} req.query.id - Episode link ID
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Sends JSON response with stream information
 *
 * @example
 *   GET /api/stream?id=abc123
 *   Response: { success: true, results: { url, quality, ... } }
 *
 * @throws {400} If 'id' query parameter is missing
 */
const getStreamInfo = async (req, res, next) => {
  try {
    const { id, slug } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, message: "Link ID is required" });
    }
    const cacheKey = `stream_${id}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, results: cached });
    }
    let data;
    try {
      data = await extractStreamInfo(id, slug);
    } catch (upstreamError) {
      // NOTE: Typed upstream faults carry their own status (e.g. 400 for a
      // garbage link id that every mirror rejects identically) — only
      // untyped failures deserve the blanket 502 gateway wrapper
      const status = upstreamError.status || 502;
      return res.status(status).json({
        success: false,
        message: upstreamError.status
          ? upstreamError.message
          : `Upstream API error: ${upstreamError.message}`,
      });
    }
    if (!data.url) {
      return res.status(404).json({ success: false, message: "Stream URL not found for this link ID", results: data });
    }
    setCache(cacheKey, data, TTL.stream);
    res.json({ success: true, results: data });
  } catch (error) {
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════
// CONTROLLER: SERVER LIST
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Available streaming servers endpoint ----
/**
 * Handles GET /api/servers requests. Returns list of available
 * streaming servers for the given episode IDs.
 *
 * @param {object} req - Express request object
 * @param {string} req.query.ids - Comma-separated episode IDs
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Sends JSON response with server list
 *
 * @example
 *   GET /api/servers?ids=123,456,789
 *   Response: { success: true, results: [{ server, name, ... }] }
 *
 * @throws {400} If 'ids' query parameter is missing
 */
const getServerList = async (req, res, next) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ success: false, message: "Episode IDs are required" });
    }
    const cacheKey = `servers_${ids}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, results: cached });
    }
    const data = await extractServerList(ids);
    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, message: "No servers found for the given episode IDs", results: [] });
    }
    setCache(cacheKey, data, TTL.servers);
    res.json({ success: true, results: data });
  } catch (error) {
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════
// CONTROLLER: MAPPER SERVERS
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Cross-episode mapped servers endpoint ----
/**
 * Handles GET /api/mapper-servers requests. Returns servers mapped
 * across multiple episodes for continuous playback.
 *
 * @param {object} req - Express request object
 * @param {string} req.query.malId - MyAnimeList ID
 * @param {string} req.query.slug - Anime slug
 * @param {string} req.query.timestamp - Timestamp for mapping
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Sends JSON response with mapped server data
 *
 * @example
 *   GET /api/mapper-servers?malId=21&slug=one-piece&timestamp=1234567890
 *   Response: { success: true, results: [...] }
 *
 * @throws {400} If any required parameter is missing
 * NOTE: All three parameters (malId, slug, timestamp) are required
 */
const getMapperServers = async (req, res, next) => {
  try {
    const { malId, slug, timestamp } = req.query;
    if (!malId || !slug || !timestamp) {
      return res.status(400).json({ success: false, message: "malId, slug, and timestamp are required" });
    }
    const cacheKey = `mapper_${malId}_${slug}_${timestamp}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, results: cached });
    }
    const data = await extractMapperServers(malId, slug, timestamp);
    setCache(cacheKey, data, TTL.default);
    res.json({ success: true, results: data });
  } catch (error) {
    next(error);
  }
};

export { getStreamInfo, getServerList, getMapperServers };

// ══════════════════════════════════════════════════════════════ END: streamInfo.controller.js