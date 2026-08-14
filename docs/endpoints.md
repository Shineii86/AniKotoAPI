# API Endpoints Reference

Base URL: `https://anikototvapi.vercel.app/api`

---

## ⚠️ Streaming Status

> **Streaming endpoints (`/api/servers`, `/api/stream`, `/api/stream/resolve`) return errors when anikototv.to blocks AJAX requests from server-side IPs.**

| What Works | What's Blocked |
|:---|:---|
| Home, spotlight, trending | `/api/servers` — server list |
| Search, suggestions, filter | `/api/stream` — embed URLs |
| Info, episodes, schedule | `/api/stream/resolve` — m3u8/mp4 |
| Top 10, most popular, new release | `/api/mapper-servers` — gogoanime servers |
| AZ list, random, genre list | All AJAX-dependent endpoints |
| All HTML-scraped endpoints | |

**To fix streaming**, set one of these environment variables:

```bash
# Option 1: ScraperAPI (requires premium plan — $49/month)
SCRAPER_API_KEY=your_scraperapi_key

# Option 2: FlareSolverr (self-hosted, unlimited)
FLARESOLVERR_URL=http://your-flaresolverr-host:8191
```

---

## Pagination

Most list endpoints return a `totalPages` field for pagination:

```json
{
  "success": true,
  "results": {
    "totalPages": 296,
    "data": [...]
  }
}
```

Use the `page` query parameter to navigate: `?page=2`

**Only `/api/filter` returns the full pagination object:**

