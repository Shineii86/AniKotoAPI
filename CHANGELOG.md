# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2026-08-14

### Added
- **Streaming Status Warning**: Added ⚠️ Streaming Status section to README documenting which endpoints work vs which are blocked by upstream anti-bot protection
- **Streaming Fix Solutions**: Added SCRAPER_API_KEY and FLARESOLVERR_URL environment variable solutions to README for bypassing Cloudflare bot protection
- **Upstream Error Detection**: Added detection of upstream API error responses (`status >= 400`) in `streamInfo.extractor.js` — returns HTTP 502 with descriptive error instead of silently returning null URL
- **Cookie-Aware Session Establishment**: Added session cookie fetching in `extractStreamInfo` and `extractServerList` — fetches watch/home page to capture `set-cookie` headers before AJAX requests
- **Optional Slug Parameter**: `getStreamInfo` controller now accepts optional `?slug=` query parameter for session establishment

### Changed
- **Version**: Bumped to 2.3.0
- **README**: Updated version badge from 2.2.1 to 2.3.0
- **README**: Added streaming status warning with solutions table
- **Docs**: Updated index.md, endpoints.md, streaming.md with streaming status warnings and v2.3.0 references

### Fixed
- **CRITICAL**: Fixed `/api/stream` returning `null` URL — upstream AJAX endpoints (`/ajax/server?get=`, `/ajax/server/list?servers=`) require session cookies; now properly detects upstream 500 errors and returns HTTP 502 with error message

## [2.2.2] - 2026-08-14

### Fixed
- **CRITICAL**: Fixed `/api/stream` returning `null` URL — root cause was AJAX endpoints (`/ajax/server?get=`, `/ajax/server/list?servers=`) require session cookies from the watch page; `fetchWithMirror` didn't persist cookies between requests, causing upstream to return `{status:500, result:"Bad request"}`
- Fixed `streamInfo.extractor.js` `extractStreamInfo` to establish session with cookies before AJAX requests — fetches watch page or home page to capture `set-cookie` headers and passes them with the AJAX request
- Fixed `streamInfo.extractor.js` `extractServerList` to establish session with cookies before AJAX requests (same cookie-aware pattern)
- Fixed `streamInfo.controller.js` `getStreamInfo` to accept optional `slug` query parameter and pass it to extractor for session establishment
- Fixed `streamInfo.controller.js` `getStreamInfo` to return HTTP 502 (Bad Gateway) with error message for upstream API failures instead of silently returning null URL
- Fixed upstream error detection in both extractors — detects `status >= 400` and non-JSON error strings from upstream API

## [2.2.1] - 2026-08-12

### Fixed
- **CRITICAL**: Fixed `streamInfo.extractor.js` `extractServerList` not parsing JSON response — `fetchWithMirror` returns raw text by default, causing Cheerio to parse a JSON string as HTML, resulting in empty server arrays (null values)
- **CRITICAL**: Fixed `streamInfo.extractor.js` `extractMapperServers` not parsing JSON response — same raw text issue caused the data processing loop to be skipped entirely, returning empty arrays
- **CRITICAL**: Fixed `creatorInfo.js` middleware overwriting error messages — the `message` field from creatorInfo was replacing actual error messages, making debugging impossible (all 500 errors showed "Built with ❤️ by Shinei Nouzen" instead of the real error)
- Fixed `streamInfo.controller.js` `getStreamInfo` to return 404 with error message when stream URL is null instead of silently returning null values
- Fixed `streamInfo.controller.js` `getServerList` to return 404 with error message when server list is empty instead of returning empty array with no indication
- Fixed `streamInfo.controller.js` to use `TTL.stream` instead of `TTL.default` for stream info caching (stream URLs rotate frequently)
- Fixed `streamInfo.controller.js` to use `TTL.servers` instead of `TTL.default` for server list caching
- Fixed `episodeList.extractor.js` JSON.parse error handling — added try/catch around JSON parsing to prevent uncaught exceptions
- Fixed `episodeListAjax.extractor.js` JSON.parse error handling — added try/catch around JSON parsing to prevent uncaught exceptions
- Fixed `schedule.extractor.js` — changed from incorrect `/?date=` URL to proper `/ajax/schedule?date=` AJAX endpoint with JSON parsing
- Fixed `seasons.extractor.js` — updated CSS selectors to handle new HTML structure where items use `data-tip` attribute instead of `<a>` tags
- Fixed `watchOrder.extractor.js` — updated CSS selectors to handle new HTML structure, added fallback to `data-tip` attribute for slugs, fixed type/episodes field extraction from `.meta .dot` elements

