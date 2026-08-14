```
╔══════════════════════════════════════════════════════════════════════════════╗
║  AniKotoAPI — Streaming Guide                                              ║
║  Base URL: https://anikototvapi.vercel.app/api                             ║
║  Free REST API scraping anime data from anikototv.to                        ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

# Streaming Guide

This document covers the complete streaming workflow for AniKotoAPI — from searching for an anime to playing the actual video stream.

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

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Streaming Workflow](#streaming-workflow)
3. [Endpoint Reference](#endpoint-reference)
4. [M3U8 Proxy](#m3u8-proxy)
5. [Video Player Integration](#video-player-integration)
6. [Error Handling](#error-handling)
7. [Performance Tips](#performance-tips)

---

// ═══════════════════════════════════════════════════════════════════════════════
// === ARCHITECTURE OVERVIEW ===
// ═══════════════════════════════════════════════════════════════════════════════

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT / BROWSER                                │
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────────────┐  │
│  │ Search / │───>│ Episode  │───>│ Servers  │───>│ Stream + Resolve     │  │
│  │ Browse   │    │ List     │    │ List     │    │ (get m3u8/mp4 URL)   │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┬───────────┘  │
│                                                              │              │
│                                                              ▼              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    VIDEO PLAYER                                      │   │
│  │           (HLS.js / Plyr / Video.js / native <video>)               │   │
│  │                                                                      │   │
│  │  ┌──────────────┐          ┌──────────────────────────────────────┐  │   │
│  │  │ Direct Play  │    OR    │  M3U8 Proxy ──> TS Proxy            │  │   │
│  │  │ (mp4, CORS)  │          │  (rewritten .m3u8 + .ts segments)   │  │   │
│  │  └──────────────┘          └──────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘

                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AniKotoAPI Server                                   │
│                                                                             │
│  GET /episodes/{id}          ─── Episode list for an anime                  │
│  GET /servers?ids={ids}      ─── Available streaming servers               │
│  GET /stream?id={link_id}    ─── Embed URL + skip data                     │
│  GET /stream/resolve?id=...  ─── Actual m3u8/mp4 stream URL                │
│  GET /stream/qualities?url=  ─── Available quality levels                   │
│  GET /stream/proxy?url=      ─── CORS-free M3U8 proxy                      │
│  GET /stream/ts-proxy?url=   ─── CORS-free TS segment proxy                │
│  GET /watch?slug=...&ep=...  ─── Combined watch page data                  │
│  GET /download?slug=...&ep=..─── Download links                            │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    UPSTREAM SOURCE (anikototv.to)                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data flow summary:**
1. Look up an anime → get `animeId` or `slug`
2. Fetch episodes → get episode `id` with base64-encoded `server_ids`
3. Decode `server_ids` → fetch `/servers?ids=...` to get streaming servers
4. Pick a server → fetch `/stream?id={link_id}` for embed URL + skip data
5. Resolve the embed → fetch `/stream/resolve?id={link_id}` for actual m3u8/mp4 URL
6. (Optional) Get quality variants → `/stream/qualities?url={m3u8_url}`
7. Play through the M3U8 proxy if CORS is an issue → `/stream/proxy?url={m3u8_url}`

---

// ═══════════════════════════════════════════════════════════════════════════════
// === STREAMING WORKFLOW ===
// ═══════════════════════════════════════════════════════════════════════════════

## Streaming Workflow

### Step 1 — Find Episodes

Use the anime's ID or slug to get the episode list.

```bash
curl -s "https://anikototvapi.vercel.app/api/episodes/one-piece"
```

**Response:**
```json
{
  "results": {
    "animeId": 3,
    "slug": "one-piece",
    "totalEpisodes": 1122,
    "episodes": [
      {
        "id": 11188,
        "episode_no": 1118,
        "slug": "episode-1118",
        "title": "Episode 1118",
        "active": true,
        "href": "/watch/one-piece/episode-1118",
        "server_ids": "MTExODg6MTExOTQ=",
        "timestamp": 1722403200,
        "mal_id": 1234
      }
    ]
  }
}
```

> **Key field:** `server_ids` is a **base64-encoded** string. Decode it to get the IDs needed for the `/servers` endpoint.

```bash
# Decode server_ids
echo "MTExODg6MTExOTQ=" | base64 -d
# Output: 11188:11194
```

### Step 2 — Get Streaming Servers

Pass the decoded `server_ids` to `/servers`.

```bash
curl -s "https://anikototvapi.vercel.app/api/servers?ids=11188:11194"
```

**Response:**
```json
{
  "results": [
    {
      "type": "hd",
      "ep_id": 11188,
      "link_id": 23001,
      "cmid": "abc123",
      "sv_id": "sv_01",
      "name": "HD-1"
    },
    {
      "type": "vidstream",
      "ep_id": 11188,
      "link_id": 23002,
      "cmid": "def456",
      "sv_id": "sv_02",
      "name": "Vidstream-2"
    },
    {
      "type": "vidcloud",
      "ep_id": 11188,
      "link_id": 23003,
      "cmid": "ghi789",
      "sv_id": "sv_03",
      "name": "VidCloud-1"
    }
  ]
}
```

> Pick a server by its `link_id`. Different servers may have different CDN paths and quality options.

### Step 3 — Get Stream Embed Info

Use the `link_id` from the chosen server.

```bash
curl -s "https://anikototvapi.vercel.app/api/stream?id=23001"
```

**Response:**
```json
{
  "results": {
    "linkId": 23001,
    "url": "https://vidplay.site/embed/abc123",
    "skipData": {
      "intro": [0, 90],
      "outro": [1320, 1410]
    }
  }
}
```

> `skipData` gives intro/outro timestamps in seconds. Use these to auto-skip in your player.
> `url` is an **embed URL** — you still need to resolve it to get the actual stream.

### Step 4 — Resolve the Actual Stream URL

This is the critical step. Call `/stream/resolve` with the `link_id`.

```bash
curl -s "https://anikototvapi.vercel.app/api/stream/resolve?id=23001&slug=one-piece"
```

**Response:**
```json
{
  "results": {
    "url": "https://vidtube.site/hls/abc123/master.m3u8",
    "type": "hls",
    "server": "HD-1",
    "subtitles": [
      {
        "label": "English",
        "src": "https://cdn.anipixcdn.co/subs/en/abc123.vtt",
        "srclang": "en"
      }
    ]
  }
}
```

> `type` will be either `"hls"` (m3u8 playlist) or `"mp4"` (direct mp4 link).
> If `type` is `"hls"`, you need to use an HLS player or the proxy endpoints.

### Step 5 — Get Available Qualities (Optional)

If the stream is HLS, query available quality levels.

```bash
curl -s "https://anikototvapi.vercel.app/api/stream/qualities?url=https://vidtube.site/hls/abc123/master.m3u8"
```

**Response:**
```json
{
  "results": {
    "url": "https://vidtube.site/hls/abc123/master.m3u8",
    "totalQualities": 4,
    "qualities": [
      { "url": "https://vidtube.site/hls/abc123/360p.m3u8", "quality": "360p", "width": 640, "height": 360 },
      { "url": "https://vidtube.site/hls/abc123/480p.m3u8", "quality": "480p", "width": 854, "height": 480 },
      { "url": "https://vidtube.site/hls/abc123/720p.m3u8", "quality": "720p", "width": 1280, "height": 720 },
      { "url": "https://vidtube.site/hls/abc123/1080p.m3u8", "quality": "1080p", "width": 1920, "height": 1080 }
    ]
  }
}
```

### Step 6 — Play via Proxy (CORS-Free)

If the upstream CDN blocks browser CORS requests, route the stream through the proxy.

```bash
# Proxy the M3U8 playlist
curl -s "https://anikototvapi.vercel.app/api/stream/proxy?url=https://vidtube.site/hls/abc123/master.m3u8"