```json
{
  "results": {
    "totalPages": 1,
    "data": [],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 0,
      "itemsPerPage": 30,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

**Endpoints with `totalPages` pagination:** `/api/search`, `/api/most-popular`, `/api/new-release`, `/api/newly-added`, `/api/latest-updated`, `/api/az-list/:letter`, `/api/filter`, `/api/genre/:name`, `/api/type/:name`, `/api/status/:name`

**Endpoints with flat arrays (no pagination):** `/api/spotlight`, `/api/trending`, `/api/top-ten`, `/api/suggestions`, `/api/recently-updated`, `/api/completed`, `/api/upcoming`, `/api/top-rankings`, `/api/mirrors`, `/api/schedule`

---

## GET /

Returns homepage data: spotlight anime, trending, top-airing, and genres.

**Response:**

```json
{
  "success": true,
  "results": {
    "spotlights": [
      {
        "slug": "wistoria-wand-and-sword-season-2-dua04",
        "poster": "https://cdn.anipixcdn.co/background/101f58336250ee0d_1779363645.webp",
        "title": "Wistoria: Wand and Sword Season 2",
        "japaneseTitle": "Tsue to Tsurugi no Wistoria Season 2",
        "description": "",
        "rating": "PG-13",
        "quality": "HD"
      }
    ],
    "trending": [
      {
        "slug": "witch-hat-atelier-ikmut/ep-11",
        "poster": "https://cdn.anipixcdn.co/thumbnail/0412057393e8a45b3ba8b16874b6034d.jpg",
        "title": "Witch Hat Atelier",
        "japaneseTitle": "Tongari Boushi no Atelier",
        "sub": 11,
        "dub": 11,
        "total": 13,
        "type": "TV"
      }
    ],
    "topAiring": [
      {
        "slug": "wistoria-wand-and-sword-season-2-dua04",
        "poster": "https://cdn.anipixcdn.co/thumbnail/4739d8dbd05dddb73604f6240b83ea68.jpg",
        "title": "Wistoria: Wand and Sword Season 2",
        "sub": 9,
        "dub": 7,
        "type": ""
      }
    ],
    "genres": ["Action", "Adventure", "Cars", "Comedy", "Dementia", "Demons", "Drama", "Ecchi", "Fantasy", "Game", "Harem", "Historical", "Horror", "Isekai", "Josei", "Kids", "Magic", "Martial Arts", "Mecha", "Military", "Music", "Mystery", "Parody", "Police", "Psychological", "Romance", "Samurai", "School", "Sci-Fi", "Seinen", "Shoujo", "Shounen", "Slice of Life", "Space", "Sports", "Super Power", "Supernatural", "Thriller", "Vampire"]
  }
}
```

---

## GET /search

Search for anime by keyword.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `keyword` | string | Yes | Search query |

**Request:**

```bash
curl "https://anikototvapi.vercel.app/api/search?keyword=naruto"
```

**Response:**

```json
{
  "success": true,
  "results": {
    "totalPages": 1,
    "data": [
      {
        "slug": "road-of-naruto-ggjw8/ep-1",
        "animeId": "7174",
        "poster": "https://cdn.anipixcdn.co/thumbnail/abfd676ad3a01f1e8860fecff9f5b8e0.jpg",
        "title": "Road of Naruto",
        "japaneseTitle": "Road of Naruto",
        "sub": 1,
        "dub": 0,
        "total": 0,
        "type": "ONA",
        "rating": "8.55",
        "genres": ["Action", "Fantasy", "Shounen"]
      }
    ]
  }
}
```

---

## GET /info

Get detailed info about an anime.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Anime slug with random hash (e.g., `naruto-shippuuden-movie-6-road-to-ninja-w2wqq`) |

> **Important:** Slugs now include random hashes (e.g., `one-piece-odmau`). Get valid slugs from `/search` or `/most-popular` results.

**Request:**

```bash
curl "https://anikototvapi.vercel.app/api/info?id=naruto-shippuuden-movie-6-road-to-ninja-w2wqq"
```

**Response:**

```json
{
  "success": true,
  "results": {
    "slug": "naruto-shippuuden-movie-6-road-to-ninja-w2wqq",
    "animeId": 786,
    "title": "Naruto: Shippuuden Movie 6: Road to Ninja",
    "japaneseTitle": "Naruto: Shippuuden Movie 6 - Road to Ninja",
    "altNames": "Naruto: Shippuuden Movie 6 - Road to Ninja;Naruto Movie 9",
    "poster": "https://cdn.anipixcdn.co/thumbnail/43dd49b4fdb9bede653e94468ff8df1e.jpg",
    "backgroundImage": "'",
    "synopsis": "Returning home to Konohagakure, the young ninja celebrate defeating a group of supposed Akatsuki...",
    "type": "Movie",
    "premiered": "Summer 2012",
    "aired": "Jul 28, 2012",
    "status": "Finished Airing",
    "malScore": "7.84",
    "duration": "1 hr 39 min",
    "episodes": "1",
    "studios": ["Pierrot"],
    "producers": ["TV Tokyo", "Shueisha"],
    "genres": ["Action", "Comedy", "Supernatural"],
    "rating": "PG-13",
    "reviewCount": "0"
  }
}
```

---

## GET /episodes

Get episode list for an anime.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Anime slug or animeId |

**Request:**

```bash
curl "https://anikototvapi.vercel.app/api/episodes/958"
```

**Response:**

```json
{
  "success": true,
  "results": {
    "animeId": 958,
    "slug": "958",
    "totalEpisodes": 220,
    "episodes": [
      {
        "id": "16638",
        "episode_no": 1,
        "slug": "1",
        "title": "",
        "active": true,
        "href": "#",
        "server_ids": "dXNCT3hNQzk3THhSTW8ySnM5...",
        "timestamp": "1729197616",
        "mal_id": "20"
      }
    ]
  }
}
```

> **Important:** The `server_ids` field is needed to fetch servers. Pass it to the `/servers` endpoint.

---

## GET /servers

Get available servers for an episode.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `ids` | string | Yes | `server_ids` from `/episodes` response |

**Request:**

```bash
curl "https://anikototvapi.vercel.app/api/servers?ids=SlNVT25JaFlCMnZOeXZ2aG5takIx..."
```

**Response:**

```json
{
  "success": true,
  "results": [
    {
      "type": "sub",
      "ep_id": "110289",
      "link_id": "MTF1dkFtaW9BRTZPbzJJRElFZUZrOWdjeldjOERLaWNMMXFNbVB3WUJqOHZGS2FSWVgvbVJraVpIV1dQRjRoN01hOFUvYmxsWXFYNGtiR0h5OWdGQWc9PQ",
      "cmid": "animixplay-fqs",
      "sv_id": "1",
      "ep_id": "110289",
      "name": "HD-1"
    },
    {
      "type": "sub",
      "ep_id": "110289",
      "link_id": "MTF1dkFtaW9BRTZPbzJJRElFZUZrOWdjeldjOERLaWNMMXFNbVB3WUJqOEZ4cFNpMDdQbnV1S3dNdklpRkhWbzRsVmgxSGx4YWx3LytPcnZXU0RCVHc9PQ",
      "cmid": "animixplay-fqs",
      "sv_id": "2",
      "ep_id": "110289",
      "name": "Vidstream-2"
    }
  ]
}
```

> **Note:** There are usually 3 servers: HD-1 (sub), Vidstream-2 (sub), VidCloud-1 (sub).

---

## GET /stream

Get streaming URL for a server.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | `link_id` from `/servers` response |

**Request:**

```bash
curl "https://anikototvapi.vercel.app/api/stream?id=MTF1dkFtaW9BRTZPbzJJRElFZUZrOWdjeldjOERLaWNMMXFNbVB3WUJqOHZGS2FSWVgvbVJraVpIV1dQRjRoN01hOFUvYmxsWXFYNGtiR0h5OWdGQWc9PQ"
```

**Response:**

```json
{
  "success": true,
  "results": {
    "linkId": "MTF1dkFtaW9BRTZPbzJJRElFZUZrOWdjeldjOERLaWNMMXFNbVB3WUJqOHZGS2FSWVgvbVJraVpIV1dQRjRoN01hOFUvYmxsWXFYNGtiR0h5OWdGQWc9PQ",
    "url": "https://megaplay.buzz/stream/s-5/94736/sub",
    "skipData": {
      "intro": [0, 0],
      "outro": [0, 0]
    }
  }
}
```

> **Note:** The `url` is a direct stream link. Use it with a video player like HLS.js or Plyr.

---

## GET /suggestions

Get anime suggestions based on keyword.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `keyword` | string | Yes | Partial title for suggestions |

**Request:**

```bash
curl "https://anikototvapi.vercel.app/api/suggestions?keyword=naruto"
```

**Response:**

```json
{
  "success": true,
  "results": [
    {
      "slug": "road-of-naruto-ggjw8/ep-1",
      "poster": "https://cdn.anipixcdn.co/thumbnail/abfd676ad3a01f1e8860fecff9f5b8e0.jpg",
      "title": "Road of Naruto",
      "japaneseTitle": "Road of Naruto"
    }
  ]
}
```

---

## GET /spotlight

Get spotlight (featured) anime.

```bash
curl "https://anikototvapi.vercel.app/api/spotlight"
```

Returns array of spotlight anime with posters, descriptions, ratings, and quality info.

---

## GET /trending

Get currently trending anime.

```bash
curl "https://anikototvapi.vercel.app/api/trending"
```

**Response:**

```json
{
  "success": true,
  "results": [
    {
      "slug": "witch-hat-atelier-ikmut/ep-11",
      "poster": "https://cdn.anipixcdn.co/thumbnail/0412057393e8a45b3ba8b16874b6034d.jpg",
      "title": "Witch Hat Atelier",
      "japaneseTitle": "Tongari Boushi no Atelier",
      "sub": 11,
      "dub": 11,
      "total": 13,
      "type": "TV"
    }
  ]
}
```

---

## GET /top-ten

Get top 10 anime for today, this week, and this month.

```bash
curl "https://anikototvapi.vercel.app/api/top-ten"
```

Returns `{ today: [...], week: [...], month: [...] }`.

---

## GET /schedule

Get anime schedule.

```bash
curl "https://anikototvapi.vercel.app/api/schedule"
```

Returns array of scheduled anime with air times.

---

## GET /random

Get a random anime.

```bash
curl "https://anikototvapi.vercel.app/api/random"
```

**Response:**

```json
{
  "success": true,
  "results": {
    "title": "Massara",
    "type": "ONA",
    "genres": ["Slice of Life", "Music"]
  }
}
```

---

## GET /new-release

Get latest released episodes.

```bash
curl "https://anikototvapi.vercel.app/api/new-release"
```

Returns paginated list of recently released anime episodes.

---

## GET /most-popular

Get most popular anime.

```bash
curl "https://anikototvapi.vercel.app/api/most-popular"
```

Returns paginated list with `totalPages` and `data` array.

---

## GET /genre/:name

Get anime by genre.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Genre name (e.g., `action`, `romance`) |
| `page` | number | No | Page number (default: 1) |

```bash
curl "https://anikototvapi.vercel.app/api/genre/action"
```

Returns paginated anime list filtered by genre.

---

## GET /type/:name

Get anime by type (TV, OVA, Movie, ONA, etc).

```bash
curl "https://anikototvapi.vercel.app/api/type/tv"
```

---

## GET /status/:name

Get anime by status (airing, completed, upcoming).

```bash
curl "https://anikototvapi.vercel.app/api/status/completed"
```

---

## GET /filter

Filter anime with multiple parameters.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `keyword` | string | No | Search keyword (pass empty string if not searching) |
| `genre[]` | number | No | Genre IDs |
| `type` | string | No | TV, OVA, Movie, etc. |
| `status` | string | No | aired, ongoing, upcoming |
| `sort` | string | No | Most watched, score, name, etc. |
| `page` | number | No | Page number |

> **Important:** The `keyword` parameter must be present (even empty) or the site returns a 500 error.

```bash
curl "https://anikototvapi.vercel.app/api/filter?keyword=&genre[]=1"
```

Returns filtered and paginated anime list.

---

## GET /watch

Get full watch page data including servers, trending, and recommended anime.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | string | Yes | Anime slug (e.g., `one-piece-100`) |
| `ep` | number | Yes | Episode number |

```bash
curl "https://anikototvapi.vercel.app/api/watch?slug=one-piece-100&ep=1"
```

Returns episode data with server list, trending sidebar, and recommended anime.

---

## GET /search/suggest

Get search autocomplete suggestions.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `keyword` | string | Yes | Search keyword |

```bash
curl "https://anikototvapi.vercel.app/api/search/suggest?keyword=naruto"
```

Returns array of suggestion objects with title, ID, and image.

---

## GET /episodes-ajax/:id

Get AJAX-loaded episode list for an anime.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Anime ID or slug |

```bash
curl "https://anikototvapi.vercel.app/api/episodes-ajax/one-piece-100"
```

Returns episode list with filters, ranges, and server IDs.

---

## GET /mapper-servers

Get cross-server mapping for gogoanime/anivibe servers.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `malId` | number | Yes | MyAnimeList ID |
| `slug` | string | Yes | Anime slug |
| `timestamp` | number | Yes | Timestamp |

```bash
curl "https://anikototvapi.vercel.app/api/mapper-servers?malId=21&slug=one-piece-100&timestamp=1234567890"
```

Returns mapped server URLs for gogoanime/anivibe.

---

## GET /newly-added

Get newly added anime series.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |

```bash
curl "https://anikototvapi.vercel.app/api/newly-added"
```

Returns paginated list of newly added anime.

---

## GET /trending-sidebar

Get trending sidebar widget data.

```bash
curl "https://anikototvapi.vercel.app/api/trending-sidebar"
```

Returns trending anime for sidebar display.

---

## GET /seasons/:id

Get all seasons for an anime (main season, OVAs, movies, specials).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | Yes | Anime numeric ID |

```bash
curl "https://anikototvapi.vercel.app/api/seasons/1642"
```

Returns all seasons including OVAs, movies, and specials for the anime.

---

## GET /watch-order/:id

Get recommended watch order for an anime franchise.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | Yes | Anime numeric ID |

```bash
curl "https://anikototvapi.vercel.app/api/watch-order/1642"
```

Returns recommended watch order sequence with relationship types.

---

## GET /latest-updated

Get recently updated anime sorted by update time.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |

```bash
curl "https://anikototvapi.vercel.app/api/latest-updated"
```

Returns paginated list of recently updated anime.

---

## GET /download

Get download links for an anime episode.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | string | Yes | Anime slug |
| `ep` | number | Yes | Episode number |

```bash
curl "https://anikototvapi.vercel.app/api/download?slug=one-piece-odmau&ep=1165"
```

Returns decoded download links for the specified episode.

---

## GET /az-list/:letter

Get anime alphabetically by letter.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `letter` | string | Yes | Letter (a-z, or # for numbers) |
| `page` | number | No | Page number (default: 1) |

```bash
curl "https://anikototvapi.vercel.app/api/az-list/a"
```

Returns paginated list of anime starting with the specified letter.

---

## GET /upcoming

Get upcoming anime sorted by air date.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |

```bash
curl "https://anikototvapi.vercel.app/api/upcoming"
```

Returns paginated list of upcoming anime with sub/dub counts, type, and rating.

---

## GET /top-rankings

Get top-ranked anime with sort options.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `sort` | string | No | Sort mode: `day` (default), `week`, or `month` |
| `page` | number | No | Page number (default: 1) |

```bash
curl "https://anikototvapi.vercel.app/api/top-rankings?sort=week"
```

**Response:**

```json
{
  "success": true,
  "results": [
    {
      "rank": 1,
      "slug": "demon-slayer-kimetsu-no-yaiba-infinity-castle-4tmun",
      "poster": "https://cdn.anipixcdn.co/thumbnail/...",
      "title": "Demon Slayer: Kimetsu no Yaiba Infinity Castle",
      "japaneseTitle": "Kimetsu no Yaiba Movie: Mugen Jou-hen",
      "sub": 1,
      "dub": 1,
      "type": "Movie"
    }
  ]
}
```

---

## GET /recently-updated

Get recently updated anime. Supports tab filtering.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `tab` | string | No | Filter: `sub`, `dub`, `all` (default: `all`) |
| `page` | number | No | Page number (default: 1) |

```bash
curl "https://anikototvapi.vercel.app/api/recently-updated"
```

Returns paginated list from `#recent-update` section with client-side tab filtering.

