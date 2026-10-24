/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — stream.routes.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Streaming routes: watch page data, server lists, stream resolution,
 *   direct embed providers and the SSRF-guarded M3U8/TS proxies.
 *   Extracted from the former monolithic apiRoutes.js.
 *
 * @exports
 *   streamRoutes - Function that registers the streaming routes
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import { getWatchPage } from "../controllers/watchPage.controller.js";
import { getStreamInfo, getServerList, getMapperServers } from "../controllers/streamInfo.controller.js";
import { getResolvedStream, getStreamQualities } from "../controllers/streamResolver.controller.js";
import { getEmbedProviders } from "../controllers/embedProviders.controller.js";
import { getDownloadLinks } from "../controllers/download.controller.js";
import { assertProxyableUrl, streamRefererHeaders } from "../helper/streamProxy.helper.js";

// ══════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Streaming route registration ----
/**
 * Registers every route that serves player-facing data. The two proxy
 * routes keep their inline SSRF guard here — they never delegate URL
 * validation to a controller.
 *
 * @param {object} app - Express application instance
 * @param {object} ctx
 * @param {Function} ctx.jsonError - Helper to return error JSON
 *
 * @example
 *   streamRoutes(app, { jsonResponse, jsonError });
 */
const streamRoutes = (app, { jsonError }) => {
  // ══════════════════════════════════════════════════════════════
  // WATCH PAGE
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Watch page data for specific episode ----
  app.get("/api/watch", async (req, res, next) => {
    try {
      await getWatchPage(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // STREAMING
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Stream URL and metadata for episode ----
  app.get("/api/stream", async (req, res, next) => {
    try {
      await getStreamInfo(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ---- FEATURE: Available streaming servers for episode ----
  app.get("/api/servers", async (req, res, next) => {
    try {
      await getServerList(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ---- FEATURE: Mapped servers across multiple episodes ----
  app.get("/api/mapper-servers", async (req, res, next) => {
    try {
      await getMapperServers(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ---- FEATURE: Download links for episode ----
  app.get("/api/download", async (req, res, next) => {
    try {
      await getDownloadLinks(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ---- FEATURE: Resolve actual stream URL (m3u8/mp4) from link ID ----
  app.get("/api/stream/resolve", async (req, res, next) => {
    try {
      await getResolvedStream(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ---- FEATURE: Available quality options for a stream URL ----
  app.get("/api/stream/qualities", async (req, res, next) => {
    try {
      await getStreamQualities(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ---- FEATURE: Direct embed providers (Megavid/AniXo/MegaPlay) ----
  app.get("/api/stream/embeds", async (req, res, next) => {
    try {
      await getEmbedProviders(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ---- FEATURE: M3U8 proxy — fetch and serve M3U8 playlists through API ----
  app.get("/api/stream/proxy", async (req, res, next) => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({ success: false, message: "M3U8 URL is required" });
      }
      // NOTE: Validate URL is from known streaming domains.
      // WARNING: Do not add an "or the path looks like a playlist" escape hatch —
      // the previous version had one, which let any host through and turned this
      // endpoint into an open proxy onto the server's own network.
      const check = assertProxyableUrl(url);
      if (!check.ok) {
        return res.status(check.status).json({ success: false, message: check.message });
      }

      const axios = (await import("axios")).default;
      const { headers: defaultHeaders } = await import("../configs/header.config.js");

      const response = await axios.get(url, {
        headers: {
          ...defaultHeaders,
          ...streamRefererHeaders(),
        },
        timeout: 15000,
        responseType: "text",
      });

      // NOTE: Rewrite relative URLs in M3U8 to proxy URLs
      let content = typeof response.data === "string" ? response.data : String(response.data);
      const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);

      content = content.replace(/(^(?!#).+\.m3u8.*$)/gm, (match) => {
        const absoluteUrl = match.startsWith("http") ? match : new URL(match, baseUrl).href;
        return `/api/stream/proxy?url=${encodeURIComponent(absoluteUrl)}`;
      });

      content = content.replace(/(^(?!#).+\.ts.*$)/gm, (match) => {
        const absoluteUrl = match.startsWith("http") ? match : new URL(match, baseUrl).href;
        return `/api/stream/ts-proxy?url=${encodeURIComponent(absoluteUrl)}`;
      });

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=30");
      res.send(content);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ---- FEATURE: TS segment proxy for video segments ----
  app.get("/api/stream/ts-proxy", async (req, res, next) => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({ success: false, message: "TS URL is required" });
      }

      // NOTE: Segment URLs come from the caller too, so they need the same guard
      // the playlist proxy uses — this endpoint previously had none.
      const check = assertProxyableUrl(url);
      if (!check.ok) {
        return res.status(check.status).json({ success: false, message: check.message });
      }

      const axios = (await import("axios")).default;
      const { headers: defaultHeaders } = await import("../configs/header.config.js");

      const response = await axios.get(url, {
        headers: {
          ...defaultHeaders,
          ...streamRefererHeaders(),
        },
        timeout: 30000,
        responseType: "arraybuffer",
      });

      res.setHeader("Content-Type", "video/mp2t");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(Buffer.from(response.data));
    } catch (error) {
      jsonError(res, error.message);
    }
  });
};

export { streamRoutes };

// ══════════════════════════════════════════════════════════════ END: stream.routes.js
