/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — cache.helper.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   In-memory LRU cache with configurable TTL per endpoint.
 *   Evicts least recently used entries when max size reached.
 *   Supports cache statistics and manual invalidation.
 *
 *   Request-scoped cache control: a `?refresh=1` query parameter makes
 *   every getCache() call inside that request skip the cache (AsyncLocalStorage
 *   scope), and the first lookup of each request is reported on X-Cache.
 *
 * @exports
 *   getCache, setCache, clearCache, getCacheStats, runWithCacheScope, LRUCache, TTL
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

import { AsyncLocalStorage } from "node:async_hooks";

// ══════════════════════════════════════════════════════════════
// REQUEST-SCOPED CACHE CONTROL
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Cache scope carried through the async request context ----
// NOTE: The scope lets server.js honour `?refresh=1` for every endpoint
// without threading `req` through 30+ controllers. Context propagates across
// awaits, so a helper that runs inside the request sees the same store.
const cacheScope = new AsyncLocalStorage();

// NOTE: Counted for /api/cache/stats so operators can see refresh traffic
let bypassCount = 0;

// ---- FEATURE: Expose the scope to the HTTP layer ----
/**
 * Runs `fn` inside a cache scope. The store may carry:
 *   - bypass {boolean} — true when the client sent ?refresh=1
 *   - res {object}     — used to stamp the X-Cache response header
 *
 * @param {object} store - Scope payload
 * @param {Function} fn - Continuation (usually Express `next`)
 * @returns {*} Whatever fn returns
 *
 * @example
 *   runWithCacheScope({ bypass: true, res }, next);
 */
const runWithCacheScope = (store, fn) => cacheScope.run(store, fn);

/**
 * Stamps X-Cache once per request — the first lookup is the endpoint's
 * primary payload, later lookups are internal helper caches.
 *
 * @param {object|undefined} res - Express response from the scope
 * @param {string} value - "HIT" | "MISS" | "BYPASS"
 */
const markCacheHeader = (res, value) => {
  if (!res || res.headersSent || res.getHeader?.("X-Cache")) return;
  res.setHeader("X-Cache", value);
};

// ══════════════════════════════════════════════════════════════
// LRU CACHE CLASS
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: LRU Cache ----
/**
 * Least Recently Used (LRU) cache implementation.
 * Maintains access order by deleting and re-inserting on read.
 * Auto-evicts oldest entry when maxSize is reached.
 */
class LRUCache {
  /**
   * @param {number} maxSize - Maximum number of entries (default: 100)
   * @param {number} defaultTTL - Default time-to-live in ms (default: 300000 = 5min)
   */
  constructor(maxSize = 100, defaultTTL = 300000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  /**
   * Get a value from the cache. Moves the entry to the end (most recent) on access.
   * Returns undefined if not found or expired.
   *
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.stats.misses++;
      return undefined;
    }

    const entry = this.cache.get(key);
    // NOTE: Lazy expiration — check expiry on access, not background timer
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // NOTE: Re-insert to move to end (most recently used position)
    this.stats.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /**
   * Set a value in the cache with optional TTL.
   * Evicts the oldest entry if at capacity.
   *
   * @param {string} key - Cache key
   * @param {*} value - Value to store
   * @param {number} [ttl] - Time-to-live in ms (uses defaultTTL if not provided)
   */
  set(key, value, ttl) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // NOTE: Evict oldest (first) entry when cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl || this.defaultTTL)
    });
    this.stats.sets++;
  }

  /**
   * Delete a specific key from the cache.
   *
   * @param {string} key - Cache key to delete
   * @returns {boolean} True if the key existed before deletion
   */
  delete(key) {
    const existed = this.cache.delete(key);
    if (existed) this.stats.deletes++;
    return existed;
  }

  /**
   * Clear all entries from the cache.
   *
   * @returns {number} Number of entries cleared
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    return size;
  }

  /**
   * Get cache statistics including hit rate.
   *
   * @returns {Object} Stats object with hits, misses, sets, deletes, size, hitRate
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * Check if a key exists and is not expired.
   *
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    if (!this.cache.has(key)) return false;
    const entry = this.cache.get(key);
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
}

// ══════════════════════════════════════════════════════════════
// TTL CONFIGURATION
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Per-Endpoint TTL ----
// NOTE: TTL values tuned per endpoint — stale data tolerance vs server load
const TTL = {
  home: 600000,        // 10min — homepage changes infrequently
  search: 300000,      // 5min  — search results update moderate
  info: 600000,        // 10min — anime info is relatively stable
  episodes: 300000,    // 5min  — episode lists update weekly
  servers: 600000,     // 10min — server URLs rarely change
  stream: 180000,      // 3min  — stream URLs rotate frequently
  spotlight: 600000,   // 10min — spotlight rotates daily
  trending: 600000,    // 10min — trending updates hourly
  schedule: 1800000,   // 30min — schedule changes daily
  genres: 3600000,     // 60min — genre list is static
  suggestions: 300000, // 5min  — suggestions update moderate
  ids: 3600000,        // 60min — MAL/AniList IDs are stable per anime
  default: 300000      // 5min  — safe default for unknown endpoints
};

// ══════════════════════════════════════════════════════════════
// SINGLETON CACHE INSTANCE
// ══════════════════════════════════════════════════════════════

// NOTE: Singleton pattern — single cache instance shared across all requests
const cache = new LRUCache(
  parseInt(process.env.CACHE_MAX_SIZE) || 200,
  parseInt(process.env.CACHE_DEFAULT_TTL) || 300000
);

// ══════════════════════════════════════════════════════════════
// EXPORTED HELPERS
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Cache Get/Set/Clear ----
/**
 * Get a value from the global cache.
 * Skips the cache entirely (and reports BYPASS) when the current request
 * carries ?refresh=1; otherwise reports HIT/MISS on X-Cache.
 *
 * @param {string} key - Cache key
 * @returns {*} Cached value or undefined
 */
const getCache = (key) => {
  const store = cacheScope.getStore();
  if (store?.bypass) {
    bypassCount++;
    markCacheHeader(store.res, "BYPASS");
    return undefined;
  }
  const value = cache.get(key);
  markCacheHeader(store?.res, value !== undefined ? "HIT" : "MISS");
  return value;
};

/**
 * Set a value in the global cache with optional TTL.
 * @param {string} key - Cache key
 * @param {*} data - Value to store
 * @param {number} [ttl] - Time-to-live in ms
 */
const setCache = (key, data, ttl) => cache.set(key, data, ttl);

/**
 * Clear all entries from the global cache.
 * @returns {number} Number of entries cleared
 */
const clearCache = () => cache.clear();

/**
 * Get cache statistics (hits, misses, hit rate, size, refresh bypasses).
 * @returns {Object} Cache stats
 */
const getCacheStats = () => ({ ...cache.getStats(), bypasses: bypassCount });

export { getCache, setCache, clearCache, getCacheStats, runWithCacheScope, LRUCache, TTL };
// ══════════════════════════════════════════════════════════════ END: cache.helper.js
