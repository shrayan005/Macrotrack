/**
 * config.js
 *
 * Shared API configuration for MacroTrack. Exports the base URL, auth-token
 * helpers, and the full set of endpoint URL constants used by all service files.
 * Also exports a fetchWithTimeout wrapper used by services that need request
 * cancellation.
 *
 * Key functions:
 *   getAuthToken()            — reads the DRF token from localStorage
 *   setAuthToken(token)       — persists a token to localStorage
 *   removeAuthToken()         — clears the token from localStorage (logout)
 *   getHeaders()              — builds { Content-Type, Authorization } headers
 *   fetchWithTimeout(url, options, timeout) — fetch with AbortController timeout
 */

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api";
// Helper function to get auth token from localStorage
export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Helper function to set auth token
export const setAuthToken = (token) => {
  localStorage.setItem('authToken', token);
};

// Helper function to remove auth token (logout)
export const removeAuthToken = () => {
  localStorage.removeItem('authToken');
};

// Default headers for API requests
export const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Token ${token}`; // Django REST Framework token format
  }

  return headers;
};

// API endpoints
export const API_ENDPOINTS = {
  // Base paths
  AUTH_BASE: `${API_BASE_URL}/auth`,

  // Authentication
  LOGIN: `${API_BASE_URL}/auth/login/`,
  SIGNUP: `${API_BASE_URL}/auth/signup/`,
  LOGOUT: `${API_BASE_URL}/auth/logout/`,

  // User Profile
  USER_PROFILE: `${API_BASE_URL}/auth/profile/`,
  UPDATE_PROFILE: `${API_BASE_URL}/auth/profile/update/`,
  ACCOUNT_STATS: `${API_BASE_URL}/auth/stats/`,
  DELETE_ACCOUNT: `${API_BASE_URL}/auth/delete-account/`,

  // Email Verification
  VERIFY_EMAIL: `${API_BASE_URL}/auth/verify-email/`,
  RESEND_VERIFICATION: `${API_BASE_URL}/auth/resend-verification/`,

  // Meals
  MEALS: `${API_BASE_URL}/meals/`,
  QUICK_LOG_MEAL: `${API_BASE_URL}/meals/quick-log/`,
  MEAL_DETAIL: (id) => `${API_BASE_URL}/meals/${id}/`,
  UPDATE_MEAL: (id) => `${API_BASE_URL}/meals/${id}/update/`,
  DELETE_MEAL: (id) => `${API_BASE_URL}/meals/${id}/delete/`,
  ADD_FOOD_TO_MEAL: (id) => `${API_BASE_URL}/meals/${id}/add-food/`,
  REMOVE_FOOD_FROM_MEAL: (mealId, foodId) => `${API_BASE_URL}/meals/${mealId}/remove-food/${foodId}/`,
  MOVE_MEAL_FOOD: (mealId, foodId) => `${API_BASE_URL}/meals/${mealId}/move-food/${foodId}/`,

  // Weight Logs
  WEIGHT_LOGS: `${API_BASE_URL}/weight-logs/`,
  WEIGHT_LOG_DETAIL: (id) => `${API_BASE_URL}/weight-logs/${id}/`,

  // Foods Database
  FOODS_SEARCH: `${API_BASE_URL}/foods/search/`,
  FOOD_DETAIL: (id) => `${API_BASE_URL}/foods/${id}/`,
  FOODS_CUSTOM: `${API_BASE_URL}/foods/custom/`,
  FOODS_CUSTOM_MY: `${API_BASE_URL}/foods/custom/my/`,
  FOODS_RECENT: `${API_BASE_URL}/foods/recent/`,

  // Dashboard & Analytics
  DASHBOARD_SUMMARY: `${API_BASE_URL}/dashboard/summary/`,

  // Coach/Analytics
  COACH_ANALYSIS: `${API_BASE_URL}/coach/analysis/`,
  COACH_CHECK_IN: `${API_BASE_URL}/coach/check-in/`,
  COACH_CHECK_INS: `${API_BASE_URL}/coach/check-ins/`,
  COACH_ACCEPT_ADJUSTMENT: `${API_BASE_URL}/coach/accept-adjustment/`,
  COACH_UPDATE_GOAL: `${API_BASE_URL}/coach/update-goal/`,
  PROGRESS_STATS: `${API_BASE_URL}/progress/stats/`,

  // Daily Notes
  DAILY_NOTES: `${API_BASE_URL}/daily-notes/`,

  // Reports
  REPORTS: `${API_BASE_URL}/reports/`,

  // Exercise Logs
  EXERCISE_LOGS: `${API_BASE_URL}/exercise-logs/`,
  EXERCISE_LOG_DETAIL: (id) => `${API_BASE_URL}/exercise-logs/${id}/`,
  EXERCISE_LOG_SUMMARY: `${API_BASE_URL}/exercise-logs/summary/`,

  // Recipes
  RECIPES: `${API_BASE_URL}/recipes/`,
  RECIPE_DETAIL: (id) => `${API_BASE_URL}/recipes/${id}/`,
  RECIPE_LOG: (id) => `${API_BASE_URL}/recipes/${id}/log/`,

  // Water Tracking
  WATER_LOGS: `${API_BASE_URL}/water-logs/`,
  WATER_LOG_DETAIL: (id) => `${API_BASE_URL}/water-logs/${id}/`,
};

// Default request timeout (30 seconds)
const DEFAULT_TIMEOUT = 30000;

/**
 * Fetch wrapper with timeout support
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in ms (default: 30000)
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default API_BASE_URL;