---

## GET /completed

Get completed anime sorted by score.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |

```bash
curl "https://anikototvapi.vercel.app/api/completed"
```

Returns flat array of finished anime.

> **Note:** The `type` field in completed results contains the **air date** (e.g., `"2016-05-14"`), not the anime type (TV/Movie/etc).

---

## GET /stream/resolve

Resolve an embed URL to actual video URL (m3u8/mp4).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | `link_id` from `/servers` response |
| `slug` | string | No | Anime slug (for session cookies) |

```bash
curl "https://anikototvapi.vercel.app/api/stream/resolve?id=MTF1dkFtaW9BRTZPbzJJRElFZUZr..."
```

Returns resolved URL, type (hls/mp4), server name, and subtitle URLs.

---

## GET /stream/qualities

Parse M3U8 playlist for available quality options.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | M3U8 playlist URL |

```bash
curl "https://anikototvapi.vercel.app/api/stream/qualities?url=https://example.com/playlist.m3u8"
```

Returns array of quality objects with url, quality label, resolution, bandwidth, and codec.

---

## GET /stream/proxy

M3U8 playlist proxy — rewrites relative URLs to proxy endpoints for CORS-free playback.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | M3U8 playlist URL |

```bash
curl "https://anikototvapi.vercel.app/api/stream/proxy?url=https://example.com/playlist.m3u8"
```

