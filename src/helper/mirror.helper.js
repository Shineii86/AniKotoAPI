/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — mirror.helper.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Multi-mirror fallback helper for resilient scraping.
 *   Automatically tries alternative domains if primary is blocked/down.
 *   Caches working mirror per session for faster subsequent requests.
 *
 * @exports
 *   fetchWithMirror, getWorkingMirror, resetMirrorCache
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import axios from "axios";
import { headers } from "../configs/header.config.js";
import { getCache, setCache } from "./cache.helper.js";
import { fetchWithProxy, getProxyStatus } from "./proxy.helper.js";

// ══════════════════════════════════════════════════════════════
// MIRROR CONFIGURATION
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Mirror Domain Configuration ----
// Default mirrors with names and priority
const DEFAULT_MIRRORS = [
  { url: "https://anikototv.to", name: "Primary", priority: 1 },
  { url: "https://anikoto.cz", name: "Regional CZ", priority: 2 },
  { url: "https://anikoto.me", name: "Short TLD", priority: 3 },
  { url: "https://anikoto.net", name: "Network", priority: 4 },
  { url: "https://anikototv.se", name: "Nordic .se", priority: 5 },
];

// Parse custom mirrors from env or use defaults
function parseMirrors() {
  const envMirrors = process.env.MIRROR_DOMAINS;
  if (!envMirrors) return DEFAULT_MIRRORS;
  
  return envMirrors.split(",").map((url, index) => ({
    url: url.trim(),
    name: `Mirror ${index + 1}`,
    priority: index + 1
  }));
}

const ALL_MIRRORS = parseMirrors();
ALL_MIRRORS.sort((a, b) => a.priority - b.priority);

// Cache key for working mirror
const MIRROR_CACHE_KEY = "working_mirror";
const MIRROR_CACHE_TTL = parseInt(process.env.MIRROR_CACHE_TTL) || 3600000;

// ══════════════════════════════════════════════════════════════
// MIRROR STATE
// ══════════════════════════════════════════════════════════════

let workingMirror = null;
let failedMirrors = new Set();

// ══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Mirror Health Check ----
/**
 * Check if a mirror is accessible
 * @param {string} baseUrl - Mirror base URL
 * @returns {Promise<boolean>}
 */
