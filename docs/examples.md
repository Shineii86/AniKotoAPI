# Code Examples

> **AniKotoAPI** — Complete code examples in cURL, JavaScript, Python, Node.js, and HTML/JS player integrations.
> All examples are tested and working with the live API at `https://anikototvapi.vercel.app/api`.

---

// ═══════════════════════════════════════════════════════════════
// ═══ SECTION 1: cURL Examples ═══
// ═══════════════════════════════════════════════════════════════

## cURL Examples

---

### Health Check

```bash
curl -s "https://anikototvapi.vercel.app/api/health" | python3 -m json.tool
```

**Expected Output:**

```json
{
  "success": true,
  "results": {
    "status": "healthy",
    "version": "2.3.0",
    "uptime": "0h 1m 21s",
    "uptimeSeconds": 81,
    "timestamp": "2026-07-30T02:20:46.153Z",
    "node": "v26.4.0",
    "memory": { "used": "99MB", "total": "150MB" }
  }
}
```

> **Tip:** Use this to verify the API is online before making other requests.

---

### Homepage

```bash
curl -s "https://anikototvapi.vercel.app/api" | python3 -m json.tool
```

---

### Search for Anime

```bash
# Search for "naruto" — returns Road of Naruto, Naruto: Shippuuden Movie 6, The Last: Naruto the Movie, etc.
curl -s "https://anikototvapi.vercel.app/api/search?keyword=naruto" | python3 -m json.tool
```

**Expected Output (partial):**

```json
{
  "success": true,
  "results": {
    "totalPages": 1,
    "data": [
      {
        "slug": "road-of-naruto-ggjw8/ep-1",
        "animeId": "7174",
        "title": "Road of Naruto",
        "japaneseTitle": "Road of Naruto",
        "sub": 1, "dub": 0, "total": 0,
        "type": "ONA",
        "rating": "8.55",
        "genres": ["Action", "Fantasy", "Shounen"]
      },
      {
        "slug": "naruto-shippuuden-movie-6-road-to-ninja-w2wqq/ep-1",
        "animeId": "786",
        "title": "Naruto: Shippuuden Movie 6: Road to Ninja",
        "japaneseTitle": "Naruto: Shippuuden Movie 6 - Road to Ninja",
        "sub": 1, "dub": 1, "total": 0,
        "type": "Movie",
        "rating": "7.84",
        "genres": ["Action", "Comedy", "Supernatural"]
      },
      {
        "slug": "the-last-naruto-the-movie-whib1/ep-1",
        "animeId": "1765",
        "title": "The Last: Naruto the Movie",
        "japaneseTitle": "The Last: Naruto the Movie",
        "sub": 1, "dub": 1, "total": 0,
        "type": "Movie",
        "rating": "7.78",
        "genres": ["Action", "Comedy", "Supernatural"]
      }
    ]
  }
}
```

---

### Get Anime Info

```bash
# Get full info for "Naruto: Shippuuden Movie 6: Road to Ninja"
curl -s "https://anikototvapi.vercel.app/api/info?id=naruto-shippuuden-movie-6-road-to-ninja-w2wqq" | python3 -m json.tool
```

