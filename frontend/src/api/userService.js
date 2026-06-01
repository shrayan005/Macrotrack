/**
 * userService.js
 *
 * Handles user-profile, password, and preferences API calls against the
 * /api/auth/profile/ endpoint group. Overlaps with profileService.js in scope —
 * prefer profileService for new code.
 *
 * Key functions:
 *   getUserProfile()                       — GET /api/auth/profile/ — returns current user profile
 *   updateUserProfile(profileData)         — PUT /api/auth/profile/update/ — full profile update
 *   patchUserProfile(profileData)          — PATCH /api/auth/profile/update/ — partial profile update
 *   updatePassword(currentPassword, newPassword) — POST /api/auth/profile/change-password/ — change password
 *   uploadProfilePicture(imageFile)        — POST /api/auth/profile/upload-picture/ — upload avatar image
 *   deleteAccount(password)               — DELETE /api/auth/profile/delete-account/ — permanently remove account
 *   getUserPreferences()                   — GET /api/auth/profile/preferences/ — returns user preferences object
 *   updateUserPreferences(preferences)     — PUT /api/auth/profile/preferences/ — update preferences
 */
// src/api/userService.js

import { API_ENDPOINTS, getHeaders } from './config';

/**
 * Get current user profile
 * @returns {Promise} - User profile data
 */
// Fetch the authenticated user's profile — GET /api/auth/profile/ — returns user object
export const getUserProfile = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.USER_PROFILE, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user profile
 * @param {Object} profileData - Updated profile information
 * @returns {Promise} - Updated profile data
 */
// Full profile update — PUT /api/auth/profile/update/ — returns updated user object
export const updateUserProfile = async (profileData) => {
  try {
    const response = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update profile');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Partially update user profile (PATCH request)
 * @param {Object} profileData - Fields to update
 * @returns {Promise} - Updated profile data
 */
// Partial profile update — PATCH /api/auth/profile/update/ — returns updated user object
export const patchUserProfile = async (profileData) => {
  try {
    const response = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update profile');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user password
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise}
 */
// Change the user's password — POST /api/auth/profile/change-password/ — returns confirmation
export const updatePassword = async (currentPassword, newPassword) => {
  try {
    const response = await fetch(`${API_ENDPOINTS.USER_PROFILE}change-password/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update password');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Upload user profile picture
 * @param {File} imageFile - Image file
 * @returns {Promise} - Updated profile data with new image URL
 */
// Upload a profile avatar — POST /api/auth/profile/upload-picture/ — returns updated profile with new image URL
export const uploadProfilePicture = async (imageFile) => {
  try {
    const formData = new FormData();
    formData.append('profile_picture', imageFile);

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_ENDPOINTS.USER_PROFILE}upload-picture/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        // Don't set Content-Type, browser will set it with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload profile picture');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete user account
 * @param {string} password - User password for confirmation
 * @returns {Promise}
 */
// Permanently delete the user account — DELETE /api/auth/profile/delete-account/ — returns { success }
export const deleteAccount = async (password) => {
  try {
    const response = await fetch(`${API_ENDPOINTS.USER_PROFILE}delete-account/`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete account');
    }

    return { success: true };
  } catch (error) {
    throw error;
  }
};

/**
 * Get user preferences
 * @returns {Promise} - User preferences
 */
// Fetch user preference settings — GET /api/auth/profile/preferences/ — returns preferences object
export const getUserPreferences = async () => {
  try {
    const response = await fetch(`${API_ENDPOINTS.USER_PROFILE}preferences/`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user preferences');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user preferences
 * @param {Object} preferences - Updated preferences
 * @returns {Promise} - Updated preferences
 */
// Update user preference settings — PUT /api/auth/profile/preferences/ — returns updated preferences object
export const updateUserPreferences = async (preferences) => {
  try {
    const response = await fetch(`${API_ENDPOINTS.USER_PROFILE}preferences/`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update preferences');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};