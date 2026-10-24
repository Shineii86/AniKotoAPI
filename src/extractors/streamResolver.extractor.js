/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — streamResolver.extractor.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Resolves actual streaming video URLs (m3u8/mp4) from embed player URLs.
 *   Follows the chain: megaplay embed → stream/getSources (decrypted `enc`
 *   payload) → m3u8 playlist, with the legacy /ajax/sources host kept as a
 *   fallback. Supports quality selection and subtitle extraction.
 *
 * @exports
 *   resolveStreamUrl, resolveStreamUrls, parseM3u8Qualities
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import axios from "axios";
import crypto from "crypto";
import { headers } from "../configs/header.config.js";
import { streamRefererHeaders } from "../helper/streamProxy.helper.js";

// ══════════════════════════════════════════════════════════════
// STREAM RESOLVER
// ══════════════════════════════════════════════════════════════

// Server name normalization map
const SERVER_NAME_MAP = {
  "VidPlay-1": "vidplay",
  "VidPlay-2": "vidplay",
  "HD-1": "hd",
  "HD-2": "hd",
  "Vidstream-1": "vidstream",
  "Vidstream-2": "vidstream",
  "VidCloud-1": "vidcloud",
  "VidCloud-2": "vidcloud",
  "StreamTape-1": "streamtape",
  "StreamTape-2": "streamtape",
};

// Embed domain to API domain mapping (legacy /ajax/sources host only)
const EMBED_API_MAP = {
  "vidtube.site": "megaplay-1.buzz",
  "vidplay.site": "megaplay-1.buzz",
  "megaplay.buzz": "megaplay-1.buzz",
  "embed.bunkrerrer.com": "megaplay-1.buzz",
};

// ---- FEATURE: getSources payload decryption ----
// The current MegaPlay API answers with an AES-CBC encrypted `enc` blob
// instead of a plain URL. Defaults mirror the player's TRUST_ENC_KEY /
// TRUST_ENC_IV fallbacks (key is zero-padded to 32 bytes, as in padKeyBytes).
const ENC_KEY = "i?LMTAx0Q6,:}50U";
const ENC_IV = "W0;27ToaUpl_P%'c";

/**
 * Decrypts the `enc` field returned by stream/getSources
 * @param {string} enc - Base64url-encoded AES-CBC payload
 * @returns {object|null} Parsed payload ({ file, ... }) or null on failure
 */
const decryptEncPayload = (enc) => {
  if (!enc || typeof enc !== "string") return null;
  try {
    const raw = Buffer.from(enc.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const key = Buffer.concat([Buffer.from(ENC_KEY, "utf8"), Buffer.alloc(16)]);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.from(ENC_IV, "utf8"));
    const plain = Buffer.concat([decipher.update(raw), decipher.final()]).toString("utf8");
    return JSON.parse(plain);
  } catch {
    return null;
  }
};

/**
 * Queries the current stream/getSources endpoint on the embed host itself
 *
 * NOTE: The `s=` CDN token the embed page carries (e.g. `?s=tcdn`) is
 * deliberately NOT forwarded — it routes segments to TikTok's ad CDN, which
 * is unreachable from many networks and cannot be proxied without allowlisting
 * every TikTok asset. Omitting it selects the plain `/anime/` content CDN.
 *
 * @returns {Promise<object|null>} API data with a playable file URL, or null
 */
const fetchGetSources = async (embedDomain, dataId, embedUrl, timeout) => {
  // NOTE: The player rewrites stream/getSources → stream/getSourcesNew, so try both
  for (const path of ["stream/getSourcesNew", "stream/getSources"]) {
    try {
      const query = `id=${encodeURIComponent(dataId)}`;
      const response = await axios.get(`https://${embedDomain}/${path}?${query}`, {
        headers: {
          ...headers,
          "Referer": embedUrl,
          "Origin": `https://${embedDomain}`,
          "Accept": "application/json",
        },
        timeout,
        validateStatus: () => true,
      });
      if (response.status < 200 || response.status >= 300) continue;

      const data = typeof response.data === "string"
        ? (() => { try { return JSON.parse(response.data); } catch { return null; } })()
        : response.data;
      if (!data || typeof data !== "object") continue;

      // NOTE: URL arrives encrypted — decrypt `enc` into `file`
      if (!data.file && data.enc) {
        const payload = decryptEncPayload(data.enc);
        if (payload?.file) data.file = payload.file;
      }
      if (data.file || data.source || data.url) return data;
    } catch {
      // NOTE: Try the next path variant
    }
  }
  return null;
};

/**
 * Legacy /ajax/sources lookup (kept as fallback for other embed domains)
 * @returns {Promise<object|null>} API data or null
 */
