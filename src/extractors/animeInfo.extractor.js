/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — animeInfo.extractor.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Extracts detailed anime information from anikototv.to including title,
 *   synopsis, metadata (type, status, studios, producers, genres), ratings,
 *   and background artwork for a given anime slug.
 *
 * @exports
 *   extractAnimeInfo
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import * as cheerio from "cheerio";
import { fetchWithMirror } from "../helper/mirror.helper.js";

// ══════════════════════════════════════════════════════════════
// ANIME INFO EXTRACTOR
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Extract full anime detail page data for a given slug ----
/**
 * Fetches the anime detail page from anikototv.to and parses all metadata
 * including titles, synopsis, ratings, studios, producers, genres, and
 * background artwork.
 *
 * @param {string} slug - The anime slug identifier (e.g. "naruto-shippuden")
 * @returns {Promise<Object>} Full anime info object with all extracted fields
 *
 * @example
 *   const info = await extractAnimeInfo("one-piece");
 *   console.log(info.title);   // "One Piece"
 *   console.log(info.studios); // ["Toei Animation"]
 */
const extractAnimeInfo = async (slug) => {
  try {
    const path = `/watch/${slug}`;
    const { data } = await fetchWithMirror(path);
    const $ = cheerio.load(data);

    const title = $("h1[itemprop='name'].title.d-title").text().trim() || "";
    const japaneseTitle = $("h1[itemprop='name'].title.d-title").attr("data-jp") || "";

    // NOTE: Upstream ships a run-on alt-names blob ("One Piece;OP ONE PIECE
    // One Piece; One Piece, One Piece, OP, ONE PIECE") — split on the
    // separators and dedupe so the string stays readable and honest
    const rawAltNames = $(".names.font-italic").text().trim() || "";
    const altNames = [...new Set(
      rawAltNames
        .split(/[;,]/)
        .map((name) => name.trim())
        .filter(Boolean)
    )].join(", ");

    const poster = $("img[itemprop='image']").attr("src") || "";
    const synopsis = $(".synopsis .content").text().trim() || "";

    // NOTE: #w-rating .score .value doubles the number (hidden schema.org
    // span + visible span = "8.73   8.73 /10") — the data-score attribute
    // on the container is the single clean value
    const rating = $("#w-rating").attr("data-score") || "";
    const ratingValue = $("#w-rating span[itemprop='ratingValue']").text().trim() || "";
    const reviewCount = $("#w-rating span[itemprop='reviewCount']").text().trim() || "";
    const animeId = parseInt($("#watch-main").attr("data-id")) || 0;

    // NOTE: .bmeta .meta:first-child contains: type, premiered, aired, status, genres
    // NOTE: Positional selectors (nth-child) are fragile — match source site's exact HTML structure
    const type = $(".bmeta .meta:first-child > div:nth-child(1) span").text().trim() || "";
    // NOTE: Upstream writes the season as a literal "&NBSP 1999" (entity
    // without a semicolon) inside the anchor — strip it, keep the year
    const premiered = $(".bmeta .meta:first-child > div:nth-child(2) span a")
      .text().replace(/&nbsp;?/gi, " ").replace(/\s+/g, " ").trim() ||
      $(".bmeta .meta:first-child > div:nth-child(2) span").text().replace(/&nbsp;?/gi, " ").trim() || "";
    const aired = $(".bmeta .meta:first-child > div:nth-child(3) span").text().trim() || "";
    const status = $(".bmeta .meta:first-child > div:nth-child(4) span a").text().trim() || "";

    // NOTE: .bmeta .meta:nth-child(2) contains: MAL score, duration, episodes, studios, producers
    const malScore = $(".bmeta .meta:nth-child(2) > div:nth-child(1) span").text().trim() || "";
    const duration = $(".bmeta .meta:nth-child(2) > div:nth-child(2) span").text().trim() || "";
    // NOTE: "?" means upstream genuinely doesn't know the episode count —
    // report null instead of the placeholder character
    const rawEpisodes = $(".bmeta .meta:nth-child(2) > div:nth-child(3) span").text().trim() || "";
    const episodes = /^\d+$/.test(rawEpisodes) ? parseInt(rawEpisodes, 10) : null;

    const studios = [];
    $(".bmeta .meta:nth-child(2) > div:nth-child(4) span a[itemprop='director'] span[itemprop='name']").each((i, el) => {
      studios.push($(el).text().trim());
    });

    const producers = [];
    $(".bmeta .meta:nth-child(2) > div:nth-child(5) span a[itemprop='director'] span[itemprop='name']").each((i, el) => {
      producers.push($(el).text().trim());
    });

    const genres = [];
    $(".bmeta .meta:first-child > div:nth-child(5) span a[href*='/genre/']").each((i, el) => {
      genres.push($(el).text().trim());
    });

    const backgroundImage = $("#player").css("background-image")?.match(/url\(['"]?(.+?)['"]?\)/)?.[1] || "";

    return {
      slug,
      animeId,
      title,
      japaneseTitle,
      altNames,
      poster,
      backgroundImage,
      synopsis,
      type,
      premiered,
      aired,
      status,
      malScore,
      duration,
      episodes,
      studios,
      producers,
      genres,
      rating: rating || ratingValue,
      reviewCount
    };
  } catch (error) {
    throw error;
  }
};

export { extractAnimeInfo };

// ══════════════════════════════════════════════════════════════ END: animeInfo.extractor.js
