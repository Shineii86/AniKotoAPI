/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — watchOrder.extractor.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Extracts watch order / related anime for a specific anime via the
 *   upstream /api/watch-order/{animeId} JSON-AJAX endpoint and parses
 *   the returned HTML fragment into a clean related-anime list.
 *
 * @exports
 *   extractWatchOrder
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import * as cheerio from "cheerio";
import { fetchWithMirror } from "../helper/mirror.helper.js";

// ══════════════════════════════════════════════════════════════
// WATCH ORDER EXTRACTOR
// ══════════════════════════════════════════════════════════════

// NOTE: /api/watch-order/ answers 500 unless the request is flagged
// as XHR and carries the site origin as Referer
const WATCH_ORDER_HEADERS = {
  "X-Requested-With": "XMLHttpRequest",
  Referer: "https://anikototv.to/",
};

// ---- FEATURE: Anime ID Resolution ----
/**
 * Resolves a slug (or passes through a numeric ID) to the upstream
 * numeric animeId used by the /api/watch-order/ endpoint.
 *
 * @param {string|number} slugOrId - Anime slug or numeric ID
 * @returns {Promise<{animeId: number, slug: string|null}>}
 */
const resolveWatchOrderTarget = async (slugOrId) => {
  const raw = String(slugOrId ?? "").trim();

  // NOTE: Numeric input is already a valid upstream animeId
  if (/^\d+$/.test(raw)) {
    return { animeId: parseInt(raw, 10), slug: null };
  }

  const { data } = await fetchWithMirror(`/watch/${raw}`, { headers: WATCH_ORDER_HEADERS });
  const $ = cheerio.load(typeof data === "string" ? data : String(data));
  const animeId = parseInt($("#watch-main").attr("data-id"), 10);

  if (!animeId) {
    const err = new Error(`Anime not found: ${raw}`);
    err.status = 404;
    throw err;
  }

  return { animeId, slug: raw };
};

// ---- FEATURE: Watch Order / Related Anime Extraction ----
/**
 * Fetches and parses the watch order / related anime for an anime.
 *
 * Uses the upstream AJAX endpoint GET {base}api/watch-order/{animeId}
 * which returns { status, result } where result is the #w-related HTML
 * fragment (or false when the anime has no related list).
 *
 * NOTE: Upstream relation labels are currently broken — every
 * .relation label ships a placeholder id="sequel" — so relation is
 * returned as the constant "related" until upstream fixes them.
 *
 * @param {string|number} slugOrId - The anime slug or numeric ID
 * @returns {Promise<Object>} Object with animeId, slug, totalRelated, related array
 *
 * @example
 *   const data = await extractWatchOrder("one-piece-odmau");
 *   console.log(data.totalRelated);
 */
const extractWatchOrder = async (slugOrId) => {
  const { animeId, slug } = await resolveWatchOrderTarget(slugOrId);

  const { data } = await fetchWithMirror(`/api/watch-order/${animeId}`, {
    headers: WATCH_ORDER_HEADERS,
  });

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
  const related = [];
  const seen = new Set();

  $("#w-related .item, #watch-order .item, .item.flexserieslist").each((_, el) => {
    const node = $(el);

    // NOTE: Anchors only — search-style "?keyword=" links are not watch pages
    const link = node.find('a[href*="/watch/"]').first();
    const href = link.attr("href") || "";
    if (!href || href.includes("?keyword=")) return;

    const itemSlug = href.split("/watch/").pop().split(/[?#]/)[0] || "";
    const title = node.find(".name, .d-title").first().text().trim() || link.text().trim() || "";

    // NOTE: .poster[data-tip] carries the site's numeric ID — use it to
    // drop the item itself from its own watch-order list
    const siteId = node.find(".poster").attr("data-tip") || "";
    if (siteId && String(animeId) === String(siteId)) return;
    if (itemSlug && itemSlug === slug) return;

    const poster = node.find("img").attr("src") || link.find("img").attr("src") || "";

    if (itemSlug && title && !seen.has(itemSlug)) {
      seen.add(itemSlug);
      related.push({
        title,
        slug: itemSlug,
        poster,
        url: href,
        relation: "related",
      });
    }
  });

  return {
    animeId,
    slug: slug ?? null,
    totalRelated: related.length,
    related,
  };
};

export { extractWatchOrder };
// ══════════════════════════════════════════════════════════════ END: watchOrder.extractor.js
