/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — openapi.config.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   OpenAPI 3.0.3 document builder. The spec is generated from structured
 *   path definitions (summary, tags, parameters, notes) so adding an
 *   endpoint in the routes layer only requires one entry here. Shared
 *   components (standard error responses, pagination envelope) are defined
 *   once in `components`.
 *
 * @exports
 *   buildOpenApiSpec, OPENAPI_PATH_COUNT
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

// ══════════════════════════════════════════════════════════════
// OPERATION BUILDERS
// ══════════════════════════════════════════════════════════════

/** Standard query parameter: cache bypass shared by every endpoint. */
const REFRESH_PARAM = {
  name: "refresh",
  in: "query",
  required: false,
  description: "Bypass the cache and force a fresh upstream fetch (1 to enable)",
  schema: { type: "string", enum: ["0", "1"] },
  example: "1",
};

/** Standard query parameter: page number. */
const pageParam = (description = "Page number (1-500)") => ({
  name: "page",
  in: "query",
  required: false,
  description,
  schema: { type: "integer", minimum: 1, maximum: 500, default: 1 },
});

/** Path parameter (slug-shaped). */
const slugParam = (name, description) => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { type: "string", maxLength: 128, pattern: "^[a-zA-Z0-9_-]+$" },
});

/** Query parameter with a string schema. */
const queryParam = (name, description, schema = { type: "string" }, example, required = false) => ({
  name,
  in: "query",
  required,
  description,
  schema,
  ...(example !== undefined ? { example } : {}),
});

/**
 * Builds a GET operation with the standard response set.
 * @param {string} summary - Short operation summary
 * @param {string[]} tags - Tag names
 * @param {object} [options]
 * @param {Array} [options.params] - Extra parameters (page/refresh added automatically)
 * @param {string} [options.description] - Long description
 * @param {boolean} [options.noRefresh=false] - Omit the refresh parameter
 * @returns {object} OpenAPI operation object
 */
const getOp = (summary, tags, { params = [], description, noRefresh = false } = {}) => ({
  summary,
  tags,
  ...(description ? { description } : {}),
  parameters: [...params, ...(noRefresh ? [] : [REFRESH_PARAM])],
  responses: {
    "200": { description: "Success", content: { "application/json": { schema: { $ref: "#/components/schemas/Envelope" } } } },
    "400": { $ref: "#/components/responses/BadRequest" },
    "404": { $ref: "#/components/responses/NotFound" },
    "429": { $ref: "#/components/responses/RateLimited" },
    "500": { $ref: "#/components/responses/ServerError" },
  },
});

// ══════════════════════════════════════════════════════════════
// PATH REGISTRY
// ══════════════════════════════════════════════════════════════

/**
 * Every registered API path. Order here is documentation order only —
 * Express route order lives in src/routes/*.
 *
 * @type {Object<string, object>}
 */
