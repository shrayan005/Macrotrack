/**
 * weightService.js
 *
 * Handles all body-weight tracking API calls against the /api/weight-logs/ endpoint.
 *
 * Key functions:
 *   getWeightLogs(params)         — GET /api/weight-logs/ — returns list of weight log entries
 *   getWeightLogById(id)          — GET /api/weight-logs/<id>/ — single log entry
 *   createWeightLog(weightData)   — POST /api/weight-logs/ — create a new weight entry
 *   updateWeightLog(id, data)     — PUT /api/weight-logs/<id>/ — replace an existing entry
 *   deleteWeightLog(id)           — DELETE /api/weight-logs/<id>/ — remove a log entry
 *   getWeightStats(params)        — GET /api/weight-logs/stats/ — aggregated weight statistics
 */
// src/api/weightService.js

import { API_ENDPOINTS, getHeaders } from './config';

/**
 * Get all weight logs for the current user
 * @param {Object} params - Query parameters (date range, etc.)
 * @returns {Promise} - Array of weight logs
 */
// List weight log entries with optional filters — GET /api/weight-logs/ — returns array of logs
export const getWeightLogs = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString 
      ? `${API_ENDPOINTS.WEIGHT_LOGS}?${queryString}` 
      : API_ENDPOINTS.WEIGHT_LOGS;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch weight logs');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get weight logs error:', error);
    throw error;
  }
};

/**
 * Get a single weight log by ID
 * @param {number} id - Weight log ID
 * @returns {Promise} - Weight log data
 */
// Fetch a single weight log entry — GET /api/weight-logs/<id>/ — returns log object
export const getWeightLogById = async (id) => {
  try {
    const response = await fetch(API_ENDPOINTS.WEIGHT_LOG_DETAIL(id), {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch weight log');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get weight log error:', error);
    throw error;
  }
};

/**
 * Create a new weight log
 * @param {Object} weightData - Weight information { weight, date }
 * @returns {Promise} - Created weight log data
 */
// Create a new weight log entry — POST /api/weight-logs/ — returns created log object
export const createWeightLog = async (weightData) => {
  try {
    const response = await fetch(API_ENDPOINTS.WEIGHT_LOGS, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(weightData),
    });

    if (!response.ok) {
      // Try to parse JSON error, but handle HTML responses gracefully
      let errorMessage = 'Failed to create weight log';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || error.detail || errorMessage;
      } catch (parseError) {
        // Response is not JSON (likely HTML error page)
        const text = await response.text();
        console.error('Non-JSON error response:', text);
        errorMessage = `Server error (${response.status}): Unable to save weight`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Create weight log error:', error);
    throw error;
  }
};

/**
 * Update an existing weight log
 * @param {number} id - Weight log ID
 * @param {Object} weightData - Updated weight information
 * @returns {Promise} - Updated weight log data
 */
// Replace an existing weight log — PUT /api/weight-logs/<id>/ — returns updated log object
export const updateWeightLog = async (id, weightData) => {
  try {
    const response = await fetch(API_ENDPOINTS.WEIGHT_LOG_DETAIL(id), {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(weightData),
    });

    if (!response.ok) {
      // Try to parse JSON error, but handle HTML responses gracefully
      let errorMessage = 'Failed to update weight log';
      try {
        const error = await response.json();
        errorMessage = error.message || error.detail || errorMessage;
      } catch (parseError) {
        // Response is not JSON (likely HTML error page)
        console.error('Non-JSON error response');
        errorMessage = `Server error (${response.status}): Unable to update weight`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Update weight log error:', error);
    throw error;
  }
};

/**
 * Delete a weight log
 * @param {number} id - Weight log ID
 * @returns {Promise}
 */
// Remove a weight log entry — DELETE /api/weight-logs/<id>/ — returns { success, id }
export const deleteWeightLog = async (id) => {
  try {
    const response = await fetch(API_ENDPOINTS.WEIGHT_LOG_DETAIL(id), {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete weight log');
    }

    return { success: true, id };
  } catch (error) {
    console.error('Delete weight log error:', error);
    throw error;
  }
};

/**
 * Get weight statistics
 * @param {Object} params - Query parameters (date range, etc.)
 * @returns {Promise} - Weight statistics
 */
// Fetch aggregated weight statistics — GET /api/weight-logs/stats/ — returns stats object
export const getWeightStats = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString 
      ? `${API_ENDPOINTS.WEIGHT_LOGS}stats/?${queryString}` 
      : `${API_ENDPOINTS.WEIGHT_LOGS}stats/`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch weight statistics');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get weight stats error:', error);
    throw error;
  }
};