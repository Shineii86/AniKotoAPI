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
import axios from "axios";
import { headers as defaultHeaders } from "../configs/header.config.js";

// ══════════════════════════════════════════════════════════════
// PROXY HELPERS
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Segment content types ----
/**
 * Detects decoy segment URLs. MegaPlay's content CDN serves real MPEG-TS
 * bytes under `.jpg`/`.html`/`.js` names with a matching decoy Content-Type
 * (`image/jpeg`, `text/html`) to break naive hotlink checks, so a segment
 * path must be answered as media regardless of what the CDN reports.
 *
 * @param {string} targetUrl - Segment URL
 * @returns {boolean} True when the path is a known decoy segment pattern
 */
const isDecoySegmentUrl = (targetUrl) => {
  let path = String(targetUrl).toLowerCase();
  try { path = new URL(targetUrl).pathname.toLowerCase(); } catch { /* keep raw */ }
  return /\/(seg|segment|frag)-/.test(path) || path.includes("~tplv-");
};

/**
 * Content type for a proxied segment, derived from its extension with the
 * upstream header as a fallback. Extensionless segment paths keep the
 * legacy `video/mp2t` answer so existing players are unaffected.
 *
 * @param {string} targetUrl - Absolute or relative segment URL
 * @param {string} [upstreamType=""] - Content-Type reported by the CDN
 * @returns {string} Content-Type for the proxied response
 */
const contentTypeFor = (targetUrl, upstreamType = "") => {
  if (isDecoySegmentUrl(targetUrl)) return "video/mp2t";

  let path = String(targetUrl).toLowerCase();
  try { path = new URL(targetUrl).pathname.toLowerCase(); } catch { /* keep raw */ }

  if (path.endsWith(".vtt")) return "text/vtt; charset=utf-8";
  if (path.endsWith(".srt")) return "application/x-subrip";
  if (path.endsWith(".ass") || path.endsWith(".ssa")) return "text/plain; charset=utf-8";
  if (path.endsWith(".aac")) return "audio/aac";
  if (path.endsWith(".m4a")) return "audio/mp4";
  if (path.endsWith(".mp4")) return "video/mp4";
  if (path.endsWith(".m4s")) return "video/iso.segment";
  if (path.endsWith(".key")) return "application/octet-stream";
  if (path.endsWith(".ts")) return "video/mp2t";

  const upstream = upstreamType.toLowerCase();
  if (upstream && !upstream.includes("text/html") && !upstream.includes("application/json")) {
    return upstream;
  }
  return "video/mp2t";
};

// ---- FEATURE: Upstream fetch with bounded retry ----
/**
 * Fetches a proxy target, retrying transient failures (network errors,
 * 429, 5xx) once. Deterministic answers such as 403 are not retried —
 * the referer/allowlist decision will not change on a second attempt.
 *
 * @param {string} target - Absolute URL to fetch
 * @param {object} options
 * @param {object} options.headers - Upstream request headers
 * @param {number} [options.timeout=15000] - Request timeout in ms
 * @param {string} [options.responseType="stream"] - Axios response type
 * @param {string} [options.range] - Incoming Range header to forward
 * @param {number} [options.attempts=2] - Total attempts (1 retry)
 * @returns {Promise<object>} Axios response with `validateStatus: () => true`
 * @throws {Error} Last network error when every attempt failed
 */
const fetchUpstream = async (target, { headers, timeout = 15000, responseType = "stream", range, attempts = 2 } = {}) => {
  const upstreamHeaders = { ...headers };
  if (range) upstreamHeaders.Range = range;

  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await axios.get(target, {
        headers: upstreamHeaders,
        timeout,
        responseType,
        validateStatus: () => true,
      });
      if ((response.status === 429 || response.status >= 500) && attempt < attempts) {
        lastError = new Error(`Upstream returned HTTP ${response.status}`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
      }
    }
  }
  throw lastError;
};

// ---- FEATURE: HLS playlist rewriting ----
/**
 * Rewrites every media reference in an M3U8 playlist to the API proxies:
 * bare segment lines AND `URI="…"` attributes (`#EXT-X-KEY`, `#EXT-X-MAP`,
 * `#EXT-X-MEDIA`, I-frame playlists). References the SSRF guard rejects
 * (unknown hosts such as a key server outside the allowlist) keep their
 * original URL so playback is never broken by the rewrite.
 *
 * @param {string} content - Raw playlist body
 * @param {string} manifestUrl - Absolute URL the playlist came from
 * @returns {string} Playlist with proxied references
 */
