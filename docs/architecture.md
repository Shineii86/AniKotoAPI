/**
 * ============================================================================
 *  AniKotoAPI — Architecture Document
 *  Version : 2.3.0
 *  Generated: 2026-08-14
 * ============================================================================
 *
 *  Free REST API for scraping anime data from anikototv.to
 *  Tech Stack: Node.js (ESM) · Express 4.21 · Cheerio 1.0 · Axios 1.8
 *              compression 1.7 · LRU Cache · Vercel Serverless
 *
 *  Table of Contents
 *  ──────────────────────────────────────────────────────────────────────────
 *  1.  High-Level Architecture
 *  2.  Request Flow
 *  3.  Directory Layout
 *  4.  Component Responsibilities
 *  5.  Data Flow
 *  6.  Mirror Failover Strategy
 *  7.  Caching Strategy
 *  8.  Rate Limiting & Compression
 *  9.  Error Handling Strategy
 *  10. Security Considerations
 *  11. Deployment (Vercel Serverless)
 *  12. Testing Strategy
 *  13. Versioning & Changelog Notes
 * ============================================================================
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1 — HIGH-LEVEL ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The system follows a layered architecture with clean separation between
 * routing, business logic (controllers), and data extraction (scrapers).
 * Vercel provides the serverless runtime; Express handles middleware and
 * routing; Cheerio handles server-side HTML parsing.
 *
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │                        CLIENT (Browser / App)                       │
 *  └──────────────────────────┬──────────────────────────────────────────┘
 *                             │  HTTPS
 *                             ▼
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │                      VERCEL EDGE / CDN                              │
 *  │              (TLS termination, static assets)                       │
 *  └──────────────────────────┬──────────────────────────────────────────┘
 *                             │
 *                             ▼
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │                  api/index.js  (Serverless Handler)                 │
 *  │                                                                     │
 *  │  ┌───────────────────────────────────────────────────────────────┐  │
 *  │  │                  server.js  (Express App)                     │  │
 *  │  │                                                               │  │
 *  │  │  ┌─────────┐  ┌────────────┐  ┌───────────────────────────┐  │  │
 *  │  │  │   CORS   │  │Compression │  │   Rate Limiter            │  │  │
 *  │  │  │  Middleware│ │ (gzip)     │  │   (100 req / 15 min)      │  │  │
 *  │  │  └─────────┘  └────────────┘  └───────────────────────────┘  │  │
 *  │  │                                                               │  │
 *  │  │  ┌──────────────────────────────────────────────────────────┐ │  │
 *  │  │  │                   ROUTING LAYER                          │ │  │
 *  │  │  │  src/routes/apiRoutes.js                                 │ │  │
 *  │  │  │  src/routes/category.route.js                            │ │  │
 *  │  │  └──────────────────────┬───────────────────────────────────┘ │  │
 *  │  │                         │                                     │  │
 *  │  │                         ▼                                     │  │
 *  │  │  ┌──────────────────────────────────────────────────────────┐ │  │
 *  │  │  │               CONTROLLER LAYER  (28 controllers)         │ │  │
 *  │  │  │  Validation · Parameter parsing · Response formatting    │ │  │
 *  │  │  └──────────────────────┬───────────────────────────────────┘ │  │
 *  │  │                         │                                     │  │
 *  │  │                         ▼                                     │  │
 *  │  │  ┌──────────────────────────────────────────────────────────┐ │  │
 *  │  │  │           EXTRACTOR / SCRAPER LAYER  (28 extractors)     │ │  │
 *  │  │  │  HTML fetching · Cheerio parsing · Data transformation   │ │  │
 *  │  │  └──────────────────────┬───────────────────────────────────┘ │  │
 *  │  │                         │                                     │  │
 *  │  │                         ▼                                     │  │
 *  │  │  ┌──────────────────────────────────────────────────────────┐ │  │
 *  │  │  │               HELPER LAYER                               │ │  │
 *  │  │  │  cache.helper.js  — LRU cache with per-endpoint TTL      │ │  │
 *  │  │  │  mirror.helper.js — Multi-mirror failover (5 domains)    │ │  │
 *  │  │  │  pagination.helper.js — Pagination builder               │ │  │
 *  │  │  └──────────────────────┬───────────────────────────────────┘ │  │
 *  │  │                         │                                     │  │
 *  │  │                         ▼                                     │  │
 *  │  │  ┌──────────────────────────────────────────────────────────┐ │  │
 *  │  │  │                   CONFIG LAYER                           │ │  │
 *  │  │  │  header.config.js — Default HTTP headers                 │ │  │
 *  │  │  │  ids.config.js    — Genre / Type / Status ID mappings    │ │  │
 *  │  │  └──────────────────────────────────────────────────────────┘ │  │
 *  │  └───────────────────────────────────────────────────────────────┘  │
 *  └─────────────────────────────────────────────────────────────────────┘
 *                             │
 *                             ▼  HTTP / HTTPS
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │              MIRROR POOL  (5 domains, auto-failover)                │
 *  │                                                                     │
 *  │  1. anikototv.to   (Primary)                                        │
 *  │  2. anikoto.cz     (Regional CZ)                                    │
 *  │  3. anikoto.me     (Short TLD)                                      │
 *  │  4. anikoto.net    (Network)                                         │
 *  │  5. anikototv.se   (Nordic .se)                                     │
 *  └─────────────────────────────────────────────────────────────────────┘
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2 — REQUEST FLOW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Every inbound request passes through the following pipeline:
 *
 *   Client
 *     │
 *     ▼
 *   ┌──────────────────────────────┐
 *   │  1.  TLS Termination (Vercel)│
 *   └──────────────┬───────────────┘
 *                  ▼
 *   ┌──────────────────────────────┐
 *   │  2.  CORS Middleware         │  ◄── Allow / Block origins
 *   └──────────────┬───────────────┘
 *                  ▼
 *   ┌──────────────────────────────┐
 *   │  3.  Compression Middleware  │  ◄── gzip (threshold: 1KB)
 *   └──────────────┬───────────────┘
 *                  ▼
 *   ┌──────────────────────────────┐
 *   │  4.  Rate Limiter            │  ◄── 100 req / 15 min / IP
 *   │       (429 on exceed)        │
 *   └──────────────┬───────────────┘
 *                  ▼
 *   ┌──────────────────────────────┐
 *   │  5.  Route Matching          │  ◄── apiRoutes.js / category.route.js
 *   └──────────────┬───────────────┘
 *                  ▼
 *   ┌──────────────────────────────┐
 *   │  6.  Controller              │  ◄── Validate params, call extractor
 *   └──────────────┬───────────────┘
 *                  ▼
 *   ┌──────────────────────────────┐
 *   │  7.  Cache Lookup            │  ◄── LRU hit? → Return cached data
 *   │       (if miss)              │
 *   └──────────────┬───────────────┘
 *                  ▼
 *   ┌──────────────────────────────┐
 *   │  8.  Mirror Selection        │  ◄── mirror.helper.js (round-robin + fallback)
 *   └──────────────┬───────────────┘
 *                  ▼
 *   ┌──────────────────────────────┐
 *   │  9.  HTTP Fetch (Axios)      │  ◄── Request source HTML from mirror
 *   └──────────────┬───────────────┘
 *                  ▼
 *   ┌──────────────────────────────┐
 *   │  10. HTML Parse (Cheerio)    │  ◄── Extractor scrapes structured data
 *   └──────────────┬───────────────┘
 *                  ▼
 *   ┌──────────────────────────────┐
 *   │  11. Cache Store             │  ◄── Write to LRU with endpoint TTL
 *   └──────────────┬───────────────┘
 *                  ▼
 *   ┌──────────────────────────────┐
 *   │  12. JSON Response           │  ◄── Express res.json()
 *   └──────────────────────────────┘
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3 — DIRECTORY LAYOUT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AniKotoAPI/
 * ├── server.js                      # Express entry point, middleware chain
 * ├── package.json                   # Dependencies & npm scripts
 * ├── api/
 * │   └── index.js                   # Vercel serverless function handler
 * ├── src/
 * │   ├── configs/
 * │   │   ├── header.config.js       # Default HTTP headers for upstream requests
 * │   │   └── ids.config.js          # Genre / Type / Status numeric ID mappings
 * │   ├── controllers/               # 28 route handlers (one per endpoint)
 * │   │   ├── homeInfo.controller.js
 * │   │   ├── animeInfo.controller.js
 * │   │   ├── search.controller.js
 * │   │   ├── episodeList.controller.js
 * │   │   ├── episodeListAjax.controller.js
 * │   │   ├── streamInfo.controller.js
 * │   │   ├── streamResolver.controller.js
 * │   │   ├── schedule.controller.js
 * │   │   ├── spotlight.controller.js
 * │   │   ├── trending.controller.js
 * │   │   ├── topten.controller.js
 * │   │   ├── suggestion.controller.js
 * │   │   ├── random.controller.js
 * │   │   ├── popular.controller.js
 * │   │   ├── filter.controller.js
 * │   │   ├── watchPage.controller.js
 * │   │   ├── azList.controller.js
 * │   │   ├── newRelease.controller.js
 * │   │   ├── status.controller.js
 * │   │   ├── trendingSidebar.controller.js
 * │   │   ├── seasons.controller.js
 * │   │   ├── watchOrder.controller.js
 * │   │   ├── download.controller.js
 * │   │   ├── upcomingAnime.controller.js
 * │   │   ├── topAnimeRankings.controller.js
 * │   │   ├── recentlyUpdatedTabs.controller.js
 * │   │   ├── completedAnime.controller.js
 * │   │   └── category.controller.js
 * │   ├── extractors/                # 28 HTML scrapers (one per data source)
 * │   │   ├── homeInfo.extractor.js
 *   │   │   ├── animeInfo.extractor.js
 *   │   │   ├── search.extractor.js
 *   │   │   ├── episodeList.extractor.js
 *   │   │   ├── episodeListAjax.extractor.js
 *   │   │   ├── streamInfo.extractor.js
 *   │   │   ├── streamResolver.extractor.js
 *   │   │   ├── schedule.extractor.js
 *   │   │   ├── spotlight.extractor.js
 *   │   │   ├── trending.extractor.js
 *   │   │   ├── topten.extractor.js
 *   │   │   ├── suggestion.extractor.js
 *   │   │   ├── random.extractor.js
 *   │   │   ├── popular.extractor.js
 *   │   │   ├── filter.extractor.js
 *   │   │   ├── watchPage.extractor.js
 *   │   │   ├── azList.extractor.js
 *   │   │   ├── newRelease.extractor.js
 *   │   │   ├── status.extractor.js
 *   │   │   ├── trendingSidebar.extractor.js
 *   │   │   ├── seasons.extractor.js
 *   │   │   ├── watchOrder.extractor.js
 *   │   │   ├── download.extractor.js
 *   │   │   ├── upcomingAnime.extractor.js
 *   │   │   ├── topAnimeRankings.extractor.js
 *   │   │   ├── recentlyUpdatedTabs.extractor.js
 *   │   │   ├── completedAnime.extractor.js
 *   │   │   └── parseListItem.helper.js
 *   │   ├── helper/
 *   │   │   ├── cache.helper.js      # LRU cache with per-endpoint TTL
 *   │   │   ├── mirror.helper.js     # Multi-mirror failover (5 domains)
 *   │   │   ├── pagination.helper.js # Pagination builder
 *   │   │   └── parseListItem.helper.js
 *   │   └── routes/
 *   │       ├── apiRoutes.js         # All route definitions + OpenAPI spec
 *   │       └── category.route.js    # Genre / Type / Status sub-routes
 *   ├── docs/                        # Documentation (you are here)
 *   │   ├── index.md
 *   │   ├── endpoints.md
 *   │   ├── streaming.md
 *   │   ├── examples.md
 *   │   ├── architecture.md
 *   │   └── testing.md
 *   ├── public/                      # Static files served by Vercel
 *   │   ├── index.html
 *   │   ├── tos.html
 *   │   ├── privacy.html
 *   │   ├── manifest.json
 *   │   ├── robots.txt
 *   │   └── sitemap.xml
 *   ├── agents/                      # AI agent role configurations
 *   │   ├── api-tester.md
 *   │   ├── backend-architect.md
 *   │   ├── devops-automator.md
 *   │   ├── performance-benchmarker.md
 *   │   ├── security-architect.md
 *   │   └── technical-writer.md
 *   └── test.js                      # Integration test suite (35 tests)
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4 — COMPONENT RESPONSIBILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │  server.js                                                            │
 * ├────────────────────────────────────────────────────────────────────────┤
 * │  • Creates the Express application instance (ESM)                     │
 * │  • Registers global middleware: CORS, compression, JSON parser        │
 * │  • Applies rate limiting middleware (100 req / 15 min / IP)           │
 * │  • Mounts route modules at /api                                       │
 * │  • Exports the app for both local dev and Vercel serverless           │
 * │  • Handles 404 fallback for unmatched routes                          │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │  api/index.js  (Vercel Serverless Handler)                            │
 * ├────────────────────────────────────────────────────────────────────────┤
 * │  • Wraps the Express app into a Vercel-compatible serverless fn       │
 * │  • Receives the raw Vercel event + context                            │
 * │  • Delegates to Express for request handling                          │
 * │  • Manages cold-start optimization                                    │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │  Controllers  (28 handlers)                                           │
 * ├────────────────────────────────────────────────────────────────────────┤
 * │  One controller per API endpoint. Responsibilities:                   │
 * │  • Extract and validate request parameters (query, params, body)      │
 * │  • Invoke the corresponding extractor function                        │
 * │  • Wrap result in a standard JSON envelope                            │
 * │  • Catch errors and return structured error responses                 │
 * │  • No direct HTTP fetching — all scraping lives in extractors         │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │  Extractors  (28 scrapers)                                            │
 * ├────────────────────────────────────────────────────────────────────────┤
 * │  One extractor per data source on the target site. Responsibilities:  │
 * │  • Build the upstream URL (via mirror.helper)                         │
 * │  • Fetch raw HTML using Axios with configured headers                 │
 * │  • Parse HTML with Cheerio and extract structured data                │
 * │  • Return normalized JavaScript objects ready for JSON serialization   │
 * │  • No Express coupling — pure data extraction                         │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │  Helpers                                                              │
 * ├────────────────────────────────────────────────────────────────────────┤
 * │  cache.helper.js                                                      │
 * │    • Wraps an LRU Cache (Map-based, no external deps)                 │
 * │    • Provides get/set/delete/clear with per-endpoint TTL              │
 * │    • TTLs range from 3 min (trending) to 60 min (genres)             │
 * │    • Cache key = full request URL for deterministic lookups           │
 * │                                                                       │
 * │  mirror.helper.js                                                     │
 * │    • Maintains ordered list of 5 mirror domains                       │
 * │    • Round-robin primary selection                                     │
 * │    • Automatic failover on HTTP error or timeout                      │
 * │    • Caches successful mirror for 1 hour per domain                   │
 * │                                                                       │
 * │  pagination.helper.js                                                 │
 * │    • Accepts current page, total pages, per-page count               │
 * │    • Returns { page, totalPages, perPage, hasNext, hasPrev }         │
 * │                                                                       │
 * │  parseListItem.helper.js                                              │
 * │    • Shared logic for parsing repeated list-item DOM structures       │
 * │    • Used by multiple extractors (trending, popular, search, etc.)    │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │  Configs                                                              │
 * ├────────────────────────────────────────────────────────────────────────┤
 * │  header.config.js                                                     │
 * │    • Default User-Agent, Accept, Accept-Language headers              │
 * │    • Ensures upstream site returns full HTML (not bot-blocked)        │
 * │                                                                       │
 * │  ids.config.js                                                        │
 * │    • Numeric ID mappings for genres (e.g., action=1, comedy=2)        │
 * │    • Type IDs (e.g., TV=1, Movie=2, OVA=3)                          │
 * │    • Status IDs (e.g., Airing=1, Completed=2, Upcoming=3)           │
 * │    • Used by filter and category controllers                          │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │  Routes                                                               │
 * ├────────────────────────────────────────────────────────────────────────┤
 * │  apiRoutes.js                                                         │
 * │    • Defines all 28 endpoint paths with HTTP methods                 │
 * │    • Maps paths to controller functions                                │
 * │    • Embeds OpenAPI 3.0 spec for auto-documentation                  │
 * │                                                                       │
 * │  category.route.js                                                    │
 * │    • Sub-router for /api/genre, /api/type, /api/status               │
 * │    • Groups related endpoints under a shared prefix                   │
 * └────────────────────────────────────────────────────────────────────────┘
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5 — DATA FLOW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The data flow is strictly unidirectional:
 *
 *   External Site (anikototv.to)
 *          │
 *          │  Raw HTML
 *          ▼
 *   ┌──────────────┐
 *   │   AxIOS       │  HTTP GET with browser-like headers
 *   └──────┬───────┘
 *          │
 *          ▼
 *   ┌──────────────┐
 *   │   Cheerio     │  DOM traversal & data extraction
 *   └──────┬───────┘
 *          │
 *          │  Structured JS objects
 *          ▼
 *   ┌──────────────┐
 *   │   Extractor   │  Normalizes data shapes across endpoints
 *   └──────┬───────┘
 *          │
 *          ▼
 *   ┌──────────────┐
 *   │   Controller  │  Wraps in { success, data } envelope
 *   └──────┬───────┘
 *          │
 *          ▼
 *   ┌──────────────┐
 *   │   LRU Cache   │  Stores for endpoint-specific TTL
 *   └──────┬───────┘
 *          │
 *          │  JSON
 *          ▼
 *   ┌──────────────┐
 *   │   Express     │  GZIP compression + CORS headers
 *   └──────┬───────┘
 *          │
 *          ▼
 *   ┌──────────────┐
 *   │   Vercel CDN  │  Edge caching + TLS
 *   └──────┬───────┘
 *          │
 *          ▼
 *        Client
 *
 *  Key data transformation points:
 *
 *  1. Raw HTML → Cheerio DOM (Axios + Cheerio.load)
 *  2. Cheerio DOM → Plain objects (extractor logic)
 *  3. Plain objects → JSON envelope (controller)
 *  4. JSON string → GZIP bytes (compression middleware)
 *  5. GZIP bytes → HTTP response (Vercel edge)
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6 — MIRROR FAILOVER STRATEGY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The API scrapes from a network of 5 mirror domains, all serving the same
 * content. The mirror.helper.js module manages automatic failover:
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │                     MIRROR DOMAINS                                   │
 *  ├──────┬──────────────────┬──────────────┬────────────────────────────┤
 *  │  #   │  Domain          │  Role        │  Notes                     │
 *  ├──────┼──────────────────┼──────────────┼────────────────────────────┤
 *  │  1   │  anikototv.to    │  Primary     │  Default fallback          │
 *  │  2   │  anikoto.cz      │  Regional    │  Central Europe            │
 *  │  3   │  anikoto.me      │  Short TLD   │  Compact URL               │
 *  │  4   │  anikoto.net     │  Network     │  Alternative DNS           │
 *  │  5   │  anikototv.se    │  Nordic      │  Sweden / Nordic region    │
 *  └──────┴──────────────────┴──────────────┴────────────────────────────┘
 *
 *  Failover Algorithm:
 *
 *    1.  On request, select the next mirror (round-robin pointer).
 *    2.  Attempt HTTP GET via Axios with 5-second timeout.
 *    3.  On success (2xx):
 *          • Cache the successful mirror domain (TTL: 1 hour).
 *          • Return HTML to the caller.
 *    4.  On failure (4xx/5xx/timeout/network error):
 *          • Log the failure.
 *          • Move to the next mirror in the list.
 *          • Repeat steps 2-4 up to 5 attempts (one per mirror).
 *    5.  If all mirrors fail:
 *          • Throw an error propagated to the controller.
 *          • Controller returns { success: false, error: "..." }.
 *
 *  Mirror Health Cache:
 *    • Key:   domain string
 *    • Value: timestamp of last successful fetch
 *    • TTL:   1 hour
 *    • Effect: Recently successful mirrors are tried first.
 *
 *  Edge Cases:
 *    • Circular failover prevents infinite loops (max 5 attempts).
 *    • Timeout per mirror: 5000ms (configurable).
 *    • All mirrors share the same origin content; no consistency risk.
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7 — CACHING STRATEGY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * An in-memory LRU (Least Recently Used) cache sits between controllers
 * and extractors, eliminating redundant upstream requests.
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │                    CACHE TTL MATRIX                                  │
 *  ├──────────────────────────────┬───────────────────────────────────────┤
 *  │  Endpoint Category           │  TTL                                 │
 *  ├──────────────────────────────┼───────────────────────────────────────┤
 *  │  Trending / Spotlight        │  3 minutes                           │
 *  │  Anime Info / Search         │  5–10 minutes                        │
 *  │  Episodes / Stream Info      │  5 minutes                           │
 *  │  Genres / Types / Status     │  60 minutes                          │
 *  │  Mirror health               │  60 minutes                          │
 *  │  Home Page                   │  5 minutes                           │
 *  │  Schedule                    │  10 minutes                          │
 *  │  Watch Order                 │  60 minutes                          │
 *  └──────────────────────────────┴───────────────────────────────────────┘
 *
 *  Cache Key Format:
 *    `{endpoint}:{normalized_params}`
 *
 *    Examples:
 *      "animeInfo:one-piece"
 *      "search:naruto"
 *      "episodeList:one-piece-100"
 *      "filter:action:page-2"
 *
 *  LRU Configuration:
 *    • Max entries: Unbounded (Map-based, no eviction by count).
 *    • Eviction:   TTL-based only (per-endpoint expiration).
 *    • Storage:    JavaScript Map (in-process memory).
 *    • Persistence: None (lost on cold start; acceptable for scraping).
 *
 *  Cache Flow:
 *
 *    Controller
 *       │
 *       ▼
 *    cache.get(key)
 *       │
 *       ├── HIT  → return cached data (no extractor call)
 *       │
 *       └── MISS → call extractor
 *                      │
 *                      ▼
 *                  cache.set(key, data, ttl)
 *                      │
 *                      ▼
 *                  return data
 *
 *  Thread Safety:
 *    Node.js is single-threaded per event loop tick. The LRU Cache Map
 *    operations (get/set/delete) are atomic. No locking required.
 *
 *  Memory Impact:
 *    Average cached entry: ~2 KB JSON.
 *    Typical active entries: ~200–500.
 *    Peak memory: ~1 MB (negligible).
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8 — RATE LIMITING & COMPRESSION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  RATE LIMITING                                                       │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │                                                                      │
 * │  • Algorithm: Sliding window counter (per IP)                        │
 * │  • Limit:     100 requests per 15-minute window                      │
 * │  • Storage:   In-memory (Map keyed by IP address)                    │
 * │  • Response:  HTTP 429 Too Many Requests                             │
 * │  • Headers:   X-RateLimit-Limit, X-RateLimit-Remaining,             │
 * │               X-RateLimit-Reset                                      │
 * │                                                                      │
 * │  Notes:                                                              │
 * │  • Vercel serverless instances are ephemeral; the rate limit map     │
 * │    resets on cold start. This is acceptable for a public scraping    │
 * │    API — the limit deters abuse but does not need to be absolute.    │
 * │  • IP is extracted from req.ip (trusts Vercel's X-Forwarded-For).   │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  GZIP COMPRESSION                                                    │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │                                                                      │
 * │  • Library:   compression 1.7 (Express middleware)                   │
 * │  • Algorithm: gzip (deflate fallback)                                │
 * │  • Threshold: 1 KB (responses smaller than this are sent raw)        │
 * │  • Level:     Default (6) — balanced speed / ratio                   │
 * │                                                                      │
 * │  Typical Compression Ratios:                                         │
 * │  • JSON responses: 70–85% reduction                                  │
 * │  • Large list endpoints: 60–75% reduction                            │
 * │  • Streaming data: 50–65% reduction                                  │
 * │                                                                      │
 * │  Bypass:                                                             │
 * │  • Clients can send Accept-Encoding: identity to opt out             │
 * │  • Vercel CDN may serve pre-compressed responses at edge             │
 * └──────────────────────────────────────────────────────────────────────┘
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 9 — ERROR HANDLING STRATEGY
// ═══════════════════════════════════════════════════════════════════════════

/**
 *  Error responses follow a consistent envelope format:
 *
 *    {
 *      "success": false,
 *      "error": {
 *        "code": 404,
 *        "message": "Anime not found"
 *      }
 *    }
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  ERROR CATEGORIES                                                    │
 *  ├─────────────────────────────┬────────────────────────────────────────┤
 *  │  Category                   │  Handling                             │
 *  ├─────────────────────────────┼────────────────────────────────────────┤
 *  │  400 Bad Request            │  Missing/invalid query params         │
 *  │  404 Not Found              │  Unknown route or missing resource     │
 *  │  429 Too Many Requests      │  Rate limit exceeded                  │
 *  │  500 Internal Server Error  │  Unhandled exceptions                 │
 *  │  502 Bad Gateway            │  All mirrors failed upstream fetch    │
 *  │  503 Service Unavailable    │  Upstream site unreachable            │
 *  └─────────────────────────────┴────────────────────────────────────────┘
 *
 *  Error Propagation Chain:
 *
 *    Source Site Error / Timeout
 *          │
 *          ▼
 *    Axios throws (ECONNREFUSED, ETIMEDOUT, 4xx/5xx status)
 *          │
 *          ▼
 *    Extractor catches and re-throws with context:
 *      { message: "...", originalError: err }
 *          │
 *          ▼
 *    Controller catches and formats JSON response:
 *      res.status(502).json({ success: false, error: { code, message } })
 *
 *  Global Error Handler:
 *    • An Express error-handling middleware (4 params) catches any
 *      unhandled exceptions that escape controller-level try/catch.
 *    • Returns 500 with a generic error message (no stack trace in prod).
 *
 *  Timeout Handling:
 *    • Axios request timeout: 10,000ms (10 seconds)
 *    • Mirror failover timeout: 5,000ms per mirror
 *    • Total worst-case latency: 5 mirrors × 5s = 25s (exceeds Vercel limit)
 *    • Mitigation: First successful mirror is cached; subsequent requests
 *      hit the cached mirror first, reducing average latency to <1s.
 *
 *  Source Site Changes:
 *    • If anikototv.to changes its HTML structure, extractors will return
 *      empty or malformed data.
 *    • Controllers detect missing required fields and return appropriate
 *      error messages rather than empty objects.
 *    • Monitoring via test.js integration suite (35 tests) catches
 *      structural regressions.
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 10 — SECURITY CONSIDERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  CORS POLICY                                                         │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │  • Configured via the 'cors' Express middleware.                     │
 *  │  • Default: Allow all origins (*) for public API usage.             │
 *  │  • Restrictable via environment variable CORS_ORIGIN.               │
 *  │  • Credentials: Not required (stateless API).                       │
 *  │  • Methods: GET only.                                               │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  INPUT VALIDATION                                                    │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │  • Query parameters are sanitized before use in URL construction.   │
 *  │  • Path parameters are URL-encoded where necessary.                 │
 *  │  • No user-supplied data is interpolated into HTML templates.        │
 *  │  • Search queries are passed as-is to upstream (no injection).      │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  SECRETS MANAGEMENT                                                  │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │  • No API keys, tokens, or secrets in the codebase.                 │
 *  │  • Vercel environment variables (if any) are not committed.         │
 *  │  • .gitignore excludes node_modules, .env, .vercel.                 │
 *  │  • All upstream requests use public, non-authenticated endpoints.   │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  DEPENDENCY SECURITY                                                 │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │  • npm audit runs in CI pipeline.                                   │
 *  │  • Dependencies pinned to exact versions in package.json.           │
 *  │  • Minimal dependency footprint (6 runtime deps).                   │
 *  │  • No file system writes by the application (Vercel constraint).    │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  RATE LIMITING AS SECURITY                                           │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │  • 100 req/15min per IP prevents scraping of the scraper.           │
 *  │  • Degrades gracefully — returns 429 with Retry-After header.       │
 *  │  • In-memory only — no persistence layer to protect.                │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  TRANSPORT SECURITY                                                  │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │  • All client ↔ API communication over HTTPS (Vercel default).      │
 *  │  • API ↔ upstream mirrors also uses HTTPS.                          │
 *  │  • HTTP requests to mirrors are auto-upgraded to HTTPS by Axios.    │
 *  └──────────────────────────────────────────────────────────────────────┘
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 11 — DEPLOYMENT (VERCEL SERVERLESS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  VERCEL ARCHITECTURE                                                 │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │                                                                      │
 *  │  ┌────────────┐     ┌──────────────────┐     ┌────────────────┐    │
 *  │  │  Global CDN │────▶│  Edge Network    │────▶│  Lambda (Node) │    │
 *  │  │  (300+ PoP) │     │  TLS + Routing   │     │  Serverless Fn │    │
 *  │  └────────────┘     └──────────────────┘     └────────┬───────┘    │
 *  │                                                        │             │
 *  │                                              ┌─────────▼────────┐   │
 *  │                                              │  /tmp (writable) │   │
 *  │                                              │  512 MB limit    │   │
 *  │                                              └──────────────────┘   │
 *  │                                                                      │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 *  Serverless Function Configuration:
 *    • Entry point:   api/index.js
 *    • Runtime:       Node.js 20.x (ESM)
 *    • Memory:        1024 MB (default)
 *    • Max duration:  10 seconds (Hobby), 60 seconds (Pro)
 *    • Max payload:   4.5 MB request, 5 MB response
 *
 *  Filesystem Constraints:
 *    • READ-ONLY:  /var/task, /var/runtime, project root
 *    • WRITABLE:   /tmp only (ephemeral, 512 MB, not shared across instances)
 *    • The API never writes to disk; this constraint is irrelevant here.
 *
 *  Cold Start Behavior:
 *    • First request after idle: ~300–800ms cold start overhead.
 *    • Subsequent requests (warm): <50ms overhead.
 *    • LRU cache is lost on cold start (in-memory only).
 *    • Cache repopulates naturally on first request per endpoint.
 *
 *  Deployment Pipeline:
 *
 *    1. Push to GitHub (main branch)
 *    2. Vercel auto-detects Node.js project
 *    3. npm install --production
 *    4. Vercel builds the serverless function
 *    5. Deploys to preview URL (PR) or production URL (main)
 *    6. Health check: GET /api/status → { success: true }
 *
 *  Environment Variables:
 *    • None required (API is fully self-contained).
 *    • Optional: CORS_ORIGIN (restrict CORS in production).
 *
 *  Monitoring:
 *    • Vercel Analytics (built-in)
 *    • Vercel Logs (real-time streaming)
 *    • test.js integration suite (manual or CI-triggered)
 *
 *  Rollback:
 *    • Vercel retains previous deployments.
 *    • One-click rollback via Vercel dashboard or CLI.
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 12 — TESTING STRATEGY
// ═══════════════════════════════════════════════════════════════════════════

/**
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  INTEGRATION TESTS (test.js)                                         │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │                                                                      │
 *  │  • 35 end-to-end tests covering all 28+ endpoints.                 │
 *  │  • Each test hits the live API and validates:                       │
 *  │    - HTTP status code (200, or expected error code)                 │
 *  │    - Response shape (success: true, data present)                   │
 *  │    - Data integrity (required fields exist, types correct)          │
 *  │    - No empty arrays where content is expected                      │
 *  │                                                                      │
 *  │  Run:  node test.js                                                  │
 *  │                                                                      │
 *  │  Test Categories:                                                    │
 *  │    • Home page data completeness                                    │
 *  │    • Anime info by slug (valid + invalid)                           │
 *  │    • Search with various queries (empty, exact, partial)            │
 *  │    • Episode list and AJAX loading                                  │
 *  │    • Stream info and resolver                                       │
 *  │    • Schedule, spotlight, trending                                  │
 *  │    • Top 10, suggestions, random                                   │
 *  │    • Popular, filter, A-Z list                                      │
 *  │    • New release, status, trending sidebar                          │
 *  │    • Seasons, watch order, download                                 │
 *  │    • Upcoming, rankings, recently updated                           │
 *  │    • Completed anime, category (genre/type/status)                  │
 *  │    • Error cases (404, invalid params)                              │
 *  │                                                                      │
 *  │  Exit Codes:                                                         │
 *  │    0  — All tests passed                                             │
 *  │    1  — One or more tests failed                                    │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  AGENT CONFIGURATIONS (agents/)                                      │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │                                                                      │
 *  │  api-tester.md           — Automated endpoint testing persona      │
 *  │  backend-architect.md    — Architecture review persona              │
 *  │  devops-automator.md     — CI/CD and deployment persona             │
 *  │  performance-benchmarker.md — Load testing and profiling persona    │
 *  │  security-architect.md   — Security audit persona                   │
 *  │  technical-writer.md     — Documentation persona                    │
 *  │                                                                      │
 *  │  These files define specialized AI agent roles for code review,     │
 *  │  testing, and documentation tasks.                                  │
 *  └──────────────────────────────────────────────────────────────────────┘
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 13 — VERSIONING & CHANGELOG NOTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  VERSION HISTORY                                                     │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │                                                                      │
 *  │  v2.3.0  (Current)                                                  │
 *  │    • 28 endpoints, 28 extractors                                    │
 *  │    • LRU cache with per-endpoint TTL                                │
 *  │    • 5-mirror failover system                                       │
 *  │    • Vercel serverless deployment                                   │
 *  │    • 35 integration tests                                           │
 *  │    • OpenAPI 3.0 spec embedded in apiRoutes.js                     │
 *  │                                                                      │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 *  Semantic Versioning:
 *    MAJOR — Breaking changes to API response shapes or endpoint removal
 *    MINOR — New endpoints, new data fields (backward-compatible)
 *    PATCH — Bug fixes, extractor updates, dependency bumps
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION — APPENDIX: QUICK REFERENCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  ENDPOINT COUNT BY CATEGORY                                          │
 *  ├─────────────────────────────┬────────────────────────────────────────┤
 *  │  Discovery (browse)         │  home, trending, popular, spotlight,  │
 *  │                             │  topten, suggestion, random, schedule │
 *  │  Search & Filter            │  search, filter, azList, category     │
 *  │  Anime Detail               │  animeInfo, watchPage, status         │
 *  │  Episode & Stream           │  episodeList, episodeListAjax,        │
 *  │                             │  streamInfo, streamResolver, download │
 *  │  Lists                      │  newRelease, trendingSidebar,         │
 *  │                             │  topAnimeRankings, recentlyUpdated,   │
 *  │                             │  completedAnime, upcomingAnime        │
 *  │  Meta                       │  seasons, watchOrder                  │
 *  ├─────────────────────────────┼────────────────────────────────────────┤
 *  │  TOTAL                      │  28 endpoints                         │
 *  └─────────────────────────────┴────────────────────────────────────────┘
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  DEPENDENCY SUMMARY (6 runtime packages)                             │
 *  ├─────────────────────────────┬────────────────────────────────────────┤
 *  │  express        4.21        │  Web framework                        │
 *  │  cheerio        1.0         │  Server-side HTML parser              │
 *  │  axios          1.8         │  HTTP client                          │
 *  │  compression    1.7         │  GZIP middleware                      │
 *  │  lru-cache      (built-in)  │  In-memory cache (Map-based)         │
 *  │  cors           (built-in)  │  CORS middleware                      │
 *  └─────────────────────────────┴────────────────────────────────────────┘
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  PERFORMANCE CHARACTERISTICS                                         │
 *  ├─────────────────────────────┬────────────────────────────────────────┤
 *  │  Cold start (first req)     │  ~300–800ms                          │
 *  │  Warm request (cache hit)   │  <10ms                               │
 *  │  Warm request (cache miss)  │  500ms–2s (upstream fetch + parse)    │
 *  │  Worst case (all mirrors)   │  ~25s (5 × 5s timeout)              │
 *  │  Response size (compressed) │  2–50 KB depending on endpoint       │
 *  │  Memory per instance        │  ~5–15 MB (Node + cache)             │
 *  └─────────────────────────────┴────────────────────────────────────────┘
 */

// ══════ END: architecture.md ══════
