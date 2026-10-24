/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — anilist.helper.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Thin, cached client for the public AniList GraphQL API. Powers the
 *   /api/anilist/* enrichment endpoints, the MAL → AniList ID lookup used
 *   by the embed providers, and the externalIds block on /api/info.
 *   AniList is a stable JSON API (no Cloudflare scraping), so responses are
 *   cached with per-purpose TTLs.
 *
 * @exports
 *   anilistQuery, resolveAnilistIdFromMal, getAnilistMedia, getAnilistSeason,
 *   ANILIST_SEASONS
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import axios from "axios";
import { getCache, setCache, TTL } from "./cache.helper.js";

// ══════════════════════════════════════════════════════════════
// CLIENT CONFIGURATION
// ══════════════════════════════════════════════════════════════

const ANILIST_GRAPHQL = "https://graphql.anilist.co";

// ---- FEATURE: Valid AniList season names ----
const ANILIST_SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"];

// ---- FEATURE: MAL → AniList ID lookup query ----
const MAL_TO_ANILIST_QUERY = `query ($idMal: Int!) { Media(idMal: $idMal, type: ANIME) { id idMal } }`;

// ---- FEATURE: Full anime metadata query ----
const MEDIA_QUERY = `query ($id: Int!) {
  Media(id: $id, type: ANIME) {
    id idMal format status episodes duration season seasonYear
    description(asHtml: false) genres synonyms meanScore averageScore popularity favourites
    startDate { year month day }
    endDate { year month day }
    bannerImage
    coverImage { extraLarge large medium color }
    countryOfOrigin isAdult source
    studios(isMain: true) { nodes { id name } }
    nextAiringEpisode { episode airingAt }
    characters(page: 1, perPage: 12, sort: [ROLE, RELEVANCE, ID]) {
      edges { role node { id name { full native } image { large } } }
    }
    relations { edges { relationType node { id idMal format type title { romaji english } coverImage { large } averageScore episodes } } }
    recommendations(page: 1, perPage: 8) { nodes { media { id idMal title { romaji english } coverImage { large } averageScore episodes } } }
  }
}`;

// ---- FEATURE: Seasonal chart query ----
const SEASON_QUERY = `query ($season: MediaSeason, $year: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { currentPage hasNextPage total }
    media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC) {
      id idMal format status episodes averageScore popularity
      title { romaji english native }
      coverImage { large color }
      bannerImage genres startDate { year month day }
    }
  }
}`;

// ══════════════════════════════════════════════════════════════
// RAW GRAPHQL TRANSPORT
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Cached GraphQL POST ----
/**
 * Executes a GraphQL query against AniList with a short timeout.
 * Only successful responses are cached — transient failures (429/5xx) must
 * not poison the cache window.
 *
 * @param {string} query - GraphQL document
 * @param {object} variables - Query variables
 * @param {object} [options]
 * @param {string} [options.cacheKey] - Cache key; omit to skip caching
 * @param {number} [options.ttl=TTL.info] - Cache TTL in ms
 * @returns {Promise<object>} The GraphQL `data` payload
 * @throws {Error} When AniList returns an error or is unreachable
 *
 * @example
 *   const data = await anilistQuery(MAL_TO_ANILIST_QUERY, { idMal: 21 });
 */
const anilistQuery = async (query, variables = {}, { cacheKey, ttl = TTL.info } = {}) => {
  if (cacheKey) {
    const cached = getCache(cacheKey);
    if (cached) return cached;
  }

  let data;
  try {
    ({ data } = await axios.post(
      ANILIST_GRAPHQL,
      { query, variables },
      {
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        timeout: 10000,
      }
    ));
  } catch (error) {
    // NOTE: AniList answers 404 for media that does not exist — normalise it
    // so controllers can map "not found" to 404 instead of a generic 502
    if (error.response?.status === 404) {
      throw new Error("Anime not found on AniList");
    }
    throw new Error(error.message || "AniList request failed");
  }

  // NOTE: Response nests under data.data — axios unwraps the HTTP body once,
  // so one more .data access reaches the GraphQL envelope
  if (data?.errors?.length) {
    throw new Error(data.errors[0]?.message || "AniList GraphQL error");
  }
  const payload = data?.data;
  if (!payload) throw new Error("AniList returned an empty payload");

  if (cacheKey) setCache(cacheKey, payload, ttl);
  return payload;
};

