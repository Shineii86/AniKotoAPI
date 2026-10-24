# Diagnostic Sweep — Full-Repo & Cross-Repository Analysis

> **Scope:** `Shineii86/AniKotoAPI` (target) scanned end-to-end, then compared
> against three sibling anime APIs for upgrade ideas.
> **Date:** 2026-10-24 · **Resulting release:** `v2.6.0`
> **Method:** every file read, every route/controller/extractor/helper indexed,
> `node --check` over all JS, full integration suite run against a local server,
> live verification of each new endpoint against its upstream API.

## Repositories scanned

| Repository | Stack | JS/TS LOC | Shape |
|---|---|---:|---|
| **Shineii86/AniKotoAPI** (target) | Node 20+ · Express · Cheerio | 10,717 | configs → routes → controllers → extractors → helpers |
| SH0MIK/Anivault-Scraper | Node · Express · TS | 8,460 | single `routes.ts` + scraper per source (MAL/AniList/TMDB/Kitsu) |
| walterwhite-69/Anivexa-API | Edge/Node · plain JS | 8,363 | 12 providers + 8 extractors + SWR smart cache |
| Teramoto669/anikoto-API | Next.js · TS | 6,793 | App Router routes + typed lib (cache/validation/proxy-pool) |

---

## 1. Findings inside AniKotoAPI

### Fixed in v2.6.0

| # | Severity | Finding | Fix |
|---|---|---|---|
| F1 | **High** | `trust proxy` was never set. Behind Render/Vercel/nginx `req.ip` is the proxy's address, so **every visitor shared one rate-limit bucket** — one noisy client could 429 the whole API. | `app.set("trust proxy", …)` driven by `TRUST_PROXY` (default `1`), documented in `.env.example`. |
| F2 | **High** | No thundering-herd protection. A cold cache key hit by N simultaneous requests fired **N identical scrapes** at the Cloudflare-protected origin. | In-flight request registry in `fetchWithMirror` — concurrent identical text fetches share one promise. |
| F3 | **Medium** | No way to bypass a stale cache entry. | `?refresh=1` on every endpoint (AsyncLocalStorage cache scope) + `X-Cache: HIT/MISS/BYPASS` response header. |
| F4 | **Medium** | Path parameters (`:id`, `:letter`) and `?page=` were passed to upstream URLs **unvalidated** — traversal-shaped or junk values went straight into the request path, and `?page=abc` silently became `NaN`-driven behaviour. | `validation.helper.js` + `validation.middleware.js`: 400 on bad slug/letter/page before any upstream call. |
| F5 | **Medium** | **`/api/cache/stats` was missing from the OpenAPI document** — spec advertised 45 paths while 46 routes were registered. | Spec rebuilt as `src/configs/openapi.config.js`; all 49 documented paths (incl. `/cache/stats`). |
| F6 | **Low** | `server.js` mixed composition with six middleware concerns (CORS, headers, rate limit, timeout, request ID, response envelopes) — 340 lines before the first route. | Extracted to `src/middleware/*` and `src/helper/response.helper.js`; `server.js` is now a composition root. |
| F7 | **Low** | `apiRoutes.js` was a 722-line file holding every route group plus the OpenAPI document. | Split into `content` / `stream` / `discovery` / `enrichment` / `system` route modules + `openapi.config.js`. |
| F8 | **Low** | AniList GraphQL client logic lived inside `embedProviders.extractor.js`, unreachable for reuse. | Extracted to `src/helper/anilist.helper.js` (shared transport, per-purpose TTLs, 404 normalisation). |
| F9 | **Low** | Endpoint badge/count drift: badges said 40, 46 routes were registered, spec had 45. | Counts normalised (42 content endpoints / 49 spec paths) and re-synced across README, docs and landing page. |

### Observed, not changed (documented deliberately)

- **Live deployment is stale.** `test.js` falls back to `https://anikototvapi.vercel.app`,
  where `/stream/embeds` returns 404 and `/episodes/latest` returns 500 — both exist and
  pass locally. **The production deployment needs a redeploy.**
- **Upstream AJAX endpoints are flaky by design** (`Servers`, `Stream Resolve`) — already
  marked `optional: true` in the suite; 38/40 pass locally.
- **Jikan (MyAnimeList) was unreachable** from the analysis environment, so no MAL-proxy
  feature was shipped — see roadmap.

---

## 2. Cross-repo feature comparison