const PATHS = {
  // ── Home ────────────────────────────────────────────────
  "/": getOp("Homepage data", ["Home"], { description: "Spotlight carousel, latest episodes, trending and top rankings in one payload.", noRefresh: true }),

  // ── Search ──────────────────────────────────────────────
  "/search": getOp("Search anime", ["Search"], {
    params: [queryParam("keyword", "Search keyword (required)", { type: "string" }, "naruto", true), pageParam()],
  }),
  "/search/suggest": getOp("Search autocomplete suggestions", ["Search"], {
    params: [queryParam("keyword", "Search keyword (required)", { type: "string" }, "nar", true)],
    noRefresh: true,
  }),
  "/suggestions": getOp("Anime suggestions", ["Search"], {
    params: [queryParam("keyword", "Seed keyword (required)", { type: "string" }, "naruto", true)],
  }),

  // ── Anime details ───────────────────────────────────────
  "/info": getOp("Anime info", ["Anime"], {
    description: "Full metadata for one anime. Includes externalIds: { animeId, malId, anilistId }.",
    params: [
      queryParam("id", "Anime slug (alias: slug)", { type: "string" }, "one-piece-odmau"),
      queryParam("slug", "Anime slug (alias: id)", { type: "string" }, "one-piece-odmau"),
    ],
  }),
  "/seasons/{id}": getOp("Season data", ["Anime"], {
    description: "Season list for one anime via the upstream /api/seasons/ AJAX fragment. Accepts a slug or a numeric animeId. Returns an empty `seasons` array when the anime has no season split (result: false upstream).",
    params: [slugParam("id", "Anime slug or numeric upstream animeId (e.g. 958)")],
  }),
  "/watch-order/{id}": getOp("Watch order & related anime", ["Anime"], {
    description: "Related-anime list for one anime via the upstream /api/watch-order/ AJAX fragment. Accepts a slug or a numeric animeId. NOTE: upstream relation labels are currently broken placeholders, so every item reports relation: \"related\"; entries are deduped and the anime itself is excluded.",
    params: [slugParam("id", "Anime slug or numeric upstream animeId (e.g. 1642)")],
  }),

  // ── Episodes ────────────────────────────────────────────
  "/episodes/latest": getOp("Latest episode checker", ["Episodes"], {
    description: "Returns only the newest episode — built for bot polling.",
    params: [queryParam("slug", "Anime slug (required)", { type: "string" }, "one-piece-odmau", true)],
    noRefresh: true,
  }),
  "/episodes/{id}": getOp("Episode list", ["Episodes"], { params: [slugParam("id", "Anime slug")] }),
  "/episodes-ajax/{id}": getOp("AJAX episode list", ["Episodes"], {
    params: [
      slugParam("id", "Anime slug"),
      queryParam("style", "Display style"),
      queryParam("vrf", "VRF verification token"),
    ],
  }),

  // ── Watch / streaming ───────────────────────────────────
  "/watch": getOp("Watch page data", ["Streaming"], {
    params: [
      queryParam("slug", "Anime slug (required)", { type: "string" }, "one-piece-odmau", true),
      queryParam("ep", "Episode number (required)", { type: "integer", minimum: 1 }, 1, true),
    ],
  }),
  "/servers": getOp("Server list", ["Streaming"], {
    params: [queryParam("ids", "Comma-separated episode IDs (required)", { type: "string" }, "1,2", true)],
  }),
  "/mapper-servers": getOp("Mapper servers", ["Streaming"], {
    description: "All three parameters are required — the endpoint 400s if any is missing.",
    params: [
      queryParam("malId", "MyAnimeList ID (required)", { type: "string" }, "21", true),
      queryParam("slug", "Anime slug (required)", { type: "string" }, "one-piece-odmau", true),
      queryParam("timestamp", "Mapper timestamp (required)", { type: "string" }, "1700000000", true),
    ],
    noRefresh: true,
  }),
  "/stream": getOp("Stream URL", ["Streaming"], {
    params: [
      queryParam("id", "Episode link ID (required)", { type: "string" }, "12345", true),
      queryParam("slug", "Anime slug (for session establishment)", { type: "string" }, "one-piece-odmau"),
    ],
  }),
  "/stream/resolve": getOp("Resolve actual stream URL (m3u8/mp4)", ["Streaming"], {
    params: [queryParam("id", "Episode link ID (required)", { type: "string" }, "12345", true)],
  }),
  "/stream/qualities": getOp("Available quality options for an M3U8 stream", ["Streaming"], {
    description: "Fetches and parses the playlist. 415 when the URL does not return an HLS playlist (#EXTM3U), 502 when the fetch itself fails.",
    params: [queryParam("url", "M3U8 playlist URL (required)", { type: "string" }, undefined, true)],
  }),
  "/stream/embeds": getOp("Direct embed provider URLs", ["Streaming"], {
    description: "Iframe-ready player URLs for Megavid, AniXo and MegaPlay — no source-site AJAX scraping required. Provide at least one of ?slug=, ?mal= or ?anilist= (400 otherwise); ?lang= must be sub or dub.",
    params: [
      queryParam("slug", "Anime slug (required unless ?mal= or ?anilist= is given)", { type: "string" }, "one-piece-odmau"),
      queryParam("mal", "Direct MAL ID — resolves anilistId automatically (required unless ?slug= or ?anilist= is given)", { type: "string" }, "21"),
      queryParam("anilist", "Direct AniList ID (required unless ?slug= or ?mal= is given)", { type: "string" }, "21"),
      queryParam("ep", "Episode number", { type: "integer", minimum: 1 }, 1),
      queryParam("lang", "Audio track", { type: "string", enum: ["sub", "dub"] }, "sub"),
      queryParam("provider", "Comma-separated provider filter", { type: "string" }, "megavid,megaplay"),
    ],
    noRefresh: true,
  }),
  "/stream/proxy": getOp("M3U8 playlist proxy (rewrites URLs)", ["Streaming"], {
    description: "Fetches an allowlisted playlist and rewrites segment URLs back through this API. 415 when the upstream body is not an HLS playlist.",
    params: [queryParam("url", "M3U8 playlist URL (required)", { type: "string" }, undefined, true)],
    noRefresh: true,
  }),
  "/stream/ts-proxy": getOp("TS video segment proxy", ["Streaming"], {
    params: [queryParam("url", "TS segment URL (required)", { type: "string" }, undefined, true)],
    noRefresh: true,
  }),
  "/download": getOp("Download links", ["Streaming"], {
    params: [
      queryParam("slug", "Anime slug (required)", { type: "string" }, "one-piece-odmau", true),
      queryParam("ep", "Episode number (required)", { type: "integer", minimum: 1 }, 1, true),
    ],
  }),

  // ── Enrichment (AniList) ────────────────────────────────
  "/anilist": getOp("AniList metadata by MAL ID", ["Enrichment"], {
    description: "MAL-first alias of /anilist/{id}: resolves the MAL ID to AniList (cached 60min) and returns the full media object. 404 when AniList has no matching media.",
    params: [queryParam("mal", "MyAnimeList ID (required)", { type: "string" }, "21", true)],
  }),
  "/anilist/{id}": getOp("AniList anime metadata", ["Enrichment"], {
    description: "Synopsis, genres, scores, studios, characters, relations and recommendations from the public AniList GraphQL API. Provide the path ID or ?mal= (400 otherwise); 404 when the media does not exist.",
    params: [queryParam("id", "AniList media ID (0 or omitted with ?mal=)", { type: "string" }, "21"),
      queryParam("mal", "MyAnimeList ID alternative", { type: "string" }, "21")],
  }),
  "/anilist/season": getOp("AniList seasonal chart", ["Enrichment"], {
    description: "Most popular anime of a season, defaulting to the current season/year.",
    params: [
      queryParam("season", "Season", { type: "string", enum: ["WINTER", "SPRING", "SUMMER", "FALL"] }, "WINTER"),
      queryParam("year", "Season year (1940-2100)", { type: "integer", minimum: 1940, maximum: 2100 }, 2026),
      pageParam("Page number (1-500)"),
      queryParam("perPage", "Items per page (1-50)", { type: "integer", minimum: 1, maximum: 50 }, 25),
    ],
  }),

  // ── Schedule ────────────────────────────────────────────
  "/schedule": getOp("Anime airing schedule", ["Schedule"], {
    description: "Airing schedule for a calendar day. ?date= defaults to today (server local time) and must be a real YYYY-MM-DD date — anything else returns 400.",
    params: [queryParam("date", "Date in YYYY-MM-DD format (optional, defaults to today)", { type: "string" }, "2026-10-24")],
  }),

  // ── Discovery ───────────────────────────────────────────
  "/spotlight": getOp("Spotlight carousel", ["Discovery"], { noRefresh: true }),
  "/trending": getOp("Trending anime", ["Discovery"], { noRefresh: true }),
  "/trending-sidebar": getOp("Trending sidebar", ["Discovery"], { noRefresh: true }),
  "/random": getOp("Random anime", ["Discovery"], { noRefresh: true }),
  "/upcoming": getOp("Upcoming anime", ["Discovery"], { noRefresh: true }),
  "/az-list/{letter}": getOp("A-Z listing", ["Discovery"], {
    params: [slugParam("letter", "Letter a-z, 0-9, other or all"), pageParam()],
  }),

  // ── Rankings ────────────────────────────────────────────
  "/top-ten": getOp("Top 10 rankings", ["Rankings"], { noRefresh: true }),
  "/top-rankings": getOp("Top anime rankings", ["Rankings"], {
    description: "Nine ranked entries per window. Each sort value maps to its own homepage tab — an unknown sort returns 400 instead of silently falling back.",
    params: [queryParam("sort", "Ranking window", { type: "string", enum: ["day", "week", "month"] }, "day")],
  }),
  "/most-popular": getOp("Most popular anime", ["Rankings"], { params: [pageParam()] }),
  "/completed": getOp("Completed anime series", ["Rankings"], { noRefresh: true }),

  // ── Releases ────────────────────────────────────────────
  "/new-release": getOp("New releases", ["Releases"], { params: [pageParam()] }),
  "/newly-added": getOp("Newly added anime", ["Releases"], { params: [pageParam()] }),
  "/latest-updated": getOp("Recently updated anime", ["Releases"], { params: [pageParam()] }),
  "/recently-updated": getOp("Recently updated tabs (all/sub/dub)", ["Releases"], {
    params: [queryParam("tab", "Tab name", { type: "string", enum: ["all", "sub", "dub"] }, "all")],
  }),

  // ── Filter ──────────────────────────────────────────────
  "/filter": getOp("Advanced filter", ["Filter"], {
    description: "Combines keyword, genre, type, status, rating and sort parameters.",
    params: [
      queryParam("keyword", "Search keyword", { type: "string" }, "naruto"),
      queryParam("genre", "Genre slug", { type: "string" }, "action"),
      queryParam("type", "Type slug", { type: "string" }, "tv"),
      queryParam("status", "Status slug", { type: "string" }, "currently-airing"),
      queryParam("sort", "Sort key", { type: "string" }, "released"),
      pageParam(),
    ],
  }),

  // ── Categories ──────────────────────────────────────────
  "/genre/{name}": getOp("Anime by genre", ["Categories"], { params: [slugParam("name", "Genre slug"), pageParam()] }),
  "/type/{name}": getOp("Anime by type", ["Categories"], { params: [slugParam("name", "Type slug"), pageParam()] }),
  "/status/{name}": getOp("Anime by status", ["Categories"], { params: [slugParam("name", "Status slug"), pageParam()] }),

  // ── System ──────────────────────────────────────────────
  "/health": getOp("Health check", ["System"], {
    description: "Uptime, version, Node version and memory usage.",
    noRefresh: true,
  }),
  "/stats": getOp("API statistics", ["System"], { description: "Request counters, error rate, cache summary and endpoint count.", noRefresh: true }),
  "/cache/stats": getOp("Cache statistics", ["System"], { description: "Hit rate, entry count, evictions and ?refresh=1 bypasses.", noRefresh: true }),
  "/mirrors": getOp("Mirror status", ["System"], { description: "Latency and reachability of every configured mirror domain.", noRefresh: true }),
  "/mirrors/reset": {
    post: {
      summary: "Reset mirror cache",
      tags: ["System"],
      responses: {
        "200": { description: "Mirror cache cleared" },
        "429": { $ref: "#/components/responses/RateLimited" },
      },
    },
  },
  "/proxy/status": getOp("Proxy status (ScraperAPI / FlareSolverr)", ["System"], { noRefresh: true }),
  "/openapi": getOp("OpenAPI specification", ["System"], { noRefresh: true }),
};