**Expected Output:**

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
    "rating": "PG-13"
  }
}
```

---

### Get Episodes

```bash
# Get episode list for animeId 21 (22 episodes, first ep ID "302")
curl -s "https://anikototvapi.vercel.app/api/episodes/21" | python3 -m json.tool
```

**Expected Output (partial):**

```json
{
  "success": true,
  "results": {
    "animeId": 21,
    "slug": "21",
    "totalEpisodes": 22,
    "episodes": [
      {
        "id": "302",
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

> **Tip:** Extract `server_ids` from the first episode to fetch available streaming servers.

---

### Get Servers

```bash
# Step 1: Get server_ids from episodes
SERVER_IDS=$(curl -s "https://anikototvapi.vercel.app/api/episodes/21" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['results']['episodes'][0]['server_ids'])")

# Step 2: Get servers using that server_ids
curl -s "https://anikototvapi.vercel.app/api/servers?ids=$SERVER_IDS" | python3 -m json.tool
```

**Expected Output:**

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
      "name": "HD-1"
    },
    {
      "type": "sub",
      "ep_id": "110289",
      "link_id": "MTF1dkFtaW9BRTZPbzJJRElFZUZrOWdjeldjOERLaWNMMXFNbVB3WUJqOEZ4cFNpMDdQbnV1S3dNdklpRkhWbzRsVmgxSGx4YWx3LytPcnZXU0RCVHc9PQ",
      "cmid": "animixplay-fqs",
      "sv_id": "2",
      "name": "Vidstream-2"
    },
    {
      "type": "sub",
      "ep_id": "110289",
      "link_id": "MTF1dkFtaW9BRTZPbzJJRElFZUZrOWdjeldjOERLaWNMMXFNbVB3WUJqOGZ4cFNpMDdQbnV1S3dNdklpRkhWbzRsVmgxSGx4YWx3LytPcnZXU0RCVHc9PQ",
      "cmid": "animixplay-fqs",
      "sv_id": "3",
      "name": "VidCloud-1"
    }
  ]
}
```

> **Note:** Servers are HD-1 (sub), Vidstream-2 (sub), VidCloud-1 (sub). Use `link_id` for streaming.

---

### Get Stream URL

```bash
# Get stream URL from a link_id
LINK_ID="MTF1dkFtaW9BRTZPbzJJRElFZUZrOWdjeldjOERLaWNMMXFNbVB3WUJqOHZGS2FSWVgvbVJraVpIV1dQRjRoN01hOFUvYmxsWXFYNGtiR0h5OWdGQWc9PQ"

curl -s "https://anikototvapi.vercel.app/api/stream?id=$LINK_ID" | python3 -m json.tool
```

**Expected Output:**

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

> **Tip:** The `url` field is the direct embed URL. Use `/stream/resolve` to get the actual m3u8/mp4 URL.

---

### Resolve Stream URL (embed → m3u8/mp4)

```bash
# Resolve embed URL to actual playable stream URL
curl -s "https://anikototvapi.vercel.app/api/stream/resolve?id=$LINK_ID" | python3 -m json.tool
```

**Expected Output:**

```json
{
  "success": true,
  "results": {
    "url": "https://vid-tube.site/hls/b32de9d4a3230c95f52948373e6e1549.m3u8",
    "type": "hls",
    "server": "HD-1",
    "subtitles": []
  }
}
```

---

### Full Streaming Pipeline (cURL one-liner)

```bash
# Complete pipeline: episodes → servers → stream URL → resolve
curl -s "https://anikototvapi.vercel.app/api/episodes/21" \
  | python3 -c "
import sys, json, urllib.request

data = json.load(sys.stdin)
server_ids = data['results']['episodes'][0]['server_ids']

servers = json.load(urllib.request.urlopen(f'https://anikototvapi.vercel.app/api/servers?ids={server_ids}'))
link_id = servers['results'][0]['link_id']

stream = json.load(urllib.request.urlopen(f'https://anikototvapi.vercel.app/api/stream?id={link_id}'))
print('Embed URL:', stream['results']['url'])
print('Skip intro:', stream['results']['skipData']['intro'])
"
```

---

### Filter by Genre

```bash
# Get all Action anime
curl -s "https://anikototvapi.vercel.app/api/genre/action?page=1" | python3 -m json.tool
```

---

### Filter by Type

```bash
# Get all Movies
curl -s "https://anikototvapi.vercel.app/api/type/movie?page=1" | python3 -m json.tool
```

---

### Filter by Status

```bash
# Get currently airing anime
curl -s "https://anikototvapi.vercel.app/api/status/currently-airing?page=1" | python3 -m json.tool
```

---

### Advanced Filter

```bash
# Filter: Action TV anime, currently airing, sorted by score
curl -s "https://anikototvapi.vercel.app/api/filter?keyword=&genre=action&type=tv&status=currently-airing&sort=score&page=1" | python3 -m json.tool
```

> **Important:** The `keyword` param is required by the source site. Pass empty string `""` if not searching.

---

### Get Top 10 (Day/Week/Month)

```bash
curl -s "https://anikototvapi.vercel.app/api/top-ten" | python3 -m json.tool
```

---

### Get Trending

```bash
curl -s "https://anikototvapi.vercel.app/api/trending" | python3 -m json.tool
```

---

### Random Anime

```bash
# Returns a random anime — e.g. "Cheating Craft" (animeId 4879)
curl -s "https://anikototvapi.vercel.app/api/random" | python3 -m json.tool
```

**Expected Output:**

```json
{
  "success": true,
  "results": {
    "slug": "cheating-craft-xhaj1",
    "animeId": 4879,
    "title": "Cheating Craft",
    "japaneseTitle": "Cheat Kusushi no Slow Life: Isekai ni Tsukurou Drugstore",
    "poster": "https://cdn.anipixcdn.co/thumbnail/...",
    "type": "TV",
    "synopsis": "An anime about students who use cheating techniques to pass exams...",
    "rating": "6.50   6.50 /10",
    "genres": ["Comedy", "School"]
  }
}
```

---

### Search Suggestions (autocomplete)

```bash
curl -s "https://anikototvapi.vercel.app/api/suggestions?keyword=naruto" | python3 -m json.tool
```

---

### AZ List

```bash
# Browse anime starting with "A"
curl -s "https://anikototvapi.vercel.app/api/az-list/a?page=1" | python3 -m json.tool
```

---

### Most Popular

```bash
curl -s "https://anikototvapi.vercel.app/api/most-popular?page=1" | python3 -m json.tool
```

---

### New Releases

```bash
curl -s "https://anikototvapi.vercel.app/api/new-release?page=1" | python3 -m json.tool
```

---

### Watch Page

```bash
curl -s "https://anikototvapi.vercel.app/api/watch?slug=one-piece-odmau&ep=1165" | python3 -m json.tool
```

---

### Proxy M3U8 for CORS-free Playback

```bash
# Rewrite an M3U8 playlist so all URLs go through the API proxy
curl -s "https://anikototvapi.vercel.app/api/stream/proxy?url=https://example.com/playlist.m3u8"
```

> **Tip:** Use this endpoint with HLS.js to avoid CORS issues in the browser.

---

// ═══════════════════════════════════════════════════════════════
// ═══ SECTION 2: JavaScript (fetch) Examples ═══
// ═══════════════════════════════════════════════════════════════

## JavaScript (Browser Fetch) Examples

---

### Search and Display Results

```javascript
async function searchAnime(keyword) {
  const res = await fetch(
    `https://anikototvapi.vercel.app/api/search?keyword=${encodeURIComponent(keyword)}`
  );
  const data = await res.json();

  if (!data.success) {
    console.error('Search failed:', data.message);
    return [];
  }

  const results = data.results.data.map(anime => ({
    title: anime.title,
    japaneseTitle: anime.japaneseTitle,
    slug: anime.slug,
    animeId: anime.animeId,
    type: anime.type,
    sub: anime.sub,
    dub: anime.dub,
    rating: anime.rating,
    genres: anime.genres
  }));

  results.forEach(a => {
    console.log(`📺 ${a.title} (${a.type}) — Sub: ${a.sub}, Dub: ${a.dub} | Rating: ${a.rating}`);
  });

  return results;
}

// Usage
searchAnime('naruto');
// Output:
// 📺 Road of Naruto (ONA) — Sub: 1, Dub: 0 | Rating: 8.55
// 📺 Naruto: Shippuuden Movie 6: Road to Ninja (Movie) — Sub: 1, Dub: 1 | Rating: 7.84
// 📺 The Last: Naruto the Movie (Movie) — Sub: 1, Dub: 1 | Rating: 7.78
```

---

### Full Streaming Workflow (episodes → servers → stream → resolve)

```javascript
async function getStreamUrl(animeId, episodeNumber = 1) {
  const BASE = 'https://anikototvapi.vercel.app/api';

  try {
    // Step 1: Get episodes
    const epRes = await fetch(`${BASE}/episodes/${animeId}`);
    const epData = await epRes.json();
    const episodes = epData.results.episodes;

    if (!episodes || episodes.length === 0) {
      throw new Error(`No episodes found for animeId ${animeId}`);
    }

    const episode = episodes.find(e => e.episode_no === episodeNumber) || episodes[0];
    console.log(`Found episode ${episode.episode_no} (id: ${episode.id})`);

    // Step 2: Get servers
    const srvRes = await fetch(`${BASE}/servers?ids=${episode.server_ids}`);
    const srvData = await srvRes.json();
    const servers = srvData.results;

    if (!servers || servers.length === 0) {
      throw new Error('No servers available');
    }

    console.log(`Available servers: ${servers.map(s => s.name).join(', ')}`);

    // Pick HD-1 by default, or first available
    const server = servers.find(s => s.name === 'HD-1') || servers[0];
    console.log(`Using server: ${server.name} (${server.type})`);

    // Step 3: Get embed URL
    const streamRes = await fetch(`${BASE}/stream?id=${server.link_id}`);
    const streamData = await streamRes.json();
    const embedUrl = streamData.results.url;
    console.log(`Embed URL: ${embedUrl}`);

    // Step 4: Resolve to actual m3u8/mp4
    const resolveRes = await fetch(`${BASE}/stream/resolve?id=${server.link_id}`);
    const resolveData = await resolveRes.json();
    const streamUrl = resolveData.results.url;
    const streamType = resolveData.results.type; // "hls" or "mp4"

    console.log(`✅ Resolved: ${streamUrl} (${streamType})`);

    return {
      url: streamUrl,
      type: streamType,
      server: server.name,
      skipIntro: streamData.results.skipData.intro,
      skipOutro: streamData.results.skipData.outro
    };

  } catch (err) {
    console.error('❌ Streaming error:', err.message);
    return null;
  }
}

// Usage: Get stream URL for animeId 21, episode 1
getStreamUrl(21, 1);
// Output:
// Found episode 1 (id: 302)
// Available servers: HD-1, Vidstream-2, VidCloud-1
// Using server: HD-1 (sub)
// Embed URL: https://megaplay.buzz/stream/s-5/94736/sub
// ✅ Resolved: https://vid-tube.site/hls/b32de9d4a3230c95f52948373e6e1549.m3u8 (hls)
```

---

### Pagination Handling

```javascript
async function fetchAllSearchResults(keyword, maxPages = 5) {
  const BASE = 'https://anikototvapi.vercel.app/api';
  const allResults = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const res = await fetch(`${BASE}/search?keyword=${encodeURIComponent(keyword)}&page=${page}`);
      const data = await res.json();

      if (!data.success || !data.results.data.length) {
        console.log(`No more results after page ${page - 1}`);
        break;
      }

      allResults.push(...data.results.data);
      console.log(`Page ${page}: ${data.results.data.length} results`);

      // Stop if we've reached the last page
      if (page >= data.results.totalPages) {
        console.log(`Reached last page (${data.results.totalPages})`);
        break;
      }

      // Respect rate limits — wait 500ms between requests
      await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      console.error(`Error on page ${page}:`, err.message);
      break;
    }
  }

  console.log(`Total results: ${allResults.length}`);
  return allResults;
}

