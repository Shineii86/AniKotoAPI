/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — system.routes.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Operational routes: health check, API statistics, cache statistics,
 *   mirror status/reset, proxy status and the OpenAPI document.
 *   Extracted from the former monolithic apiRoutes.js.
 *
 * @exports
 *   systemRoutes - Function that registers the system routes
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import { createRequire } from "module";
import { getMirrorStatus, resetMirrorCache } from "../helper/mirror.helper.js";
import { getCacheStats } from "../helper/cache.helper.js";
import { getProxyStatus } from "../helper/proxy.helper.js";
import { buildOpenApiSpec, OPENAPI_PATH_COUNT } from "../configs/openapi.config.js";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json");

// ══════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: System route registration ----
/**
 * Registers the operational endpoints. `metrics` is supplied by the
 * orchestrator so health/stats can report live counters without the
 * system module owning the request-counter state.
 *
 * @param {object} app - Express application instance
 * @param {object} ctx
 * @param {Function} ctx.jsonError - Helper to return error JSON
 * @param {Function} ctx.getMetrics - Returns { startTime, requestCount, errorCount }
 *
 * @example
 *   systemRoutes(app, { jsonError, getMetrics });
 */
const systemRoutes = (app, { jsonError, getMetrics }) => {
  // ══════════════════════════════════════════════════════════════
  // HEALTH & STATS
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Health check endpoint ----
  app.get("/api/health", (req, res) => {
    const { startTime } = getMetrics();
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    res.json({
      success: true,
      results: {
        status: "healthy",
        version: version,
        uptime: `${hours}h ${minutes}m ${seconds}s`,
        uptimeSeconds: uptime,
        timestamp: new Date().toISOString(),
        node: process.version,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
        },
      },
    });
  });

  // ---- FEATURE: Cache & API statistics ----
  app.get("/api/stats", (req, res) => {
    const { startTime, requestCount, errorCount } = getMetrics();
    const uptime = Math.floor((Date.now() - startTime) / 1000);

    res.json({
      success: true,
      results: {
        uptime: uptime + "s",
        requests: {
          total: requestCount,
          errors: errorCount,
          successRate: requestCount > 0
            ? ((1 - errorCount / requestCount) * 100).toFixed(1) + "%"
            : "100%",
        },
        cache: {
          type: "in-memory",
          ttl: "5 minutes",
          description: "Map-based cache with TTL expiration and ?refresh=1 bypass",
        },
        endpoints: 42,
        openapiPaths: OPENAPI_PATH_COUNT,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ---- FEATURE: Mirror status and health check ----
  app.get("/api/mirrors", async (req, res) => {
    try {
      const status = await getMirrorStatus();
      res.json({ success: true, results: status });
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ---- FEATURE: Cache statistics ----
  app.get("/api/cache/stats", (req, res) => {
    const stats = getCacheStats();
    res.json({ success: true, results: stats });
  });

  // ---- FEATURE: Reset mirror cache ----
  app.post("/api/mirrors/reset", (req, res) => {
    resetMirrorCache();
    // NOTE: `results` keeps the response shape consistent with every other
    // endpoint ({ success, results, ... }) so generic clients don't special-case it
    res.json({ success: true, message: "Mirror cache reset", results: { reset: true } });
  });

  // ---- FEATURE: Proxy status (ScraperAPI / FlareSolverr) ----
  app.get("/api/proxy/status", (req, res) => {
    const status = getProxyStatus();
    res.json({ success: true, results: status });
  });

  // ---- FEATURE: OpenAPI specification ----
  app.get("/api/openapi", (req, res) => {
    res.json({ success: true, ...buildOpenApiSpec(version) });
  });
};

export { systemRoutes };

// ══════════════════════════════════════════════════════════════ END: system.routes.js