## [2.2.0] - 2026-07-28

### Added
- **Stream Resolve Endpoint**: `GET /api/stream/resolve?id=&slug=` — Resolves actual m3u8/mp4 URLs from embed player URLs (vidtube.site → megaplay API → m3u8 playlist)
- **Stream Qualities Endpoint**: `GET /api/stream/qualities?url=` — Parses M3U8 playlists for available quality options with resolution, bandwidth, and URLs
- **M3U8 Proxy Endpoint**: `GET /api/stream/proxy?url=` — Rewrites M3U8 playlists to proxy through API for CORS-free HLS playback
- **TS Proxy Endpoint**: `GET /api/stream/ts-proxy?url=` — Proxies `.ts` video segments with proper `Content-Type: video/mp2t` and CORS headers
- **Stream Resolver Extractor**: Full pipeline for resolving actual video URLs from embed pages
- **M3U8 Quality Parser**: Parses master playlists to extract quality options sorted by resolution
- **Server Name Normalization**: Maps display names to clean identifiers (VidPlay-1 → vidplay, HD-1 → hd)
- **Subtitle Extraction**: Extracts subtitle tracks from streaming API responses
- **Embed API Domain Mapping**: Maps vidtube.site → megaplay-1.buzz for stream resolution
- **Shared Helper**: New `parseListItem.helper.js` for unified anime list item parsing across all extractors
- **Graceful Shutdown**: Server now handles SIGTERM/SIGINT signals for clean shutdown
- **Request ID Tracking**: Every request gets a unique `X-Request-Id` header for debugging
- **CSP Headers**: Added `Content-Security-Policy` header for XSS protection
- **HSTS Headers**: Added `Strict-Transport-Security` header for HTTPS enforcement
- **Body Size Limits**: Added `express.json({ limit: '10kb' })` to prevent large payload attacks
- **Rate Limiter Cleanup**: Automatic cleanup of stale IP entries every 5 minutes
- **Uncaught Exception Handler**: Added handler for uncaught exceptions with graceful shutdown
- **Upcoming Anime Endpoint**: `GET /api/upcoming` — upcoming anime releases from homepage
- **Top Anime Rankings Endpoint**: `GET /api/top-rankings?sort=top|newest` — ranked anime with sort modes
- **Recently Updated Tabs Endpoint**: `GET /api/recently-updated?tab=all|dub|sub` — filtered updates
- **Completed Anime Endpoint**: `GET /api/completed` — finished anime series from homepage
- **Enhanced Filter**: Added `source`, `epMin`, `epMax`, `excludeWatchlist` parameters to `/api/filter`
- **Source IDs Config**: New `SOURCE_IDS` mapping for 18 source material types
- **Season IDs Config**: New `SEASON_IDS` mapping for 4 broadcast seasons
- **Extended Type IDs**: Added `tv-short` and `tv-special` type mappings