const rewritePlaylist = (content, manifestUrl) => {
  const baseUrl = manifestUrl.substring(0, manifestUrl.lastIndexOf("/") + 1);

  const proxiedUrl = (raw) => {
    let absolute;
    try {
      absolute = raw.startsWith("http") ? raw : new URL(raw, baseUrl).href;
    } catch {
      return raw;
    }
    if (!assertProxyableUrl(absolute).ok) return raw;

    const isManifest = /\.m3u8(\?|#|$)/i.test(absolute);
    const route = isManifest ? "proxy" : "ts-proxy";
    return `/api/stream/${route}?url=${encodeURIComponent(absolute)}`;
  };

  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        return line.includes("URI=")
          ? line.replace(/URI="([^"]+)"/g, (_, uri) => `URI="${proxiedUrl(uri)}"`)
          : line;
      }
      return proxiedUrl(trimmed);
    })
    .join("\n");
};

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
      jsonError(res, error.message, error.status || 500);
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
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ---- FEATURE: Available streaming servers for episode ----
  app.get("/api/servers", async (req, res, next) => {
    try {
      await getServerList(req, res, next);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ---- FEATURE: Mapped servers across multiple episodes ----
  app.get("/api/mapper-servers", async (req, res, next) => {
    try {
      await getMapperServers(req, res, next);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ---- FEATURE: Download links for episode ----
  app.get("/api/download", async (req, res, next) => {
    try {
      await getDownloadLinks(req, res, next);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ---- FEATURE: Resolve actual stream URL (m3u8/mp4) from link ID ----
  app.get("/api/stream/resolve", async (req, res, next) => {
    try {
      await getResolvedStream(req, res, next);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ---- FEATURE: Available quality options for a stream URL ----
  app.get("/api/stream/qualities", async (req, res, next) => {
    try {
      await getStreamQualities(req, res, next);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ---- FEATURE: Direct embed providers (Megavid/AniXo/MegaPlay) ----
  app.get("/api/stream/embeds", async (req, res, next) => {
    try {
      await getEmbedProviders(req, res, next);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ---- FEATURE: M3U8 proxy — fetch and serve M3U8 playlists through API ----
  app.get("/api/stream/proxy", async (req, res, next) => {
    try {
      const { url } = req.query;
      if (!url) {
        return jsonError(res, "M3U8 URL is required", 400);
      }
      // NOTE: Validate URL is from known streaming domains.
      // WARNING: Do not add an "or the path looks like a playlist" escape hatch —
      // the previous version had one, which let any host through and turned this
      // endpoint into an open proxy onto the server's own network.
      const check = assertProxyableUrl(url);
      if (!check.ok) {
        return jsonError(res, check.message, check.status);
      }

      const response = await fetchUpstream(url, {
        headers: { ...defaultHeaders, ...streamRefererHeaders() },
        timeout: 15000,
        responseType: "text",
      });

      if (response.status !== 200) {
        return jsonError(res, `Upstream returned HTTP ${response.status}`, 502);
      }

      const content = typeof response.data === "string" ? response.data : String(response.data);

      // NOTE: A CDN error or challenge page served with HTTP 200 would
      // otherwise be rewritten line-by-line into garbage the player rejects
      if (!content.includes("#EXTM3U")) {
        return jsonError(res, "Upstream did not return an HLS playlist", 415);
      }

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=30");
      res.send(rewritePlaylist(content, url));
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ---- FEATURE: Segment proxy — streams TS/media segments through API ----
  app.get("/api/stream/ts-proxy", async (req, res, next) => {
    try {
      const { url } = req.query;
      if (!url) {
        return jsonError(res, "Segment URL is required", 400);
      }

      // NOTE: Segment URLs come from the caller too, so they need the same guard
      // the playlist proxy uses — this endpoint previously had none.
      const check = assertProxyableUrl(url);
      if (!check.ok) {
        return jsonError(res, check.message, check.status);
      }

      const response = await fetchUpstream(url, {
        headers: { ...defaultHeaders, ...streamRefererHeaders() },
        timeout: 30000,
        responseType: "stream",
        range: req.headers.range,
      });

      if (response.status !== 200 && response.status !== 206) {
        response.data?.destroy?.();
        return jsonError(res, `Upstream returned HTTP ${response.status}`, 502);
      }

      const upstreamType = String(response.headers["content-type"] || "");
      // NOTE: CDN error pages arrive as HTML — never serve them as media.
      // Decoy segment URLs claim text/html on purpose, so they are exempt.
      if (upstreamType.includes("text/html") && !isDecoySegmentUrl(url)) {
        response.data?.destroy?.();
        return jsonError(res, "Upstream returned HTML instead of media", 415);
      }

      res.status(response.status);
      res.setHeader("Content-Type", contentTypeFor(url, upstreamType));
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=3600");
      // NOTE: Only advertise ranges the CDN actually supports — relaying a
      // Range request upstream yields 200/full body from this host
      if (response.headers["accept-ranges"]) {
        res.setHeader("Accept-Ranges", response.headers["accept-ranges"]);
      }
      if (response.headers["content-range"]) {
        res.setHeader("Content-Range", response.headers["content-range"]);
      }
      if (response.headers["content-length"]) {
        res.setHeader("Content-Length", response.headers["content-length"]);
      }

      // NOTE: Stream straight through — buffering whole segments in memory
      // spikes RSS on serverless instances
      response.data.on("error", () => res.destroy());
      response.data.pipe(res);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });
};

export { streamRoutes };

// ══════════════════════════════════════════════════════════════ END: stream.routes.js