// Usage
fetchAllSearchResults('naruto', 3);
```

---

### Error Handling with try/catch

```javascript
async function safeFetch(endpoint, params = {}) {
  const BASE = 'https://anikototvapi.vercel.app/api';
  const url = new URL(`${BASE}${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  try {
    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || 'API returned success: false');
    }

    return data.results;

  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      console.error('Network error — API may be down:', err.message);
    } else {
      console.error('API error:', err.message);
    }
    return null;
  }
}

// Usage
const anime = await safeFetch('/info', { id: 'cheating-craft-xhaj1' });
if (anime) {
  console.log(`Found: ${anime.title} (${anime.type})`);
}

const stream = await safeFetch('/stream', { id: 'MTF1dkFtaW9BRTZPbzJJRElFZUZr...' });
if (stream) {
  console.log(`Stream: ${stream.url}`);
}
```

---

### Auto-Complete Search Suggestions

```javascript
async function getSearchSuggestions(keyword) {
  if (!keyword || keyword.length < 2) return [];

  const res = await fetch(
    `https://anikototvapi.vercel.app/api/suggestions?keyword=${encodeURIComponent(keyword)}`
  );
  const data = await res.json();

  if (!data.success) return [];

  return data.results.map(anime => ({
    title: anime.title,
    japaneseTitle: anime.japaneseTitle,
    slug: anime.slug,
    type: anime.type,
    poster: anime.poster
  }));
}

// Debounced search for input fields
let debounceTimer;
document.getElementById('search-input')?.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const suggestions = await getSearchSuggestions(e.target.value);
    console.log(`Found ${suggestions.length} suggestions:`);
    suggestions.forEach(s => {
      console.log(`  ${s.title} (${s.type}) — ${s.slug}`);
    });
  }, 300); // 300ms debounce
});
```

---

### Trending and Top-10 Display

```javascript
async function displayTrending() {
  const [trendingRes, topTenRes] = await Promise.all([
    fetch('https://anikototvapi.vercel.app/api/trending'),
    fetch('https://anikototvapi.vercel.app/api/top-ten')
  ]);

  const trending = await trendingRes.json();
  const topTen = await topTenRes.json();

  console.log('=== Trending Anime ===');
  trending.results.slice(0, 5).forEach((anime, i) => {
    console.log(`  ${i + 1}. ${anime.title} — Sub: ${anime.sub}, Dub: ${anime.dub}`);
  });

  console.log('\n=== Top 10 Today ===');
  topTen.results.today.slice(0, 5).forEach(anime => {
    console.log(`  #${anime.rank} ${anime.name}`);
  });

  console.log('\n=== Top 10 This Week ===');
  topTen.results.week.slice(0, 5).forEach(anime => {
    console.log(`  #${anime.rank} ${anime.name}`);
  });
}

displayTrending();
```

---

// ═══════════════════════════════════════════════════════════════
// ═══ SECTION 3: Python (requests) Examples ═══
// ═══════════════════════════════════════════════════════════════

## Python (requests) Examples

---

### Search for Anime

```python
import requests

BASE = "https://anikototvapi.vercel.app/api"

def search_anime(keyword, page=1):
    """Search for anime by keyword."""
    resp = requests.get(f"{BASE}/search", params={"keyword": keyword, "page": page})
    resp.raise_for_status()
    data = resp.json()

    if not data["success"]:
        raise Exception(data.get("message", "Search failed"))

    results = data["results"]["data"]
    print(f"Found {len(results)} results (page {page}/{data['results']['totalPages']}):")
    for anime in results:
        print(f"  {anime['title']} ({anime['type']}) — Sub: {anime['sub']}, Dub: {anime['dub']}")

    return results

# Usage
results = search_anime("naruto")
# Output:
# Found 3 results (page 1/1):
#   Road of Naruto (ONA) — Sub: 1, Dub: 0
#   Naruto: Shippuuden Movie 6: Road to Ninja (Movie) — Sub: 1, Dub: 1
#   The Last: Naruto the Movie (Movie) — Sub: 1, Dub: 1
```

---

### Get Anime Details

```python
import requests

BASE = "https://anikototvapi.vercel.app/api"

def get_anime_info(slug):
    """Get full anime information by slug."""
    resp = requests.get(f"{BASE}/info", params={"id": slug})
    resp.raise_for_status()
    data = resp.json()

    info = data["results"]
    print(f"Title:      {info['title']}")
    print(f"Japanese:   {info['japaneseTitle']}")
    print(f"Type:       {info['type']}")
    print(f"Status:     {info['status']}")
    print(f"Episodes:   {info.get('episodes', 'Unknown')}")
    print(f"Score:      {info['malScore']}")
    print(f"Genres:     {', '.join(info['genres'])}")
    print(f"Studios:    {', '.join(info['studios'])}")
    print(f"Synopsis:   {info['synopsis'][:100]}...")

    return info

# Usage
info = get_anime_info("naruto-shippuuden-movie-6-road-to-ninja-w2wqq")
```

---

### Streaming Workflow (Python)

```python
import requests

BASE = "https://anikototvapi.vercel.app/api"

def get_stream_url(anime_id, episode_number=1):
    """Complete streaming workflow: episodes → servers → stream → resolve."""

    # Step 1: Get episodes
    ep_resp = requests.get(f"{BASE}/episodes/{anime_id}")
    ep_resp.raise_for_status()
    episodes = ep_resp.json()["results"]["episodes"]

    if not episodes:
        raise Exception(f"No episodes found for animeId {anime_id}")

    episode = next(
        (e for e in episodes if e["episode_no"] == episode_number),
        episodes[0]
    )
    print(f"Episode {episode['episode_no']} (id: {episode['id']})")

    # Step 2: Get servers
    srv_resp = requests.get(f"{BASE}/servers", params={"ids": episode["server_ids"]})
    srv_resp.raise_for_status()
    servers = srv_resp.json()["results"]

    if not servers:
        raise Exception("No servers available")

    # Prefer HD-1
    server = next((s for s in servers if s["name"] == "HD-1"), servers[0])
    print(f"Server: {server['name']} ({server['type']})")

    # Step 3: Get embed URL
    stream_resp = requests.get(f"{BASE}/stream", params={"id": server["link_id"]})
    stream_resp.raise_for_status()
    embed_url = stream_resp.json()["results"]["url"]
    print(f"Embed URL: {embed_url}")

    # Step 4: Resolve to actual stream
    resolve_resp = requests.get(f"{BASE}/stream/resolve", params={"id": server["link_id"]})
    resolve_resp.raise_for_status()
    resolved = resolve_resp.json()["results"]

    print(f"✅ Stream: {resolved['url']} ({resolved['type']})")
    return resolved

# Usage
stream = get_stream_url(21, 1)
# Output:
# Episode 1 (id: 302)
# Server: HD-1 (sub)
# Embed URL: https://megaplay.buzz/stream/s-5/94736/sub
# ✅ Stream: https://vid-tube.site/hls/...m3u8 (hls)
```

---

### Filter and Paginate

```python
import requests
import time

BASE = "https://anikototvapi.vercel.app/api"

def filter_anime(genre=None, anime_type=None, status=None, sort=None, max_pages=3):
    """Filter anime with multiple parameters and pagination."""
    all_results = []

    for page in range(1, max_pages + 1):
        params = {"keyword": "", "page": page}
        if genre:
            params["genre"] = genre
        if anime_type:
            params["type"] = anime_type
        if status:
            params["status"] = status
        if sort:
            params["sort"] = sort

        resp = requests.get(f"{BASE}/filter", params=params)
        resp.raise_for_status()
        data = resp.json()

        if not data["success"]:
            break

        page_data = data["results"]["data"]
        if not page_data:
            break

        all_results.extend(page_data)
        print(f"Page {page}: {len(page_data)} results")

        # Check pagination info if available
        pagination = data["results"].get("pagination", {})
        if pagination and not pagination.get("hasNext", True):
            break

        time.sleep(0.5)  # Rate limit respect

    print(f"\nTotal: {len(all_results)} anime found")
    for anime in all_results[:5]:
        print(f"  {anime['title']} ({anime['type']}) — Rating: {anime.get('rating', 'N/A')}")

    return all_results

