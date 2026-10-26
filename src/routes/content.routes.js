/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — content.routes.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Content routes: homepage, anime info, search, episode lists, schedule,
 *   filter, seasons, watch order and the A-Z listing. Extracted from the
 *   former monolithic apiRoutes.js so each route group can be read and
 *   changed in isolation.
 *
 * @exports
 *   contentRoutes - Function that registers the content routes
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import { getHomeInfo } from "../controllers/homeInfo.controller.js";
import { getAnimeInfo } from "../controllers/animeInfo.controller.js";
import { getSearchResults, getSearchSuggestions } from "../controllers/search.controller.js";
import { getEpisodeList } from "../controllers/episodeList.controller.js";
import { getLatestEpisode } from "../controllers/episodeLatest.controller.js";
import { getEpisodeListAjax } from "../controllers/episodeListAjax.controller.js";
import { getSchedule } from "../controllers/schedule.controller.js";
import { getFilter } from "../controllers/filter.controller.js";
import { getSeasons } from "../controllers/seasons.controller.js";
import { getWatchOrder } from "../controllers/watchOrder.controller.js";
import { getAzList } from "../controllers/azList.controller.js";
import {
  validateSlugParam,
  validateLetterParam,
  validateQueryParam,
} from "../middleware/validation.middleware.js";
import { validateSlug, validateQueryWord } from "../helper/validation.helper.js";

// ══════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Content route registration ----
/**
 * Registers homepage, info, search, episodes, schedule and catalogue routes.
 * Path parameters are validated (400 on traversal/junk) before the
 * controller runs, so no unvalidated value is ever passed upstream.
 *
 * @param {object} app - Express application instance
 * @param {object} ctx
 * @param {Function} ctx.jsonResponse - Helper to wrap data in success JSON
 * @param {Function} ctx.jsonError - Helper to return error JSON
 *
 * @example
 *   contentRoutes(app, { jsonResponse, jsonError });
 */
const contentRoutes = (app, { jsonError }) => {
  // ══════════════════════════════════════════════════════════════
  // HOME
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Homepage data endpoint ----
  app.get("/api/", async (req, res, next) => {
    try {
      await getHomeInfo(req, res, next);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // ANIME INFO
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Anime detail information by slug ----
  app.get(
    "/api/info",
    validateQueryParam("id", validateSlug, "slug"),
    validateQueryParam("slug", validateSlug, "slug"),
    async (req, res, next) => {
      try {
        await getAnimeInfo(req, res, next);
      } catch (error) {
        jsonError(res, error.message, error.status || 500);
      }
    }
  );

  // ══════════════════════════════════════════════════════════════
  // SEARCH
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Full search results with pagination ----
  app.get(
    "/api/search",
    validateQueryParam("keyword", validateQueryWord, "keyword"),
    async (req, res, next) => {
      try {
        await getSearchResults(req, res, next);
      } catch (error) {
        jsonError(res, error.message, error.status || 500);
      }
    }
  );

  // ---- FEATURE: Search autocomplete suggestions ----
  app.get(
    "/api/search/suggest",
    validateQueryParam("keyword", validateQueryWord, "keyword"),
    async (req, res, next) => {
      try {
        await getSearchSuggestions(req, res, next);
      } catch (error) {
        jsonError(res, error.message, error.status || 500);
      }
    }
  );

  // ══════════════════════════════════════════════════════════════
  // EPISODES
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Latest episode checker (literal path must precede :id) ----
  app.get(
    "/api/episodes/latest",
    validateQueryParam("slug", validateSlug, "slug"),
    async (req, res, next) => {
      try {
        await getLatestEpisode(req, res, next);
      } catch (error) {
        jsonError(res, error.message, error.status || 500);
      }
    }
  );

  // ---- FEATURE: Episode list for anime by ID ----
  app.get("/api/episodes/:id", validateSlugParam("id"), async (req, res, next) => {
    try {
      await getEpisodeList(req, res, next);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ---- FEATURE: AJAX-loaded episode list (additional data) ----
  app.get("/api/episodes-ajax/:id", validateSlugParam("id"), async (req, res, next) => {
    try {
      await getEpisodeListAjax(req, res, next);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // SCHEDULE
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Anime airing schedule by date ----
  app.get("/api/schedule", async (req, res, next) => {
    try {
      await getSchedule(req, res, next);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // FILTER
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Advanced filter/search by parameters ----
  app.get("/api/filter", async (req, res, next) => {
    try {
      await getFilter(req, res, next);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // SEASONS & WATCH ORDER
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Season information for anime ----
  app.get("/api/seasons/:id", validateSlugParam("id"), async (req, res, next) => {
    try {
      await getSeasons(req, res, next);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ---- FEATURE: Recommended watch order for anime ----
  app.get("/api/watch-order/:id", validateSlugParam("id"), async (req, res, next) => {
    try {
      await getWatchOrder(req, res, next);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // A-Z LIST
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Alphabetical anime listing ----
  app.get("/api/az-list/:letter", validateLetterParam("letter"), async (req, res, next) => {
    try {
      await getAzList(req, res, next);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });
};

export { contentRoutes };

// ══════════════════════════════════════════════════════════════ END: content.routes.js