// ══════════════════════════════════════════════════════════════
// LOOKUPS
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: MAL ID → AniList ID lookup (cached) ----
/**
 * Resolves an AniList media ID from a MAL ID via the public GraphQL API.
 * Results are cached for TTL.ids (60min) — IDs never change per anime.
 *
 * @param {string|number} malId - MyAnimeList ID
 * @returns {Promise<string|null>} AniList ID or null on failure
 *
 * @example
 *   await resolveAnilistIdFromMal(21); // "21" (One Piece)
 */
const resolveAnilistIdFromMal = async (malId) => {
  // NOTE: Cache-first — AniList IDs never change per MAL ID, so a hit here
  // avoids a GraphQL round-trip on every embed request (TTL.ids = 60min)
  const cacheKey = `anilist_from_mal_${malId}`;
  try {
    const payload = await anilistQuery(
      MAL_TO_ANILIST_QUERY,
      { idMal: parseInt(malId, 10) },
      { cacheKey, ttl: TTL.ids }
    );
    return payload?.Media?.id || null;
  } catch {
    // TIP: Never throw here — a missing AniList ID only disables AniXo,
    // MegaPlay/Megavid can still build URLs from the MAL ID alone
    return null;
  }
};

// ---- FEATURE: Full AniList metadata for an anime ----
/**
 * Fetches rich metadata (synopsis, score, genres, characters, relations and
 * recommendations) for an AniList ID. Cached for TTL.info (10min).
 *
 * @param {number|string} id - AniList media ID
 * @returns {Promise<object>} Normalised media object
 * @throws {Error} When the ID does not exist on AniList
 *
 * @example
 *   const media = await getAnilistMedia(21);
 *   // { id: 21, title: { romaji: "ONE PIECE" }, genres: [...] }
 */
const getAnilistMedia = async (id) => {
  const numericId = parseInt(id, 10);
  if (!Number.isInteger(numericId) || numericId < 1) {
    throw new Error("Invalid AniList ID");
  }
  const payload = await anilistQuery(MEDIA_QUERY, { id: numericId }, {
    cacheKey: `anilist_media_${numericId}`,
    ttl: TTL.info,
  });
  return payload.Media;
};

// ---- FEATURE: Seasonal chart ----
/**
 * Returns the most popular anime for a given season/year from AniList.
 * Defaults to the current season when season/year are omitted.
 * Cached for TTL.schedule (30min) per season/page combination.
 *
 * @param {object} [options]
 * @param {string} [options.season] - WINTER | SPRING | SUMMER | FALL
 * @param {number} [options.year] - Season year (1940–2100)
 * @param {number} [options.page=1] - Page number (1–500)
 * @param {number} [options.perPage=25] - Items per page (1–50)
 * @returns {Promise<{season, year, page, perPage, pageInfo, media[]}>}
 * @throws {Error} When season/year/page are out of range
 *
 * @example
 *   const chart = await getAnilistSeason({ season: "WINTER", year: 2026 });
 */
const getAnilistSeason = async ({ season, year, page = 1, perPage = 25 } = {}) => {
  const now = new Date();
  // NOTE: AniList seasons switch on the 1st of Jan/Apr/Jul/Oct
  const currentSeason = ANILIST_SEASONS[Math.floor(now.getMonth() / 3)];

  const safeSeason = String(season || currentSeason).toUpperCase();
  if (!ANILIST_SEASONS.includes(safeSeason)) {
    throw new Error(`Invalid season (expected one of ${ANILIST_SEASONS.join(", ")})`);
  }

  const safeYear = year === undefined || year === null || year === ""
    ? now.getFullYear()
    : parseInt(year, 10);
  if (!Number.isInteger(safeYear) || safeYear < 1940 || safeYear > 2100) {
    throw new Error("Invalid year (expected an integer between 1940 and 2100)");
  }

  const safePage = parseInt(page, 10) || 1;
  const safePerPage = Math.min(Math.max(parseInt(perPage, 10) || 25, 1), 50);

  const payload = await anilistQuery(
    SEASON_QUERY,
    { season: safeSeason, year: safeYear, page: safePage, perPage: safePerPage },
    {
      cacheKey: `anilist_season_${safeSeason}_${safeYear}_${safePage}_${safePerPage}`,
      ttl: TTL.schedule,
    }
  );

  return {
    season: safeSeason,
    year: safeYear,
    page: safePage,
    perPage: safePerPage,
    pageInfo: payload.Page?.pageInfo || null,
    media: payload.Page?.media || [],
  };
};

export {
  anilistQuery,
  resolveAnilistIdFromMal,
  getAnilistMedia,
  getAnilistSeason,
  ANILIST_SEASONS,
  ANILIST_GRAPHQL,
};

// ══════════════════════════════════════════════════════════════ END: anilist.helper.js