# Proxy individual TS segments (HLS player will call this automatically when proxied)
curl -s "https://anikototvapi.vercel.app/api/stream/ts-proxy?url=https://vidtube.site/hls/abc123/segment_001.ts"
```

### Combined Watch Page (Shortcut)

For a single-call approach that bundles episode data + servers + recommendations:

```bash
curl -s "https://anikototvapi.vercel.app/api/watch?slug=one-piece&ep=1118"
```

**Response:**
```json
{
  "results": {
    "episode": {
      "id": 11188,
      "episode_no": 1118,
      "title": "Episode 1118"
    },
    "servers": [ ... ],
    "trending": [ ... ],
    "recommendations": [ ... ]
  }
}
```

---

// ═══════════════════════════════════════════════════════════════════════════════
// === ENDPOINT REFERENCE ===
// ═══════════════════════════════════════════════════════════════════════════════

## Endpoint Reference

### GET /episodes/{id}

| Param | Type   | Description                              |
|-------|--------|------------------------------------------|
| `id`  | string | Anime ID or slug                         |

Returns the full episode list with `server_ids` (base64) for each episode.

```bash
curl -s "https://anikototvapi.vercel.app/api/episodes/demon-slayer"
```

---

### GET /servers?ids={server_ids}

| Param  | Type   | Description                                        |
|--------|--------|----------------------------------------------------|
| `ids`  | string | Decoded `server_ids` from episodes (colon-separated) |

Returns available streaming servers with `link_id` values for each.

```bash
curl -s "https://anikototvapi.vercel.app/api/servers?ids=11188:11194"
```

---

### GET /stream?id={link_id}

| Param     | Type   | Description               |
|-----------|--------|---------------------------|
| `id`      | number | `link_id` from servers    |

Returns the embed URL and skip data (intro/outro timestamps).

```bash
curl -s "https://anikototvapi.vercel.app/api/stream?id=23001"
```

---

### GET /stream/resolve?id={link_id}&slug={slug}

| Param     | Type   | Description                    |
|-----------|--------|--------------------------------|
| `id`      | number | `link_id` from servers (required) |
| `slug`    | string | Anime slug (optional)          |

Resolves the actual stream URL (m3u8 or mp4) and subtitle tracks.

```bash
curl -s "https://anikototvapi.vercel.app/api/stream/resolve?id=23001&slug=one-piece"
```

---

### GET /stream/qualities?url={m3u8_url}

| Param  | Type   | Description                     |
|--------|--------|---------------------------------|
| `url`  | string | M3U8 playlist URL (required)    |

Returns all available quality levels for the given HLS playlist.

```bash
curl -s "https://anikototvapi.vercel.app/api/stream/qualities?url=https%3A%2F%2Fvidtube.site%2Fhls%2Fabc123%2Fmaster.m3u8"
```

---

### GET /stream/proxy?url={m3u8_url}

| Param  | Type   | Description                                    |
|--------|--------|------------------------------------------------|
| `url`  | string | M3U8 URL (must be from an allowed domain)      |

Returns rewritten M3U8 content with `Content-Type: application/vnd.apple.mpegurl`.

**Allowed domains:** `vidtube.site`, `vidplay.site`, `megaplay.buzz`, `megaplay-1.buzz`, `cdn.anipixcdn.co`

```bash
curl -s "https://anikototvapi.vercel.app/api/stream/proxy?url=https://vidtube.site/hls/abc123/master.m3u8"
```

**Rewritten output example:**
```
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
https://anikototvapi.vercel.app/api/stream/ts-proxy?url=https%3A%2F%2Fvidtube.site%2Fhls%2Fabc123%2F360p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480
https://anikototvapi.vercel.app/api/stream/ts-proxy?url=https%3A%2F%2Fvidtube.site%2Fhls%2Fabc123%2F480p.m3u8
```

> The proxy rewrites all internal URLs to route through `/stream/ts-proxy`, so every TS segment fetch also goes through the proxy — fully CORS-free.

---

### GET /stream/ts-proxy?url={ts_url}

| Param  | Type   | Description                          |
|--------|--------|--------------------------------------|
| `url`  | string | `.ts` segment URL (required)         |

Returns binary TS video data with `Content-Type: video/mp2t`.

```bash
curl -s "https://anikototvapi.vercel.app/api/stream/ts-proxy?url=https://vidtube.site/hls/abc123/segment_001.ts" --output segment.ts
```

---

### GET /watch?slug={slug}&ep={n}

| Param  | Type   | Description                       |
|--------|--------|-----------------------------------|
| `slug` | string | Anime slug (required)             |
| `ep`   | number | Episode number (required)         |

Single-call endpoint returning episode data, available servers, trending sidebar, and recommendations.

```bash
curl -s "https://anikototvapi.vercel.app/api/watch?slug=one-piece&ep=1118"
```

---

### GET /download?slug={slug}&ep={n}

| Param  | Type   | Description                       |
|--------|--------|-----------------------------------|
| `slug` | string | Anime slug (required)             |
| `ep`   | number | Episode number (required)         |

Returns download links for the specified episode.

```bash
curl -s "https://anikototvapi.vercel.app/api/download?slug=one-piece&ep=1118"
```

**Response:**
```json
{
  "results": {
    "downloadLinks": [
      { "quality": "1080p", "url": "https://..." },
      { "quality": "720p", "url": "https://..." }
    ],
    "episodeNumber": 1118,
    "title": "Episode 1118"
  }
}
```

---

### GET /mapper-servers?malId={n}&slug={s}&timestamp={ts}

| Param       | Type   | Description                              |
|-------------|--------|------------------------------------------|
| `malId`     | number | MyAnimeList ID (required)                |
| `slug`      | string | Anime slug (required)                    |
| `timestamp` | number | Unix timestamp (required)                |

Cross-server mapping for resolving servers across different backends.

```bash
curl -s "https://anikototvapi.vercel.app/api/mapper-servers?malId=21&slug=one-piece&timestamp=1722403200"
```

---

// ═══════════════════════════════════════════════════════════════════════════════
// === M3U8 PROXY ===
// ═══════════════════════════════════════════════════════════════════════════════

## M3U8 Proxy

### Why Use It?

Upstream video CDNs (vidtube.site, vidplay.site, etc.) typically set restrictive CORS headers that block browser requests. The M3U8 proxy solves this by:

1. Fetching the M3U8 playlist server-side
2. Rewriting all internal URLs to point back through the API proxy
3. Serving the rewritten playlist with proper CORS headers
4. Proxying every `.ts` segment request through `/stream/ts-proxy`

### How It Works

```
Browser                AniKotoAPI Proxy           Upstream CDN
  │                         │                         │
  │  GET /stream/proxy?url= │                         │
  │────────────────────────>│                         │
  │                         │  GET master.m3u8        │
  │                         │────────────────────────>│
  │                         │<────────────────────────│
  │  rewritten m3u8         │                         │
  │<────────────────────────│                         │
  │                         │                         │
  │  GET /stream/ts-proxy?url=segment_001.ts          │
  │────────────────────────>│                         │
  │                         │  GET segment_001.ts     │
  │                         │────────────────────────>│
  │  binary TS data         │<────────────────────────│
  │<────────────────────────│                         │
  │  ... (repeat for each segment)                    │