### Changed
- **Mirror Fallback**: All 22+ extractors now use `fetchWithMirror()` for consistent mirror fallback
- **Mirror Helper**: 404 responses no longer mark mirrors as failed — only connection errors trigger failover
- **Seasons Extractor**: Rewritten to extract from watch page sidebar (AJAX endpoints don't exist on source site)
- **Watch Order Extractor**: Rewritten to extract from watch page sidebar trending/related sections
- **Stream Info Extractor**: Now establishes session before AJAX calls, normalizes server names, adds type field
- **Code Deduplication**: Extracted shared list item parsing logic into `parseListItem.helper.js`, eliminating ~200 lines of duplicated code across 8+ extractors
- **Documentation**: All files follow strict documentation style — box-style headers, section separators, feature markers, JSDoc params/returns, inline notes, and module footers
- **Version**: Bumped to 2.2.0
- **Package**: Removed unused `cors` dependency (custom CORS middleware used instead)
- **README**: Updated all endpoint counts, features, and streaming flow documentation
- **Docs**: Updated endpoints.md, streaming.md, architecture.md, examples.md with new endpoints

### Fixed
- **Middleware Order**: Moved request timeout middleware before routes to properly catch timeouts
- **CORS POST**: Fixed CORS to allow POST method for `/api/mirrors/reset` endpoint
- **HomeInfo Cache**: Removed redundant cache check in `homeInfo.extractor.js` (controller already handles caching)
- **Error Handler**: Added `res.headersSent` check to prevent double response on timeout
- **Unused Imports**: Removed unused `cheerio`, `axios`, `headers` imports from extractors that now use `fetchWithMirror`
- **Watch Page Path**: Fixed `/api/watch` 500 error — path format changed from `/slug/ep` to `/slug/ep-N`
- **Info Endpoint**: Now accepts both `?id=` and `?slug=` params for flexibility
- **Status Names**: Fixed `/api/status/airing` 500 — added status name mapping (ongoing→currently-airing, completed→finished-airing)
- **Top Rankings**: Fixed selectors to match actual HTML (`#top-anime .scaff.side.items a.item`) with rank class extraction
- **Completed Anime**: Fixed selectors for `section.top-table[data-name='completed']`
- **Recently Updated**: Fixed selectors for `#recent-update .ani.items .item` with client-side tab filtering

### Removed
- **Unused Dependency**: Removed `cors` package from dependencies (custom middleware handles CORS)
- **Dead Code**: Removed redundant cache check in `homeInfo.extractor.js`

## [2.1.0] - 2026-07-05

### Changed
- **UI**: Complete redesign of all HTML pages with Claude/Anthropic design system
- **UI**: Warm cream canvas (#faf9f5) replacing dark purple theme
- **UI**: Coral accent (#cc785c) replacing gradient purple/pink
- **UI**: Slab-serif headlines (Cormorant Garamond) with negative letter-spacing
- **UI**: Dark navy product surfaces (#181715) for code blocks and footer
- **UI**: Light cream feature cards (#efe9de)
- **UI**: Removed ambient orbs, particles, glitch effects, scanlines
- **UI**: Minimal shadows with color-block depth philosophy
- **Version**: Bumped to 2.1.0

## [2.0.2] - 2026-07-05

### Fixed
- **Documentation**: Fixed streaming flow guide — `/api/episodes/:slug` corrected to `/api/episodes/:animeId`
- **Documentation**: Fixed all examples using `road-of-naruto-ggjw8` slug for episodes to use `958` animeId
- **Documentation**: Fixed JavaScript/Node.js streaming examples to use `animeId` parameter instead of `animeSlug`
- **Documentation**: Updated cURL examples to use correct animeId (958) for episodes endpoint
- **Documentation**: Updated architecture.md streaming flow diagram to reflect correct endpoint

## [2.0.1] - 2026-07-05

### Fixed
- **Documentation**: Fixed `/api/servers` parameter description — now correctly states `server_ids` from `/episodes` response (base64-encoded) instead of generic "Episode IDs"
- **Documentation**: Fixed `/api/servers` sample response to match actual API output (flat array with `type`, `ep_id`, `link_id`, `cmid`, `sv_id`, `name`)
- **Documentation**: Added `/api/stream` quick reference section with parameter docs and example response
- **Documentation**: Added note that `/api/stream` requires lowercase `id` parameter (case-sensitive)

## [2.0.0] - 2026-07-04

### Added
- **Pagination Metadata**: All list endpoints now include `pagination` object with `currentPage`, `totalPages`, `totalItems`, `itemsPerPage`, `hasNext`, `hasPrev`
- **Creator Info Middleware**: Injects creator attribution (name, GitHub, Telegram, message, timestamp) into every JSON response
- **Multi-Mirror Fallback System**: Automatic failover across 5 mirror domains (anikototv.to, anikoto.cz, anikoto.me, anikoto.net, anikototv.se)
- **LRU Cache with Configurable TTL**: Replaced basic Map cache with LRU cache supporting per-endpoint TTL (3min to 60min)
- **Response Compression**: Added gzip compression middleware (level 6, 1024 byte threshold)
- **Cache Statistics Endpoint**: `/api/cache/stats` returns hits, misses, sets, deletes, size, hitRate
- **Mirror Status Endpoint**: `/api/mirrors` shows health status and latency for all domains
- **Mirror Reset Endpoint**: `/api/mirrors/reset` clears mirror cache and failed state
- **Seasons Endpoint**: `/api/seasons/:id` returns all seasons/OVAs/movies for an anime
- **Watch Order Endpoint**: `/api/watch-order/:id` returns related anime with relationship types
- **Latest Updated Endpoint**: `/api/latest-updated` returns recently updated anime sorted by update time
- **Download Endpoint**: `/api/download?slug=&ep=` returns decoded download links from base64 data
- **Configurable Rate Limiting**: `RATE_LIMIT` and `RATE_WINDOW` env vars for customization
- **Request Timeout**: Configurable via `REQUEST_TIMEOUT` env var (default 30s)
- **Rate Limit Headers**: `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers
- **Retry-After Header**: Included in 429 responses with seconds until reset
- **Environment Variables**: Added `MIRROR_DOMAINS`, `MIRROR_CACHE_TTL`, `CACHE_MAX_SIZE`, `CACHE_DEFAULT_TTL`
- **Test Suite**: Added 27 endpoint tests with performance metrics and optional endpoint handling
- **OpenAPI Spec**: Added `/api/mirrors`, `/api/mirrors/reset`, `/api/latest-updated`, `/api/download` to spec

### Changed
- **BREAKING**: All extractors now use mirror fallback helper for resilience
- **BREAKING**: Cache system upgraded from simple Map to LRU with eviction
- **BREAKING**: Rate limiting now configurable via environment variables
- Updated `extractPages.helper.js` to use `fetchWithMirror` instead of direct axios
- Updated `homeInfo.extractor.js` to use mirror fallback
- Updated `episodeListAjax.extractor.js` to use mirror fallback
- Updated all controllers to use endpoint-specific TTL values
- Updated `.env.example` with all new configuration options
- Updated `test.js` with optional endpoint handling and performance metrics

### Fixed
- **CRITICAL**: Fixed `extractPages` URL handling bug causing doubled URLs in mirror fallback
- **CRITICAL**: Fixed `creatorInfo` middleware not including `message` field in responses
- Fixed header merging bug in mirror helper (custom headers were ignored)
- Fixed mirror URL construction (proper base URL handling)
- Fixed cache key sorting in filter controller
- Fixed trailing slash inconsistency in console output
- Fixed inconsistent error handling across extractors

### Removed
- Removed `og-image.svg` and `logo.png` (replaced by `share.png`)
- Removed unused `cookie-parser` dependency (was already removed in v1.8.0)

## [1.9.0] - 2026-06-09

### Fixed
- **CRITICAL**: Added global Express error handler (returns JSON instead of HTML)
- **CRITICAL**: Removed caching from random endpoint (defeated purpose)
- **CRITICAL**: Renamed share.jpg to share.png (MIME type mismatch)
- **CRITICAL**: Fixed OG image dimensions (630 → 601)
- **CRITICAL**: Fixed manifest.json icon sizes (192x192 → 512x512)
- **CRITICAL**: Fixed implicit global event variable in console
- **CRITICAL**: Added 9 missing endpoints to docs/endpoints.md
- Imported version from package.json (no hardcoded drift)
- Added dynamic endpoint count in stats
- Added input sanitization for mapper API (SSRF prevention)
- Added homepage caching (reduced 5 duplicate HTTP requests)
- Added rate limiting (100 requests/minute per IP)
- Added rel="noopener noreferrer" to all target="_blank" links
- Fixed trailing slash inconsistency in console
- Added noindex meta to 404.html
- Fixed docs/architecture.md controller filenames and dependency versions
- Fixed README.md dependency versions
- Added 12 missing endpoint tests
- Added escapeHtml helper for error messages
- Consistent favicon across all pages
- Added meta descriptions to privacy.html and tos.html
- Added OG/Twitter meta tags to privacy.html and tos.html
- Added aria-label to playground inputs
- Added aria-hidden to decorative SVGs
- Synced Twitter description with OG description
- Fixed robots.txt to disallow /api
- Added PWA fields to manifest.json
- Removed 5 unused imports
- Removed unused cookie-parser dependency
- Fixed inconsistent error handling in extractors
- Fixed resolvedSlug returning numeric ID
- Added /watch endpoint to streaming docs
- Improved test assertions and status code validation
- Deleted orphaned og-image.svg and logo.png
- Removed redundant try/catch from extractPages
- Added max size eviction to cache
- Added cache key sorting in filter controller
- Added author meta tag
- Fixed favicon.svg font

### Changed
- Version bumped to 1.9.0

## [1.8.0] - 2026-06-08

### Fixed
- **CRITICAL**: `extractPages.helper.js` — Pagination URL bug (`?page` → `&page` when URL already has query params)
- **CRITICAL**: `package.json` — Fixed invalid dependency versions (axios ^1.7.0, dotenv ^16.4.0, express ^4.21.0)
- `privacy.html` + `tos.html` — Fixed broken footer links (`//tos` → `/tos`, `//privacy` → `/privacy`)
- `manifest.json` — Fixed invalid icon purpose (`"any maskable"` → `"maskable"`)
- `server.js` — Removed duplicate CORS middleware (was using both `cors()` package and custom middleware)
- `server.js` — Removed unused `cors` import
- `server.js` — Added `__dirname` computation (was missing)
- `search.controller.js` — Fixed cache key collision with suggestion controller
- `apiRoutes.js` — Made endpoint count dynamic (was hardcoded 27)
- Updated endpoint count from 27→30 across all documentation files
- Fixed axios version in package.json (^1.7.0 → ^1.8.0)
- `vercel.json` — Removed duplicate CORS header (server.js handles it)

### Changed
- `header.config.js` — Updated User-Agent to Chrome 130 (was Chrome 120)
- `dataUrl.js` — Removed redundant `anikototv.to` from ALT_DOMAINS
- `category.extractor.js` — Removed unused `cheerio` import
- `test.js` — Updated test script in package.json to actually run tests
- Version bumped to 1.8.0

### Security
- Unified CORS handling in server.js (single middleware instead of triple)
- Removed Vercel-level CORS header (Express handles it)
- Fixed XSS potential in index.html error display (used textContent pattern)

## [1.7.3] - 2026-06-08

### Fixed
- Health endpoint typo: `s` → `seconds` in uptime string formatting
- Request counter middleware moved before route registrations (was never executing)
- Request counter now properly tracks all API requests and errors

## [1.7.2] - 2026-06-08

### Added
- `docs/` folder with complete API documentation using real live API data
  - `docs/index.md` — Overview, quick start with real responses
  - `docs/endpoints.md` — Full API reference (27 endpoints with real data)
  - `docs/streaming.md` — Streaming flow guide (3-step with real data)
  - `docs/examples.md` — Code examples in cURL, JavaScript, Python, Node.js (all tested)
  - `docs/architecture.md` — Project structure, tech stack, design decisions
- `/api/health` — Health check endpoint (uptime, version, memory)
- `/api/stats` — Cache & API statistics (requests, errors, success rate)
- `/api/openapi` — OpenAPI 3.0.3 specification
- Security headers: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- Request counter middleware for statistics
- `CONTRIBUTING.md` — Contribution guidelines
- `test.js` — Integration test suite (18 endpoints)

### Fixed
- Clean URLs: `/tos` and `/privacy` instead of `/tos.html` and `/privacy.html`
- Added Express routes for clean URL serving
  - `docs/architecture.md` — Project structure, tech stack, design decisions

### Fixed
- `episodeList.extractor.js` — Parse AJAX JSON response, extract `server_ids`, `timestamp`, `mal_id`
- `streamInfo.extractor.js` — Parse server list HTML into structured objects
- `streamInfo.extractor.js` — Parse stream URL from JSON response properly
- Added cheerio import to streamInfo extractor for HTML parsing

## [1.7.1] - 2026-06-08

### Changed
- Updated all Vercel URLs from `anikoto.vercel.app` to `anikototvapi.vercel.app`
- Updated across 80 references in HTML, JS, MD, XML, SVG, JSON files

## [1.7.0] - 2026-06-08

### Changed
- **BREAKING**: Rebranded entire project from `AniKatoAPI` to `AniKotoAPI`
- Renamed all references across 66 files (controllers, extractors, configs, routes)
- Updated README.md, package.json, server.js, all public pages
- Updated GitHub repository URLs from `AniKatoAPI` to `AniKotoAPI`
- Updated Vercel URLs from `anikato.vercel.app` to `anikototvapi.vercel.app`
- Preserved `anikototv.to` domain references (source website, not project name)

## [1.6.0] - 2026-06-08

### Added
- `public/manifest.json` — PWA manifest with theme color, icons, display mode
- `public/robots.txt` — Crawler directives and sitemap reference
- `public/sitemap.xml` — XML sitemap with homepage, API, privacy, and terms pages
- `public/og-image.svg` — SVG Open Graph image with gradient design, title, and tagline
- `public/privacy.html` — Full privacy policy (data collection, third-party, DMCA, cookies)
- `public/tos.html` — Full terms of service (acceptable use, rate limits, liability, DMCA)

### Changed
- Completely rebuilt `public/index.html` from scratch (premium UI/UX)
- Replaced all emojis with inline SVG icons throughout the entire page
- Hero section now features a live interactive API console (fetch, run, see JSON response)
- Console has preset buttons (Home, Search, Stream, Random, Schedule) with one-click switching
- Added scroll-reveal animations via IntersectionObserver (no external libraries)
- Added animated particle system via canvas (60 particles, purple-tinted)
- Added glassmorphism sticky header with scroll-aware background blur
- Added stats section with animated counters (counts up on viewport entry)
- Added infinite scrolling marquee with feature highlights and SVG icons
- Added endpoint explorer with sidebar navigation, multi-language code tabs (cURL, JS, Python)
- Added playground section with 4 interactive cards (search, stream, random, schedule)
- Added CTA section with gradient background
- Added full footer with 4-column grid (brand, API links, resources, legal)
- Rebuilt `public/404.html` with glitch animation effect, scanlines, and SVG icons
- All CSS uses custom properties, no external frameworks

## [1.5.5] - 2026-06-08

### Changed
- Completely redesigned `public/index.html` landing page (AniNewsAPI style)
- Dark theme with ambient floating orb animations, glassmorphism cards, sticky header
- Hero section with terminal-style API preview and animated gradient text
- Stats ribbon (24+ endpoints, 0 API keys, 40+ genres, live data)
- Features grid with 6 cards (search, streaming, metadata, schedule, filters, caching)
- Interactive API endpoint documentation with expandable cards, parameter tables, code examples
- "Try It Live" playground with 4 interactive demos (search, stream, random, schedule)
- Responsive mobile design
- Redesigned `public/404.html` with animated 404 code, floating animation, action buttons

## [1.5.4] - 2026-06-08

### Changed
- Restructured API Endpoints section to match HiAnime-Api documentation style
- Added category headers with blockquote format: `> ## 🏠 GET Home Info`
- Each endpoint now has: Endpoint path, Parameters table, Example of request (curl + JS), Sample Response
- 19 documentation sections covering all API endpoints

## [1.5.3] - 2026-06-08

### Fixed
- Replaced ALL placeholder/example responses in README with real live API data
- Every endpoint now shows actual data from anikototv.to (One Piece, Solo Leveling, Digimon, etc.)
- No more dummy "Anime Title" or generic placeholder objects

## [1.5.2] - 2026-06-08

### Added
- Disclaimer section (educational purposes, 3rd party media, no affiliation)
- Render deploy button alongside Vercel
- JavaScript `import axios` code examples for all 25 API endpoints

## [1.5.1] - 2026-06-08

### Fixed
- Added missing example responses to README for 11 endpoints: episodes-ajax, stream, servers, mapper-servers, new-release, newly-added, schedule, filter, genre/:name, type/:name, status/:name
- All 24 API endpoints now have collapsible live example responses in documentation

## [1.5.0] - 2026-06-08

### Changed
- Complete documentation rewrite of ALL source files (50+ files)
- Added box-style header comments (Project, Author, License) to every file
- Added section headers using double-line box decorators (`═════`)
- Added feature markers (`// ---- FEATURE: XYZ ----`) before every major function
- Added JSDoc comments for EVERY function with @param, @returns, @example
- Added inline notes (NOTE, WARNING, TIP) for non-obvious logic
- Added footer END markers to every module/file
- Matched code style to AlisaReactionBot repository format
- All files now searchable by feature name via grep

## [1.4.0] - 2026-06-08

### Fixed
- Fixed ALL CSS selectors to match actual anikototv.to HTML structure
- Fixed search results (was returning empty data array)
- Fixed anime info page (was returning empty fields)
- Fixed episode list (was returning 0 episodes)
- Fixed most-popular (was returning empty data array)
- Fixed random endpoint (was returning 500 error)
- Fixed filter endpoint (was returning 500 error)
- Fixed suggestions (was returning empty array)
- Added /api/genre/:name, /api/type/:name routes (was returning 404)
- Fixed watch page server/episode extraction
- Fixed rating field to return clean value

## [1.3.0] - 2026-06-08

### Added
- Stream URL extraction via `/ajax/server?get={linkId}` endpoint
- Server list endpoint (`/api/servers?ids={episodeIds}`)
- Mapper API integration for gogoanime/anivibe servers (`/api/mapper-servers`)
- Seasons endpoint (`/api/seasons/:id`)
- Watch order endpoint (`/api/watch-order/:id`)
- Episode list AJAX endpoint (`/api/episodes-ajax/:id`)
- Genre ID mapping for correct filter parameters
- Type, Status, Rating, Sort ID mappings

### Fixed
- Stream extractor now properly extracts video embed URLs
- Filter endpoint now uses correct numeric IDs for genres/types/status
- Watch page extractor captures all data attributes (data-id, data-url, etc.)
- Server list extraction includes all data attributes (link-id, ep-id, cmid, sv-id)

## [1.2.0] - 2026-06-08

### Added
- Watch page endpoint (`/api/watch?slug={slug}&ep={ep}`)
- AZ List endpoint (`/api/az-list/:letter?page={page}`)
- New Release endpoint (`/api/new-release?page={page}`)
- Newly Added endpoint (`/api/newly-added?page={page}`)
- Status endpoint (`/api/status/:status?page={page}`)
- Trending Sidebar endpoint (`/api/trending-sidebar`)
- Complete episode navigation (prev/next)
- Related & recommended anime on watch page
- Server list for video playback
- Next episode schedule data

## [1.1.0] - 2026-06-08

### Fixed
- Corrected HTML selectors based on actual website analysis
- Updated episode list extraction
- Fixed stream info endpoint to use AJAX server list
- Improved error handling

## [1.0.0] - 2026-06-08

### Added
- Initial project setup
- Express.js server with Vercel deployment support
- Home page API endpoint (`/api/`)
- Anime info endpoint (`/api/info?id={anime-slug}`)
- Search endpoint (`/api/search?keyword={keyword}`)
- Search suggestions endpoint (`/api/search/suggest?keyword={keyword}`)
- Episode list endpoint (`/api/episodes/{anime-slug}`)
- Stream info endpoint (`/api/stream?id={episode-id}`)
- Schedule endpoint (`/api/schedule?date={YYYY-MM-DD}`)
- Spotlight endpoint (`/api/spotlight`)
- Trending endpoint (`/api/trending`)
- Top 10 endpoint (`/api/top-ten`)
- Suggestions endpoint (`/api/suggestions?keyword={keyword}`)
- Random anime endpoint (`/api/random`)
- Most popular endpoint (`/api/most-popular?page={page}`)
- Filter endpoint (`/api/filter?{params}`)
- Category endpoints (`/api/{category}?page={page}`)
- Caching system with 5-minute TTL
- CORS configuration with allowed origins
- Public HTML documentation page
- 404 error page
- Dockerfile for containerization
- Render.yaml for Render deployment
- MIT License
- README with API documentation

### Changed
- Updated all extractors to match actual anikototv.to HTML structure
- Changed ID-based lookups to slug-based lookups
- Updated URL patterns to match actual website structure
- Improved CSS selectors for better accuracy