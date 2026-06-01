/**
 * exerciseService.js
 *
 * Handles all exercise-log API calls against the /api/exercise-logs/ endpoint group.
 *
 * Key functions:
 *   getExerciseLogs(params)        — GET /api/exercise-logs/ — list logs with optional query filters
 *   createExerciseLog(data)        — POST /api/exercise-logs/ — create a new exercise entry
 *   updateExerciseLog(id, data)    — PUT /api/exercise-logs/<id>/ — replace an existing log
 *   deleteExerciseLog(id)          — DELETE /api/exercise-logs/<id>/ — remove a log
 *   getExerciseSummary(date)       — GET /api/exercise-logs/summary/?date=<date> — aggregate calories burned
 */
// src/api/exerciseService.js

import { API_ENDPOINTS, getHeaders } from './config';

// List exercise logs with optional query params — GET /api/exercise-logs/ — returns paginated list
export const getExerciseLogs = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString
      ? `${API_ENDPOINTS.EXERCISE_LOGS}?${queryString}`
      : API_ENDPOINTS.EXERCISE_LOGS;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch exercise logs');
    }

    return await response.json();
  } catch (error) {
    console.error('Get exercise logs error:', error);
    throw error;
  }
};

// Create a new exercise log entry — POST /api/exercise-logs/ — returns created log object
export const createExerciseLog = async (data) => {
  try {
    const response = await fetch(API_ENDPOINTS.EXERCISE_LOGS, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to create exercise log';
      try {
        const error = await response.json();
        errorMessage = error.detail || Object.values(error).flat().join(', ') || errorMessage;
      } catch {
        errorMessage = `Server error (${response.status})`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Create exercise log error:', error);
    throw error;
  }
};

// Replace an existing exercise log — PUT /api/exercise-logs/<id>/ — returns updated log object
export const updateExerciseLog = async (id, data) => {
  try {
    const response = await fetch(API_ENDPOINTS.EXERCISE_LOG_DETAIL(id), {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to update exercise log';
      try {
        const error = await response.json();
        errorMessage = error.detail || Object.values(error).flat().join(', ') || errorMessage;
      } catch {
        errorMessage = `Server error (${response.status})`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Update exercise log error:', error);
    throw error;
  }
};

// Remove an exercise log — DELETE /api/exercise-logs/<id>/ — returns { success, id }
export const deleteExerciseLog = async (id) => {
  try {
    const response = await fetch(API_ENDPOINTS.EXERCISE_LOG_DETAIL(id), {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete exercise log');
    }

    return { success: true, id };
  } catch (error) {
    console.error('Delete exercise log error:', error);
    throw error;
  }
};

// Get aggregated exercise summary for a date — GET /api/exercise-logs/summary/?date=<date> — returns total calories burned
export const getExerciseSummary = async (date) => {
  try {
    const url = date
      ? `${API_ENDPOINTS.EXERCISE_LOG_SUMMARY}?date=${date}`
      : API_ENDPOINTS.EXERCISE_LOG_SUMMARY;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch exercise summary');
    }

    return await response.json();
  } catch (error) {
    console.error('Get exercise summary error:', error);
    throw error;
  }
};