Returns rewritten M3U8 content with all `.m3u8` and `.ts` URLs pointing to proxy endpoints.

---

## GET /stream/ts-proxy

TS video segment proxy — serves `.ts` segments with proper Content-Type and CORS headers.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | `.ts` segment URL |

```bash
curl "https://anikototvapi.vercel.app/api/stream/ts-proxy?url=https://example.com/segment.ts"
```

Returns binary video segment with `Content-Type: video/mp2t` and `Access-Control-Allow-Origin: *`.

---

## System Endpoints

### GET /health

Health check endpoint. No parameters required.

```bash
curl "https://anikototvapi.vercel.app/api/health"
```

**Response:**

```json
{
  "success": true,
  "results": {
    "status": "healthy",
    "version": "2.4.0",
    "uptime": "0h 1m 21s",
    "uptimeSeconds": 81,
    "timestamp": "2026-07-30T02:20:46.153Z",
    "node": "v26.4.0",
    "memory": {
      "used": "99MB",
      "total": "150MB"
    }
  }
}
```

---

### GET /stats

API statistics endpoint. No parameters required.

```bash
curl "https://anikototvapi.vercel.app/api/stats"
```

**Response:**

```json
{
  "success": true,
  "results": {
    "uptime": "81s",
    "requests": {
      "total": 37,
      "errors": 9,
      "successRate": "75.7%"
    },
    "cache": {
      "type": "in-memory",
      "ttl": "5 minutes",
      "description": "Map-based cache with TTL expiration"
    },
    "endpoints": 38,
    "timestamp": "2026-07-30T02:20:46.205Z"
  }
}
```

