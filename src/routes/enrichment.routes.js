/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — enrichment.routes.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Enrichment routes backed by the public AniList GraphQL API. These are
 *   not scrape endpoints — they talk to a stable JSON API, so they stay
 *   fast and available even when the origin site is behind Cloudflare.
 *
 * @exports
 *   enrichmentRoutes - Function that registers the enrichment routes
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import { getAnilistAnime, getAnilistSeasonChart } from "../controllers/anilist.controller.js";

// ══════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Enrichment route registration ----
/**
 * Registers the AniList enrichment routes.
 * NOTE: `/anilist/season` must be registered before `/anilist/:id?` —
 * otherwise the literal path is swallowed by the parameterised route.
 *
 * @param {object} app - Express application instance
 * @param {object} ctx
 * @param {Function} ctx.jsonError - Helper to return error JSON
 *
 * @example
 *   enrichmentRoutes(app, { jsonResponse, jsonError });
 */
const enrichmentRoutes = (app, { jsonError }) => {
  // ══════════════════════════════════════════════════════════════
  // SEASONAL CHART (literal path — register before /anilist/:id)
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: AniList seasonal chart ----
  app.get("/api/anilist/season", async (req, res, next) => {
    try {
      await getAnilistSeasonChart(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // ANIME METADATA
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: AniList metadata by ID, or by MAL ID via ?mal= ----
  // NOTE: The optional :id segment lets MAL-first clients call
  // /api/anilist?mal=21 without inventing a placeholder path value
  app.get("/api/anilist/:id?", async (req, res, next) => {
    try {
      await getAnilistAnime(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });
};

export { enrichmentRoutes };

// ══════════════════════════════════════════════════════════════ END: enrichment.routes.js