```

### Allowed Domains

The proxy only serves URLs from these whitelisted domains:

- `vidtube.site`
- `vidplay.site`
- `megaplay.buzz`
- `megaplay-1.buzz`
- `cdn.anipixcdn.co`

Requests with URLs from other domains will be rejected.

### Usage Example

```javascript
// After resolving a stream URL:
const streamUrl = "https://vidtube.site/hls/abc123/master.m3u8";

// Build the proxied URL
const proxyUrl = `https://anikototvapi.vercel.app/api/stream/proxy?url=${encodeURIComponent(streamUrl)}`;

// Use this in your HLS player
const hls = new Hls();
hls.loadSource(proxyUrl);
hls.attachMedia(videoElement);
```

---

// ═══════════════════════════════════════════════════════════════════════════════
// === VIDEO PLAYER INTEGRATION ===
// ═══════════════════════════════════════════════════════════════════════════════

## Video Player Integration

### HLS.js

[HLS.js](https://github.com/video-dev/hls.js) is the most common choice for playing HLS streams in the browser.

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
</head>
<body>
  <video id="video" controls width="100%"></video>

  <script>
    const video = document.getElementById('video');
    const streamUrl = 'https://vidtube.site/hls/abc123/master.m3u8';

    // Use the proxy for CORS-free playback
    const proxyUrl = `https://anikototvapi.vercel.app/api/stream/proxy?url=${encodeURIComponent(streamUrl)}`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr, url) => {
          // All requests automatically route through the proxy
          // No additional setup needed when using the proxy URL as source
        }
      });
      hls.loadSource(proxyUrl);
      hls.attachMedia(video);

      // Auto-skip intro (from skipData)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const introEnd = 90; // seconds — from skipData.intro[1]
        video.currentTime = introEnd;
        video.play();
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = proxyUrl;
    }
  </script>
