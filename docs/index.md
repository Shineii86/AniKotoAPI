# // === HEADER ===
# AniKotoAPI v2.3.0
# Free REST API for Anime Data
# Scraping anikototv.to with Cheerio

---

![AniKotoAPI](https://img.shields.io/badge/AniKotoAPI-v2.3.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Endpoints](https://img.shields.io/badge/Endpoints-38+-orange)
![Node.js](https://img.shields.io/badge/Node.js-18+-brightgreen)

> A fast, free REST API that scrapes anime data from **anikototv.to**.
> Built with Node.js, Cheerio, and deployed on Vercel serverless functions.

---

## // === STREAMING STATUS ===

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

## // === QUICK START ===

### Get started in 3 steps:

**Step 1** — Make your first request:

```bash
curl https://anikototvapi.vercel.app/api/
```

**Step 2** — Search for an anime:

```bash
curl https://anikototvapi.vercel.app/api/search?q=naruto
```

**Step 3** — Get anime info:

```bash
curl https://anikototvapi.vercel.app/api/info?link=/anime/naruto
```

That's it. No API keys required.

---

## // === FEATURES ===

| Feature | Description |
|---|---|
| **38+ Endpoints** | Full coverage of anime data, streaming, and discovery |
| **28 HTML Scrapers** | Cheerio-based scrapers for robust data extraction |
| **28 Route Handlers** | Organized controllers with clean separation of concerns |
| **5 Mirror Domains** | Automatic failover across multiple source domains |
| **LRU Cache** | Per-endpoint TTL caching for performance |
| **Rate Limiting** | 100 requests per 15 minutes per IP |
| **GZIP Compression** | Compressed responses for faster transfers |
| **Vercel Deployment** | Zero-config serverless deployment |
| **OpenAPI Spec** | Auto-generated API documentation at `/api/openapi` |
| **Health Checks** | System status and cache monitoring endpoints |

---

## // === ENDPOINTS OVERVIEW ===

### Home

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/` | Homepage data: featured, spotlight, sidebar content |

### Anime

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/info` | Full anime info, episodes, relations, recommendations |
| GET | `/api/seasons/:id` | Season/episode details for an anime |
| GET | `/api/watch-order/:id` | Canonical watch order for a series |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search` | Search anime by title |
| GET | `/api/search/suggest` | Autocomplete suggestions |
| GET | `/api/suggestions` | Trending/general suggestions |

### Episodes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/episodes/:id` | Episode list for an anime |
| GET | `/api/episodes-ajax/:id` | Lazy-loaded episode pagination |

### Streaming

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stream` | Master stream URL for an episode |
| GET | `/api/servers` | Available servers for an episode |
| GET | `/api/stream/resolve` | Resolve a streaming URL |
| GET | `/api/stream/qualities` | Available quality variants |
| GET | `/api/stream/proxy` | Proxied video stream |
| GET | `/api/stream/ts-proxy` | Proxied TS segment stream |
| GET | `/api/watch` | Watch page with stream data |
| GET | `/api/download` | Download link for an episode |
| GET | `/api/mapper-servers` | Server name mappings |

### Discovery

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/spotlight` | Featured/spotlight anime |
| GET | `/api/trending` | Currently trending anime |
| GET | `/api/top-ten` | Top 10 rankings |
| GET | `/api/random` | Random anime recommendation |
| GET | `/api/most-popular` | Most popular anime |
| GET | `/api/trending-sidebar` | Trending sidebar widget data |

### Releases

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/new-release` | Recently released episodes |
| GET | `/api/newly-added` | Newly added anime |
| GET | `/api/latest-updated` | Latest updated anime |
| GET | `/api/recently-updated` | Recently updated entries |
| GET | `/api/completed` | Completed anime |
| GET | `/api/upcoming` | Upcoming anime |

### Rankings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/top-rankings` | Top ranked anime by category |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/genre/:name` | Anime by genre |
| GET | `/api/type/:name` | Anime by type (TV, Movie, OVA, etc.) |
| GET | `/api/status/:name` | Anime by status (Airing, Completed, etc.) |
| GET | `/api/az-list/:letter` | Alphabetical listing |
| GET | `/api/filter` | Multi-criteria filter |

### Schedule

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schedule` | Anime release schedule |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check / uptime |
| GET | `/api/stats` | API statistics |
| GET | `/api/cache/stats` | Cache hit/miss statistics |
| GET | `/api/mirrors` | List available mirror domains |
| POST | `/api/mirrors/reset` | Reset failover mirror state |
| GET | `/api/openapi` | OpenAPI/Swagger spec |

---

## // === ARCHITECTURE ===

```
AniKotoAPI/
├── api/                    # Vercel serverless functions
│   ├── index.js            # Home endpoint
│   ├── info.js             # Anime info
│   ├── search.js           # Search
│   ├── stream.js           # Streaming
│   └── ...                 # 38+ route handlers
├── scrapers/               # Cheerio HTML scrapers
│   ├── home.js
│   ├── info.js
│   ├── search.js
│   └── ...                 # 28 scrapers
├── utils/                  # Shared utilities
│   ├── cache.js            # LRU cache with TTL
│   ├── rateLimit.js        # IP-based rate limiter
│   ├── mirrors.js          # Mirror failover logic
│   └── compress.js         # GZIP compression
├── docs/                   # Documentation
│   ├── index.md            # This file
│   ├── endpoints.md        # Full API reference
│   ├── streaming.md        # Streaming workflow
│   ├── examples.md         # Code examples
│   ├── architecture.md     # Design patterns
│   └── testing.md          # Test suite docs
├── package.json
└── vercel.json
```

### Key Design Patterns

- **Scraping Layer**: 28 Cheerio-based scrapers parse HTML from anikototv.to, isolating page-specific logic from route handlers.
- **Controller Layer**: 28 route handlers map HTTP requests to scraper calls, handle validation, and format responses.
- **Cache Layer**: LRU cache with per-endpoint TTL reduces redundant scraping. Hot endpoints cache for 2–5 minutes; cold endpoints for 10+ minutes.
- **Mirror Layer**: 5 source domains with automatic failover. If one domain is slow or down, requests transparently fall back to the next mirror.
- **Rate Limiter**: Token bucket algorithm, 100 requests per 15-minute window per client IP.

---

## // === GETTING STARTED ===

### Using cURL

```bash
# Get homepage data
curl https://anikototvapi.vercel.app/api/

# Search for an anime
curl "https://anikototvapi.vercel.app/api/search?q=one+piece"

# Get anime details
curl "https://anikototvapi.vercel.app/api/info?link=/anime/one-piece"

# Get streaming servers
curl "https://anikototvapi.vercel.app/api/servers?link=/one-piece-episode-1"

# Get trending anime
curl https://anikototvapi.vercel.app/api/trending
```

### Using JavaScript (fetch)

```javascript
const BASE = "https://anikototvapi.vercel.app/api";

// Search
const res = await fetch(`${BASE}/search?q=naruto`);
const data = await res.json();
console.log(data.results);
```

### Using Python (requests)

```python
import requests

BASE = "https://anikototvapi.vercel.app/api"

# Search
r = requests.get(f"{BASE}/search?q=naruto")
print(r.json()["results"])
```

### Using Node.js (axios)

```javascript
const axios = require("axios");
const BASE = "https://anikototvapi.vercel.app/api";

async function searchAnime(query) {
  const { data } = await axios.get(`${BASE}/search`, {
    params: { q: query }
  });
  return data.results;
}
```

---

## // === RATE LIMITING ===

- **Limit**: 100 requests per 15-minute window
- **Scope**: Per client IP address
- **Headers**: Rate limit info returned in response headers
- **Exceeded**: Returns `429 Too Many Requests`

If you hit the rate limit, wait for the window to reset before retrying.

---

## // === MIRROR FAILOVER ===

AniKotoAPI maintains 5 mirror domains. When a request fails on the primary domain, the system automatically retries on the next available mirror.

```
Primary → Mirror 1 → Mirror 2 → Mirror 3 → Mirror 4 → Mirror 5
```

Use `/api/mirrors` to check current mirror status, or `POST /api/mirrors/reset` to reset the failover state.

---

## // === CACHING ===

The API uses an LRU (Least Recently Used) cache with per-endpoint TTL:

| Endpoint Category | TTL |
|-------------------|-----|
| Home / Spotlight | 2 minutes |
| Search | 3 minutes |
| Anime Info | 5 minutes |
| Streaming | 1 minute |
| Rankings / Lists | 10 minutes |

Cache stats available at `/api/cache/stats`.

---

## // === ERROR RESPONSES ===

All errors return JSON with a consistent structure:

```json
{
  "error": true,
  "message": "Description of what went wrong",
  "status": 404
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / missing parameters |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## // === DOCUMENTATION ===

| File | Description |
|------|-------------|
| [endpoints.md](./endpoints.md) | Full API reference for all 38+ endpoints |
| [streaming.md](./streaming.md) | Complete streaming workflow guide |
| [examples.md](./examples.md) | Working code examples in cURL, JS, Python |
| [architecture.md](./architecture.md) | Project structure and design patterns |
| [testing.md](./testing.md) | Integration test suite documentation |

---

## // === CONTRIBUTING ===

Contributions are welcome. To contribute:

1. Fork the repository from [GitHub](https://github.com/Shineii86/AniKotoAPI)
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and test them
4. Commit with a clear message
5. Push and open a Pull Request

### Development Setup

```bash
git clone https://github.com/Shineii86/AniKotoAPI.git
cd AniKotoAPI
npm install
npm run dev
```

### Guidelines

- Follow existing code style and patterns
- Add scrapers in `scrapers/` for new pages
- Add route handlers in `api/` for new endpoints
- Update documentation when adding features
- Test all changes before submitting

---

## // === LICENSE ===

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2024 Shinei Nouzen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## // === LINKS ===

- **Live API**: https://anikototvapi.vercel.app/api
- **GitHub**: https://github.com/Shineii86/AniKotoAPI
- **OpenAPI Spec**: https://anikototvapi.vercel.app/api/openapi
- **Health Check**: https://anikototvapi.vercel.app/api/health
- **Author**: [Shinei Nouzen](https://github.com/Shineii86)

---

// ══════ END: index.md ══════
