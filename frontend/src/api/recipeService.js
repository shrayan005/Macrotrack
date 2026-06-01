/**
 * recipeService.js
 *
 * Handles all recipe API calls against the /api/recipes/ endpoint group.
 *
 * Key functions:
 *   getRecipes(params)                                       — GET /api/recipes/ — list user's recipes with optional filters
 *   createRecipe(data)                                       — POST /api/recipes/ — create a new recipe
 *   updateRecipe(id, data)                                   — PUT /api/recipes/<id>/ — replace a recipe
 *   deleteRecipe(id)                                         — DELETE /api/recipes/<id>/ — remove a recipe
 *   logRecipeToDiary(id, { meal_type, date, serving_multiplier }) — POST /api/recipes/<id>/log/ — add recipe to diary meal
 */
// src/api/recipeService.js

import { API_ENDPOINTS, getHeaders } from './config';

// List the user's recipes with optional query params — GET /api/recipes/ — returns paginated list
export const getRecipes = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString
      ? `${API_ENDPOINTS.RECIPES}?${queryString}`
      : API_ENDPOINTS.RECIPES;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recipes');
    }

    return await response.json();
  } catch (error) {
    console.error('Get recipes error:', error);
    throw error;
  }
};

// Create a new recipe — POST /api/recipes/ — returns created recipe object
export const createRecipe = async (data) => {
  try {
    const response = await fetch(API_ENDPOINTS.RECIPES, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to create recipe';
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
    console.error('Create recipe error:', error);
    throw error;
  }
};

// Replace a recipe by ID — PUT /api/recipes/<id>/ — returns updated recipe object
export const updateRecipe = async (id, data) => {
  try {
    const response = await fetch(API_ENDPOINTS.RECIPE_DETAIL(id), {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to update recipe';
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
    console.error('Update recipe error:', error);
    throw error;
  }
};

// Remove a recipe — DELETE /api/recipes/<id>/ — returns { success, id }
export const deleteRecipe = async (id) => {
  try {
    const response = await fetch(API_ENDPOINTS.RECIPE_DETAIL(id), {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete recipe');
    }

    return { success: true, id };
  } catch (error) {
    console.error('Delete recipe error:', error);
    throw error;
  }
};

// Log a recipe as a diary meal entry — POST /api/recipes/<id>/log/ — returns created meal with foods
export const logRecipeToDiary = async (id, { meal_type, date, serving_multiplier = 1 }) => {
  try {
    const response = await fetch(API_ENDPOINTS.RECIPE_LOG(id), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ meal_type, date, serving_multiplier }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to log recipe to diary';
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
    console.error('Log recipe to diary error:', error);
    throw error;
  }
};