</body>
</html>
```

**Quality switching with HLS.js:**

```javascript
// After loading the manifest
hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
  const levels = data.levels; // array of quality levels
  // levels[0] = 360p, levels[1] = 720p, levels[2] = 1080p, etc.

  // Auto-select highest quality
  hls.currentLevel = levels.length - 1;

  // Or let the user pick
  document.getElementById('quality-select').addEventListener('change', (e) => {
    hls.currentLevel = parseInt(e.target.value);
  });
});
```

---

### Plyr

[Plyr](https://plyr.io/) is a simple, clean video player. It uses HLS.js under the hood for non-native browsers.

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css" />
</head>
<body>
  <video id="player" controls crossorigin playsinline></video>

  <script src="https://cdn.plyr.io/3.7.8/plyr.polyfilled.js"></script>

  <script>
    const player = new Plyr('#player', {
      quality: {
        default: 720,
        options: [360, 480, 720, 1080]
      }
    });

    // Set the proxied HLS source
    const streamUrl = 'https://vidtube.site/hls/abc123/master.m3u8';
    const proxyUrl = `https://anikototvapi.vercel.app/api/stream/proxy?url=${encodeURIComponent(streamUrl)}`;

    player.source = {
      type: 'video',
      sources: [
        {
          src: proxyUrl,
          type: 'application/x-mpegURL',
          size: 720
        }
      ],
      // Optional: subtitle tracks
      tracks: [
        {
          kind: 'subtitles',
          label: 'English',
          srclang: 'en',
          src: 'https://cdn.anipixcdn.co/subs/en/abc123.vtt',
          default: true
        }
      ]
    };

    // Apply skip data
    const introEnd = 90;  // from skipData.intro[1]
    const outroStart = 1320; // from skipData.outro[0]

    player.on('timeupdate', () => {
      // Auto-skip intro
      if (player.currentTime < introEnd && player.currentTime < 5) {
        player.currentTime = introEnd;
      }
      // Auto-skip outro
      if (player.currentTime >= outroStart) {
        // Navigate to next episode or show end screen
      }
    });
  </script>
