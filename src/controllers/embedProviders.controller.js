/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — embedProviders.controller.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Controller for direct embed provider URLs (Megavid, AniXo, MegaPlay).
 *   Returns iframe-ready player URLs that bypass Cloudflare entirely —
 *   no scraping of the source site's AJAX layer required when the client
 *   supplies mal/anilist IDs directly.
 *
 * @exports
 *   getEmbedProviders - Express route handler for GET /api/stream/embeds
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import { buildEpisodeEmbeds } from "../extractors/embedProviders.extractor.js";
import { EMBED_PROVIDER_IDS } from "../configs/embedProviders.config.js";
import { getCache, setCache, TTL } from "../helper/cache.helper.js";
import { jsonError } from "../helper/response.helper.js";

// ══════════════════════════════════════════════════════════════
// CONTROLLER: EMBED PROVIDERS
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Direct embed provider URLs for an episode ----
/**
 * Handles GET /api/stream/embeds requests. Builds iframe-ready embed
 * URLs for Megavid/AniXo/MegaPlay from a slug or direct external IDs.
 *
 * @param {object} req - Express request object
 * @param {string} [req.query.slug] - Anime slug (IDs resolved automatically)
 * @param {string} [req.query.ep] - Episode number (default 1)
 * @param {string} [req.query.lang] - "sub" or "dub" (default "sub")
 * @param {string} [req.query.provider] - Comma-separated provider filter
 * @param {string} [req.query.mal] - Direct MAL ID (skips slug lookup)
 * @param {string} [req.query.anilist] - Direct AniList ID
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Sends JSON response with iframe-ready embed URLs
 *
 * @example
 *   GET /api/stream/embeds?slug=one-piece-odmau&ep=1150&lang=sub
 *   GET /api/stream/embeds?mal=21&ep=1&provider=megavid
 *   Response: { success: true, results: { ids, providers: [{ id, name, url }] } }
 *
 * @throws {400} If no identifying parameter is provided or provider is unknown
 */
const getEmbedProviders = async (req, res, next) => {
  try {
    const { slug, ep, episode, lang, provider, mal, anilist } = req.query;

    // NOTE: Accept both ?ep= and ?episode=; lang must be exactly sub|dub —
    // silently coercing a typo to "sub" only hides client bugs
    const rawEp = ep ?? episode;
    if (rawEp !== undefined && !/^\d+$/.test(String(rawEp))) {
      return jsonError(res, `Invalid ep: ${rawEp} (expected a positive integer)`, 400);
    }
    const rawLang = lang !== undefined ? String(lang).toLowerCase() : "sub";
    if (rawLang !== "sub" && rawLang !== "dub") {
      return jsonError(res, `Invalid lang: ${lang} (expected sub or dub)`, 400);
    }

    const resolvedEp = parseInt(rawEp || "1", 10) || 1;
    const resolvedLang = rawLang;
    const requested = provider
      ? String(provider).split(",").map((p) => p.trim().toLowerCase()).filter(Boolean)
      : null;

    // NOTE: Validate providers before touching cache or upstream — a typo
    // should fail fast with the list of valid IDs, not build wrong URLs
    if (requested) {
      const unknown = requested.filter((p) => !EMBED_PROVIDER_IDS.includes(p));
      if (unknown.length) {
        return jsonError(res, `Unknown provider(s): ${unknown.join(", ")}. Valid: ${EMBED_PROVIDER_IDS.join(", ")}`, 400);
      }
    }

    if (!slug && !mal && !anilist) {
      return jsonError(res, "Provide 'slug', 'mal' or 'anilist' (plus optional 'ep' and 'lang')", 400);
    }

    // NOTE: Validate the numeric IDs themselves — "abc" must not be treated
    // as a real MAL/AniList id and silently probed upstream
    if (mal !== undefined && !/^\d+$/.test(String(mal))) {
      return jsonError(res, `Invalid mal: ${mal} (expected a numeric MAL ID)`, 400);
    }
    if (anilist !== undefined && !/^\d+$/.test(String(anilist))) {
      return jsonError(res, `Invalid anilist: ${anilist} (expected a numeric AniList ID)`, 400);
    }

    // NOTE: Cache key composes every response-affecting input — episode,
    // lang and provider filter all change the output, so each combination
    // is cached separately (TTL.ids = 60min, IDs and URLs are stable)
    const cacheKey = `embeds_${slug || ""}_${mal || ""}_${anilist || ""}_${resolvedEp}_${resolvedLang}_${(requested || []).join("-")}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, results: cached });
    }

    const result = await buildEpisodeEmbeds({
      slug: slug || null,
      episode: resolvedEp,
      lang: resolvedLang,
      providers: requested,
      malId: mal || null,
      anilistId: anilist || null,
    });

    setCache(cacheKey, result, TTL.ids);
    res.json({ success: true, results: result });
  } catch (error) {
    next(error);
  }
};

export { getEmbedProviders };

// ══════════════════════════════════════════════════════════════ END: embedProviders.controller.js
