/**
 * waterService.js
 *
 * Handles all water-intake tracking API calls against the /api/water-logs/ endpoint.
 *
 * Key functions:
 *   getWaterLogs(date)          — GET /api/water-logs/?date=<date> — returns total_ml and entry list for a day
 *   addWater(amount_ml, date)   — POST /api/water-logs/ — log a water intake entry
 *   deleteWater(id)             — DELETE /api/water-logs/<id>/ — remove a water entry
 */
import { API_ENDPOINTS, getHeaders } from './config';

/**
 * Fetch water intake total and entries for a given date.
 * @param {string} date - YYYY-MM-DD
 * @returns {{ total_ml: number, entries: Array<{id, amount_ml}> }}
 */
export const getWaterLogs = async (date) => {
  const url = `${API_ENDPOINTS.WATER_LOGS}?date=${date}`;
  const response = await fetch(url, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to fetch water logs');
  return response.json();
};

/**
 * Add a water intake entry.
 * @param {number} amount_ml
 * @param {string} date - YYYY-MM-DD
 * @returns {{ id: number, amount_ml: number }}
 */
export const addWater = async (amount_ml, date) => {
  const response = await fetch(API_ENDPOINTS.WATER_LOGS, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ amount_ml, date }),
  });
  if (!response.ok) throw new Error('Failed to add water entry');
  return response.json();
};

/**
 * Delete a water intake entry.
 * @param {number} id
 */
export const deleteWater = async (id) => {
  const response = await fetch(API_ENDPOINTS.WATER_LOG_DETAIL(id), {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete water entry');
};