async function checkMirror(baseUrl) {
  try {
    const response = await axios.get(`${baseUrl}/home`, {
      headers,
      timeout: 10000,
      maxRedirects: 5,
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// ---- FEATURE: Working Mirror Discovery ----
/**
 * Get the best available mirror
 * @returns {Promise<string>} Working mirror base URL
 */
async function getWorkingMirror() {
  // Check cache first
  const cached = getCache(MIRROR_CACHE_KEY);
  if (cached && !failedMirrors.has(cached)) {
    workingMirror = cached;
    return workingMirror;
  }

  // Try mirrors in priority order
  for (const mirror of ALL_MIRRORS) {
    if (failedMirrors.has(mirror.url)) continue;

    const isWorking = await checkMirror(mirror.url);
    if (isWorking) {
      workingMirror = mirror.url;
      setCache(MIRROR_CACHE_KEY, mirror.url, MIRROR_CACHE_TTL);
      console.log(`[MIRROR] Using: ${mirror.name} (${mirror.url})`);
      return mirror.url;
    } else {
      failedMirrors.add(mirror.url);
      console.log(`[MIRROR] Failed: ${mirror.name} (${mirror.url})`);
    }
  }

  // All mirrors failed, reset and try again
  failedMirrors.clear();
  workingMirror = ALL_MIRRORS[0].url;
  console.log(`[MIRROR] All failed, resetting to primary: ${workingMirror}`);
  return workingMirror;
}

// ---- FEATURE: Mirror Cache Reset ----
/**
 * Reset mirror cache and failed state
 */
function resetMirrorCache() {
  workingMirror = null;
  failedMirrors.clear();
  setCache(MIRROR_CACHE_KEY, null, 0);
  console.log("[MIRROR] Cache reset");
}

// ---- FEATURE: URL Builder ----
/**
 * Build URL with current mirror
 * @param {string} path - URL path
 * @param {string} baseUrl - Optional custom base URL
 * @returns {string} Full URL
 */
function buildUrl(path, baseUrl = workingMirror) {
  const base = baseUrl || ALL_MIRRORS[0].url;
  return `${base}${path}`;
}

// ---- FEATURE: Resilient Fetch with Mirror Fallback ----
/**
 * Fetch with automatic mirror fallback and proxy support
 * @param {string} path - URL path to fetch
 * @param {object} options - Additional options
 * @returns {Promise<{data: string, mirror: string, proxy: string}>}
 */
async function fetchWithMirror(path, options = {}) {
  const { 
    timeout = 15000, 
    retries = 2,
    returnType = "text",
    headers: customHeaders = {},
    useProxy = true,
  } = options;

  // Merge default headers with custom headers
  const requestHeaders = { ...headers, ...customHeaders };

  let lastError = null;

  // Try cached working mirror first
  const mirrorsToTry = [];
  
  if (workingMirror && !failedMirrors.has(workingMirror)) {
    mirrorsToTry.push(workingMirror);
  }

  // Add remaining mirrors
  for (const mirror of ALL_MIRRORS) {
    if (!mirrorsToTry.includes(mirror.url) && !failedMirrors.has(mirror.url)) {
      mirrorsToTry.push(mirror.url);
    }
  }

  // If all failed, reset and try all
  if (mirrorsToTry.length === 0) {
    failedMirrors.clear();
    mirrorsToTry.push(...ALL_MIRRORS.map(m => m.url));
  }

  // Try direct requests first
  for (const mirror of mirrorsToTry) {
    const url = buildUrl(path, mirror);
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await axios.get(url, {
          headers: requestHeaders,
          timeout,
          responseType: returnType === "text" ? "text" : "json",
        });

        if (response.status === 200) {
          // Check for Cloudflare challenge
          const data = response.data;
          if (typeof data === "string" && (
            data.includes("Just a moment...") ||
            data.includes("Checking your browser") ||
            data.includes("Enable JavaScript")
          )) {
            throw new Error("Cloudflare challenge detected");
          }

          // Check for upstream error
          let parsed = data;
          if (typeof data === "string") {
            try { parsed = JSON.parse(data); } catch { /* not JSON */ }
          }
          if (parsed && typeof parsed === "object" && parsed.status && Number(parsed.status) >= 400) {
            throw new Error(`Upstream error (${parsed.status}): ${parsed.result || "Bad request"}`);
          }

          // Update working mirror
          if (mirror !== workingMirror) {
            workingMirror = mirror;
            setCache(MIRROR_CACHE_KEY, mirror, MIRROR_CACHE_TTL);
            console.log(`[MIRROR] Switched to: ${mirror}`);
          }
          return { 
            data: response.data,
            mirror,
            proxy: "direct"
          };
        }

        // NOTE: 404 means endpoint doesn't exist, not mirror failure — don't retry
        if (response.status === 404) {
          throw new Error(`Endpoint not found: ${path}`);
        }
      } catch (error) {
        lastError = error;
        // NOTE: Don't retry on 404 — the endpoint simply doesn't exist on this mirror
        if (error.message?.includes("Endpoint not found")) {
          break;
        }
        if (attempt < retries) {
          // Wait before retry
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }

    // NOTE: Only mark mirror as failed for connection errors, not endpoint 404s
    if (!lastError.message?.includes("Endpoint not found")) {
      failedMirrors.add(mirror);
      console.log(`[MIRROR] Marked as failed: ${mirror}`);
    }
  }

  // All direct requests failed — try proxy if configured
  if (useProxy) {
    const proxyStatus = getProxyStatus();
    if (proxyStatus.anyEnabled) {
      console.log(`[MIRROR] All mirrors failed, trying proxy...`);
      try {
        const proxyResult = await fetchWithProxy(
          buildUrl(path, mirrorsToTry[0]),
          { requestHeaders, timeout: timeout * 2, returnType }
        );
        return {
          data: proxyResult.data,
          mirror: mirrorsToTry[0],
          proxy: proxyResult.proxy,
        };
      } catch (proxyError) {
        console.log(`[MIRROR] Proxy also failed: ${proxyError.message}`);
      }
    }
  }

  throw new Error(`All mirrors failed. Last error: ${lastError?.message}`);
}

// ---- FEATURE: Mirror Status Reporter ----
/**
 * Get mirror status for all domains
 * @returns {Promise<Array>}
 */
async function getMirrorStatus() {
  const status = [];
  
  for (const mirror of ALL_MIRRORS) {
    const start = Date.now();
    const isWorking = await checkMirror(mirror.url);
    const latency = Date.now() - start;
    
    status.push({
      name: mirror.name,
      url: mirror.url,
      priority: mirror.priority,
      status: isWorking ? "online" : "offline",
      latency: `${latency}ms`,
      isCurrent: mirror.url === workingMirror,
    });
  }
  
  return status;
}

export { 
  fetchWithMirror, 
  getWorkingMirror, 
  resetMirrorCache, 
  buildUrl,
  getMirrorStatus,
  getProxyStatus,
  ALL_MIRRORS
};
// ══════════════════════════════════════════════════════════════ END: mirror.helper.js
