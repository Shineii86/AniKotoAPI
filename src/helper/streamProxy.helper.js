/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — streamProxy.helper.js
 * Repository: https://github.com/Shineii86
 *
 * @description
 *   Request guard for the M3U8/TS streaming proxies. Validates that a
 *   caller-supplied URL points at a known streaming CDN before the server
 *   fetches it, so the proxy endpoints cannot be used to reach internal
 *   services (SSRF).
 *
 * @exports
 *   assertProxyableUrl
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

// ══════════════════════════════════════════════════════════════
// PROXY ALLOWLIST
// ══════════════════════════════════════════════════════════════

// Registrable domains the proxies may fetch from. Subdomains are covered,
// so the apex is listed once and rotating hosts (cdn1., s2., …) still match.
// NOTE: megaplay-1.buzz was removed — it no longer resolves.
const DEFAULT_PROXY_DOMAINS = [
  // Embed players
  "megaplay.buzz",
  "vidtube.site",
  "vidplay.site",
  // Stream / subtitle CDNs
  "anipixcdn.co",
  "norami.top",
  "kryntal.top",
  "akirax.buzz",
];

// Parse the allowlist from env or use defaults
function parseProxyDomains() {
  const envDomains = process.env.STREAM_PROXY_DOMAINS;
  if (!envDomains) return DEFAULT_PROXY_DOMAINS;

  return envDomains
    .split(",")
    .map(d => d.trim().toLowerCase())
    .filter(Boolean);
}

const PROXY_DOMAINS = parseProxyDomains();

// Referer the stream CDNs expect. They answer 403 to the site origin
// (anikototv.to) and to no Referer at all — only the player origin passes.
const STREAM_REFERER = process.env.STREAM_PROXY_REFERER || "https://megaplay.buzz/";

// ══════════════════════════════════════════════════════════════
// PRIVATE ADDRESS DETECTION
// ══════════════════════════════════════════════════════════════

// NOTE: Blocks IP literals pointing at the host's own network. This is a
// second layer, not the primary control — the allowlist is. A hostname that
// passes the allowlist but resolves to a private address (DNS rebinding) is
// not caught here, since axios re-resolves the name when it connects.
const isPrivateAddress = (hostname) => {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();

  // IPv6 loopback, link-local (fe80::/10) and unique-local (fc00::/7)
  if (host === "::1" || host === "::") return true;
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(host)) return true;

  // IPv4-mapped IPv6 — unwrap and fall through to the IPv4 checks
  const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const target = mapped || host;

  const octets = target.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!octets) return false;

  const [a, b] = octets.slice(1).map(Number);
  if (a === 0 || a === 10 || a === 127) return true;      // this-network, private, loopback
  if (a === 169 && b === 254) return true;                 // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;         // private
  if (a === 192 && b === 168) return true;                  // private
  if (a === 100 && b >= 64 && b <= 127) return true;        // CGNAT
  return false;
};

// ══════════════════════════════════════════════════════════════
// URL GUARD
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Proxy URL Validation ----
/**
 * Validates a caller-supplied proxy target.
 *
 * @param {string} rawUrl - The URL from the request query
 * @returns {{ ok: true, url: URL } | { ok: false, status: number, message: string }}
 *
 * @example
 *   const check = assertProxyableUrl(req.query.url);
 *   if (!check.ok) return res.status(check.status).json({ success: false, message: check.message });
 */
const assertProxyableUrl = (rawUrl) => {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, status: 400, message: "Malformed URL" };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, status: 400, message: "Only http and https URLs can be proxied" };
  }

  const hostname = url.hostname.toLowerCase();

  if (isPrivateAddress(hostname)) {
    return { ok: false, status: 403, message: "Domain not allowed for proxy" };
  }

  const isAllowed = PROXY_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
  if (!isAllowed) {
    return { ok: false, status: 403, message: "Domain not allowed for proxy" };
  }

  return { ok: true, url };
};

// ---- FEATURE: CDN Request Headers ----
/**
 * Headers the stream CDNs require on a proxied fetch.
 *
 * @returns {object} Referer/Origin pair for the configured player origin
 */
const streamRefererHeaders = () => ({
  "Referer": STREAM_REFERER,
  "Origin": new URL(STREAM_REFERER).origin,
});

export { assertProxyableUrl, streamRefererHeaders };

// ══════════════════════════════════════════════════════════════ END: streamProxy.helper.js
