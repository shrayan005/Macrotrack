/**
 * DiaryPage
 *
 * Daily food diary where users log, edit, and delete meals for a chosen date.
 * Supports weight logging and daily notes.
 *
 * Props:
 *   None — date is stored in local state; user data comes from AuthContext.
 *
 * Used in: App.js (protected route "/diary")
 */
// src/features/diary/DiaryPage.js

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../../shared/Navbar';
import { useNavigate } from 'react-router-dom';
import { getUserMeals, removeFoodFromMeal, moveMealFood, quickLogMeal } from '../../api/mealService';
import { getWeightLogs, createWeightLog, updateWeightLog } from '../../api/weightService';
import { getRecentFoods } from '../../api/foodService';
import { getRecipes, logRecipeToDiary } from '../../api/recipeService';
import { useAuth } from '../../hooks/useAuth';
import DailyNote from './DailyNote';
import { showToast } from '../../utils/toast';

function DiaryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [meals, setMeals] = useState([]);
  const [dailyTotals, setDailyTotals] = useState(null);
  const [weightLogs, setWeightLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [mealFoodToDelete, setMealFoodToDelete] = useState(null);
  const [foodToMove, setFoodToMove] = useState(null); // {mealId, mealFoodId, currentMealType, foodName}
  const [dailyNote, setDailyNote] = useState(null); // Daily note from API
  const [recentFoods, setRecentFoods] = useState([]);
  const [showRecentFoods, setShowRecentFoods] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [showRecipes, setShowRecipes] = useState(false);

  // Get user's calorie target from profile
  const calorieTarget = user?.calorie_target || 2000;

  // Fetch meals for the selected date from the backend API.
  // This updates the local state with the user's logged foods and their daily note.
  const fetchMeals = useCallback(async (silent = false) => {
    try {
      // Only show the full loading skeleton on the very first load (not after quick-add / move / delete).
      // A "silent" refresh skips the loading state so the page doesn't scroll back to the top.
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      // BACKEND CALL: fetches meals for a specific date
      // Response includes daily_totals pre-computed on the backend
      const response = await getUserMeals({ date: selectedDate });
      setMeals(response.results || []);
      setDailyNote(response.daily_note || null);
      setDailyTotals(response.daily_totals || null);
    } catch (err) {
      setError('Failed to load meals');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Fetch meals for selected date
  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  // Fetch weight logs on mount
  useEffect(() => {
    fetchWeightLogs();
  }, []);

  // Fetch recent foods on mount (non-critical)
  useEffect(() => {
    getRecentFoods(6).then(data => {
      setRecentFoods(data.results || []);
    }).catch(() => {});
  }, []);

  // Fetch user's recipes on mount (non-critical)
  useEffect(() => {
    getRecipes().then(data => {
      setRecipes(data.results || data || []);
    }).catch(() => {});
  }, []);

  // Fetch user's weight history from the backend
  const fetchWeightLogs = async () => {
    try {
      // BACKEND CALL: Gets all weight logs to display today's weight if logged
      const response = await getWeightLogs();
      // backend returns a plain array (no pagination), so use it directly
      setWeightLogs(Array.isArray(response) ? response : (response.results || []));
    } catch (err) {
      // Weight log fetch failed
    }
  };

  // Handles deleting a specific food item from a meal
  const handleDeleteMealFood = async () => {
    if (!mealFoodToDelete) return;

    try {
      const { mealId, mealFoodId } = mealFoodToDelete;
      // BACKEND CALL: Tells the server to remove this food from the meal
      await removeFoodFromMeal(mealId, mealFoodId);

      // Refresh meals silently — don't scroll to top
      await fetchMeals(true);
      setMealFoodToDelete(null);
    } catch (err) {
      // Delete failed - toast shown below
      showToast('Failed to delete food item', true);
    }
  };

  // Handles moving a food item from one meal type (e.g. 'breakfast') to another (e.g. 'lunch')
  const handleMoveMealFood = async (newMealType) => {
    if (!foodToMove) return;

    try {
      const { mealId, mealFoodId } = foodToMove;
      // BACKEND CALL: Updates the meal type for a specific food on the server
      await moveMealFood(mealId, mealFoodId, newMealType);

      // Refresh meals silently — don't scroll to top
      await fetchMeals(true);
      setFoodToMove(null);
    } catch (err) {
      // Move failed - toast shown below
      showToast('Failed to move food item', true);
    }
  };

  // Handles saving or updating the user's weight for the selected date
  const handleSaveWeight = async () => {
    try {
      const weight = parseFloat(weightInput);
      if (isNaN(weight) || weight <= 0) {
        showToast('Please enter a valid weight', true);
        return;
      }

      const existingLog = weightLogs.find(w => w.date === selectedDate);

      if (existingLog) {
        // Update existing log
        // BACKEND CALL: Modifies an already logged weight entry for today
        const updated = await updateWeightLog(existingLog.id, {
          weight,
          date: selectedDate
        });
        setWeightLogs(prev =>
          prev.map(w => w.id === existingLog.id ? updated : w)
        );
      } else {
        // Create new log
        // BACKEND CALL: Creates a brand new weight log entry for the day
        const newLog = await createWeightLog({
          weight,
          date: selectedDate
        });
        setWeightLogs(prev => [...prev, newLog]);
      }

      setShowWeightModal(false);
      setWeightInput('');
    } catch (err) {
      // Weight save failed - toast shown below
      showToast('Failed to save weight', true);
    }
  };

  // Handles logging a recipe from the sidebar into breakfast
  const handleLogRecipe = async (recipe) => {
    try {
      await logRecipeToDiary(recipe.id, {
        meal_type: 'breakfast',
        date: selectedDate,
        serving_multiplier: 1,
      });
      await fetchMeals(true);
      showToast(`${recipe.name} added to Breakfast`);
    } catch {
      showToast('Failed to log recipe', true);
    }
  };

  // Handles quickly logging a food from the "Recent Foods" sidebar into breakfast
  const handleLogRecentFood = async (recentFood) => {
    try {
      // BACKEND CALL: Immediately creates a new meal entry for the selected recent food
      await quickLogMeal({
        meal_type: 'breakfast',
        date: selectedDate,
        foods: [{
          food_id: recentFood.food.id,
          serving_size: recentFood.last_serving_size,
          serving_unit: recentFood.last_serving_unit,
          serving_grams: recentFood.last_serving_grams,
        }],
      });
      // Refresh meals silently — don't scroll to top
      await fetchMeals(true);
      showToast(`${recentFood.food.name} added to Breakfast`);
    } catch {
      showToast('Failed to log food', true);
    }
  };

  // Transform meal data for display
  const getMealsByType = () => {
    const mealsByType = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: []
    };

    meals.forEach(meal => {
      const foods = (meal.meal_foods || []).map(mf => ({
        id: mf.id,
        mealId: meal.id,
        name: mf.food_name,
        calories: parseFloat(mf.calories),
        protein: parseFloat(mf.protein),
        carbs: parseFloat(mf.carbs),
        fat: parseFloat(mf.fat),
        fiber: mf.fiber != null ? parseFloat(mf.fiber) : null,
        quantity: parseFloat(mf.serving_size),
        servingGrams: parseFloat(mf.serving_grams),
        servingLabel: mf.serving_unit,
        time: meal.time || '',
        source: mf.source || 'manual',
      }));

      if (mealsByType[meal.meal_type]) {
        mealsByType[meal.meal_type].push(...foods);
      }
    });

    return mealsByType;
  };

  const mealsByType = getMealsByType();

  const formatServingText = (quantity, servingLabel, servingGrams) => {
    if (quantity == null || !servingLabel) return null;

    const normalizedLabel = String(servingLabel).trim().toLowerCase();
    const isGramUnit = normalizedLabel === 'g' || normalizedLabel === 'gram' || normalizedLabel === 'grams';

    if (isGramUnit) {
      const totalGrams = Number.isFinite(servingGrams) && servingGrams > 0
        ? Math.round(quantity * servingGrams)
        : quantity;
      return `${totalGrams} g`;
    }

    return `${quantity} × ${servingLabel}`;
  };

  const getRecentFoodCalories = (recentFood) => {
    const caloriesPer100 = Number(recentFood?.food?.calories);
    const servingGrams = Number(recentFood?.last_serving_grams);
    const normalizedServingGrams = Number.isFinite(servingGrams) && servingGrams > 0 ? servingGrams : 100;

    if (!Number.isFinite(caloriesPer100)) {
      return 0;
    }

    return Math.round((caloriesPer100 * normalizedServingGrams) / 100);
  };

  // Daily totals come pre-computed from the backend (daily_totals in meals response)
  const totalCalories = dailyTotals?.calories ?? 0;
  const totalProtein  = dailyTotals?.protein  ?? 0;
  const totalCarbs    = dailyTotals?.carbs    ?? 0;
  const totalFat      = dailyTotals?.fat      ?? 0;
  const totalFiber    = dailyTotals?.fiber    ?? 0;
  const fiberTarget   = user?.fiber_target || 25;

  const todayWeight = weightLogs.find((w) => w.date === selectedDate);

  const MealSection = ({ title, foods, currentMealType }) => {
    return (
    <div className="diary-meal-section">
      <div className="meal-section-header">
        <h3>{title}</h3>
        <div className="meal-header-actions">
          <button className="btn-add-food" onClick={() => navigate('/foods')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Food
          </button>
        </div>
      </div>

      {foods.length === 0 ? (
        <div className="no-meals">
          <p>No foods logged for {title.toLowerCase()}</p>
        </div>
      ) : (
        <div className="diary-meals-list">
          {foods.map((food) => {
            return (
            <div key={food.id} className="diary-meal-item">
              <div className="meal-item-info">
                <div className="meal-item-name">
                  {food.name}
                  {food.source === 'ai' && (
                    <span className="meal-source-badge meal-source-ai" title="Added via AI image analysis">AI</span>
                  )}
                  {food.quantity && food.servingLabel && (
                    <span className="meal-item-quantity">
                      {formatServingText(food.quantity, food.servingLabel, food.servingGrams)}
                    </span>
                  )}
                </div>
                {food.time && <div className="meal-item-time">{food.time}</div>}
              </div>

              <div className="meal-item-nutrition">
                <span className="meal-item-calories">{Math.round(food.calories)} cal</span>
                <span className="meal-item-macro">P: {food.protein.toFixed(1)}g</span>
                <span className="meal-item-macro">C: {food.carbs.toFixed(1)}g</span>
                <span className="meal-item-macro">F: {food.fat.toFixed(1)}g</span>
                {food.fiber != null && (
                  <span className="meal-item-macro fiber-macro">Fi: {food.fiber.toFixed(1)}g</span>
                )}
              </div>

              <div className="meal-item-actions">
                <button
                  className="btn-move"
                  onClick={() => setFoodToMove({
                    mealId: food.mealId,
                    mealFoodId: food.id,
                    currentMealType: currentMealType,
                    foodName: food.name
                  })}
                  title="Move to another meal"
                >
                  Move
                </button>
                <button
                  className="btn-delete"
                  onClick={() => setMealFoodToDelete({
                    mealId: food.mealId,
                    mealFoodId: food.id,
                    foodName: food.name
                  })}
                >
                  Delete
                </button>
              </div>

            </div>
            );
          })}
        </div>
      )}
    </div>
  );
  };

  if (loading) {
    return (
      <div className="page-container">
        <Navbar currentPage="diary" />
        <div className="page-content">
          <div className="skeleton skeleton-title" style={{ width: '30%', marginBottom: '24px' }} />
          <div className="skeleton-row" style={{ marginBottom: '24px' }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton-card" style={{ flex: 1, height: '120px', marginBottom: 0 }} />
            ))}
          </div>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton-card" style={{ marginBottom: '16px' }}>
              <div className="skeleton skeleton-text lg" style={{ width: '20%', marginBottom: '12px' }} />
              {[1,2].map(j => <div key={j} className="skeleton skeleton-text" style={{ marginBottom: '8px' }} />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Navbar currentPage="diary" />

      <div className="page-content">
        <div className="diary-header">
          <div>
            <h1 className="page-title">Food Diary</h1>
            <p className="page-subtitle">Track your daily nutrition</p>
          </div>

          <div className="diary-controls">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-input"
            />

            <button
              className="btn btn-primary"
              onClick={() => navigate('/foods')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{ marginRight: '6px', flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Search Foods
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              background: 'color-mix(in srgb, var(--danger-color) 10%, var(--bg-secondary))',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              color: 'var(--danger-color)'
            }}
          >
            {error}
          </div>
        )}

        {/* Daily Note Section */}
        <DailyNote date={selectedDate} initialData={dailyNote} onSave={fetchMeals} />

        <div className="diary-summary-grid">
          <div className="summary-card">
            <div className="summary-icon calories-icon"></div>
            <div className="summary-content">
              <div className="summary-value">{Math.round(totalCalories)}</div>
              <div className="summary-label">Calories</div>
              <div className="summary-target">Goal: {calorieTarget}</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon protein-icon"></div>
            <div className="summary-content">
              <div className="summary-value">{totalProtein.toFixed(1)}g</div>
              <div className="summary-label">Protein</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon carbs-icon"></div>
            <div className="summary-content">
              <div className="summary-value">{totalCarbs.toFixed(1)}g</div>
              <div className="summary-label">Carbs</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon fat-icon"></div>
            <div className="summary-content">
              <div className="summary-value">{totalFat.toFixed(1)}g</div>
              <div className="summary-label">Fat</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon fiber-icon"></div>
            <div className="summary-content">
              <div className="summary-value">{totalFiber.toFixed(1)}g</div>
              <div className="summary-label">Fiber</div>
              <div className="summary-target">Goal: {fiberTarget}g</div>
            </div>
          </div>
        </div>

        <div className="diary-content">
          <div className="diary-meals">
            <MealSection
              title="Breakfast"
              foods={mealsByType.breakfast}
              currentMealType="breakfast"
            />
            <MealSection
              title="Lunch"
              foods={mealsByType.lunch}
              currentMealType="lunch"
            />
            <MealSection
              title="Dinner"
              foods={mealsByType.dinner}
              currentMealType="dinner"
            />
            <MealSection
              title="Snacks"
              foods={mealsByType.snack}
              currentMealType="snack"
            />
          </div>

          <div className="diary-sidebar">
            {recentFoods.length > 0 && (
              <div className="card recent-foods-card">
                <div
                  className="recent-foods-card-header"
                  onClick={() => setShowRecentFoods(prev => !prev)}
                >
                  <h3>Recent Foods</h3>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    style={{ transform: showRecentFoods ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {showRecentFoods && (
                  <div className="recent-foods-list">
                    {recentFoods.map(rf => (
                      <div key={rf.id} className="recent-food-item">
                        <div className="recent-food-info">
                          <span className="recent-food-name">{rf.food.name}</span>
                          <span className="recent-food-cal">{getRecentFoodCalories(rf)} cal</span>
                        </div>
                        <button
                          className="btn-log-recent"
                          onClick={() => handleLogRecentFood(rf)}
                          title="Add to today's breakfast"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {recipes.length > 0 && (
              <div className="card recent-foods-card">
                <div
                  className="recent-foods-card-header"
                  onClick={() => setShowRecipes(prev => !prev)}
                >
                  <h3>My Recipes</h3>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    style={{ transform: showRecipes ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {showRecipes && (
                  <div className="recent-foods-list">
                    {recipes.map(recipe => (
                      <div key={recipe.id} className="recent-food-item">
                        <div className="recent-food-info">
                          <span className="recent-food-name">{recipe.name}</span>
                          <span className="recent-food-cal">{Math.round(recipe.calories)} cal</span>
                        </div>
                        <button
                          className="btn-log-recent"
                          onClick={() => handleLogRecipe(recipe)}
                          title="Add to today's breakfast"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="card weight-log-card">
              <h3>Weight Log</h3>

              {todayWeight ? (
                <div className="weight-logged">
                  <div className="weight-value">{todayWeight.weight} kg</div>
                  <p className="weight-date">Logged for this date</p>

                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => {
                      setWeightInput(todayWeight.weight);
                      setShowWeightModal(true);
                    }}
                  >
                    Update Weight
                  </button>
                </div>
              ) : (
                <div className="weight-not-logged">
                  <p>No weight logged for this date</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowWeightModal(true)}
                  >
                    Log Weight
                  </button>
                </div>
              )}
            </div>

            <div className="card">
              <h3>Nutrition Info</h3>
              <div className="nutrition-breakdown">
                <div className="breakdown-item">
                  <span className="breakdown-label">Total Calories</span>
                  <span className="breakdown-value">{Math.round(totalCalories)}</span>
                </div>

                <div className="breakdown-item">
                  <span className="breakdown-label">Remaining</span>
                  <span
                    className={`breakdown-value ${calorieTarget - totalCalories >= 0
                      ? 'positive'
                      : 'negative'
                      }`}
                  >
                    {Math.round(calorieTarget - totalCalories)}
                  </span>
                </div>

                <div className="breakdown-divider"></div>

                <div className="breakdown-item">
                  <span className="breakdown-label">Protein</span>
                  <span className="breakdown-value">{totalProtein.toFixed(1)}g</span>
                </div>

                <div className="breakdown-item">
                  <span className="breakdown-label">Carbs</span>
                  <span className="breakdown-value">{totalCarbs.toFixed(1)}g</span>
                </div>

                <div className="breakdown-item">
                  <span className="breakdown-label">Fat</span>
                  <span className="breakdown-value">{totalFat.toFixed(1)}g</span>
                </div>

                <div className="breakdown-divider"></div>

                <div className="breakdown-item">
                  <span className="breakdown-label">Fiber</span>
                  <span className="breakdown-value">{totalFiber.toFixed(1)}g</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">Fiber Goal</span>
                  <span className={`breakdown-value ${totalFiber >= fiberTarget ? 'positive' : ''}`}>
                    {fiberTarget - totalFiber > 0
                      ? `${(fiberTarget - totalFiber).toFixed(1)}g left`
                      : 'Goal reached!'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weight Modal */}
      {showWeightModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowWeightModal(false)}
        >
          <div
            className="modal-content small"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Log Weight</h2>

            <div className="modal-form">
              <div className="form-group">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="weight-input"
                  autoFocus
                />
              </div>

              <div className="modal-buttons">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowWeightModal(false)}
                >
                  Cancel
                </button>

                <button className="btn btn-primary" onClick={handleSaveWeight}>
                  Save Weight
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Meal Food Confirmation Modal */}
      {mealFoodToDelete && (
        <div
          className="modal-overlay"
          onClick={() => setMealFoodToDelete(null)}
        >
          <div
            className="modal-content small"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Delete Food Item?</h2>
            <p className="modal-description">
              Are you sure you want to delete "{mealFoodToDelete.foodName}"? This action cannot be undone.
            </p>

            <div className="modal-buttons">
              <button
                className="btn btn-secondary"
                onClick={() => setMealFoodToDelete(null)}
              >
                Cancel
              </button>

              <button
                className="btn btn-primary"
                style={{ background: 'var(--danger-color)' }}
                onClick={handleDeleteMealFood}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Meal Food Modal */}
      {foodToMove && (
        <div
          className="modal-overlay"
          onClick={() => setFoodToMove(null)}
        >
          <div
            className="modal-content small"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Move Food Item</h2>
            <p className="modal-description">
              Move "{foodToMove.foodName}" to:
            </p>

            <div className="move-meal-options">
              {['breakfast', 'lunch', 'dinner', 'snack'].map((mealType) => {
                const isCurrentMeal = mealType === foodToMove.currentMealType;
                const displayName = mealType === 'snack' ? 'Snacks' : mealType.charAt(0).toUpperCase() + mealType.slice(1);

                return (
                  <button
                    key={mealType}
                    className={`move-meal-option ${isCurrentMeal ? 'current' : ''}`}
                    onClick={() => !isCurrentMeal && handleMoveMealFood(mealType)}
                    disabled={isCurrentMeal}
                  >
                    {displayName}
                    {isCurrentMeal && <span className="current-badge">(Current)</span>}
                  </button>
                );
              })}
            </div>

            <div className="modal-buttons" style={{ marginTop: '20px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setFoodToMove(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default DiaryPage;
