/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — embedProviders.extractor.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Resolves external IDs (MAL/AniList) for an anime and builds
 *   iframe-ready direct embed URLs for Megavid, AniXo and MegaPlay.
 *   MAL ID comes from the site's episode list (data-mal); AniList ID
 *   is looked up via the public AniList GraphQL API (cached).
 *   No provider scraping — pure URL construction.
 *
 * @exports
 *   resolveExternalIds, resolveAnilistIdFromMal, buildEpisodeEmbeds
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import { EMBED_PROVIDERS } from "../configs/embedProviders.config.js";
import { extractEpisodeList } from "./episodeList.extractor.js";
import { getCache, setCache, TTL } from "../helper/cache.helper.js";
// NOTE: The MAL→AniList lookup lives in the shared AniList client so the
// /api/anilist/* endpoints and the embed builders reuse one cached transport
import { resolveAnilistIdFromMal } from "../helper/anilist.helper.js";

// ══════════════════════════════════════════════════════════════
// ANILIST LOOKUP
// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════
// EXTERNAL ID RESOLUTION
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Resolve MAL + AniList IDs for an anime slug ----
/**
 * Uses the site's episode list (data-mal attribute) to get the MAL ID,
 * then looks up the AniList ID. Cached per slug.
 *
 * @param {string} slugOrId - Anime slug or numeric internal ID
 * @returns {Promise<{animeId: number, malId: string|null, anilistId: string|null, slug: string}>}
 *
 * @example
 *   const ids = await resolveExternalIds("one-piece-odmau");
 *   // { animeId: 1642, malId: "21", anilistId: "21", slug: "one-piece-odmau" }
 */
const resolveExternalIds = async (slugOrId) => {
  const cacheKey = `ext_ids_${slugOrId}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  // NOTE: One watch-page + one AJAX round-trip yields both the internal
  // animeId and the MAL ID (every episode anchor carries data-mal)
  const episodeData = await extractEpisodeList(slugOrId);
  const animeId = episodeData?.animeId || 0;

  // NOTE: Dedup — every episode shares the same series-level MAL ID;
  // take the first non-empty value and stop (no need to scan 1000+ eps)
  let malId = null;
  const episodes = episodeData?.episodes || [];
  for (const ep of episodes) {
    if (ep?.mal_id) { malId = String(ep.mal_id); break; }
  }

  let anilistId = null;
  if (malId) anilistId = await resolveAnilistIdFromMal(malId);

  const result = { animeId, malId, anilistId, slug: slugOrId };
  // NOTE: Only cache resolved slugs — failed lookups (dead slug, upstream
  // block) should be retried on the next request instead of sticking for 60min
  if (animeId || malId) setCache(cacheKey, result, TTL.ids);
  return result;
};

// ══════════════════════════════════════════════════════════════
// EMBED URL BUILDER
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Build direct embed URLs for an episode ----
/**
 * Builds iframe-ready embed URLs for the requested providers.
 * Accepts a slug (IDs resolved automatically) or direct mal/anilist IDs.
 *
 * @param {object} options
 * @param {string} [options.slug] - Anime slug for ID resolution
 * @param {number|string} [options.episode=1] - Episode number
 * @param {string} [options.lang="sub"] - "sub" or "dub"
 * @param {string[]|null} [options.providers=null] - Provider filter (null = all)
 * @param {string|number|null} [options.malId=null] - Direct MAL ID (skips slug lookup)
 * @param {string|number|null} [options.anilistId=null] - Direct AniList ID
 * @returns {Promise<Object>} { slug, episode, lang, ids, providers[], unavailable[] }
 *
 * @example
 *   const embeds = await buildEpisodeEmbeds({ slug: "one-piece-odmau", episode: 1150 });
 *   embeds.providers.forEach(p => console.log(p.id, p.url));
 */
const buildEpisodeEmbeds = async ({ slug, episode, lang = "sub", providers = null, malId = null, anilistId = null }) => {
  // NOTE: Sanitize inputs — episode must be a positive integer, lang is
  // clamped to the two values the providers actually accept
  const safeEpisode = Math.max(1, parseInt(episode, 10) || 1);
  const safeLang = lang === "dub" ? "dub" : "sub";

  let resolvedMal = malId ? String(malId) : null;
  let resolvedAnilist = anilistId ? String(anilistId) : null;
  let animeId = 0;
  let resolvedSlug = slug || null;

  // TIP: Direct-ID fast path — clients that already hold mal/anilist IDs
  // (e.g. AniList-powered frontends) skip the slug scrape entirely; the
  // slug lookup only runs when at least one ID is still missing
  if ((!resolvedMal || !resolvedAnilist) && slug) {
    const ids = await resolveExternalIds(slug);
    animeId = ids.animeId || 0;
    resolvedSlug = ids.slug || slug;
    if (!resolvedMal) resolvedMal = ids.malId || null;
    if (!resolvedAnilist) resolvedAnilist = ids.anilistId ? String(ids.anilistId) : null;
  }

  if (!resolvedMal && !resolvedAnilist) {
    return {
      slug: resolvedSlug,
      episode: safeEpisode,
      lang: safeLang,
      ids: { animeId, malId: null, anilistId: null },
      providers: [],
      unavailable: Object.values(EMBED_PROVIDERS).map((p) => ({
        id: p.id,
        name: p.name,
        reason: "No MAL or AniList ID available for this anime",
      })),
    };
  }

  const wanted = providers && providers.length
    ? providers.map((p) => String(p).toLowerCase())
    : Object.keys(EMBED_PROVIDERS);

  const built = [];
  const unavailable = [];

  // NOTE: State-machine-lite loop — each provider either builds a URL
  // ("built") or records why it can't ("unavailable"); the client always
  // gets a complete picture instead of silently missing providers
  for (const providerId of wanted) {
    const provider = EMBED_PROVIDERS[providerId];
    if (!provider) {
      unavailable.push({ id: providerId, name: providerId, reason: "Unknown provider" });
      continue;
    }
    const url = provider.build({
      malId: resolvedMal,
      anilistId: resolvedAnilist,
      episode: safeEpisode,
      lang: safeLang,
    });
    if (url) {
      built.push({
        id: provider.id,
        name: provider.name,
        url,
        iframeReady: true,
        origin: provider.origin,
      });
    } else {
      unavailable.push({
        id: provider.id,
        name: provider.name,
        reason: `Requires ${provider.requires.join(" or ")}`,
      });
    }
  }

  return {
    slug: resolvedSlug,
    episode: safeEpisode,
    lang: safeLang,
    ids: { animeId, malId: resolvedMal, anilistId: resolvedAnilist },
    providers: built,
    unavailable,
  };
};

export { resolveExternalIds, resolveAnilistIdFromMal, buildEpisodeEmbeds };

// ══════════════════════════════════════════════════════════════ END: embedProviders.extractor.js