| Capability | AniKotoAPI | Anivault | Anivexa | anikoto-API |
|---|:-:|:-:|:-:|:-:|
| Scrape endpoints (info/search/episodes/stream) | ✅ | ✅ | ✅ | ✅ |
| Multi-source providers | ❌ single-source | ✅ 6 sources | ✅ 12 providers | ❌ single-source |
| In-flight cache stampede guard | ✅ **new** | ❌ | ✅ `dedupe()` | ✅ `getOrSet()` |
| Stale-while-revalidate / `?refresh=1` | ✅ **new** | ❌ | ✅ SWR + bg refresh | ✅ `refresh` param |
| Input validation module | ✅ **new** | ❌ | ❌ | ✅ `validation.ts` |
| AniList GraphQL enrichment | ✅ **new** | ✅ `/anilist/*` | ✅ id map only | ❌ |
| MAL (Jikan) enrichment | ❌ | ✅ 15 routes | ❌ | ❌ |
| TMDB / Kitsu metadata | ❌ | ✅ | ❌ | ❌ |
| Seasonal chart | ✅ **new** | ✅ | ❌ | ❌ |
| SSRF-guarded stream/HLS proxy | ✅ | ✅ | ❌ | ✅ |
| Subtitle proxy | ❌ | ✅ `/proxy/subtitle` | ❌ | ❌ |
| Rate limiting + security headers | ✅ | ❌ | ❌ | ❌ |
| Health / stats / cache-stats / mirrors | ✅ | ✅ health | ✅ banner | ✅ |
| Full OpenAPI document | ✅ **new** | ❌ | ❌ | ✅ 1,057-line spec |
| Distributed cache (Redis/Upstash) | ❌ | ❌ | ✅ Upstash REST | ❌ |
| Browser-fingerprint proxy pool | ❌ | ❌ | ❌ | ✅ `proxy-pool.ts` |
| Discord relay / image migration | ❌ | ✅ | ❌ | ❌ |

---

## 3. What was shipped in v2.6.0

### Modularisation (requested restructuring)

```
server.js                     ← composition root only (~170 lines)
src/
├── middleware/               ← NEW folder (6 modules)
│   ├── requestId.middleware.js
│   ├── cors.middleware.js
│   ├── securityHeaders.middleware.js
│   ├── rateLimit.middleware.js      (factory + idle sweep, trust-proxy aware)
│   ├── timeout.middleware.js
│   └── validation.middleware.js     (path/query guards)
├── helper/
│   ├── response.helper.js           ← NEW (jsonResponse / jsonError)
│   ├── validation.helper.js         ← NEW (slug/letter/page/query validators)
│   └── anilist.helper.js            ← NEW (cached GraphQL client)
├── configs/
│   └── openapi.config.js            ← NEW (spec builder, 49 paths)
├── controllers/
│   └── anilist.controller.js        ← NEW
└── routes/                          ← split from one 722-line file
    ├── apiRoutes.js                 ← orchestrator (counter, validation, groups)
    ├── content.routes.js            ← NEW
    ├── stream.routes.js             ← NEW
    ├── discovery.routes.js          ← NEW
    ├── enrichment.routes.js         ← NEW
    └── system.routes.js             ← NEW
```

### New endpoints (40 → 42 content endpoints)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/anilist/:id` | Full AniList metadata: synopsis, genres, scores, studios, characters, relations, recommendations |
| GET | `/api/anilist?mal=21` | Same, keyed by MAL ID (resolved through a cached lookup) |
| GET | `/api/anilist/season?season=WINTER&year=2026` | Seasonal chart (defaults to current season) |

All three were verified live against `graphql.anilist.co` before shipping.

### Behaviour upgrades

- `?refresh=1` — cache bypass for any endpoint, reported as `X-Cache: BYPASS`
- `X-Cache: HIT|MISS|BYPASS` on the first cache lookup of each request
- `?page=` must be an integer in `[1, 500]` → otherwise `400`
- Slug-shaped path/query params must match `[A-Za-z0-9_-]` (no traversal) → otherwise `400`
- `/api/stats` now reports `endpoints` + `openapiPaths`

---

## 4. Recommended roadmap (not yet implemented)

**P1 — resilience**
1. **Optional Upstash/Redis cache layer** (from Anivexa `smartcache.js`) — in-memory LRU
   is lost on every serverless cold start; a REST-backed layer survives redeploy.
2. **Subtitle proxy** (from Anivault `/proxy/subtitle`) — players need VTT/SRT fetched
   through the same SSRF guard as the TS proxy.
3. **Retry/backoff wrapper** around `fetchWithMirror` (Anivexa `wreq.js` style) with
   jittered delays instead of fixed `500ms * attempt`.

**P2 — enrichment breadth**
4. **MAL (Jikan) endpoints** (Anivault ships 15) — characters, pictures, recommendations,
   streaming availability. *Blocked: `api.jikan.moe` was unreachable from the analysis
   environment; verify before shipping.*
5. **TMDB/Kitsu episode thumbnails** (Anivault) — nice-to-have for client UIs.
6. **`/api/tooltip/:id`** — lightweight hover-preview payload (anikoto-API has it).

**P3 — multi-source**
7. **Provider map** (`/map/:anilistId`) — AniList ID → episodes across several sources
   (Anivexa's core idea). Largest effort; would make the API resilient when the primary
   origin is down.
8. **Browser-fingerprint proxy pool** (anikoto-API `proxy-pool.ts`) — rotates UA /
   `sec-ch-ua` sets and optionally exits through residential proxies.

**Housekeeping**
9. Redeploy production so `/stream/embeds`, `/episodes/latest` and `/info.externalIds`
   work on the public URL (they already pass locally).
10. Keep endpoint counts in sync whenever a route is added — the OpenAPI builder and
    `/api/stats` now derive from single sources of truth, which prevents F5/F9-style drift.

---

*Generated by the v2.6.0 diagnostic sweep.*