# Usage: Action TV anime, currently airing
filter_anime(genre="action", anime_type="tv", status="currently-airing")
```

---

### Batch Processing

```python
import requests
import json
import time

BASE = "https://anikototvapi.vercel.app/api"

def batch_fetch_anime_info(slugs, delay=0.5):
    """Fetch info for multiple anime with rate limiting."""
    results = []

    for i, slug in enumerate(slugs):
        try:
            resp = requests.get(f"{BASE}/info", params={"id": slug}, timeout=10)
            resp.raise_for_status()
            data = resp.json()

            if data["success"]:
                info = data["results"]
                results.append({
                    "slug": slug,
                    "title": info["title"],
                    "type": info["type"],
                    "status": info["status"],
                    "episodes": info.get("episodes"),
                    "score": info["malScore"],
                    "genres": info["genres"]
                })
                print(f"[{i+1}/{len(slugs)}] ✅ {info['title']}")
            else:
                print(f"[{i+1}/{len(slugs)}] ❌ {slug}: {data.get('message', 'Unknown error')}")

        except Exception as e:
            print(f"[{i+1}/{len(slugs)}] ❌ {slug}: {e}")

        time.sleep(delay)

    return results

# Usage: Fetch info for multiple anime
slugs = [
    "cheating-craft-xhaj1",
    "road-of-naruto-ggjw8",
    "naruto-shippuuden-movie-6-road-to-ninja-w2wqq"
]
anime_list = batch_fetch_anime_info(slugs)

# Save to JSON
with open("anime_batch.json", "w") as f:
    json.dump(anime_list, f, indent=2)
print(f"\nSaved {len(anime_list)} anime to anime_batch.json")
```

---

### Random Anime Discovery

```python
import requests

BASE = "https://anikototvapi.vercel.app/api"

def discover_random(count=5):
    """Discover random anime for recommendations."""
    discovered = []

    for i in range(count):
        resp = requests.get(f"{BASE}/random")
        resp.raise_for_status()
        anime = resp.json()["results"]
        discovered.append(anime)
        print(f"{i+1}. {anime['title']} ({anime['type']}) — {', '.join(anime['genres'])}")

    return discovered

# Usage
discover_random()
```

---

// ═══════════════════════════════════════════════════════════════
// ═══ SECTION 4: Node.js (axios) Examples ═══
// ═══════════════════════════════════════════════════════════════

## Node.js (axios) Examples

---

### Server-Side Streaming Workflow

```javascript
const axios = require('axios');

const BASE = 'https://anikototvapi.vercel.app/api';

async function getStreamUrl(animeId, episodeNumber = 1) {
  // Step 1: Get episodes
  const { data: epData } = await axios.get(`${BASE}/episodes/${animeId}`);
  const episodes = epData.results.episodes;

  if (!episodes || episodes.length === 0) {
    throw new Error(`No episodes found for animeId ${animeId}`);
  }

  const episode = episodes.find(e => e.episode_no === episodeNumber) || episodes[0];
  console.log(`Episode ${episode.episode_no} (id: ${episode.id})`);

  // Step 2: Get servers
  const { data: srvData } = await axios.get(`${BASE}/servers`, {
    params: { ids: episode.server_ids }
  });
  const servers = srvData.results;

  if (!servers || servers.length === 0) {
    throw new Error('No servers available');
  }

  const server = servers.find(s => s.name === 'HD-1') || servers[0];
  console.log(`Server: ${server.name} (${server.type})`);

  // Step 3: Get embed URL
  const { data: streamData } = await axios.get(`${BASE}/stream`, {
    params: { id: server.link_id }
  });
  console.log(`Embed: ${streamData.results.url}`);

  // Step 4: Resolve to actual stream
  const { data: resolveData } = await axios.get(`${BASE}/stream/resolve`, {
    params: { id: server.link_id }
  });

  const result = {
    url: resolveData.results.url,
    type: resolveData.results.type,
    server: server.name,
    skipIntro: streamData.results.skipData.intro,
    skipOutro: streamData.results.skipData.outro
  };

  console.log(`✅ Stream: ${result.url} (${result.type})`);
  return result;
}

// Usage
getStreamUrl(21, 1)
  .then(stream => console.log('Result:', stream))
  .catch(err => console.error('Error:', err.message));
```

---

### Concurrent Requests

```javascript
const axios = require('axios');

const BASE = 'https://anikototvapi.vercel.app/api';

async function fetchMultipleEndpoints() {
  // Fetch multiple endpoints concurrently
  const endpoints = [
    axios.get(`${BASE}/`),
    axios.get(`${BASE}/trending`),
    axios.get(`${BASE}/top-ten`),
    axios.get(`${BASE}/random`),
    axios.get(`${BASE}/suggestions`, { params: { keyword: 'naruto' } })
  ];

  const [
    homeRes,
    trendingRes,
    topTenRes,
    randomRes,
    suggestRes
  ] = await Promise.all(endpoints);

  console.log('=== Homepage ===');
  console.log(`Spotlights: ${homeRes.data.results.spotlights.length}`);
  console.log(`Trending:   ${homeRes.data.results.trending.length}`);
  console.log(`Genres:     ${homeRes.data.results.genres.length}`);

  console.log('\n=== Trending (top 3) ===');
  trendingRes.data.results.slice(0, 3).forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.title} — Sub: ${a.sub}, Dub: ${a.dub}`);
  });

  console.log('\n=== Top 10 Today ===');
  topTenRes.data.results.today.slice(0, 3).forEach(a => {
    console.log(`  #${a.rank} ${a.name}`);
  });

  console.log('\n=== Random Anime ===');
  const random = randomRes.data.results;
  console.log(`  ${random.title} (${random.type}) — ${random.genres.join(', ')}`);

  console.log('\n=== Naruto Suggestions ===');
  suggestRes.data.results.forEach(s => {
    console.log(`  ${s.title} (${s.type}) — ${s.slug}`);
  });
}

fetchMultipleEndpoints().catch(console.error);
```

---

### Error Handling with Retries

```javascript
const axios = require('axios');

const BASE = 'https://anikototvapi.vercel.app/api';

