/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — schedule.controller.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Controller for anime airing schedule. Returns anime episodes
 *   scheduled to air on a specific date in YYYY-MM-DD format.
 *   Defaults to today (server local time) when no date is given.
 *
 * @exports
 *   getSchedule - Express route handler for GET /api/schedule
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import { extractSchedule } from "../extractors/schedule.extractor.js";
import { getCache, setCache, TTL } from "../helper/cache.helper.js";
import { jsonError } from "../helper/response.helper.js";

// ══════════════════════════════════════════════════════════════
// CONTROLLER: SCHEDULE
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Date helpers ----
const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

// NOTE: Strict check — regex alone accepts 2026-13-45, so the parsed date
// must round-trip to the same year/month/day components
const isValidDate = (value) => {
  const match = DATE_REGEX.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
};

const todayLocal = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// ---- FEATURE: Anime airing schedule endpoint ----
/**
 * Handles GET /api/schedule requests. Returns anime episodes
 * scheduled for the specified date (defaults to today).
 *
 * @param {object} req - Express request object
 * @param {string} [req.query.date] - Date in YYYY-MM-DD format (default: today)
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Sends JSON response with schedule data
 *
 * @example
 *   GET /api/schedule?date=2024-01-15
 *   Response: { success: true, results: [{ time, title, ... }] }
 *
 * @throws {400} If 'date' is malformed or not a real calendar date
 */
const getSchedule = async (req, res, next) => {
  try {
    const date = req.query.date ?? todayLocal();

    if (!isValidDate(String(date))) {
      return jsonError(res, `Invalid date: ${date} (expected YYYY-MM-DD, e.g. 2026-10-24)`, 400);
    }

    const cacheKey = `schedule_${date}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, results: cached });
    }
    const data = await extractSchedule(date);
    setCache(cacheKey, data, TTL.schedule);
    res.json({ success: true, results: data });
  } catch (error) {
    next(error);
  }
};

export { getSchedule };

// ══════════════════════════════════════════════════════════════ END: schedule.controller.js