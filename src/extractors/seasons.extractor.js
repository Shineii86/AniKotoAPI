/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — seasons.extractor.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Extracts season information for a specific anime via the
 *   upstream /api/seasons/{animeId} JSON-AJAX endpoint and
 *   parses the returned HTML fragment into a clean season list.
 *
 * @exports
 *   extractSeasons
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import * as cheerio from "cheerio";
import { fetchWithMirror } from "../helper/mirror.helper.js";

// ══════════════════════════════════════════════════════════════
// SEASONS EXTRACTOR
// ══════════════════════════════════════════════════════════════

// NOTE: /api/seasons/ answers 500 unless the request is flagged as XHR
// and carries the site origin as Referer
const SEASON_HEADERS = {
  "X-Requested-With": "XMLHttpRequest",
  Referer: "https://anikototv.to/",
};

// ---- FEATURE: Anime ID Resolution ----
/**
 * Resolves a slug (or passes through a numeric ID) to the upstream
 * numeric animeId used by the /api/seasons/ endpoint.
 *
 * @param {string|number} slugOrId - Anime slug or numeric ID
 * @returns {Promise<{animeId: number, slug: string|null}>}
 */
const resolveSeasonsTarget = async (slugOrId) => {
  const raw = String(slugOrId ?? "").trim();

  // NOTE: Numeric input is already a valid upstream animeId
  if (/^\d+$/.test(raw)) {
    return { animeId: parseInt(raw, 10), slug: null };
  }

  // NOTE: Slug form needs one watch-page fetch to read #watch-main[data-id]
  const { data } = await fetchWithMirror(`/watch/${raw}`, { headers: SEASON_HEADERS });
  const $ = cheerio.load(typeof data === "string" ? data : String(data));
  const animeId = parseInt($("#watch-main").attr("data-id"), 10);

  if (!animeId) {
    const err = new Error(`Anime not found: ${raw}`);
    err.status = 404;
    throw err;
  }

  return { animeId, slug: raw };
};

// ---- FEATURE: Season Information Extraction ----
/**
 * Fetches and parses season information for an anime.
 *
 * Uses the upstream AJAX endpoint GET {base}api/seasons/{animeId}
 * which returns { status, result } where result is an HTML fragment
 * (or false when the anime has no season split).
 *
 * @param {string|number} slugOrId - The anime slug or numeric ID
 * @returns {Promise<Object>} Object with animeId, slug, totalSeasons, seasons array
 *
 * @example
 *   const seasons = await extractSeasons("naruto-6rmxy");
 *   console.log(seasons.totalSeasons);
 */
const extractSeasons = async (slugOrId) => {
  const { animeId, slug } = await resolveSeasonsTarget(slugOrId);

  const { data } = await fetchWithMirror(`/api/seasons/${animeId}`, {
    headers: SEASON_HEADERS,
  });

  // NOTE: Upstream replies { status:200, result:"<html>" } or { status:200, result:false }
  let payload = null;
  try {
    payload = JSON.parse(typeof data === "string" ? data : String(data));
  } catch {
    payload = null;
  }

  const fragment =
    payload && payload.status === 200 &&
    typeof payload.result === "string" && payload.result.trim().length > 2
      ? payload.result
      : "";

  const $ = cheerio.load(fragment);
  const seasons = [];
  const seen = new Set();

  $("#w-seasons .swiper-slide.season, .seasons .swiper-slide.season, #w-seasons .item").each((_, el) => {
    const node = $(el);
    const link = node.find("a").first();
    const href = link.attr("href") || "";
    const title = node.find(".name, .title").first().text().trim() || link.text().trim() || "";
    const style = link.attr("style") || node.attr("style") || "";
    const poster =
      (style.match(/url\((['"]?)([^'")]+)\1\)/) || [])[2] ||
      node.find("img").attr("src") || "";
    const seasonSlug = href.split("/watch/").pop().split(/[?#]/)[0] || "";

    if (title && seasonSlug && !seen.has(seasonSlug)) {
      seen.add(seasonSlug);
      seasons.push({
        title,
        slug: seasonSlug,
        poster,
        url: href,
        active: node.hasClass("active"),
      });
    }
  });

  return {
    animeId,
    slug: slug ?? null,
    totalSeasons: seasons.length,
    seasons,
  };
};

export { extractSeasons };
// ══════════════════════════════════════════════════════════════ END: seasons.extractor.js
