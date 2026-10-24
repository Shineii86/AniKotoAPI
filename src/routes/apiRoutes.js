/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — apiRoutes.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Central API router. Mounts the request counter and global query
 *   validation, then delegates to the per-domain route modules:
 *
 *     content     → homepage, info, search, episodes, schedule, filter, A-Z
 *     stream      → watch, servers, stream resolve, embeds, SSRF-guarded proxies
 *     discovery   → spotlight, trending, rankings, releases, widgets
 *     enrichment  → AniList metadata & seasonal charts
 *     category    → genre / type / status
 *     system      → health, stats, mirrors, cache, OpenAPI
 *
 * @exports
 *   createApiRoutes - Function that registers all API routes on the Express app
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import { contentRoutes } from "./content.routes.js";
import { streamRoutes } from "./stream.routes.js";
import { discoveryRoutes } from "./discovery.routes.js";
import { enrichmentRoutes } from "./enrichment.routes.js";
import { categoryRoutes } from "./category.route.js";
import { systemRoutes } from "./system.routes.js";
import { validatePageQuery } from "../middleware/validation.middleware.js";

// ══════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Main API route registration function ----
/**
 * Registers all API routes on the Express app instance.
 * Each route delegates to a controller and uses the provided
 * jsonResponse/jsonError helpers for consistent output.
 *
 * @param {object} app - Express application instance
 * @param {Function} jsonResponse - Helper to wrap data in success JSON
 * @param {Function} jsonError - Helper to return error JSON
 *
 * @example
 *   createApiRoutes(app, jsonResponse, jsonError);
 */
const createApiRoutes = (app, jsonResponse, jsonError) => {
  // ══════════════════════════════════════════════════════════════
  // REQUEST COUNTER (must be before all routes)
  // ══════════════════════════════════════════════════════════════

  const startTime = Date.now();
  let requestCount = 0;
  let errorCount = 0;

  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      requestCount++;
      res.on("finish", () => {
        if (res.statusCode >= 400) errorCount++;
      });
    }
    next();
  });

  // ══════════════════════════════════════════════════════════════
  // GLOBAL QUERY VALIDATION (?page= must be a bounded integer)
  // ══════════════════════════════════════════════════════════════

  app.use("/api", validatePageQuery);

  // ══════════════════════════════════════════════════════════════
  // DOMAIN ROUTE GROUPS (order matters: literal paths before :params)
  // ══════════════════════════════════════════════════════════════

  const ctx = { jsonResponse, jsonError };

  contentRoutes(app, ctx);
  streamRoutes(app, ctx);
  discoveryRoutes(app, ctx);
  enrichmentRoutes(app, ctx);

  // NOTE: Category routes (genre, type, status) are registered separately
  categoryRoutes(app, jsonResponse, jsonError);

  systemRoutes(app, {
    ...ctx,
    // NOTE: Live counters stay in this closure so /health and /stats
    // report the values of the process that is actually serving them
    getMetrics: () => ({ startTime, requestCount, errorCount }),
  });
};

export { createApiRoutes };

// ══════════════════════════════════════════════════════════════ END: apiRoutes.js