async function fetchWithRetry(url, params = {}, retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data } = await axios.get(url, {
        params,
        timeout: 10000
      });

      if (!data.success) {
        throw new Error(data.message || 'API returned success: false');
      }

      return data.results;

    } catch (err) {
      const isLastAttempt = attempt === retries;
      const status = err.response?.status;
      const isServerError = status && status >= 500;

      if (isLastAttempt || !isServerError) {
        throw err;
      }

      console.warn(`Attempt ${attempt} failed (${status}), retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2; // Exponential backoff
    }
  }
}

// Usage
async function main() {
  try {
    const anime = await fetchWithRetry(`${BASE}/info`, { id: 'cheating-craft-xhaj1' });
    console.log(`Found: ${anime.title} (${anime.type})`);

    const episodes = await fetchWithRetry(`${BASE}/episodes/${anime.animeId}`);
    console.log(`Episodes: ${episodes.totalEpisodes}`);
  } catch (err) {
    console.error('Failed after retries:', err.message);
  }
}

main();
```

---

### Episode List with Axios

```javascript
const axios = require('axios');

async function getEpisodeList(animeId) {
  const { data } = await axios.get(`https://anikototvapi.vercel.app/api/episodes/${animeId}`);

  const { animeId: id, totalEpisodes, episodes } = data.results;

  console.log(`Anime ID: ${id}`);
  console.log(`Total Episodes: ${totalEpisodes}`);
  console.log(`Episodes available: ${episodes.length}`);

  episodes.forEach(ep => {
    console.log(`  Episode ${ep.episode_no}: server_ids = ${ep.server_ids ? 'available' : 'missing'}`);
  });

  return data.results;
}

getEpisodeList(21);
```

---

### Suggestions with Axios

```javascript
const axios = require('axios');

async function getSuggestions(keyword) {
  const { data } = await axios.get('https://anikototvapi.vercel.app/api/suggestions', {
    params: { keyword }
  });

  return data.results;
}

getSuggestions('naruto').then(suggestions => {
  suggestions.forEach(a => console.log(`${a.title} (${a.slug})`));
});
```

---

// ═══════════════════════════════════════════════════════════════
// ═══ SECTION 5: HTML/JS Player Integration ═══
// ═══════════════════════════════════════════════════════════════

## HTML/JS Player Integration

---

### HLS.js Player with M3U8 Proxy

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AniKotoAPI Player — HLS.js</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0f0f23; color: #e0e0e0; padding: 20px; }
    .player-container { max-width: 900px; margin: 0 auto; }
    h1 { text-align: center; margin-bottom: 20px; color: #a78bfa; }
    video { width: 100%; border-radius: 8px; background: #000; }
    .controls { margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap; }
    button { padding: 8px 16px; border: 1px solid #a78bfa; background: #1e1e2e; color: #e0e0e0;
             border-radius: 6px; cursor: pointer; font-size: 14px; }
    button:hover { background: #a78bfa; color: #fff; }
    select { padding: 8px; border: 1px solid #a78bfa; background: #1e1e2e; color: #e0e0e0;
             border-radius: 6px; font-size: 14px; }
    .info { margin-top: 15px; padding: 12px; background: #1e1e2e; border-radius: 8px; font-size: 13px; }
    .status { color: #22c55e; } .error { color: #ef4444; }
  </style>
</head>
<body>
  <div class="player-container">
    <h1>AniKotoAPI HLS Player</h1>
    <video id="video" controls></video>

    <div class="controls">
      <button onclick="loadEpisode(21, 1)">Load Ep 1</button>
      <button onclick="loadEpisode(21, 2)">Load Ep 2</button>
      <select id="quality-select" onchange="switchQuality(this.value)">
        <option value="">Auto Quality</option>
      </select>
    </div>

    <div class="info" id="status">Ready. Click a button to load an episode.</div>
  </div>

  <script>
    const BASE = 'https://anikototvapi.vercel.app/api';
    const video = document.getElementById('video');
    const statusEl = document.getElementById('status');
    const qualitySelect = document.getElementById('quality-select');
    let hls = null;

    function setStatus(msg, isError = false) {
      statusEl.textContent = msg;
      statusEl.className = isError ? 'info error' : 'info status';
    }

    async function loadEpisode(animeId, ep) {
      try {
        setStatus(`Loading episode ${ep}...`);

        // Step 1: Get episodes
        const epRes = await fetch(`${BASE}/episodes/${animeId}`);
        const epData = await epRes.json();
        const episodes = epData.results.episodes;
        const episode = episodes.find(e => e.episode_no === ep) || episodes[0];

        // Step 2: Get servers
        const srvRes = await fetch(`${BASE}/servers?ids=${episode.server_ids}`);
        const srvData = await srvRes.json();
        const server = srvData.results.find(s => s.name === 'HD-1') || srvData.results[0];

        // Step 3: Get embed URL
        const streamRes = await fetch(`${BASE}/stream?id=${server.link_id}`);
        const streamData = await streamRes.json();

        // Step 4: Resolve to m3u8
        const resolveRes = await fetch(`${BASE}/stream/resolve?id=${server.link_id}`);
        const resolveData = await resolveRes.json();
        const streamUrl = resolveData.results.url;

        setStatus(`Ep ${ep} — Server: ${server.name} — Resolving stream...`);

        // Step 5: Use M3U8 proxy for CORS-free playback
        const proxyUrl = `${BASE}/stream/proxy?url=${encodeURIComponent(streamUrl)}`;

        // Initialize HLS.js
        if (hls) { hls.destroy(); }

        if (Hls.isSupported()) {
          hls = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60
          });

          hls.loadSource(proxyUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            const levels = data.levels.map((l, i) => ({
              index: i,
              height: l.height,
              width: l.width,
              bitrate: l.bitrate
            }));

            // Populate quality selector
            qualitySelect.innerHTML = '<option value="">Auto</option>';
            levels.forEach(l => {
              const opt = document.createElement('option');
              opt.value = l.index;
              opt.textContent = `${l.height}p (${Math.round(l.bitrate / 1000)}kbps)`;
              qualitySelect.appendChild(opt);
            });

            setStatus(`Playing Ep ${ep} — ${levels.length} qualities available`);
            video.play();
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              setStatus(`Fatal error: ${data.type}`, true);
            }
          });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari native HLS
          video.src = proxyUrl;
          setStatus(`Playing Ep ${ep} (native HLS)`);
        }

      } catch (err) {
        setStatus(`Error: ${err.message}`, true);
        console.error(err);
      }
    }

    function switchQuality(levelIndex) {
      if (!hls) return;
      if (levelIndex === '') {
        hls.currentLevel = -1; // Auto
      } else {
        hls.currentLevel = parseInt(levelIndex);
      }
    }
  </script>
</body>
</html>
```

---

### Plyr Player Setup

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AniKotoAPI — Plyr Player</title>
  <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css" />
  <script src="https://cdn.plyr.io/3.7.8/plyr.polyfilled.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    body { background: #0f0f23; display: flex; justify-content: center; align-items: center;
           min-height: 100vh; margin: 0; }
    .plyr { width: 100%; max-width: 900px; border-radius: 12px; }
  </style>
</head>
<body>
  <video id="player" controls crossorigin playsinline></video>

  <script>
    const BASE = 'https://anikototvapi.vercel.app/api';
    const video = document.getElementById('player');

    async function initPlyr(animeId, episode) {
      try {
        // Get episodes
        const epRes = await fetch(`${BASE}/episodes/${animeId}`);
        const epData = await epRes.json();
        const episodeData = epData.results.episodes.find(e => e.episode_no === episode);

        // Get servers
        const srvRes = await fetch(`${BASE}/servers?ids=${episodeData.server_ids}`);
        const srvData = await srvRes.json();
        const server = srvData.results.find(s => s.name === 'HD-1') || srvData.results[0];

        // Resolve stream
        const resolveRes = await fetch(`${BASE}/stream/resolve?id=${server.link_id}`);
        const resolveData = await resolveRes.json();
        const streamUrl = resolveData.results.url;

        // Use proxy for CORS
        const proxyUrl = `${BASE}/stream/proxy?url=${encodeURIComponent(streamUrl)}`;

        // Setup HLS.js with Plyr
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(proxyUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            // Initialize Plyr after HLS is ready
            const player = new Plyr(video, {
              controls: ['play-large', 'play', 'progress', 'current-time', 'duration',
                         'mute', 'volume', 'settings', 'fullscreen'],
              settings: ['speed'],
              speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] }
            });

            console.log('Plyr initialized with HLS stream');
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = `${BASE}/stream/proxy?url=${encodeURIComponent(streamUrl)}`;
          new Plyr(video);
        }

      } catch (err) {
        console.error('Failed to init player:', err);
      }
    }

    // Load episode: animeId 21, episode 1
    initPlyr(21, 1);
  </script>