</body>
</html>
```

---

### Video.js

[Video.js](https://videojs.com/) is another popular choice with a large plugin ecosystem.

```html
<!DOCTYPE html>
<html>
<head>
  <link href="https://vjs.zencdn.net/8.6.1/video-js.css" rel="stylesheet" />
</head>
<body>
  <video
    id="my-video"
    class="video-js vjs-default-skin vjs-big-play-centered"
    controls
    preload="auto"
    crossorigin="anonymous"
  >
    <track kind="subtitles" label="English" srclang="en"
           src="https://cdn.anipixcdn.co/subs/en/abc123.vtt" default />
  </video>

  <script src="https://vjs.zencdn.net/8.6.1/video.min.js"></script>

  <script>
    const streamUrl = 'https://vidtube.site/hls/abc123/master.m3u8';
    const proxyUrl = `https://anikototvapi.vercel.app/api/stream/proxy?url=${encodeURIComponent(streamUrl)}`;

    const player = videojs('my-video', {
      html5: {
        vhs: {
          overrideNative: true,
          smoothQualityChange: true
        }
      },
      sources: [{
        src: proxyUrl,
        type: 'application/x-mpegURL'
      }]
    });

    player.ready(() => {
      // Apply intro skip
      const introEnd = 90;
      player.currentTime(introEnd);
    });

    // Quality selection (requires videojs-contrib-quality-levels plugin)
    const qualityLevels = player.qualityLevels();
    qualityLevels.on('addqualitylevel', () => {
      // Available quality levels loaded
    });
  </script>
