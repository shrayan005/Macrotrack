/**
 * profileService.js
 *
 * Handles user-profile and account-management API calls against the /api/auth/
 * endpoint group. Complements authService.js — this file covers post-login
 * profile operations.
 *
 * Key functions:
 *   getUserProfile()        — GET /api/auth/profile/ — returns current user profile object
 *   updateUserProfile(data) — PUT /api/auth/profile/update/ — full profile update, returns updated user
 *   getAccountStats()       — GET /api/auth/stats/ — returns total meals, streak, member since
 *   deleteAccount()         — DELETE /api/auth/delete-account/ — permanently removes the account
 *   getDashboardSummary()   — GET /api/dashboard/summary/ — pre-computed dashboard data (totals, streaks, habit grid)
 */
// src/api/profileService.js
import { API_ENDPOINTS, getHeaders } from "./config";

/**
 * Get current user's profile
 * @returns {Promise<Object>} - User profile data
 */
export async function getUserProfile() {
  const res = await fetch(API_ENDPOINTS.USER_PROFILE, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw data || new Error('Request failed');
  }

  return data;
}

/**
 * Update current user's profile
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object>} - Updated user profile
 */
export async function updateUserProfile(profileData) {
  const res = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(profileData),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw data || new Error('Request failed');
  }

  return data;
}

/**
 * Get account statistics (total meals, streak, member since)
 * @returns {Promise<Object>} - Account stats
 */
export async function getAccountStats() {
  const res = await fetch(`${API_ENDPOINTS.AUTH_BASE}/stats/`, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw data || new Error('Request failed');
  }

  return data;
}

/**
 * Get pre-computed dashboard summary from backend.
 * Returns daily totals, habit grid, streaks, calorie chart — no frontend calculation needed.
 * @returns {Promise<Object>} - { daily_totals, meal_breakdown, habit_grid, calorie_chart, meal_streak, weight_streak, recent_weight_change, current_weight, calorie_target }
 */
export async function getDashboardSummary() {
  const res = await fetch(API_ENDPOINTS.DASHBOARD_SUMMARY, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw data || new Error('Request failed');
  }

  return data;
}

/**
 * Delete current user's account permanently
 * @returns {Promise<Object>} - Confirmation message
 */
export async function deleteAccount() {
  const res = await fetch(`${API_ENDPOINTS.AUTH_BASE}/delete-account/`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw data || new Error('Request failed');
  }

  return data;
}

