/**
 * fetchWithTimeout.js
 *
 * Thin fetch wrapper that aborts the request via AbortController if it has not
 * resolved within the given timeout, preventing requests from hanging indefinitely.
 * Exports: fetchWithTimeout (default)
 */

/**
 * @param {string} url - Request URL
 * @param {RequestInit} [options={}] - Fetch options (method, headers, body, etc.)
 * @param {number} [timeoutMs=30000] - Abort timeout in milliseconds
 * @returns {Promise<Response>} - Native fetch Response promise
 */
const DEFAULT_TIMEOUT_MS = 30000;

export default function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const { signal } = controller;

  const merged = { ...options, signal };

  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, merged).finally(() => clearTimeout(timeout));
}
