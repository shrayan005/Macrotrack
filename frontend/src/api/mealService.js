/**
 * mealService.js
 *
 * Handles all meal-diary API calls against the /api/meals/ endpoint group.
 *
 * Key functions:
 *   quickLogMeal(mealData)                    — POST /api/meals/quick-log/ — create meal + foods in one request
 *   getUserMeals(filters)                     — GET /api/meals/ — list meals with optional date/type filtering
 *   getMealDetail(mealId)                     — GET /api/meals/<id>/ — single meal with foods
 *   updateMeal(mealId, updates)               — PUT /api/meals/<id>/update/ — update meal metadata
 *   deleteMeal(mealId)                        — DELETE /api/meals/<id>/delete/ — remove a meal
 *   addFoodToMeal(mealId, foodData)           — POST /api/meals/<id>/add-food/ — add a food entry to a meal
 *   removeFoodFromMeal(mealId, mealFoodId)    — DELETE /api/meals/<id>/remove-food/<foodId>/ — remove a food entry
 *   moveMealFood(mealId, mealFoodId, newType) — POST /api/meals/<id>/move-food/<foodId>/ — reassign to another meal type
 */
// src/api/mealService.js
import { API_ENDPOINTS, getHeaders } from "./config";

/**
 * Quick log a meal with food items in one request
 * @param {Object} mealData - Meal data
 * @param {string} mealData.meal_type - breakfast, lunch, dinner, or snack
 * @param {string} mealData.date - Date in YYYY-MM-DD format
 * @param {string} [mealData.time] - Time in HH:MM format (optional)
 * @param {string} [mealData.notes] - Optional notes
 * @param {Array} mealData.foods - Array of food items
 * @returns {Promise<Object>} - Created meal with foods
 */
export async function quickLogMeal(mealData) {
  const res = await fetch(API_ENDPOINTS.QUICK_LOG_MEAL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(mealData),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw data || new Error('Request failed');
  }

  return data;
}

/**
 * Get all meals for the current user with optional filtering
 * @param {Object} filters - Query filters
 * @param {string} [filters.date] - Filter by specific date (YYYY-MM-DD)
 * @param {string} [filters.start_date] - Filter from this date onwards
 * @param {string} [filters.end_date] - Filter up to this date
 * @param {string} [filters.meal_type] - Filter by meal type
 * @returns {Promise<Object>} - { count, results }
 */
export async function getUserMeals(filters = {}) {
  const params = new URLSearchParams();

  if (filters.date) params.append("date", filters.date);
  if (filters.start_date) params.append("start_date", filters.start_date);
  if (filters.end_date) params.append("end_date", filters.end_date);
  if (filters.meal_type) params.append("meal_type", filters.meal_type);

  const url = `${API_ENDPOINTS.MEALS}${params.toString() ? `?${params}` : ""}`;

  const res = await fetch(url, {
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
 * Get detailed information for a specific meal
 * @param {number} mealId - Meal ID
 * @returns {Promise<Object>} - Meal details with foods
 */
export async function getMealDetail(mealId) {
  const res = await fetch(API_ENDPOINTS.MEAL_DETAIL(mealId), {
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
 * Update meal details (meal_type, date, time, notes)
 * @param {number} mealId - Meal ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated meal
 */
export async function updateMeal(mealId, updates) {
  const res = await fetch(API_ENDPOINTS.UPDATE_MEAL(mealId), {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw data || new Error('Request failed');
  }

  return data;
}

/**
 * Delete a meal
 * @param {number} mealId - Meal ID
 * @returns {Promise<void>}
 */
export async function deleteMeal(mealId) {
  const res = await fetch(API_ENDPOINTS.DELETE_MEAL(mealId), {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw data || new Error('Request failed');
  }
}

/**
 * Add a food item to an existing meal
 * @param {number} mealId - Meal ID
 * @param {Object} foodData - Food data
 * @param {number} foodData.food_id - Food database ID
 * @param {number} [foodData.serving_size] - Number of servings (default: 1)
 * @param {string} [foodData.serving_unit] - Unit of measurement (default: 'serving')
 * @param {number} [foodData.serving_grams] - Grams per serving unit (default: 100)
 * @returns {Promise<Object>} - Created MealFood entry
 */
export async function addFoodToMeal(mealId, foodData) {
  const res = await fetch(API_ENDPOINTS.ADD_FOOD_TO_MEAL(mealId), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(foodData),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw data || new Error('Request failed');
  }

  return data;
}

/**
 * Remove a food item from a meal
 * @param {number} mealId - Meal ID
 * @param {number} mealFoodId - MealFood ID
 * @returns {Promise<void>}
 */
export async function removeFoodFromMeal(mealId, mealFoodId) {
  const res = await fetch(API_ENDPOINTS.REMOVE_FOOD_FROM_MEAL(mealId, mealFoodId), {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw data || new Error('Request failed');
  }
}

/**
 * Move a food item from one meal type to another
 * @param {number} mealId - Current meal ID
 * @param {number} mealFoodId - MealFood ID
 * @param {string} newMealType - New meal type ('breakfast', 'lunch', 'dinner', 'snack')
 * @returns {Promise<Object>} - Response with new meal info
 */
export async function moveMealFood(mealId, mealFoodId, newMealType) {
  const res = await fetch(API_ENDPOINTS.MOVE_MEAL_FOOD(mealId, mealFoodId), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ new_meal_type: newMealType }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw data || new Error('Request failed');
  }

  return data;
}