// ══════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════

const TAGS = [
  { name: "Home", description: "Homepage data" },
  { name: "Search", description: "Search & suggestions" },
  { name: "Anime", description: "Anime details" },
  { name: "Episodes", description: "Episode lists" },
  { name: "Streaming", description: "Stream URLs & servers" },
  { name: "Enrichment", description: "AniList metadata & seasonal charts" },
  { name: "Schedule", description: "Airing schedule" },
  { name: "Discovery", description: "Random, trending, spotlight" },
  { name: "Rankings", description: "Top 10, most popular" },
  { name: "Releases", description: "New releases" },
  { name: "Filter", description: "Advanced filtering" },
  { name: "Categories", description: "Genre, type, status" },
  { name: "System", description: "Health, stats, OpenAPI" },
];

const COMPONENTS = {
  schemas: {
    Envelope: {
      type: "object",
      description: "Standard response wrapper. `results` holds the payload; `creator`/`timestamp` are injected by the attribution middleware.",
      properties: {
        success: { type: "boolean", example: true },
        results: { type: "object", nullable: true },
        message: { type: "string", nullable: true },
        creator: { type: "string", example: "Shinei Nouzen" },
        github: { type: "string", example: "https://github.com/Shineii86" },
        telegram: { type: "string", example: "https://telegram.me/Shineii86" },
        timestamp: { type: "string", example: "24/10/2026, 10:34:57 pm" },
      },
    },
    Error: {
      type: "object",
      properties: {
        success: { type: "boolean", example: false },
        message: { type: "string", example: "Keyword is required" },
      },
    },
    Pagination: {
      type: "object",
      properties: {
        currentPage: { type: "integer", example: 1 },
        totalPages: { type: "integer", example: 12 },
        totalItems: { type: "integer", example: 350 },
        itemsPerPage: { type: "integer", example: 30 },
        hasNext: { type: "boolean", example: true },
        hasPrev: { type: "boolean", example: false },
      },
    },
  },
  responses: {
    BadRequest: {
      description: "Missing or invalid parameter",
      content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
    },
    NotFound: {
      description: "Resource not found",
      content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
    },
    RateLimited: {
      description: "Rate limit exceeded (see Retry-After and X-RateLimit-*)",
      content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
    },
    ServerError: {
      description: "Internal server error",
      content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
    },
  },
};

