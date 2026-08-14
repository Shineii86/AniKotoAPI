/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — proxy.helper.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Proxy helper for bypassing Cloudflare bot protection.
 *   Supports ScraperAPI (premium) and FlareSolverr (self-hosted).
 *   Automatically routes requests through proxy when direct requests fail.
 *
 * @exports
 *   fetchWithProxy, getProxyStatus
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import axios from "axios";
import { headers } from "../configs/header.config.js";

// ══════════════════════════════════════════════════════════════
// PROXY CONFIGURATION
// ══════════════════════════════════════════════════════════════

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const FLARESOLVERR_URL = process.env.FLARESOLVERR_URL;

// ScraperAPI endpoint
const SCRAPER_API_URL = "http://api.scraperapi.com";

// ══════════════════════════════════════════════════════════════
// PROXY STATUS
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Get proxy configuration status ----
/**
 * Returns current proxy configuration status
 * @returns {Object} Proxy status with enabled/disabled and available methods
 */
function getProxyStatus() {
  return {
    scraperApi: {
      enabled: !!SCRAPER_API_KEY,
      configured: !!SCRAPER_API_KEY,
    },
    flaresolverr: {
      enabled: !!FLARESOLVERR_URL,
      configured: !!FLARESOLVERR_URL,
      url: FLARESOLVERR_URL || null,
    },
    anyEnabled: !!SCRAPER_API_KEY || !!FLARESOLVERR_URL,
  };
}

// ══════════════════════════════════════════════════════════════
// SCRAPERAPI
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: ScraperAPI proxy fetch ----
/**
 * Fetch a URL through ScraperAPI (premium residential IPs)
 * @param {string} url - Target URL
 * @param {Object} options - Request options
 * @returns {Promise<{data: string, proxy: string}>}
 */
async function fetchViaScraperApi(url, options = {}) {
  const { timeout = 30000, returnType = "text" } = options;

  const params = {
    api_key: SCRAPER_API_KEY,
    url: url,
    render: "false",
  };

  const response = await axios.get(SCRAPER_API_URL, {
    params,
    timeout,
    responseType: returnType === "text" ? "text" : "json",
  });

  return {
    data: response.data,
    proxy: "scraperapi",
  };
}

// ══════════════════════════════════════════════════════════════
// FLARESOLVERR
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: FlareSolverr proxy fetch ----
/**
 * Fetch a URL through FlareSolverr (self-hosted browser)
 * @param {string} url - Target URL
 * @param {Object} options - Request options
 * @returns {Promise<{data: string, proxy: string}>}
 */
async function fetchViaFlareSolverr(url, options = {}) {
  const { timeout = 60000, returnType = "text" } = options;

  const response = await axios.post(
    `${FLARESOLVERR_URL}/v1`,
    {
      cmd: "request.get",
      url: url,
      maxTimeout: timeout,
    },
    {
      headers: { "Content-Type": "application/json" },
      timeout: timeout + 10000,
    }
  );

  if (response.data.status === "ok") {
    return {
      data: response.data.solution.response,
      proxy: "flaresolverr",
    };
  }

  throw new Error(`FlareSolverr error: ${response.data.message}`);
}

// ══════════════════════════════════════════════════════════════
// UNIFIED PROXY FETCH
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Fetch with automatic proxy fallback ----
/**
 * Fetch a URL with automatic proxy fallback when direct requests fail.
 * Tries direct first, then falls back to configured proxies.
 *
 * @param {string} url - Target URL
 * @param {Object} options - Request options
 * @param {Object} options.requestHeaders - Custom headers for direct request
 * @param {number} options.timeout - Request timeout (default: 15000ms)
 * @param {string} options.returnType - Response type: "text" or "json"
 * @returns {Promise<{data: string, proxy: string}>}
 */
async function fetchWithProxy(url, options = {}) {
  const {
    requestHeaders = headers,
    timeout = 15000,
    returnType = "text",
  } = options;

  // 1. Try direct request first
  try {
    const response = await axios.get(url, {
      headers: requestHeaders,
      timeout,
      responseType: returnType === "text" ? "text" : "json",
    });

    if (response.status === 200) {
      // Check if response is a valid result (not a Cloudflare block)
      const data = response.data;
      if (typeof data === "string" && data.includes("Just a moment...")) {
        throw new Error("Cloudflare challenge detected");
      }
      if (typeof data === "string" && data.includes("Checking your browser")) {
        throw new Error("Cloudflare challenge detected");
      }

      return { data, proxy: "direct" };
    }
  } catch (error) {
    // If ScraperAPI or FlareSolverr configured, try them
    if (!SCRAPER_API_KEY && !FLARESOLVERR_URL) {
      throw error;
    }
  }

  // 2. Try ScraperAPI if configured
  if (SCRAPER_API_KEY) {
    try {
      console.log(`[PROXY] Trying ScraperAPI for: ${url}`);
      return await fetchViaScraperApi(url, { timeout, returnType });
    } catch (error) {
      console.log(`[PROXY] ScraperAPI failed: ${error.message}`);
    }
  }

  // 3. Try FlareSolverr if configured
  if (FLARESOLVERR_URL) {
    try {
      console.log(`[PROXY] Trying FlareSolverr for: ${url}`);
      return await fetchViaFlareSolverr(url, { timeout, returnType });
    } catch (error) {
      console.log(`[PROXY] FlareSolverr failed: ${error.message}`);
    }
  }

  // 4. All methods failed — try direct one more time with higher timeout
  try {
    const response = await axios.get(url, {
      headers: requestHeaders,
      timeout: timeout * 2,
      responseType: returnType === "text" ? "text" : "json",
    });

    return { data: response.data, proxy: "direct-retry" };
  } catch (error) {
    throw new Error(`All fetch methods failed for ${url}: ${error.message}`);
  }
}

export { fetchWithProxy, getProxyStatus };

// ══════════════════════════════════════════════════════════════ END: proxy.helper.js