const fetchLegacySources = async (apiDomain, dataId, embedDomain, embedUrl, timeout) => {
  try {
    const response = await axios.get(`https://${apiDomain}/ajax/sources/${dataId}`, {
      headers: {
        ...headers,
        "Referer": embedUrl,
        "Origin": `https://${embedDomain}`,
      },
      timeout,
    });
    const data = typeof response.data === "string"
      ? (() => { try { return JSON.parse(response.data); } catch { return {}; } })()
      : response.data;
    return data && typeof data === "object" && Object.keys(data).length ? data : null;
  } catch {
    return null;
  }
};

// ---- FEATURE: Server Name Normalization ----
/**
 * Normalizes server display names to clean identifiers
 * @param {string} name - Raw server name (e.g., "VidPlay-1")
 * @returns {string} Normalized name (e.g., "vidplay")
 */
const normalizeServerName = (name) => {
  if (!name) return "unknown";
  return SERVER_NAME_MAP[name] || name.toLowerCase().replace(/[-\s]+\d+$/, "").trim();
};

// ---- FEATURE: Stream URL Resolution ----
/**
 * Resolves the actual video stream URL from an embed player page.
 * Extracts data-id from the embed HTML, then queries the megaplay API.
 *
 * @param {string} embedUrl - The embed player URL (e.g., vidtube.site/stream/...)
 * @param {object} [options] - Resolution options
 * @param {boolean} [options.followRedirects=true] - Follow HTTP redirects
 * @param {number} [options.timeout=10000] - Request timeout in ms
 * @returns {Promise<Object>} Object with url, qualities, skipData, type
 *
 * @example
 *   const resolved = await resolveStreamUrl("https://vidtube.site/stream/...");
 *   console.log(resolved.url);      // m3u8 URL
 *   console.log(resolved.qualities); // [{ label: "720p", url: "..." }]
 */
const resolveStreamUrl = async (embedUrl, options = {}) => {
  const { followRedirects = true, timeout = 10000 } = options;

  try {
    // NOTE: Extract the embed page to find data-id and API domain
    const embedResponse = await axios.get(embedUrl, {
      headers: {
        ...headers,
        "Referer": "https://anikototv.to/",
        "Origin": "https://anikototv.to",
      },
      timeout,
      maxRedirects: followRedirects ? 5 : 0,
    });

    const embedHtml = typeof embedResponse.data === "string"
      ? embedResponse.data
      : String(embedResponse.data);

    // NOTE: Extract data attributes from the player div
    const dataId = embedHtml.match(/data-id="(\d+)"/)?.[1];
    const realId = embedHtml.match(/data-realid="([^"]+)"/)?.[1];
    const mediaId = embedHtml.match(/data-mediaid="([^"]+)"/)?.[1];

    if (!dataId) {
      return {
        url: null,
        qualities: [],
        skipData: null,
        type: null,
        error: "Could not extract player data-id from embed page",
      };
    }

    // NOTE: Determine API domain from embed URL or extract from page
    const embedDomain = new URL(embedUrl).hostname;
    const apiDomain = EMBED_API_MAP[embedDomain] || embedDomain;

    // NOTE: Prefer the current getSources endpoint on the embed host itself —
    // the legacy /ajax/sources host (megaplay-1.buzz) no longer resolves in DNS
    const apiData =
      (await fetchGetSources(embedDomain, dataId, embedUrl, timeout)) ||
      (await fetchLegacySources(apiDomain, dataId, embedDomain, embedUrl, timeout)) ||
      {};

    // NOTE: Extract stream URL from API response
    const streamUrl = apiData?.source || apiData?.url || apiData?.file || null;
    const streamType = apiData?.type || (streamUrl?.includes(".m3u8") ? "hls" : "mp4");

    // NOTE: Parse m3u8 qualities if it's an HLS stream
    let qualities = [];
    if (streamUrl && streamType === "hls") {
      // NOTE: The CDN answers 403 without the player-origin Referer
      qualities = await parseM3u8Qualities(streamUrl, {
        headers: { ...headers, ...streamRefererHeaders() },
        timeout,
      });
    }

    // NOTE: Extract subtitles if available
    const subtitles = extractSubtitles(apiData);

    // NOTE: getSources returns intro/outro as { start, end }; the site's own
    // skip_data uses [start, end] — normalize to the site's array shape
    const toRange = (value) => {
      if (Array.isArray(value)) return [value[0] ?? null, value[1] ?? null];
      if (value && typeof value === "object") return [value.start ?? null, value.end ?? null];
      return null;
    };

    return {
      url: streamUrl,
      type: streamType,
      qualities,
      subtitles,
      skipData: apiData?.skip_data ||
        (apiData?.intro || apiData?.outro
          ? { intro: toRange(apiData.intro), outro: toRange(apiData.outro) }
          : null),
      dataId,
      realId,
      mediaId,
      backup: apiData?.backup || null,
    };
  } catch (error) {
    return {
      url: null,
      qualities: [],
      skipData: null,
      type: null,
      error: error.message,
    };
  }
};