// ══════════════════════════════════════════════════════════════
// SPEC BUILDER
// ══════════════════════════════════════════════════════════════

const OPENAPI_PATH_COUNT = Object.keys(PATHS).length;

/**
 * Builds the full OpenAPI 3.0.3 document for the running server.
 * @param {string} version - Package version string
 * @param {string} [baseUrl] - Public base URL advertised to consumers
 * @returns {object} OpenAPI document
 *
 * @example
 *   res.json(buildOpenApiSpec("2.6.1"));
 */
const buildOpenApiSpec = (version, baseUrl = "https://anikototvapi.vercel.app/api") => ({
  openapi: "3.0.3",
  info: {
    title: "AniKotoAPI",
    description:
      "Free REST API for anime data from anikototv.to. All list endpoints are cached in-memory; append ?refresh=1 to force a fresh scrape. Responses are wrapped in { success, results }.",
    version,
    contact: {
      name: "Shinei Nouzen",
      url: "https://github.com/Shineii86/AniKotoAPI",
    },
    license: { name: "MIT", url: "https://github.com/Shineii86/AniKotoAPI/blob/main/LICENSE" },
  },
  servers: [
    { url: baseUrl, description: "Production" },
    { url: "http://localhost:4444/api", description: "Local development" },
  ],
  paths: PATHS,
  components: COMPONENTS,
  tags: TAGS,
});

export { buildOpenApiSpec, OPENAPI_PATH_COUNT };

// ══════════════════════════════════════════════════════════════ END: openapi.config.js