---

### GET /cache/stats

Cache statistics endpoint. No parameters required.

```bash
curl "https://anikototvapi.vercel.app/api/cache/stats"
```

**Response:**

```json
{
  "success": true,
  "results": {
    "hits": 0,
    "misses": 28,
    "sets": 26,
    "deletes": 0,
    "size": 26,
    "hitRate": "0.00%"
  }
}
```

---

### GET /mirrors

Mirror status endpoint. No parameters required.

```bash
curl "https://anikototvapi.vercel.app/api/mirrors"
```

**Response:**

```json
{
  "success": true,
  "results": [
    {
      "name": "Primary",
      "url": "https://anikototv.to",
      "priority": 1,
      "status": "online",
      "latency": "6115ms",
      "isCurrent": true
    },
    {
      "name": "Regional CZ",
      "url": "https://anikoto.cz",
      "priority": 2,
      "status": "online",
      "latency": "672ms",
      "isCurrent": false
    }
  ]
}
```

---

### POST /mirrors/reset

Reset mirror cache. No parameters required.

```bash
curl -X POST "https://anikototvapi.vercel.app/api/mirrors/reset"
```

**Response:**

```json
{
  "success": true,
  "message": "Mirror cache reset"
}
```

---

### GET /openapi

OpenAPI 3.0.3 specification. No parameters required.