</body>
</html>
```

---

### Video.js Setup

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AniKotoAPI — Video.js Player</title>
  <link href="https://cdn.jsdelivr.net/npm/video.js@8.10.0/dist/video-js.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/video.js@8.10.0/dist/video.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@videojs/http-streaming@3.12.0/dist/videojs-http-streaming.min.js"></script>
  <style>
    body { background: #0f0f23; display: flex; justify-content: center; align-items: center;
           min-height: 100vh; margin: 0; }
    .video-js { width: 100%; max-width: 900px; border-radius: 12px; }
  </style>
</head>
<body>
  <video id="video-player" class="video-js vjs-big-play-centered" controls preload="auto">
    <p class="vjs-no-js">Please enable JavaScript to use this player.</p>
  </video>

  <script>
    const BASE = 'https://anikototvapi.vercel.app/api';

    async function initVideoJS(animeId, episode) {
      try {
        // Get episodes
        const epRes = await fetch(`${BASE}/episodes/${animeId}`);
        const epData = await epRes.json();
        const episodeData = epData.results.episodes.find(e => e.episode_no === episode);

        // Get servers
        const srvRes = await fetch(`${BASE}/servers?ids=${episodeData.server_ids}`);
        const srvData = await srvRes.json();
        const server = srvData.results.find(s => s.name === 'HD-1') || srvData.results[0];

        // Resolve stream
        const resolveRes = await fetch(`${BASE}/stream/resolve?id=${server.link_id}`);
        const resolveData = await resolveRes.json();
        const streamUrl = resolveData.results.url;

        // Use proxy for CORS
        const proxyUrl = `${BASE}/stream/proxy?url=${encodeURIComponent(streamUrl)}`;

        // Initialize Video.js
        const player = videojs('video-player', {
          controls: true,
          autoplay: false,
          preload: 'auto',
          fluid: true,
          responsive: true,
          playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
          sources: [{
            src: proxyUrl,
            type: 'application/x-mpegURL'
          }]
        });

        player.ready(() => {
          console.log('Video.js player ready — Ep', episode, 'via', server.name);
        });

        return player;

      } catch (err) {
        console.error('Failed to init Video.js:', err);
      }
    }

    initVideoJS(21, 1);
  </script>
</body>
</html>
```

---

