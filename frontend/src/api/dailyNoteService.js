/**
 * dailyNoteService.js
 *
 * Handles diary note API calls against the /api/daily-notes/ endpoint.
 * The backend performs an upsert on POST, so there is no separate create/update split.
 *
 * Key functions:
 *   getDailyNote(date)    — GET /api/daily-notes/?date=<date> — returns note object or null if none exists
 *   saveDailyNote(noteData) — POST /api/daily-notes/ — create or update the note for the given date
 */
// src/api/dailyNoteService.js
import { API_ENDPOINTS, getHeaders } from "./config";

/**
 * Get daily note for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} - Note data or null if not found
 */
export async function getDailyNote(date) {
    const url = `${API_ENDPOINTS.DAILY_NOTES}?date=${date}`;

    const res = await fetch(url, {
        method: "GET",
        headers: getHeaders(),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw data || new Error('Request failed');
    }

    // Backend returns {date: "...", note: null} when no note exists
    if (data.note === null) {
        return null;
    }

    return data;
}

/**
 * Create or update daily note
 * @param {Object} noteData - Note data
 * @param {string} noteData.date - Date in YYYY-MM-DD format
 * @param {string[]} [noteData.tags] - Array of tags
 * @param {string} [noteData.note_text] - Note content
 * @param {string} [noteData.activity_level] - Activity level
 * @returns {Promise<Object>} - Saved note
 */
export async function saveDailyNote(noteData) {
    const res = await fetch(API_ENDPOINTS.DAILY_NOTES, {
        method: "POST", // The endpoint handles upsert logic
        headers: getHeaders(),
        body: JSON.stringify(noteData),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw data || new Error('Request failed');
    }

    return data;
}
