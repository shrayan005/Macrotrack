/**
 * foodService.js
 *
 * This file is the frontend "API layer" for food and food-image features.
 *
 * HOW FRONTEND GOES TO BACKEND (simple flow):
 * 1) A React page/component calls one of the functions in this file.
 * 2) This file builds the request URL + method + headers/body.
 * 3) `fetch(...)` sends HTTP request to Django backend endpoints under /api/...
 * 4) Backend view/viewset processes it and returns JSON.
 * 5) This file parses JSON and returns data to the page.
 * 6) If backend returns an error status, this file throws an Error object.
 *
 * Key functions:
 *   searchFoods(query, page, pageSize)       — GET /api/foods/search/ — paginated food search with 5-min cache
 *   getFoodDetail(foodId, includeServings)   — GET /api/foods/<id>/ — single food with optional serving sizes
 *   createCustomFood(foodData)               — POST /api/foods/custom/ — create a user-owned food entry
 *   getUserCustomFoods()                     — GET /api/foods/custom/my/ — list the user's custom foods
 *   getRecentFoods(limit)                    — GET /api/foods/recent/ — recently logged foods for quick-add
 */
// src/api/foodService.js
// API_ENDPOINTS contains backend URLs. getHeaders adds JSON + auth headers.
import { API_ENDPOINTS, getHeaders } from "./config";
// apiCache is an in-memory cache used to avoid repeated GET calls.
import apiCache from "../utils/apiCache";

/**
 * Search for foods via FatSecret API or return cached results
 * Backend call: GET /api/foods/search/?page=<page>&page_size=<pageSize>[&q=<query>]
 * @param {string} query - Search term (optional, min 3 characters to trigger FatSecret API search)
 * @param {number} page - Page number (default: 1)
 * @param {number} pageSize - Number of results per page (default: 50)
 * @returns {Promise<Object>} - { count, page, page_size, total_pages, results }
 */
export async function searchFoods(query = '', page = 1, pageSize = 50) {
  // Build query params that backend expects.
  const params = new URLSearchParams({
    page: page,
    page_size: pageSize,
  });

  // Add query parameter if provided (triggers FatSecret search if >= 3 chars)
  if (query && query.trim()) {
    params.append('q', query.trim());
  }

  // Final backend URL: /api/foods/search/?page=...&page_size=...&q=...
  const url = `${API_ENDPOINTS.FOODS_SEARCH}?${params}`;

  // Check cache first so we can skip calling backend if data is still fresh.
  const cacheKey = { query, page, pageSize };
  const cached = apiCache.get(url, cacheKey, 5 * 60 * 1000); // 5 min cache
  if (cached) {
    return cached;
  }

  // Send GET request to backend.
  const res = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  });

  // Parse JSON safely. If parsing fails, fallback to empty object.
  const data = await res.json().catch(() => null);

  // Convert backend error response into thrown Error for UI handling.
  if (!res.ok) {
    const error = new Error(data?.error || data?.detail || 'Failed to search foods');
    error.statusCode = res.status;
    error.data = data;
    throw error;
  }

  // Save successful response in cache for next time.
  apiCache.set(url, cacheKey, data);

  return data; // { count, page, page_size, total_pages, results: [...] }
}

/**
 * Get detailed information for a specific food
 * Backend call: GET /api/foods/<foodId>/[?include_servings=true]
 * @param {number} foodId - Food database ID
 * @param {boolean} includeServings - Include serving size options from FatSecret API (default: false)
 * @returns {Promise<Object>} - Food details with optional serving sizes
 */
export async function getFoodDetail(foodId, includeServings = false) {
  // Optional flag sent as query param so backend includes serving options.
  const params = includeServings ? '?include_servings=true' : '';

  // GET /api/foods/<id>/
  const res = await fetch(`${API_ENDPOINTS.FOOD_DETAIL(foodId)}${params}`, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await res.json().catch(() => null);

  // Throw meaningful error when backend does not return 2xx.
  if (!res.ok) {
    const error = new Error(data?.error || data?.detail || 'Failed to get food details');
    error.statusCode = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Create a custom food entry
 * Backend call: POST /api/foods/custom/
 * @param {Object} foodData - Custom food data
 * @param {string} foodData.name - Food name
 * @param {number} foodData.calories - Calories per 100g
 * @param {number} foodData.protein - Protein in grams per 100g
 * @param {number} foodData.carbs - Carbs in grams per 100g
 * @param {number} foodData.fat - Fat in grams per 100g
 * @param {number} [foodData.fiber] - Fiber in grams per 100g (optional)
 * @param {string} [foodData.category] - Food category (optional)
 * @param {string} [foodData.serving_description] - Serving description (optional)
 * @returns {Promise<Object>} - Created food object
 */
export async function createCustomFood(foodData) {
  // POST JSON payload to backend custom-food endpoint.
  const res = await fetch(API_ENDPOINTS.FOODS_CUSTOM, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(foodData),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error || data?.detail || 'Failed to create custom food');
    error.statusCode = res.status;
    error.data = data;
    throw error;
  }

  // New/updated data means old cache may be stale, so clear it.
  apiCache.clearAll();

  return data;
}

/**
 * Get all custom foods created by the current user
 * Backend call: GET /api/foods/custom/my/
 * @returns {Promise<Object>} - { count, results }
 */
export async function getUserCustomFoods() {
  // GET all custom foods owned by current logged-in user.
  const res = await fetch(API_ENDPOINTS.FOODS_CUSTOM_MY, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error || data?.detail || 'Failed to get custom foods');
    error.statusCode = res.status;
    error.data = data;
    throw error;
  }

  return data; // { count, results: [...] }
}

/**
 * Get user's recently logged foods (unique foods, most recent first)
 * Backend call: GET /api/foods/recent/?limit=<limit>
 * @param {number} limit - Number of foods to return (default: 15, max: 50)
 * @returns {Promise<Object>} - { count, results: [{id, food, last_serving_size, last_serving_unit, times_logged}] }
 */
export async function getRecentFoods(limit = 15) {
  // GET recent foods for quick-add/autocomplete style UI.
  const params = new URLSearchParams({ limit });

  const res = await fetch(`${API_ENDPOINTS.FOODS_RECENT}?${params}`, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error || data?.detail || 'Failed to get recent foods');
    error.statusCode = res.status;
    error.data = data;
    throw error;
  }

  return data;
}
