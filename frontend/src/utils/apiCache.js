/**
 * apiCache.js
 *
 * In-memory API response cache with TTL expiry, used by foodService to avoid
 * redundant food-search requests. Exports a singleton apiCache instance and a
 * cachedFetch helper.
 * Exports: apiCache (default), cachedFetch
 */

class APICache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Generate cache key from URL and params
   * @param {string} url - API endpoint URL
   * @param {Object} params - Request parameters
   * @returns {string} - Cache key
   */
  _generateKey(url, params = {}) {
    const paramString = JSON.stringify(params);
    return `${url}:${paramString}`;
  }

  /**
   * Check if cached data is still valid
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in milliseconds
   * @returns {boolean} - True if cache is valid
   */
  _isValid(key, ttl) {
    if (!this.timestamps.has(key)) {
      return false;
    }

    const timestamp = this.timestamps.get(key);
    const age = Date.now() - timestamp;
    return age < ttl;
  }

  /**
   * Get cached response
   * @param {string} url - API endpoint URL
   * @param {Object} params - Request parameters
   * @param {number} ttl - Time to live in milliseconds
   * @returns {any|null} - Cached data or null if not found/expired
   */
  get(url, params = {}, ttl = this.DEFAULT_TTL) {
    const key = this._generateKey(url, params);

    if (!this.cache.has(key)) {
      return null;
    }

    if (!this._isValid(key, ttl)) {
      // Expired, remove from cache
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  /**
   * Set cached response
   * @param {string} url - API endpoint URL
   * @param {Object} params - Request parameters
   * @param {any} data - Data to cache
   */
  set(url, params = {}, data) {
    const key = this._generateKey(url, params);
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now());
  }

  /**
   * Clear specific cache entry
   * @param {string} url - API endpoint URL
   * @param {Object} params - Request parameters
   */
  clear(url, params = {}) {
    const key = this._generateKey(url, params);
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll() {
    this.cache.clear();
    this.timestamps.clear();
  }

  /**
   * Clear expired cache entries
   */
  clearExpired() {
    const now = Date.now();
    let clearedCount = 0;

    for (const [key, timestamp] of this.timestamps.entries()) {
      const age = now - timestamp;
      if (age >= this.DEFAULT_TTL) {
        this.cache.delete(key);
        this.timestamps.delete(key);
        clearedCount++;
      }
    }

    return clearedCount;
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.timestamps.entries()).map(([key, timestamp]) => ({
        key,
        age: Date.now() - timestamp,
        expired: !this._isValid(key, this.DEFAULT_TTL)
      }))
    };
  }
}

// Create singleton instance
const apiCache = new APICache();

// Clear expired entries every 5 minutes
setInterval(() => {
  apiCache.clearExpired();
}, 5 * 60 * 1000);

export default apiCache;

/**
 * Wrapper for fetch with caching
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {Object} cacheOptions - Cache options
 * @returns {Promise<any>} - Response data
 */
export async function cachedFetch(url, options = {}, cacheOptions = {}) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    skipCache = false,
    params = {}
  } = cacheOptions;

  // Only cache GET requests
  const method = options.method || 'GET';
  if (method !== 'GET' || skipCache) {
    const response = await fetch(url, options);
    return await response.json();
  }

  // Check cache first
  const cached = apiCache.get(url, params, ttl);
  if (cached !== null) {
    return cached;
  }

  // Fetch from network
  const response = await fetch(url, options);
  const data = await response.json();

  // Cache the response
  if (response.ok) {
    apiCache.set(url, params, data);
  }

  return data;
}
