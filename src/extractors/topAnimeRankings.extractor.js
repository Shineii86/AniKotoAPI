/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — topAnimeRankings.extractor.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Extracts top anime rankings from the homepage with sort options.
 *   Supports "day", "week" and "month" ranking tabs.
 *   Parses ranked items with position numbers 1-9.
 *
 * @exports
 *   extractTopAnimeRankings
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import * as cheerio from "cheerio";
import { fetchWithMirror } from "../helper/mirror.helper.js";

// ══════════════════════════════════════════════════════════════
// TOP ANIME RANKINGS EXTRACTION
// ══════════════════════════════════════════════════════════════

const VALID_SORTS = ["day", "week", "month"];

// ---- FEATURE: Extract top anime rankings with sort option ----
/**
 * Fetches and parses the top anime rankings from the homepage.
 * Each ranking window (day/week/month) lives in its own
 * #top-anime .tab-content[data-name="..."] panel with 9 items.
 *
 * @param {string} sort - Ranking sort mode: "day", "week" or "month" (default: "day")
 * @returns {Promise<Array<Object>>} Array of ranked anime objects
 * @returns {number} return[].rank - Ranking position (1-9)
 * @returns {string} return[].slug - URL slug for the anime
 * @returns {string} return[].poster - Poster image URL
 * @returns {string} return[].title - Anime title
 * @returns {string} return[].japaneseTitle - Japanese title
 * @returns {number} return[].sub - Subbed episode count
 * @returns {number} return[].dub - Dubbed episode count
 * @returns {string} return[].type - Anime type
 *
 * @example
 *   const topAnime = await extractTopAnimeRankings("week");
 *   console.log(topAnime[0].rank); // 1
 */
const extractTopAnimeRankings = async (sort = "day") => {
  const window = VALID_SORTS.includes(sort) ? sort : "day";

  // NOTE: Homepage contains three ranking tabs — day / week / month
  const { data } = await fetchWithMirror("/home");
  const $ = cheerio.load(data);

  const results = [];
  const seen = new Set();

  // NOTE: Scope strictly to the requested tab — the old unfiltered selector
  // also grabbed sibling tabs, producing 27 items with duplicated ranks
  const tabSelector = `[data-name='${window}']`;

  $(`#top-anime .tab-content${tabSelector} a.item`).each((i, el) => {
    const slug = $(el).attr("href")?.split("/watch/").pop() || "";
    if (!slug || seen.has(slug)) return;
    seen.add(slug);

    const poster = $(el).find("img").attr("src") || "";
    const title = $(el).find(".name").text().trim() || "";
    const japaneseTitle = $(el).find(".name").attr("data-jp") || "";
    const sub = parseInt($(el).find(".ep-status.sub span").text().trim()) || 0;
    const dub = parseInt($(el).find(".ep-status.dub span").text().trim()) || 0;
    const type = $(el).find(".meta .dot:last-child").text().trim() || "";

    // NOTE: Rank comes from the rankN class on the <a> element
    const rankClass = String($(el).attr("class") || "").match(/\brank(\d+)\b/);
    const rank = rankClass ? parseInt(rankClass[1], 10) : i + 1;

    results.push({ rank, slug, poster, title, japaneseTitle, sub, dub, type });
  });

  return results;
};

export { extractTopAnimeRankings, VALID_SORTS };

// ══════════════════════════════════════════════════════════════ END: topAnimeRankings.extractor.js
