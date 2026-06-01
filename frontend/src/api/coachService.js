/**
 * coachService.js
 *
 * Handles all AI coach API calls against the /api/coach/ endpoint group.
 *
 * Key functions:
 *   getCoachAnalysis()              — GET /api/coach/analysis/ — full coach analysis with insights and projections
 *   submitCheckIn(checkInData)      — POST /api/coach/check-in/ — submit weekly reflection and accept/reject adjustments
 *   acceptCalorieAdjustment(target) — POST /api/coach/accept-adjustment/ — apply coach-recommended calorie target
 *   updateCoachGoal(settings)       — PUT /api/coach/update-goal/ — update goal type, rate, and calorie target
 *   getCheckInHistory(limit)        — GET /api/coach/check-ins/?limit=<n> — list past check-in records
 */
// src/api/coachService.js
import { API_ENDPOINTS, getHeaders } from "./config";

/**
 * Get comprehensive coach analysis including insights, projections, recommendations
 * @returns {Promise<Object>} Coach analysis data
 */
export async function getCoachAnalysis() {
  const res = await fetch(API_ENDPOINTS.COACH_ANALYSIS, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw data || new Error('Request failed');
  return data;
}

/**
 * Submit weekly check-in
 * @param {Object} checkInData - Check-in data
 * @param {string} checkInData.reflection - 'great', 'okay', 'struggled'
 * @param {string} checkInData.notes - Optional notes
 * @param {boolean} checkInData.accepted_adjustment - Whether user accepted calorie recommendation
 * @param {number} checkInData.new_calorie_target - New calorie target if accepted
 * @param {string} checkInData.new_goal - Optional new goal
 * @param {string} checkInData.new_rate - Optional new rate
 * @param {number} checkInData.current_weight - Current weight at check-in
 * @param {number} checkInData.weekly_rate - Weekly rate at check-in
 * @param {number} checkInData.adherence_percent - Adherence at check-in
 * @returns {Promise<Object>}
 */
export async function submitCheckIn(checkInData) {
  const res = await fetch(API_ENDPOINTS.COACH_CHECK_IN, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(checkInData),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw data || new Error('Request failed');
  return data;
}

/**
 * Accept calorie adjustment recommendation
 * @param {number} newTarget - New calorie target
 * @returns {Promise<Object>}
 */
export async function acceptCalorieAdjustment(newTarget) {
  const res = await fetch(API_ENDPOINTS.COACH_ACCEPT_ADJUSTMENT, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ calorie_target: newTarget }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw data || new Error('Request failed');
  return data;
}

/**
 * Update goal and rate settings from coach page
 * @param {Object} settings - Settings to update
 * @param {string} settings.goal - 'lose', 'maintain', 'gain'
 * @param {string} settings.rate - 'slow', 'moderate', 'aggressive'
 * @param {number} settings.calorie_target - Optional calorie target
 * @returns {Promise<Object>}
 */
export async function updateCoachGoal(settings) {
  const res = await fetch(API_ENDPOINTS.COACH_UPDATE_GOAL, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(settings),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw data || new Error('Request failed');
  return data;
}

/**
 * Get check-in history
 * @param {number} limit - Number of results (default: 10, max: 50)
 * @returns {Promise<Object>}
 */
export async function getCheckInHistory(limit = 10) {
  const res = await fetch(`${API_ENDPOINTS.COACH_CHECK_INS}?limit=${limit}`, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw data || new Error('Request failed');
  return data;
}