// ---- FEATURE: Batch Stream URL Resolution ----
/**
 * Resolves stream URLs for multiple episodes in batch
 * @param {string} embedUrl - The embed player URL
 * @param {object} [options] - Resolution options
 * @returns {Promise<Object>} Batch resolution result
 */
const resolveStreamUrls = async (embedUrl, options = {}) => {
  try {
    const resolved = await resolveStreamUrl(embedUrl, options);
    return resolved;
  } catch (error) {
    return { url: null, error: error.message };
  }
};

// ══════════════════════════════════════════════════════════════
// M3U8 PARSER
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: M3U8 Quality Parser ----
/**
 * Parses an M3U8 playlist to extract available quality options.
 * Supports both master playlists (multiple qualities) and media playlists.
 *
 * @param {string} m3u8Url - URL of the M3U8 playlist
 * @param {object} [options] - Fetch options
 * @param {object} [options.headers] - Custom headers
 * @param {number} [options.timeout=10000] - Request timeout
 * @returns {Promise<Array<Object>>} Array of quality objects
 *
 * @example
 *   const qualities = await parseM3u8Qualities("https://example.com/master.m3u8");
 *   qualities.forEach(q => console.log(`${q.label}: ${q.url}`));
 */
const parseM3u8Qualities = async (m3u8Url, options = {}) => {
  const { headers: customHeaders = {}, timeout = 10000 } = options;

  try {
    const response = await axios.get(m3u8Url, {
      // NOTE: Player-origin Referer by default — the CDN 403s without it
      headers: { ...headers, ...streamRefererHeaders(), ...customHeaders },
      timeout,
    });

    const content = typeof response.data === "string"
      ? response.data
      : String(response.data);

    const qualities = [];
    const lines = content.split("\n").map((l) => l.trim());

    // NOTE: Parse master playlist (contains #EXT-X-STREAM-INF)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("#EXT-X-STREAM-INF:")) {
        const attrs = lines[i].substring("#EXT-X-STREAM-INF:".length);
        const bandwidth = parseInt(attrs.match(/BANDWIDTH=(\d+)/)?.[1] || "0");
        const resolution = attrs.match(/RESOLUTION=(\d+x\d+)/)?.[1] || "";
        const [width, height] = resolution.split("x").map(Number);
        const nextLine = lines[i + 1];

        if (nextLine && !nextLine.startsWith("#")) {
          // NOTE: Resolve relative URLs against base M3U8 URL
          const qualityUrl = nextLine.startsWith("http")
            ? nextLine
            : new URL(nextLine, m3u8Url).href;

          qualities.push({
            label: height ? `${height}p` : `${bandwidth}bps`,
            width: width || 0,
            height: height || 0,
            bandwidth,
            url: qualityUrl,
          });
        }
      }
    }

    // NOTE: If no qualities found, it's likely a single-quality stream
    if (qualities.length === 0 && content.includes("#EXTINF")) {
      qualities.push({
        label: "default",
        width: 0,
        height: 0,
        bandwidth: 0,
        url: m3u8Url,
      });
    }

    // NOTE: Sort by resolution/bandwidth descending (highest first)
    qualities.sort((a, b) => (b.height || b.bandwidth) - (a.height || a.bandwidth));

    return qualities;
  } catch (error) {
    return [];
  }
};

// ══════════════════════════════════════════════════════════════
// SUBTITLE EXTRACTOR
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Subtitle Track Extractor ----
/**
 * Extracts subtitle information from API response data
 * @param {object} apiData - The megaplay API response
 * @returns {Array<Object>} Array of subtitle objects
 */
const extractSubtitles = (apiData) => {
  const subtitles = [];

  // NOTE: Subtitles may be in different formats depending on the source
  if (apiData?.subtitles && Array.isArray(apiData.subtitles)) {
    for (const sub of apiData.subtitles) {
      subtitles.push({
        label: sub.label || sub.language || "Unknown",
        language: sub.code || sub.language || "unknown",
        url: sub.url || sub.file || null,
        format: sub.format || "srt",
      });
    }
  }

  // NOTE: Some sources embed subtitles in tracks array (captions on getSources)
  if (apiData?.tracks && Array.isArray(apiData.tracks)) {
    for (const track of apiData.tracks) {
      if (track.kind === "subtitles" || track.type === "subtitles" || track.kind === "captions") {
        subtitles.push({
          label: track.label || track.language || "Unknown",
          language: track.srclang || track.language || "unknown",
          url: track.file || track.src || null,
          format: track.format || "srt",
        });
      }
    }
  }

  return subtitles;
};

export { resolveStreamUrl, resolveStreamUrls, parseM3u8Qualities, normalizeServerName, extractSubtitles };

// ══════════════════════════════════════════════════════════════ END: streamResolver.extractor.js