```bash
curl "https://anikototvapi.vercel.app/api/openapi"
```

Returns the full OpenAPI spec document with all endpoint definitions, tags, and server information.

---

## Response Patterns

| Pattern | Format | Endpoints |
|:---|:---|:---|
| **Flat array** | `results: [...]` | `/spotlight`, `/trending`, `/top-ten`, `/suggestions`, `/recently-updated`, `/completed`, `/upcoming`, `/top-rankings`, `/mirrors`, `/schedule` |
| **Paginated data** | `results: { totalPages, data: [...] }` | `/search`, `/most-popular`, `/new-release`, `/newly-added`, `/latest-updated`, `/genre/:name`, `/type/:name`, `/status/:name`, `/az-list/:letter` |
| **Full pagination** | `results: { totalPages, data: [...], pagination: {...} }` | `/filter` only |
| **Three-period** | `results: { today/week/month: [...] }` or `{ day/week/month: [...] }` | `/top-ten`, `/trending-sidebar` |
| **Single object** | `results: {...}` | `/home`, `/info`, `/episodes`, `/episodes-ajax`, `/random`, `/health`, `/stats`, `/cache/stats`, `/stream-qualities` |

---

## Common Workflows

### Streaming Workflow

```
1. GET /episodes/{animeId}     → Get episode list with server_ids
2. GET /servers?ids={ids}      → Get available servers with link_ids
3. GET /stream?id={link_id}    → Get embed URL + skip data
4. GET /stream/resolve?id={link_id}  → Get actual m3u8/mp4 URL
5. GET /stream/qualities?url={m3u8}  → Get available qualities
6. GET /stream/proxy?url={m3u8}      → Get CORS-free proxied playlist
```

### Discovery Workflow

```
1. GET /              → Homepage: spotlights, trending, genres
2. GET /search?q=     → Search by keyword
3. GET /info?id=      → Get anime details
4. GET /episodes/     → Get episode list
5. GET /seasons/      → Get all seasons
6. GET /watch-order/  → Get watch order for franchises
```

### Filter & Browse Workflow

```
1. GET /genre/{name}      → Browse by genre
2. GET /type/{name}       → Browse by type (TV, Movie, OVA)
3. GET /status/{name}     → Browse by status (airing, completed)
4. GET /filter?...        → Advanced multi-parameter filter
5. GET /az-list/{letter}  → Browse alphabetically
6. GET /top-rankings?sort=day  → Top ranked anime
```

---

// ══════ END: endpoints.md ══════