</body>
</html>
```

---

### MP4 (Direct Play)

When the resolved stream `type` is `"mp4"`, no HLS player is needed — use a standard `<video>` tag:

```javascript
const streamUrl = 'https://...video.mp4';
video.src = streamUrl;
video.play();
```

MP4 files typically have CORS enabled, so no proxy is needed.

---

// ═══════════════════════════════════════════════════════════════════════════════
// === ERROR HANDLING ===
// ═══════════════════════════════════════════════════════════════════════════════

## Error Handling

### HTTP Status Codes

| Code | Meaning                                | Action                                      |
|------|----------------------------------------|---------------------------------------------|
| 200  | Success                                | Process response                            |
| 400  | Bad request — missing/invalid params   | Check query parameters                      |
| 403  | Forbidden — domain not in allowlist    | Use an allowed domain for proxy URLs        |
| 404  | Resource not found                     | Verify slug, episode number, or link_id     |
| 429  | Rate limited                           | Implement backoff / retry logic             |
| 500  | Server error                           | Retry after delay; report if persistent     |

### Common Error Response Format

```json
{
  "error": true,
  "message": "Invalid or expired session",
  "status": 403
}
```

### Client-Side Error Handling (JavaScript)

```javascript
async function fetchStream(slug, episode) {
  try {
    // Step 1: Get episodes
    const epRes = await fetch(`https://anikototvapi.vercel.app/api/episodes/${slug}`);
    if (!epRes.ok) throw new Error(`Episodes fetch failed: ${epRes.status}`);
    const epData = await epRes.json();

    const episodeEntry = epData.results.episodes.find(e => e.episode_no === episode);
    if (!episodeEntry) throw new Error(`Episode ${episode} not found`);

    // Step 2: Decode server_ids and fetch servers
    const decodedIds = atob(episodeEntry.server_ids);
    const srvRes = await fetch(`https://anikototvapi.vercel.app/api/servers?ids=${decodedIds}`);
    if (!srvRes.ok) throw new Error(`Servers fetch failed: ${srvRes.status}`);
    const srvData = await srvRes.json();

    const firstServer = srvData.results[0];
    if (!firstServer) throw new Error('No servers available');

    // Step 3: Resolve stream
    const streamRes = await fetch(
      `https://anikototvapi.vercel.app/api/stream/resolve?id=${firstServer.link_id}&slug=${slug}`
    );
    if (!streamRes.ok) throw new Error(`Stream resolve failed: ${streamRes.status}`);
    const streamData = await streamRes.json();

    return streamData.results;

  } catch (err) {
    console.error('Stream error:', err.message);
    // Show error to user, retry, or try next server
  }
}
```

### Retry with Exponential Backoff

```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
}
```

### Fallback Server Strategy

```javascript
async function playWithFallback(servers, slug, videoEl) {
  for (const server of servers) {
    try {
      const res = await fetch(
        `https://anikototvapi.vercel.app/api/stream/resolve?id=${server.link_id}&slug=${slug}`
      );
      const data = await res.json();
      const streamUrl = data.results.url;

      if (data.results.type === 'hls') {
        const proxyUrl = `https://anikototvapi.vercel.app/api/stream/proxy?url=${encodeURIComponent(streamUrl)}`;
        const hls = new Hls();
        hls.loadSource(proxyUrl);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MANIFEST_PARSED, () => videoEl.play());
        return; // success
      } else {
        videoEl.src = streamUrl;
        videoEl.play();
        return; // success
      }
    } catch (err) {
      console.warn(`Server ${server.name} failed, trying next...`);
    }
  }
  console.error('All servers failed');
}
```

---

// ═══════════════════════════════════════════════════════════════════════════════
// === PERFORMANCE TIPS ===
// ═══════════════════════════════════════════════════════════════════════════════

## Performance Tips

1. **Cache episode data.** Episode lists don't change often — cache the response for 5-10 minutes client-side.

2. **Use `/watch` for initial load.** The combined `/watch` endpoint saves 2-3 round trips when loading a new episode page.

3. **Prefer direct m3u8 when possible.** Only use the proxy when CORS blocks direct access. Test direct first, fall back to proxy on error.

4. **Preload the next episode.** After playback starts, prefetch the next episode's server list and resolved URL.

5. **Lazy-load subtitles.** Subtitle VTT files are small but only load them when the user enables them.

6. **Use `poster` thumbnails.** Set a poster image on the `<video>` element to show a thumbnail while the stream loads.

7. **Implement quality auto-selection.** Default to 720p for mobile, 1080p for desktop. Let users override.

8. **Handle network errors gracefully.** When the player stalls, try re-resolving the stream URL before giving up — the upstream URL may have expired.

9. **Respect rate limits.** The API may rate-limit aggressive polling. Use exponential backoff on 429 responses.

10. **Clean up HLS instances.** When navigating away or switching episodes, always call `hls.destroy()` to free memory and network connections.

---

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  End of Streaming Guide                                                     ║
║  AniKotoAPI — https://anikototvapi.vercel.app/api                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

// ══════ END: streaming.md ══════