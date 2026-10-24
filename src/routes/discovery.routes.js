/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — discovery.routes.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Discovery and catalogue routes: spotlight, trending, rankings, release
 *   lists, sidebar widgets, upcoming and completed anime. Extracted from the
 *   former monolithic apiRoutes.js.
 *
 * @exports
 *   discoveryRoutes - Function that registers the discovery routes
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import { getSpotlight } from "../controllers/spotlight.controller.js";
import { getTrending } from "../controllers/trending.controller.js";
import { getTopTen } from "../controllers/topten.controller.js";
import { getSuggestions } from "../controllers/suggestion.controller.js";
import { getRandom } from "../controllers/random.controller.js";
import { getPopular } from "../controllers/popular.controller.js";
import { getNewRelease, getNewlyAdded, getLatestUpdated } from "../controllers/newRelease.controller.js";
import { getTrendingSidebar } from "../controllers/trendingSidebar.controller.js";
import { getUpcomingAnime } from "../controllers/upcomingAnime.controller.js";
import { getTopAnimeRankings } from "../controllers/topAnimeRankings.controller.js";
import { getRecentlyUpdatedTabs } from "../controllers/recentlyUpdatedTabs.controller.js";
import { getCompletedAnime } from "../controllers/completedAnime.controller.js";

// ══════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Discovery route registration ----
/**
 * Registers the list/ranking routes. Every handler follows the same
 * controller-in-try/catch pattern as the rest of the API.
 *
 * @param {object} app - Express application instance
 * @param {object} ctx
 * @param {Function} ctx.jsonError - Helper to return error JSON
 *
 * @example
 *   discoveryRoutes(app, { jsonResponse, jsonError });
 */
const discoveryRoutes = (app, { jsonError }) => {
  // ══════════════════════════════════════════════════════════════
  // DISCOVERY / HOMEPAGE SECTIONS
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Spotlight/featured anime carousel ----
  app.get("/api/spotlight", async (req, res, next) => {
    try {
      await getSpotlight(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ---- FEATURE: Currently trending anime ----
  app.get("/api/trending", async (req, res, next) => {
    try {
      await getTrending(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ---- FEATURE: Top 10 ranked anime ----
  app.get("/api/top-ten", async (req, res, next) => {
    try {
      await getTopTen(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ---- FEATURE: Auto-complete suggestions by keyword ----
  app.get("/api/suggestions", async (req, res, next) => {
    try {
      await getSuggestions(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ---- FEATURE: Random anime recommendation ----
  app.get("/api/random", async (req, res, next) => {
    try {
      await getRandom(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ---- FEATURE: Most popular anime list ----
  app.get("/api/most-popular", async (req, res, next) => {
    try {
      await getPopular(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // RELEASE LISTS
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Recently released episodes ----
  app.get("/api/new-release", async (req, res, next) => {
    try {
      await getNewRelease(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ---- FEATURE: Newly added anime series ----
  app.get("/api/newly-added", async (req, res, next) => {
    try {
      await getNewlyAdded(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ---- FEATURE: Recently updated anime (sorted by update time) ----
  app.get("/api/latest-updated", async (req, res, next) => {
    try {
      await getLatestUpdated(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // SIDEBAR
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Trending sidebar widget data ----
  app.get("/api/trending-sidebar", async (req, res, next) => {
    try {
      await getTrendingSidebar(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // UPCOMING ANIME
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Upcoming anime releases ----
  app.get("/api/upcoming", async (req, res, next) => {
    try {
      await getUpcomingAnime(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // TOP ANIME RANKINGS
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Top anime rankings with sort (top/newest) ----
  app.get("/api/top-rankings", async (req, res, next) => {
    try {
      await getTopAnimeRankings(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // RECENTLY UPDATED (TAB FILTERED)
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Recently updated anime with tab filter (all/dub/sub) ----
  app.get("/api/recently-updated", async (req, res, next) => {
    try {
      await getRecentlyUpdatedTabs(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // COMPLETED ANIME
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Completed anime series ----
  app.get("/api/completed", async (req, res, next) => {
    try {
      await getCompletedAnime(req, res, next);
    } catch (error) {
      jsonError(res, error.message);
    }
  });
};

export { discoveryRoutes };

// ══════════════════════════════════════════════════════════════ END: discovery.routes.js
