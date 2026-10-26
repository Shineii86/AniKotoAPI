/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — category.route.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Defines category-based API routes for genre, type, and status
 *   filtering. Each route transforms its params into a unified
 *   category format before delegating to the category controller.
 *
 * @exports
 *   categoryRoutes - Function that registers category routes on the Express app
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import { getCategory } from "../controllers/category.controller.js";

// ══════════════════════════════════════════════════════════════
// CATEGORY ROUTES
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Category route registration function ----
/**
 * Registers genre, type, and status category routes on the Express app.
 * Each route maps to the unified getCategory controller with the
 * appropriate category path prefix.
 *
 * @param {object} app - Express application instance
 * @param {Function} jsonResponse - Helper to wrap data in success JSON
 * @param {Function} jsonError - Helper to return error JSON
 *
 * @example
 *   categoryRoutes(app, jsonResponse, jsonError);
 */
const categoryRoutes = (app, jsonResponse, jsonError) => {
  // ══════════════════════════════════════════════════════════════
  // GENRE ROUTE
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Anime filtered by genre ----
  // NOTE: The genre param is appended to 'genre/' to form the full category path
  app.get("/api/genre/:genre", async (req, res, next) => {
    req.params.category = `genre/${req.params.genre}`;
    try {
      await getCategory(req, res, next);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // TYPE ROUTE
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Anime filtered by type (TV, Movie, OVA, etc.) ----
  // NOTE: The type param is appended to 'type/' to form the full category path
  app.get("/api/type/:type", async (req, res, next) => {
    req.params.category = `type/${req.params.type}`;
    try {
      await getCategory(req, res, next);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // STATUS ROUTE
  // ══════════════════════════════════════════════════════════════

  // ---- FEATURE: Anime filtered by airing status ----
  // NOTE: The status param is appended to 'status/' to form the full category path
  app.get("/api/status/:status", async (req, res, next) => {
    req.params.category = `status/${req.params.status}`;
    try {
      await getCategory(req, res, next);
    } catch (error) {
      jsonError(res, error.message, error.status || 500);
    }
  });
};

export { categoryRoutes };

// ══════════════════════════════════════════════════════════════ END: category.route.js