### Custom Player with Quality Selection

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AniKotoAPI — Custom Player</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0f0f23; color: #e0e0e0; padding: 20px; }
    .player-wrapper { max-width: 960px; margin: 0 auto; }
    h1 { text-align: center; color: #a78bfa; margin-bottom: 20px; }
    video { width: 100%; border-radius: 8px; background: #000; }
    .player-bar { display: flex; align-items: center; gap: 12px; margin-top: 12px; padding: 10px;
                  background: #1e1e2e; border-radius: 8px; flex-wrap: wrap; }
    .player-bar button { padding: 6px 14px; background: #22c55e; color: #fff; border: none;
                         border-radius: 4px; cursor: pointer; font-size: 13px; }
    .player-bar button:hover { background: #16a34a; }
    .player-bar select { padding: 6px; background: #0f0f23; color: #e0e0e0; border: 1px solid #333;
                         border-radius: 4px; font-size: 13px; }
    .info-box { margin-top: 12px; padding: 12px; background: #1e1e2e; border-radius: 8px; font-size: 13px; }
    .info-box code { color: #a78bfa; }
    .ep-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
               gap: 6px; margin-top: 12px; }
    .ep-btn { padding: 8px; text-align: center; background: #1e1e2e; border: 1px solid #333;
              border-radius: 4px; cursor: pointer; color: #e0e0e0; font-size: 13px; }
    .ep-btn:hover { border-color: #a78bfa; background: #2a2a4a; }
    .ep-btn.active { background: #a78bfa; color: #fff; border-color: #a78bfa; }
  </style>
</head>
<body>
  <div class="player-wrapper">
    <h1>AniKotoAPI Custom Player</h1>
    <video id="video" controls></video>

    <div class="player-bar">
      <select id="server-select" onchange="switchServer(this.value)">
        <option value="">Loading servers...</option>
      </select>
      <select id="quality-select" onchange="switchQuality(this.value)">
        <option value="">Auto</option>
      </select>
      <button onclick="toggleSpeed()">Speed</button>
      <span id="speed-label" style="font-size:13px;">1x</span>
    </div>

    <div class="ep-grid" id="episode-grid"></div>

    <div class="info-box" id="info">Loading...</div>
  </div>

  <script>
    const BASE = 'https://anikototvapi.vercel.app/api';
    const video = document.getElementById('video');
    const serverSelect = document.getElementById('server-select');
    const qualitySelect = document.getElementById('quality-select');
    const infoBox = document.getElementById('info');
    const epGrid = document.getElementById('episode-grid');
    const speedLabel = document.getElementById('speed-label');

    let hls = null;
    let currentServers = [];
    let currentAnimeId = null;
    let speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    let speedIdx = 2;

    function setInfo(msg) { infoBox.innerHTML = msg; }

    async function loadAnime(animeId) {
      currentAnimeId = animeId;
      setInfo('Loading episodes...');

      const epRes = await fetch(`${BASE}/episodes/${animeId}`);
      const epData = await epRes.json();
      const episodes = epData.results.episodes;

      // Render episode grid
      epGrid.innerHTML = '';
      episodes.forEach(ep => {
        const btn = document.createElement('div');
        btn.className = 'ep-btn';
        btn.textContent = ep.episode_no;
        btn.onclick = () => loadEpisode(ep);
        epGrid.appendChild(btn);
      });

      // Load first episode
      if (episodes.length > 0) {
        loadEpisode(episodes[0]);
      }
    }

    async function loadEpisode(ep) {
      // Highlight active episode
      document.querySelectorAll('.ep-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i + 1 === ep.episode_no);
      });

      setInfo(`Loading episode ${ep.episode_no}...`);

      // Get servers
      const srvRes = await fetch(`${BASE}/servers?ids=${ep.server_ids}`);
      const srvData = await srvRes.json();
      currentServers = srvData.results;

      // Populate server dropdown
      serverSelect.innerHTML = '';
      currentServers.forEach((s, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `${s.name} (${s.type})`;
        serverSelect.appendChild(opt);
      });

      // Load first server
      if (currentServers.length > 0) {
        loadServer(0, ep.episode_no);
      }
    }

    async function loadServer(index, epNum) {
      const server = currentServers[index];
      setInfo(`Loading ${server.name}...`);

      // Get embed + resolve
      const [streamRes, resolveRes] = await Promise.all([
        fetch(`${BASE}/stream?id=${server.link_id}`),
        fetch(`${BASE}/stream/resolve?id=${server.link_id}`)
      ]);

      const streamData = await streamRes.json();
      const resolveData = await resolveRes.json();
      const streamUrl = resolveData.results.url;
      const proxyUrl = `${BASE}/stream/proxy?url=${encodeURIComponent(streamUrl)}`;

      // Setup HLS
      if (hls) hls.destroy();

      if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(proxyUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (e, data) => {
          qualitySelect.innerHTML = '<option value="">Auto</option>';
          data.levels.forEach((l, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${l.height}p (${Math.round(l.bitrate / 1000)}kbps)`;
            qualitySelect.appendChild(opt);
          });
          setInfo(`Ep ${epNum} — <code>${server.name}</code> — ${data.levels.length} qualities`);
          video.play();
        });
      }
    }

    function switchServer(index) {
      loadServer(parseInt(index));
    }

    function switchQuality(value) {
      if (!hls) return;
      hls.currentLevel = value === '' ? -1 : parseInt(value);
    }

    function toggleSpeed() {
      speedIdx = (speedIdx + 1) % speeds.length;
      video.playbackRate = speeds[speedIdx];
      speedLabel.textContent = `${speeds[speedIdx]}x`;
    }

    // Initialize: load animeId 21
    loadAnime(21);
  </script>
</body>
</html>
```

---

// ═══════════════════════════════════════════════════════════════
// ═══ SECTION 6: Real Response Examples ═══
// ═══════════════════════════════════════════════════════════════

## Real Response Examples

> These are actual responses from the live API, showing real data you will receive.

---

### Search "naruto" — Full Response

```bash
curl -s "https://anikototvapi.vercel.app/api/search?keyword=naruto" | python3 -m json.tool
```

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
      },
      {
        "slug": "naruto-shippuuden-movie-6-road-to-ninja-w2wqq/ep-1",
        "animeId": "786",
        "poster": "https://cdn.anipixcdn.co/thumbnail/43dd49b4fdb9bede653e94468ff8df1e.jpg",
        "title": "Naruto: Shippuuden Movie 6: Road to Ninja",
        "japaneseTitle": "Naruto: Shippuuden Movie 6 - Road to Ninja",
        "sub": 1,
        "dub": 1,
        "total": 0,
        "type": "Movie",
        "rating": "7.84",
        "genres": ["Action", "Comedy", "Supernatural"]
      },
      {
        "slug": "the-last-naruto-the-movie-whib1/ep-1",
        "animeId": "1765",
        "poster": "https://cdn.anipixcdn.co/thumbnail/6c3cf77d52820cd0fe646d38bc2145ca.jpg",
        "title": "The Last: Naruto the Movie",
        "japaneseTitle": "The Last: Naruto the Movie",
        "sub": 1,
        "dub": 1,
        "total": 0,
        "type": "Movie",
        "rating": "7.78",
        "genres": ["Action", "Comedy", "Supernatural"]
      }
    ]
  }
}
```

---

### Episodes for animeId 21 — Full Response

```bash
curl -s "https://anikototvapi.vercel.app/api/episodes/21" | python3 -m json.tool
```

```json
{
  "success": true,
  "results": {
    "animeId": 21,
    "slug": "21",
    "totalEpisodes": 22,
    "episodes": [
      {
        "id": "302",
        "episode_no": 1,
        "slug": "1",
        "title": "",
        "active": true,
        "href": "#",
        "server_ids": "dXNCT3hNQzk3THhSTW8ySnM5UmM9PQ",
        "timestamp": "1729197616",
        "mal_id": "20"
      },
      {
        "id": "303",
        "episode_no": 2,
        "slug": "2",
        "title": "",
        "active": true,
        "href": "#",
        "server_ids": "dXNCT3hNQzk3THhSTW8ySnM5UmM9PQ==",
        "timestamp": "1729197616",
        "mal_id": "20"
      }
    ]
  }
}
```

> **Note:** First episode ID is `"302"`, and `server_ids` is used to fetch streaming servers.

---

### Servers — Full Response

```bash
curl -s "https://anikototvapi.vercel.app/api/servers?ids=dXNCT3hNQzk3THhSTW8ySnM5UmM9PQ" | python3 -m json.tool
```

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
      "name": "HD-1"
    },
    {
      "type": "sub",
      "ep_id": "110289",
      "link_id": "MTF1dkFtaW9BRTZPbzJJRElFZUZrOWdjeldjOERLaWNMMXFNbVB3WUJqOEZ4cFNpMDdQbnV1S3dNdklpRkhWbzRsVmgxSGx4YWx3LytPcnZXU0RCVHc9PQ",
      "cmid": "animixplay-fqs",
      "sv_id": "2",
      "name": "Vidstream-2"
    },
    {
      "type": "sub",
      "ep_id": "110289",
      "link_id": "MTF1dkFtaW9BRTZPbzJJRElFZUZrOWdjeldjOERLaWNMMXFNbVB3WUJqOGZ4cFNpMDdQbnV1S3dNdklpRkhWbzRsVmgxSGx4YWx3LytPcnZXU0RCVHc9PQ",
      "cmid": "animixplay-fqs",
      "sv_id": "3",
      "name": "VidCloud-1"
    }
  ]
}
```

> **Tip:** Use `link_id` from any server to get the stream URL via `/stream` or `/stream/resolve`.

---

### Stream URL — Full Response

```bash
curl -s "https://anikototvapi.vercel.app/api/stream?id=MTF1dkFtaW9BRTZPbzJJRElFZUZrOWdjeldjOERLaWNMMXFNbVB3WUJqOHZGS2FSWVgvbVJraVpIV1dQRjRoN01hOFUvYmxsWXFYNGtiR0h5OWdGQWc9PQ" | python3 -m json.tool
```

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

> **Note:** The `url` field is the embed URL. Use `/stream/resolve` to get the actual m3u8/mp4.

---

### Stream Resolve — Full Response

```bash
curl -s "https://anikototvapi.vercel.app/api/stream/resolve?id=MTF1dkFtaW9BRTZPbzJJRElFZUZrOWdjeldjOERLaWNMMXFNbVB3WUJqOHZGS2FSWVgvbVJraVpIV1dQRjRoN01hOFUvYmxsWXFYNGtiR0h5OWdGQWc9PQ" | python3 -m json.tool
```

```json
{
  "success": true,
  "results": {
    "url": "https://vid-tube.site/hls/b32de9d4a3230c95f52948373e6e1549.m3u8",
    "type": "hls",
    "server": "HD-1",
    "subtitles": []
  }
}
```

> **Tip:** Use the `url` with HLS.js or any HLS-compatible player. Wrap it with `/stream/proxy?url=...` for CORS-free playback.

---

### Random Anime — Full Response

```bash
curl -s "https://anikototvapi.vercel.app/api/random" | python3 -m json.tool
```

```json
{
  "success": true,
  "results": {
    "slug": "cheating-craft-xhaj1",
    "animeId": 4879,
    "title": "Cheating Craft",
    "japaneseTitle": "Cheat Kusushi no Slow Life: Isekai ni Tsukurou Drugstore",
    "poster": "https://cdn.anipixcdn.co/thumbnail/6e9f1594c5f379b28e5e2f20e787c7a3.jpg",
    "type": "TV",
    "synopsis": "An anime about students who use creative cheating techniques to survive in a world where exam results determine everything...",
    "rating": "6.50   6.50 /10",
    "genres": ["Comedy", "School"],
    "url": "https://anikototv.to/random"
  }
}
```

---

### Search Suggestions — Full Response

```bash
curl -s "https://anikototvapi.vercel.app/api/suggestions?keyword=naruto" | python3 -m json.tool
```

```json
{
  "success": true,
  "results": [
    {
      "slug": "road-of-naruto-ggjw8/ep-1",
      "poster": "https://cdn.anipixcdn.co/thumbnail/abfd676ad3a01f1e8860fecff9f5b8e0.jpg",
      "title": "Road of Naruto",
      "japaneseTitle": "Road of Naruto",
      "type": "ONA",
      "sub": 1,
      "dub": 0
    },
    {
      "slug": "naruto-shippuuden-movie-6-road-to-ninja-w2wqq/ep-1",
      "poster": "https://cdn.anipixcdn.co/thumbnail/43dd49b4fdb9bede653e94468ff8df1e.jpg",
      "title": "Naruto: Shippuuden Movie 6: Road to Ninja",
      "japaneseTitle": "Naruto: Shippuuden Movie 6 - Road to Ninja",
      "type": "Movie",
      "sub": 1,
      "dub": 1
    },
    {
      "slug": "the-last-naruto-the-movie-whib1/ep-1",
      "poster": "https://cdn.anipixcdn.co/thumbnail/6c3cf77d52820cd0fe646d38bc2145ca.jpg",
      "title": "The Last: Naruto the Movie",
      "japaneseTitle": "The Last: Naruto the Movie",
      "type": "Movie",
      "sub": 1,
      "dub": 1
    }
  ]
}
```

---

### Top 10 — Full Response

```bash
curl -s "https://anikototvapi.vercel.app/api/top-ten" | python3 -m json.tool
```

```json
{
  "success": true,
  "results": {
    "today": [
      { "slug": "one-piece-odmau", "rank": 1, "name": "One Piece", "sub": 1165, "dub": 1133, "type": "TV" },
      { "slug": "wistoria-wand-and-sword-season-2-dua04", "rank": 2, "name": "Wistoria: Wand and Sword Season 2", "sub": 9, "dub": 7, "type": "TV" },
      { "slug": "re-zero-starting-life-in-another-world-season-4-4hk9h", "rank": 3, "name": "Re:ZERO Season 4", "sub": 9, "dub": 9, "type": "TV" }
    ],
    "week": [
      { "slug": "one-piece-odmau", "rank": 1, "name": "One Piece", "sub": 1165, "dub": 1133, "type": "TV" },
      { "slug": "that-time-i-got-reincarnated-as-a-slime-season-4-0u851", "rank": 2, "name": "That Time I Got Reincarnated as a Slime Season 4", "sub": 9, "dub": 7, "type": "TV" },
      { "slug": "wistoria-wand-and-sword-season-2-dua04", "rank": 3, "name": "Wistoria: Wand and Sword Season 2", "sub": 9, "dub": 7, "type": "TV" }
    ],
    "month": [
      { "slug": "one-piece-odmau", "rank": 1, "name": "One Piece", "sub": 1165, "dub": 1133, "type": "TV" },
      { "slug": "wistoria-wand-and-sword-season-2-dua04", "rank": 2, "name": "Wistoria: Wand and Sword Season 2", "sub": 9, "dub": 7, "type": "TV" },
      { "slug": "re-zero-starting-life-in-another-world-season-4-4hk9h", "rank": 3, "name": "Re:ZERO Season 4", "sub": 9, "dub": 9, "type": "TV" }
    ]
  }
}
```

---

### Health Check — Full Response

```bash
curl -s "https://anikototvapi.vercel.app/api/health" | python3 -m json.tool
```

```json
{
  "success": true,
  "results": {
    "status": "healthy",
    "version": "2.3.0",
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

### Genre Filter — Action Anime

```bash
curl -s "https://anikototvapi.vercel.app/api/genre/action?page=1" | python3 -m json.tool
```

```json
{
  "success": true,
  "results": {
    "totalPages": 114,
    "data": [
      {
        "slug": "loner-life-in-another-world-g9rqp/ep-1",
        "animeId": "2",
        "poster": "https://cdn.anipixcdn.co/thumbnail/63ea2c642aaee001d818604fe1d9a811.jpg",
        "title": "Loner Life in Another World",
        "japaneseTitle": "Hitoribocchi no Isekai Kouryaku",
        "sub": 12, "dub": 12, "total": 12,
        "type": "TV", "rating": "6.23"
      },
      {
        "slug": "dandadan-lzcmw/ep-1",
        "animeId": "4",
        "poster": "https://cdn.anipixcdn.co/thumbnail/56705e032d3b13b849ca05bb7799013e.jpg",
        "title": "Dandadan",
        "japaneseTitle": "Dandadan",
        "sub": 12, "dub": 12, "total": 12,
        "type": "TV", "rating": "8.75"
      }
    ]
  }
}
```

---

### Advanced Filter — Action TV Currently Airing

```bash
curl -s "https://anikototvapi.vercel.app/api/filter?keyword=&genre=action&type=tv&status=currently-airing&sort=score&page=1" | python3 -m json.tool
```

---

// ═══════════════════════════════════════════════════════════════
// ═══ SECTION 7: Quick Reference ═══
// ═══════════════════════════════════════════════════════════════

## Quick Reference — All Endpoints

| Endpoint | Method | Params | Description |
|:---|:---:|:---|:---|
| `/api` | GET | — | Homepage data |
| `/api/health` | GET | — | Health check |
| `/api/search` | GET | `keyword`, `page` | Search anime |
| `/api/suggestions` | GET | `keyword` | Autocomplete suggestions |
| `/api/info` | GET | `id` | Anime details |
| `/api/episodes/:id` | GET | — | Episode list |
| `/api/servers` | GET | `ids` | Streaming servers |
| `/api/stream` | GET | `id` | Embed stream URL |
| `/api/stream/resolve` | GET | `id` | Resolve to m3u8/mp4 |
| `/api/stream/qualities` | GET | `url` | Parse M3U8 qualities |
| `/api/stream/proxy` | GET | `url` | CORS-free M3U8 proxy |
| `/api/stream/ts-proxy` | GET | `url` | TS segment proxy |
| `/api/random` | GET | — | Random anime |
| `/api/top-ten` | GET | — | Top 10 day/week/month |
| `/api/trending` | GET | — | Trending anime |
| `/api/spotlight` | GET | — | Spotlight anime |
| `/api/most-popular` | GET | `page` | Most popular |
| `/api/new-release` | GET | `page` | New releases |
| `/api/newly-added` | GET | `page` | Newly added |
| `/api/latest-updated` | GET | `page` | Recently updated |
| `/api/schedule` | GET | `date` | Anime schedule |
| `/api/genre/:name` | GET | `page` | Genre filter |
| `/api/type/:name` | GET | `page` | Type filter |
| `/api/status/:name` | GET | `page` | Status filter |
| `/api/filter` | GET | `keyword`, `genre`, `type`, `status`, `sort`, `page` | Advanced filter |
| `/api/az-list/:letter` | GET | `page` | Alphabetical browse |
| `/api/seasons/:id` | GET | — | Anime seasons |
| `/api/watch-order/:id` | GET | — | Watch order |
| `/api/download` | GET | `slug`, `ep` | Download links |
| `/api/watch` | GET | `slug`, `ep` | Watch page data |
| `/api/mapper-servers` | GET | `malId`, `slug`, `timestamp` | Mapper API |
| `/api/health` | GET | — | Health check |
| `/api/stats` | GET | — | API stats |
| `/api/cache/stats` | GET | — | Cache stats |
| `/api/mirrors` | GET | — | Mirror status |
| `/api/mirrors/reset` | POST | — | Reset mirrors |
| `/api/openapi` | GET | — | OpenAPI spec |

---

// ═══════════════════════════════════════════════════════════════
// ═══ SECTION 8: Tips & Best Practices ═══
// ═══════════════════════════════════════════════════════════════

## Tips & Best Practices

### Rate Limiting

```javascript
// Add delays between requests to avoid rate limiting
async function fetchWithDelay(requests, delayMs = 500) {
  const results = [];
  for (const req of requests) {
    const result = await fetch(req);
    results.push(await result.json());
    await new Promise(r => setTimeout(r, delayMs));
  }
  return results;
}
```

### Cache Responses Locally

```javascript
// Simple in-memory cache for repeated requests
const cache = new Map();

async function cachedFetch(url, ttlMs = 60000) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.time < ttlMs) {
    return cached.data;
  }

  const res = await fetch(url);
  const data = await res.json();
  cache.set(url, { data, time: Date.now() });
  return data;
}
```

### Pick Sub or Dub Servers

```javascript
// Filter servers by type
const subServers = servers.filter(s => s.type === 'sub');
const dubServers = servers.filter(s => s.type === 'dub');

// Prefer specific server
const preferred = servers.find(s => s.name === 'HD-1' && s.type === 'sub')
               || servers.find(s => s.type === 'sub')
               || servers[0];
```

### Using the M3U8 Proxy (CORS)

```javascript
// Always use the proxy for browser playback
const rawUrl = 'https://example.com/playlist.m3u8';
const proxiedUrl = `https://anikototvapi.vercel.app/api/stream/proxy?url=${encodeURIComponent(rawUrl)}`;

// Use with HLS.js
hls.loadSource(proxiedUrl);
hls.attachMedia(videoElement);
```

### Error Recovery

```javascript
// Try multiple servers if one fails
async function resilientStream(animeId, episode) {
  const epRes = await fetch(`${BASE}/episodes/${animeId}`);
  const episodes = (await epRes.json()).results.episodes;
  const ep = episodes.find(e => e.episode_no === episode);

  const srvRes = await fetch(`${BASE}/servers?ids=${ep.server_ids}`);
  const servers = (await srvRes.json()).results;

  for (const server of servers) {
    try {
      const resolveRes = await fetch(`${BASE}/stream/resolve?id=${server.link_id}`);
      const resolved = (await resolveRes.json()).results;
      if (resolved.url) return resolved;
    } catch (err) {
      console.warn(`Server ${server.name} failed, trying next...`);
    }
  }

  throw new Error('All servers failed');
}
```

---

// ═══════ END: examples.md ═══════
