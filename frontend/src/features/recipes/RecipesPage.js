/**
 * RecipesPage Component
 *
 * Manage and log custom recipes with:
 * - Create recipes: add ingredients, set quantities, auto-calculate nutrition
 * - View recipes: see full ingredient lists and macro breakdown
 * - Edit recipes: update ingredients and portions
 * - Delete recipes: remove from Fav recipes list
 * - Log to diary: quick-add entire recipe to a meal with portion adjustment
 *
 * Features:
 * - Ingredient search from food database
 * - Auto-calculate macros from ingredient composition
 * - Scale recipes by servings
 * - Filter and sort recipes
 * - Favorite/starred recipes for quick access
 *
 * Props:
 *   None — reads auth data from AuthContext
 *
 * Used in: App.js (protected route "/recipes")
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from '../../shared/Navbar';
import {
  getRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  logRecipeToDiary,
} from '../../api/recipeService';
import { showToast } from '../../utils/toast';
import { safeParseFloat } from '../../utils/numberHelpers';
import '../../styles/recipes.css';

const emptyForm = {
  name: '',
  description: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  serving_description: '1 serving',
};

function RecipesPage() {
  const today = new Date().toISOString().split('T')[0];

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editRecipe, setEditRecipe] = useState(null);
  const [recipeToDelete, setRecipeToDelete] = useState(null);
  const [logTarget, setLogTarget] = useState(null);
  const [logForm, setLogForm] = useState({ meal_type: 'breakfast', date: today, serving_multiplier: '1' });
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const fetchRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getRecipes();
      setRecipes(response.results || response || []);
    } catch {
      showToast('Failed to load recipes', true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const filtered = useMemo(
    () =>
      searchQuery.trim()
        ? recipes.filter((r) =>
            r.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : recipes,
    [recipes, searchQuery]
  );

  const openCreateModal = () => {
    setEditRecipe(null);
    setFormData(emptyForm);
    setShowCreateModal(true);
  };

  const openEditModal = (recipe) => {
    setEditRecipe(recipe);
    setFormData({
      name: recipe.name,
      description: recipe.description || '',
      calories: String(recipe.calories),
      protein: String(recipe.protein),
      carbs: String(recipe.carbs),
      fat: String(recipe.fat),
      fiber: recipe.fiber != null ? String(recipe.fiber) : '',
      serving_description: recipe.serving_description || '1 serving',
    });
    setShowCreateModal(true);
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateNutrition = (data) => {
    const fields = ['calories', 'protein', 'carbs', 'fat'];
    for (const f of fields) {
      const v = safeParseFloat(data[f], null);
      if (v === null || v < 0) return `${f} must be 0 or more`;
      if (v > 10000) return `${f} seems unreasonably high`;
    }
    if (data.fiber !== '') {
      const fv = safeParseFloat(data.fiber, null);
      if (fv === null || fv < 0) return 'Fiber must be 0 or more';
    }
    return null;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (!formData.name.trim()) {
      showToast('Recipe name is required', true);
      return;
    }

    const validationError = validateNutrition(formData);
    if (validationError) {
      showToast(validationError, true);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        calories: safeParseFloat(formData.calories, 0),
        protein: safeParseFloat(formData.protein, 0),
        carbs: safeParseFloat(formData.carbs, 0),
        fat: safeParseFloat(formData.fat, 0),
        ...(formData.fiber !== '' && { fiber: safeParseFloat(formData.fiber, null) }),
        serving_description: formData.serving_description.trim() || '1 serving',
      };

      if (editRecipe) {
        await updateRecipe(editRecipe.id, payload);
        showToast('Recipe updated');
      } else {
        await createRecipe(payload);
        showToast('Recipe created');
      }

      setShowCreateModal(false);
      fetchRecipes();
    } catch (err) {
      showToast(err.message || 'Failed to save recipe', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!recipeToDelete) return;
    try {
      await deleteRecipe(recipeToDelete.id);
      showToast('Recipe deleted');
      setRecipeToDelete(null);
      fetchRecipes();
    } catch {
      showToast('Failed to delete recipe', true);
    }
  };

  const openLogModal = (recipe) => {
    setLogTarget(recipe);
    setLogForm({ meal_type: 'breakfast', date: today, serving_multiplier: '1' });
  };

  const handleLogToDiary = async (e) => {
    e.preventDefault();
    if (isSaving || !logTarget) return;

    const multiplier = parseFloat(logForm.serving_multiplier);
    if (isNaN(multiplier) || multiplier <= 0) {
      showToast('Serving multiplier must be greater than 0', true);
      return;
    }

    setIsSaving(true);
    try {
      await logRecipeToDiary(logTarget.id, {
        meal_type: logForm.meal_type,
        date: logForm.date,
        serving_multiplier: multiplier,
      });
      showToast(`${logTarget.name} added to diary`);
      setLogTarget(null);
    } catch (err) {
      showToast(err.message || 'Failed to add recipe to diary', true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-container">
      <Navbar currentPage="recipes" />

      <div className="page-content">
        {/* Header */}
        <div className="recipes-header">
          <div>
            <h1 className="recipes-title">Recipes</h1>
            <p className="recipes-subtitle">Save your favourite meals and log them instantly</p>
          </div>
          <div className="recipes-actions">
            <input
              type="text"
              className="recipes-search-bar"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="btn btn-primary" onClick={openCreateModal}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px', flexShrink: 0 }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Recipe
            </button>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
            Loading recipes...
          </div>
        ) : (
          <div className="recipes-grid">
            {filtered.length === 0 ? (
              <div className="recipes-empty-state">
                <div className="recipes-empty-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="1" />
                    <path d="M9 12h6M9 16h4" />
                  </svg>
                </div>
                <h3>{searchQuery ? 'No recipes match your search' : 'No recipes yet'}</h3>
                <p>
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Create your first saved meal to log it instantly anytime'}
                </p>
                {!searchQuery && (
                  <button className="btn btn-primary" onClick={openCreateModal}>
                    Create Your First Recipe
                  </button>
                )}
              </div>
            ) : (
              filtered.map((recipe) => (
                <div key={recipe.id} className="recipe-card">
                  <div className="recipe-card-header">
                    <span className="recipe-name">{recipe.name}</span>
                    <span className="recipe-serving-badge">{recipe.serving_description}</span>
                  </div>

                  {recipe.description && (
                    <p className="recipe-description">{recipe.description}</p>
                  )}

                  <div className="recipe-macros">
                    <span className="recipe-macro-item calories">
                      {Math.round(parseFloat(recipe.calories))} cal
                    </span>
                    <span className="recipe-macro-item protein">
                      P: {parseFloat(recipe.protein).toFixed(1)}g
                    </span>
                    <span className="recipe-macro-item carbs">
                      C: {parseFloat(recipe.carbs).toFixed(1)}g
                    </span>
                    <span className="recipe-macro-item fat">
                      F: {parseFloat(recipe.fat).toFixed(1)}g
                    </span>
                    {recipe.fiber != null && (
                      <span className="recipe-macro-item fiber">
                        Fi: {parseFloat(recipe.fiber).toFixed(1)}g
                      </span>
                    )}
                  </div>

                  <div className="recipe-card-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => openLogModal(recipe)}
                    >
                      Add to Diary
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => openEditModal(recipe)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete-sm"
                      onClick={() => setRecipeToDelete(recipe)}
                      title="Delete recipe"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => !isSaving && setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editRecipe ? 'Edit Recipe' : 'New Recipe'}</h2>
            <p className="modal-description">Enter the total nutrition for the full recipe (one serving)</p>

            <form onSubmit={handleSave} className="modal-form">
              <div className="form-group">
                <label>Recipe Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g., My Protein Smoothie"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Description <span style={{ fontWeight: 'normal', color: 'var(--text-secondary)' }}>optional</span></label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Short description"
                />
              </div>

              <div className="form-group">
                <label>Serving Description</label>
                <input
                  type="text"
                  name="serving_description"
                  value={formData.serving_description}
                  onChange={handleFormChange}
                  placeholder="e.g., 1 serving, 1 bowl"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Calories</label>
                  <input
                    type="number"
                    name="calories"
                    value={formData.calories}
                    onChange={handleFormChange}
                    placeholder="0"
                    min="0"
                    step="0.1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Protein (g)</label>
                  <input
                    type="number"
                    name="protein"
                    value={formData.protein}
                    onChange={handleFormChange}
                    placeholder="0"
                    min="0"
                    step="0.1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Carbs (g)</label>
                  <input
                    type="number"
                    name="carbs"
                    value={formData.carbs}
                    onChange={handleFormChange}
                    placeholder="0"
                    min="0"
                    step="0.1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Fat (g)</label>
                  <input
                    type="number"
                    name="fat"
                    value={formData.fat}
                    onChange={handleFormChange}
                    placeholder="0"
                    min="0"
                    step="0.1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Fiber (g) <span style={{ fontWeight: 'normal', color: 'var(--text-secondary)' }}>optional</span></label>
                  <input
                    type="number"
                    name="fiber"
                    value={formData.fiber}
                    onChange={handleFormChange}
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editRecipe ? 'Update Recipe' : 'Create Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add to Diary Modal */}
      {logTarget && (
        <div className="modal-overlay" onClick={() => !isSaving && setLogTarget(null)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <h2>Add to Diary</h2>
            <p className="modal-description">Log <strong>{logTarget.name}</strong> to your diary</p>

            <form onSubmit={handleLogToDiary} className="modal-form">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={logForm.date}
                  onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Meal</label>
                <select
                  value={logForm.meal_type}
                  onChange={(e) => setLogForm({ ...logForm, meal_type: e.target.value })}
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <div className="form-group">
                <label>Servings</label>
                <input
                  type="number"
                  value={logForm.serving_multiplier}
                  onChange={(e) => setLogForm({ ...logForm, serving_multiplier: e.target.value })}
                  min="0.1"
                  /* ── Added today: Changed from step="0.25" to step="any" ── */
                  /* Bypasses HTML5 strict step validation so users can type whole numbers like '1' without errors */
                  step="any"
                  required
                />
                <span className="serving-multiplier-hint">
                  1 = {logTarget.serving_description} ({Math.round(parseFloat(logTarget.calories))} cal)
                </span>
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setLogTarget(null)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Adding...' : 'Add to Diary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {recipeToDelete && (
        <div className="modal-overlay" onClick={() => setRecipeToDelete(null)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Recipe?</h2>
            <p className="modal-description">
              Are you sure you want to delete <strong>{recipeToDelete.name}</strong>? This cannot be undone.
            </p>
            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setRecipeToDelete(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecipesPage;
