/**
 * reportsService.js
 *
 * Handles analytics and nutrition-report API calls.
 *
 * Key functions:
 *   getProgressStats(days) — GET /api/progress/stats/?days=N — pre-aggregated daily breakdown + weight trend
 *   getReports(period)     — GET /api/reports/?period=<period> — complete nutrition report
 */
// src/api/reportsService.js
import { API_ENDPOINTS, getHeaders } from "./config";

/**
 * Get pre-aggregated progress statistics for the given number of days.
 * Returns daily_breakdown (per-day calories/macros), daily_weight (forward-filled),
 * compliance_pct, weight change, and macro averages — all computed on the backend.
 * @param {number} days - Number of days to analyse (7, 14, 30, 90)
 * @returns {Promise<Object>} - { date_range, calories, macros, weight, daily_breakdown, daily_weight }
 */
export async function getProgressStats(days = 30) {
  const params = new URLSearchParams({ days });
  const url = `${API_ENDPOINTS.PROGRESS_STATS}?${params}`;

  const res = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error || 'Failed to fetch progress stats');
    error.statusCode = res.status;
    throw error;
  }

  return data;
}

/**
 * Get nutrition reports and analytics
 * @param {string} period - Time period: '7d', '30d', 'this_month', or 'custom:YYYY-MM-DD:YYYY-MM-DD'
 * @returns {Promise<Object>} - Complete report data
 */
// Fetch nutrition reports for a time period — GET /api/reports/?period=<period> — returns full report object
export async function getReports(period = '7d') {
  const params = new URLSearchParams({ period });
  const url = `${API_ENDPOINTS.REPORTS}?${params}`;

  const res = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error || 'Failed to fetch reports');
    error.statusCode = res.status;
    error.data = data;
    throw error;
  }

  return data;
}
