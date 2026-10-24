# Testing

Comprehensive integration test suite for AniKotoAPI — validates all 42 content endpoints, streaming flow, error handling, and performance benchmarks.

## Quick Start

```bash
node test.js
```

No external test framework required — just Node.js native `fetch`.

## Auto-Detection

The test suite automatically detects which API to use:

1. **Local server running** (`localhost:4444`) → uses local
2. **No local server** → falls back to live API (`anikototvapi.vercel.app`)
3. **Manual override** → `API_URL=http://localhost:4444/api node test.js`

```bash
# Auto-detect (recommended)
node test.js

# Start local server first, then test
npm start        # terminal 1
node test.js     # terminal 2

# Force specific URL
API_URL=http://localhost:4444/api node test.js
API_URL=https://anikototvapi.vercel.app/api node test.js
```

## What It Tests

### Core Endpoints (5)
| Test | Endpoint | Validates |
|------|----------|-----------|
| Home | `GET /` | `results.spotlights` or `results.trending` |
| Search | `GET /search?keyword=naruto` | `results.data` array |
| Info | `GET /info?id=one-piece-odmau` | `results.title` |
| Episodes | `GET /episodes/one-piece-odmau` | `results.episodes` array |
| Servers | `GET /servers?ids=1` | `results` exists |

### Streaming (1)
| Test | Endpoint | Validates |
|------|----------|-----------|
| Stream | `GET /watch?slug=one-piece-odmau&ep=1` | `results.servers` or `results.episodeNumber` |

### Discovery (10)
| Test | Endpoint | Validates |
|------|----------|-----------|
| Suggestions | `GET /suggestions?keyword=naruto` | `results` |
| Spotlight | `GET /spotlight` | `results` |
| Trending | `GET /trending` | `results` |
| Top 10 | `GET /top-ten` | `results` |
| Random | `GET /random` | `results` |
| Most Popular | `GET /most-popular` | `results` |
| Upcoming | `GET /upcoming` | `results` (array) |
| Top Rankings | `GET /top-rankings` | `results` (array) |
| Recently Updated | `GET /recently-updated` | `results` (array) |
| Completed | `GET /completed` | `results` (array) |

### Release Lists (3)
| Test | Endpoint | Validates |
|------|----------|-----------|
| New Release | `GET /new-release` | `results` |
| Newly Added | `GET /newly-added` | `results` |
| Latest Updated | `GET /latest-updated` | `results` |

### Categories (5)
| Test | Endpoint | Validates |
|------|----------|-----------|
| Genre | `GET /genre/action` | `results` |
| Type | `GET /type/tv` | `results` |
| Status | `GET /status/airing` | `results` |
| AZ List | `GET /az-list/a` | `results` |
| Filter | `GET /filter?keyword=naruto` | `results` |

### Search Variants (2)
| Test | Endpoint | Validates |
|------|----------|-----------|
| Search Suggest | `GET /search/suggest?keyword=naruto` | `results` |
| Trending Sidebar | `GET /trending-sidebar` | `results` |

### Anime Detail (3 — optional)
| Test | Endpoint | Validates |
|------|----------|-----------|
| Seasons | `GET /seasons/one-piece-odmau` | `results.seasons` or `results.totalSeasons` |
| Watch Order | `GET /watch-order/one-piece-odmau` | `results.related` or `results.totalRelated` |
| Download | `GET /download?slug=one-piece-odmau&ep=1` | `results` |

### System (5)
| Test | Endpoint | Validates |
|------|----------|-----------|
| Health | `GET /health` | `results.status === "healthy"` |
| Stats | `GET /stats` | `results.endpoints` |
| Cache Stats | `GET /cache/stats` | `results.hits !== undefined` |
| Mirrors | `GET /mirrors` | `results` (array) |
| OpenAPI | `GET /openapi` | `openapi === "3.0.3"` |

### Dynamic Tests (2)
| Test | Endpoint | How It Works |
|------|----------|--------------|
| Episodes Ajax | `GET /episodes-ajax/:animeId` | Fetches `animeId` from `/info` at runtime |
| Stream Resolve | `GET /stream/resolve?id=:linkId&slug=...` | Fetches `linkId` via episodes → servers flow |

## Test Structure

```javascript
{
  name: "Test Name",           // Display name
  url: "/endpoint?param=val", // URL path (appended to BASE)
  check: (data) => boolean,   // Custom validation function
  optional: true              // Skip on failure instead of fail
}
```

### Validation Logic

For each test:
1. **HTTP status** — Must be 200 (or skip if `optional` and 404/500)
2. **`success` field** — Must be `true` (or skip if `optional`)
3. **Custom check** — `check(data)` must return truthy (or skip if `optional`)

### Optional Tests

Marked with `optional: true`. Instead of failing, they print `⏭️ Skipped` when:
- HTTP 404 or 500
- `success: false`
- Custom validation fails
- Network error

## Sample Output

```
📡 Detected local server — using localhost:4444

🧪 Running 46 tests...

📡 API: http://localhost:4444/api

[MIRROR] Switched to: https://anikototv.to
✅ Home (438ms)
✅ Search (480ms)
✅ Info (27ms)
...
✅ Episodes Ajax (1304ms)

==================================================
📊 Results: 35 passed, 0 failed, 0 skipped, 35 total
==================================================

⚡ Performance:
   Average: 465ms
   Min: 11ms
   Max: 3679ms
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All tests passed |
| `1` | One or more tests failed |

## Performance Metrics

The test suite reports:
- **Per-test timing** — Response time for each endpoint
- **Average** — Mean response time across all passing tests
- **Min/Max** — Fastest and slowest endpoints
- **Cache effect** — Cached responses return in ~10-30ms vs ~300-500ms uncached

## Adding New Tests

1. Add entry to the `tests` array in `test.js`:
```javascript
{ name: "New Endpoint", url: "/new-endpoint", check: (d) => d.results },
```

2. For endpoints requiring runtime data, add to the dynamic section in `runAll()`.

3. Run `node test.js` to verify.

## Architecture

```
test.js
├── detectBase()           # Auto-detect local vs live API
├── tests[]                # Static test definitions (34 tests)
├── runAll()
│   ├── detectBase()       # Resolve API URL
│   ├── fetchJson()        # Pre-fetch dynamic data (animeId, linkId)
│   ├── push dynamic tests # Episodes Ajax, Stream Resolve
│   └── runTest() × 35     # Execute each test sequentially
├── runTest()              # Single test runner with timing
└── results[]              # Pass/fail/skip tracking
```

## Notes

- Tests run **sequentially** to avoid rate limiting
- **No mocking** — all tests hit real HTTP endpoints
- **Cache aware** — repeated runs benefit from server-side caching
- **Dynamic tests** resolve dependencies at runtime (animeId, linkId)
- **Stream Resolve** may skip if no valid link_id is available (data expires)
