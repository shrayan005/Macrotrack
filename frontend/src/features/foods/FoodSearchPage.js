/**
 * FoodSearchPage
 *
 * Food database search with category filtering, a custom meal entry form, and a
 * "quick log" flow that adds a food directly to a chosen meal type for today.
 * Also surfaces a recent-foods panel for quick re-logging.
 *
 * Props:
 *   None — all state is managed locally; backend is queried on search.
 *
 * Used in: App.js (protected route "/foods")
 */
// src/features/foods/FoodSearchPage.js

import React, { useState, useEffect, useMemo } from "react";
import Navbar from "../../shared/Navbar";
import { useNavigate } from "react-router-dom";
import { searchFoods, createCustomFood, getFoodDetail, getRecentFoods } from "../../api/foodService";
import { quickLogMeal } from "../../api/mealService";
import { safeParseFloat, formatCalories, formatMacros } from "../../utils/numberHelpers";
import { showToast } from "../../utils/toast";

const CATEGORIES = [
  "protein",
  "grains",
  "vegetables",
  "fruits",
  "nuts",
  "dairy",
];

function FoodSearchPage() {
  const navigate = useNavigate();

  // SEARCH & FILTERING STATE
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null); // null = show all foods
  const [searchResults, setSearchResults] = useState([]);

  // SELECTED FOOD STATE (for modal)
  const [selectedFood, setSelectedFood] = useState(null);
  const [servings, setServings] = useState(1); // Number of servings user selects
  const [servingUnit, setServingUnit] = useState(0); // Index into serving options
  const [mealType, setMealType] = useState("breakfast"); // breakfast/lunch/dinner/snack

  // MODAL VISIBILITY STATE
  const [showAddModal, setShowAddModal] = useState(false); // Show "Add Food" modal
  const [showCustomMealModal, setShowCustomMealModal] = useState(false); // Show "Create Custom" modal

  const [customMeal, setCustomMeal] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
  });

  // LOADING & SAVING STATE
  const [isSaving, setIsSaving] = useState(false); // True while API call is in progress
  const [loadingServings, setLoadingServings] = useState(false); // True while fetching detailed serving options
  const [loading, setLoading] = useState(true); // True while initially loading food database
  const [apiError, setApiError] = useState(""); // Error message from API
  const [isSearching, setIsSearching] = useState(false); // True while searching API

  // PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1); // Current page number
  const [totalPages, setTotalPages] = useState(1); // Total number of pages
  const itemsPerPage = 20; // How many foods to display per page

  // RECENT FOODS STATE
  const [recentFoods, setRecentFoods] = useState([]); // Foods user logged recently (for quick re-logging)

  const categories = CATEGORIES;

  // HELPER FUNCTIONS
  /**
   * Clear the cached foods from session storage and reload the page
   * Used for debugging when the food database seems out of sync
   */
  const handleClearCache = () => {
    sessionStorage.removeItem('all_cached_foods');
    window.location.reload();
  };

  // EFFECT: LOAD ALL FOODS ON MOUNT
  /**
   * When the page first loads, fetch all available foods from the backend
   * This populates the initial food database for browsing and filtering
   */
  // Load all cached foods on mount
  useEffect(() => {
    const loadAllFoods = async () => {
      try {
        setLoading(true);
        setApiError("");

        // Load all cached foods from backend
        // ── Added today: Increased load limit to 200 ──
        // Fetches up to 200 foods on initial load so newly added database items are visible
        const response = await searchFoods('', 1, 200);

        if (!response.results || response.results.length === 0) {
          setApiError("No foods found. Please try searching.");
          setLoading(false);
          return;
        }

        const transformedFoods = (response.results || []).map((food) => ({
          id: food.id,
          name: food.name,
          calories: safeParseFloat(food.calories, 0),
          protein: safeParseFloat(food.protein, 0),
          carbs: safeParseFloat(food.carbs, 0),
          fat: safeParseFloat(food.fat, 0),
          serving: food.serving_description || food.serving || "100g",
          category: food.category,
        }));

        setSearchResults(transformedFoods);
      } catch (err) {
        setApiError(`Failed to load foods: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    loadAllFoods();
  }, []); // Only run once on mount

  // EFFECT: LOAD RECENT FOODS ON MOUNT
  /**
   * Fetch foods the user has recently logged so they can quickly re-log them
   */
  // Load recent foods on mount
  useEffect(() => {
    const loadRecentFoods = async () => {
      try {
        const response = await getRecentFoods(15);
        setRecentFoods(response.results || []);
      } catch (err) {
        // Don't show error to user - recent foods is a nice-to-have
      }
    };

    loadRecentFoods();
  }, []);

  // EFFECT: SEARCH FOODS AS USER TYPES
  /**
   * When the user types in the search box:
   * 1. Wait 500ms to avoid too many API calls (debounce)
   * 2. If search is 3+ chars, search the FatSecret API
   * 3. If search is cleared, reload all foods
   * 4. Cancel previous requests if user types again before request completes
   */
  // Handle search query changes with debouncing
  useEffect(() => {
    let isActive = true;
    const abortController = new AbortController();

    // If search query is >= 3 chars, search with API (includes API call)
    if (searchQuery && searchQuery.trim().length >= 3) {
      const timer = setTimeout(async () => {
        try {
          setIsSearching(true);
          setApiError("");

          const response = await searchFoods(searchQuery.trim(), 1, 50);

          // Only update if this is still the active search
          if (!isActive) {
            return;
          }

          const transformedFoods = (response.results || []).map((food) => ({
            id: food.id,
            name: food.name,
            calories: safeParseFloat(food.calories, 0),
            protein: safeParseFloat(food.protein, 0),
            carbs: safeParseFloat(food.carbs, 0),
            fat: safeParseFloat(food.fat, 0),
            serving: food.serving_description || food.serving || "100g",
            category: food.category,
          }));

          if (isActive) {
            setSearchResults(transformedFoods);
          }
        } catch (err) {
          if (isActive && err.name !== 'AbortError') {
            setApiError(`Search failed: ${err.message || 'Unknown error'}`);
          }
        } finally {
          if (isActive) {
            setIsSearching(false);
          }
        }
      }, 500); // 500ms debounce

      return () => {
        isActive = false;
        abortController.abort();
        clearTimeout(timer);
      };
    } else if (!searchQuery || searchQuery.trim().length === 0) {
      // If search is cleared, reload all cached foods
      const timer = setTimeout(async () => {
        try {
          setIsSearching(true);

        // ── Added today: Increased load limit to 200 ──
        // This ensures that all recently imported FatSecret foods (which exceed the 
        // original 25 limit) are fully loaded into the frontend cache so they appear 
        // when the user browses the food database.
        const response = await searchFoods('', 1, 200);

          if (!isActive) {
            return;
          }

          const transformedFoods = (response.results || []).map((food) => ({
            id: food.id,
            name: food.name,
            calories: safeParseFloat(food.calories, 0),
            protein: safeParseFloat(food.protein, 0),
            carbs: safeParseFloat(food.carbs, 0),
            fat: safeParseFloat(food.fat, 0),
            serving: food.serving_description || food.serving || "100g",
            category: food.category,
          }));

          if (isActive) {
            setSearchResults(transformedFoods);
          }
        } catch (err) {
          if (isActive && err.name !== 'AbortError') {
            // Silently handle reload errors
          }
        } finally {
          if (isActive) {
            setIsSearching(false);
          }
        }
      }, 300);

      return () => {
        isActive = false;
        abortController.abort();
        clearTimeout(timer);
      };
    }
  }, [searchQuery]); // Run when search query changes

  // COMPUTED: FILTER FOODS BY CATEGORY
  /**
   * Filter the search results based on the selected category
   * Also handles special "recents" category to show recently-logged foods
   */
  // Client-side category filtering (works during search and browsing)
  const filteredFoods = useMemo(() => {
    // If "recents" is selected, show recent foods (only when not actively searching)
    if (selectedCategory === "recents" && (!searchQuery || searchQuery.trim().length < 3)) {
      // Transform recent foods to match the food item structure
      return recentFoods.map(recent => ({
        id: recent.food.id,
        name: recent.food.name,
        calories: recent.food.calories,
        protein: recent.food.protein,
        carbs: recent.food.carbs,
        fat: recent.food.fat,
        serving: `${recent.last_serving.serving_size} ${recent.last_serving.serving_unit}`,
        category: recent.food.category || 'Recent',
        // Store recent-specific data for quick log
        isRecent: true,
        recentData: recent
      }));
    }

    let filtered = [...searchResults];

    // Apply category filter (now works during search too!)
    if (selectedCategory && selectedCategory !== "all" && selectedCategory !== "recents") {
      filtered = filtered.filter(
        (food) =>
          food.category &&
          food.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    return filtered;
  }, [searchResults, selectedCategory, searchQuery, recentFoods]);

  // EFFECT: UPDATE PAGE COUNT WHEN FILTERS CHANGE
  /**
   * Whenever the filtered foods change, recalculate how many pages we need
   */
  // Update total pages when filtered results change
  useEffect(() => {
    const newTotalPages = Math.ceil(filteredFoods.length / itemsPerPage) || 1;
    setTotalPages(newTotalPages);
  }, [filteredFoods.length, itemsPerPage]);

  // COMPUTED: PAGINATED FOODS FOR DISPLAY
  /**
   * Take the filtered foods and slice them based on current page
   * E.g., page 1 shows foods 0-19, page 2 shows foods 20-39, etc.
   */
  // Paginated foods for display
  const paginatedFoods = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredFoods.slice(startIndex, endIndex);
  }, [filteredFoods, currentPage, itemsPerPage]);

  // EFFECT: RESET TO PAGE 1 WHEN SEARCH/FILTER CHANGES
  /**
   * When user changes search or category, go back to page 1
   * (Otherwise they might be on page 5 of old results, which is confusing)
   */
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  // EFFECT: SCROLL TO TOP WHEN PAGE CHANGES
  /**
   * Smooth scroll to top of the page when user navigates pages
   * Improves UX since the new foods are now at the top
   */
  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // HANDLER: WHEN USER CLICKS ON A FOOD
  /**
   * When user clicks a food, open the "Add to Log" modal
   * Fetch detailed serving options in the background (e.g., "1 cup", "1 oz", etc.)
   * If detailed fetch fails, use default serving options
   */
  const handleFoodClick = async (food) => {
    const foodWithDefaults = {
      ...food,
      serving_options: [
        { unit: "serving", grams: 100, label: "1 serving (100g)", gram_weight: 100 },
        { unit: "gram", grams: 1, label: "per gram", gram_weight: 1 },
      ],
    };

    setSelectedFood(foodWithDefaults);
    setServings(1);
    setServingUnit(0);
    setShowAddModal(true);
    setLoadingServings(true);

    // Fetch detailed serving options in the background
    try {
      const detailedFood = await getFoodDetail(food.id, true);

      // Update with real serving options if available
      if (detailedFood.serving_options && detailedFood.serving_options.length > 0) {
        setSelectedFood(detailedFood);
      } else {
        // API succeeded but no serving options - keep defaults
        setSelectedFood({ ...detailedFood, serving_options: foodWithDefaults.serving_options });
      }
      // Always reset to index 0 after loading new food — prevents stale index
      // pointing out-of-bounds when the new food has fewer serving options.
      setServingUnit(0);
    } catch (error) {
      // Keep the default serving options already set; index 0 is safe since
      // foodWithDefaults always has at least 2 options.
    } finally {
      setLoadingServings(false);
    }
  };

  // EFFECT: KEYBOARD SHORTCUTS
  /**
   * Listen for keyboard events:
   * - Escape: Close any open modal
   * - Shift+Ctrl+R: Clear cache (developer shortcut)
   * - Enter: Submit form in modal
   */
  //  Keyboard shortcuts for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Developer shortcut: Shift+Ctrl+R to clear cache
      if (e.shiftKey && e.ctrlKey && e.key === 'R') {
        e.preventDefault();
        handleClearCache();
        return;
      }

      if (showAddModal) {
        if (e.key === "Escape") {
          setShowAddModal(false);
        } else if (e.key === "Enter" && !e.shiftKey && e.target.tagName !== "INPUT") {
          e.preventDefault();
          handleAddToLog();
        }
      }
      if (showCustomMealModal && e.key === "Escape") {
        setShowCustomMealModal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddModal, showCustomMealModal]);

  // HANDLER: QUICK ADD TO CURRENT MEAL TYPE
  /**
   * "Quick add" means:
   * 1. User clicks quick-add button on a food
   * 2. It adds that food with default 1 serving to the selected meal type (breakfast/lunch/etc)
   * 3. For recent foods, it uses the previously logged serving size
   * 4. No modal - just instant add
   */
  // Quick add function (add with default 1 serving to last meal type)
  const handleQuickAdd = async (food, e) => {
    e.stopPropagation();

    if (isSaving) return;
    setIsSaving(true);

    try {
      // Check if this is a recent food (use stored serving info)
      const isRecentFood = food.isRecent && food.recentData;

      const mealData = {
        meal_type: mealType,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
        foods: [
          {
            food_id: food.id,
            serving_size: isRecentFood ? food.recentData.last_serving.serving_size : 1,
            serving_unit: isRecentFood ? food.recentData.last_serving.serving_unit : "serving",
            serving_grams: isRecentFood ? food.recentData.last_serving.serving_grams : 100,
          },
        ],
      };

      await quickLogMeal(mealData);
      showToast(`${food.name} added to ${mealType}!`);

      // Refresh recent foods if we just logged from recents
      if (isRecentFood) {
        try {
          const response = await getRecentFoods(15);
          setRecentFoods(response.results || []);
        } catch (err) {
          // Ignore refresh errors
        }
      }
    } catch (error) {
      // Error handled by UI state
      showToast("Failed to add food. Please try again.", true);
    } finally {
      setIsSaving(false);
    }
  };

  // HELPER: GET CURRENT SERVING OPTION
  /**
   * The user can select different serving units (e.g., "1 cup", "100g", "1 oz")
   * This function returns the currently selected serving option
   * Falls back to 100g (safe default) if index is out of bounds
   */
  // Safely resolve the currently-selected serving option.
  // Falls back to a 100 g default if the index is out-of-bounds or the list is empty.
  const getActiveServingOption = () => {
    const options = selectedFood?.serving_options || [];
    const safeIndex = servingUnit >= 0 && servingUnit < options.length ? servingUnit : 0;
    return options[safeIndex] || { gram_weight: 100, label: "1 serving (100g)" };
  };

  // HELPER: CALCULATE NUTRITION FOR SELECTED AMOUNT
  /**
   * Take the base nutrition info (per 100g) and multiply by:
   * - Number of servings user selected
   * - Grams in the selected serving unit
   * Then return formatted nutrition totals for display
   */
  const calculateNutrition = () => {
    if (!selectedFood) return null;

    const servingOption = getActiveServingOption();

    const gramsPerUnit = servingOption.gram_weight || servingOption.grams || 100;
    // Always ensure servings is a valid number (default to 1 if empty or invalid)
    const numServings = safeParseFloat(servings, 1);
    const multiplier = (numServings * gramsPerUnit) / 100;

    return {
      calories: formatCalories(selectedFood.calories * multiplier),
      protein: formatMacros(selectedFood.protein * multiplier),
      carbs: formatMacros(selectedFood.carbs * multiplier),
      fat: formatMacros(selectedFood.fat * multiplier),
    };
  };

  // HANDLER: ADD FOOD TO DIARY
  /**
   * User filled in servings and clicked "Add to Diary"
   * Send the food + serving info to backend to log it
   * Then close modal and show success message
   */
  const handleAddToLog = async () => {
    if (!selectedFood || isSaving) return;

    setIsSaving(true);

    try {
      const servingOption = getActiveServingOption();

      // Ensure servings is a valid number
      const numServings = safeParseFloat(servings, 1);

      // Prepare meal data for backend
      const mealData = {
        meal_type: mealType,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
        foods: [
          {
            food_id: selectedFood.id,
            serving_size: numServings,
            serving_unit: servingUnit,
            serving_grams: servingOption.gram_weight || servingOption.grams || 100,
          },
        ],
      };

      // Log to backend
      await quickLogMeal(mealData);

      setShowAddModal(false);
      setSelectedFood(null);

      showToast("Food added to diary!");
    } catch (error) {
      // Error handled by UI state
      showToast("Failed to add food to diary. Please try again.", true);
    } finally {
      setIsSaving(false);
    }
  };

  // HANDLER: UPDATE CUSTOM MEAL FORM
  /**
   * User is typing in the "Create Custom Meal" form
   * Update the state as they type
   */
  const handleCustomMealChange = (e) => {
    setCustomMeal({ ...customMeal, [e.target.name]: e.target.value });
  };

  // HELPER: VALIDATE CUSTOM MEAL NUTRITION
  /**
   * Check if the nutrition values user entered make sense:
   * 1. No macro should exceed 100g per 100g (impossible)
   * 2. Calories should roughly match calculated calories from macros
   *    (Protein & Carbs = 4 cal/g, Fat = 9 cal/g)
   * 3. If validation fails, warn user but let them continue
   */
  const validateNutrition = (calories, protein, carbs, fat) => {
    const warnings = [];

    // Check for unreasonably high macro values (per 100g)
    if (protein > 100) warnings.push("Protein exceeds 100g per 100g");
    if (carbs > 100) warnings.push("Carbs exceed 100g per 100g");
    if (fat > 100) warnings.push("Fat exceeds 100g per 100g");

    // Calculate theoretical calories from macros
    const calculatedCalories = (protein * 4) + (carbs * 4) + (fat * 9);

    // Check if entered calories match calculated calories (within 30% margin)
    const difference = Math.abs(calories - calculatedCalories);
    const margin = calories * 0.3;

    if (difference > margin && calories > 0) {
      warnings.push(
        `Calories (${Math.round(calories)}) don't match macros (${Math.round(calculatedCalories)}). Expected ±30% match.`
      );
    }

    return warnings;
  };

  // HANDLER: CREATE & LOG CUSTOM MEAL
  /**
   * User created a custom food with manual nutrition values
   * 1. Validate the nutrition info (warn if doesn't make sense)
   * 2. Create a new food in the database
   * 3. Log it to the diary as a meal entry
   * 4. Close modal and show success message
   */
  const handleAddCustomMeal = async (e) => {
    e.preventDefault();

    if (isSaving) return;

    setIsSaving(true);

    try {
      const calories = safeParseFloat(customMeal.calories, 0);
      const protein = safeParseFloat(customMeal.protein, 0);
      const carbs = safeParseFloat(customMeal.carbs, 0);
      const fat = safeParseFloat(customMeal.fat, 0);
      const fiber = customMeal.fiber !== "" ? safeParseFloat(customMeal.fiber, null) : null;

      // Validate nutrition values
      const warnings = validateNutrition(calories, protein, carbs, fat);
      if (warnings.length > 0) {
        const proceed = window.confirm(
          `⚠️ Nutrition validation warnings:\n\n${warnings.join('\n')}\n\nDo you want to continue anyway?`
        );
        if (!proceed) {
          setIsSaving(false);
          return;
        }
      }

      // First, create the custom food in the backend
      const customFoodData = {
        name: customMeal.name,
        calories: calories,
        protein: protein,
        carbs: carbs,
        fat: fat,
        ...(fiber !== null && { fiber }),
        serving_description: "100g (custom)",
        category: "Custom",
      };

      const createdFood = await createCustomFood(customFoodData);

      // Then, log it as a meal
      const mealData = {
        meal_type: mealType,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
        foods: [
          {
            food_id: createdFood.id,
            serving_size: 1,
            serving_unit: "serving",
            serving_grams: 100,
          },
        ],
      };

      await quickLogMeal(mealData);

      setShowCustomMealModal(false);
      setCustomMeal({
        name: "",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
        fiber: "",
      });

      showToast("Custom meal added to diary!");
    } catch (error) {
      // Error handled by UI state
      showToast("Failed to create custom meal. Please try again.", true);
    } finally {
      setIsSaving(false);
    }
  };

  const nutrition = selectedFood ? calculateNutrition() : null;

  // MAIN RENDER
  /**
   * Layout:
   * 1. Navigation bar at top
   * 2. Page header with title and buttons (Create Custom, View Diary)
   * 3. Search box with optional category filters
   * 4. Food list with pagination
   * 5. Modals for adding food or creating custom meal
   */
  return (
    <div className="page-container">
      <Navbar
        currentPage="foods"
        onLogout={() => navigate("/")}
      />

      <div className="page-content">
        <div className="search-header">
          <div>
            <h1 className="page-title">Food Database</h1>
            <p className="page-subtitle">
              {searchResults.length > 0
                ? `Browse ${searchResults.length}+ foods`
                : 'Search food database'}
            </p>
          </div>
          <div className="search-header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowCustomMealModal(true)}
            >
              Create Custom
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/diary")}
            >
              View Diary
            </button>
          </div>
        </div>

        <div className="search-container">
          <div className="search-box">
            <svg
              className="search-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search foods (e.g., chicken, rice, apple)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {!searchQuery && (
            <div className="search-filters">
              {/* Show all button first */}
              <button
                className={`filter-btn filter-btn-all ${selectedCategory === null ? "active" : ""}`}
                onClick={() => setSelectedCategory(null)}
                title={`${searchResults.length} total foods`}
              >
                All
                {!loading && searchResults.length > 0 && <span className="filter-count">({searchResults.length})</span>}
              </button>
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;

                // Calculate category count - handle case-insensitive matching
                const categoryCount = searchResults.filter(f => {
                  if (!f.category) return false;
                  return f.category.toLowerCase() === cat.toLowerCase();
                }).length;

                return (
                  <button
                    key={cat}
                    className={`filter-btn ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                    title={`${categoryCount} ${cat} foods`}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    {!loading && searchResults.length > 0 && <span className="filter-count">({categoryCount})</span>}
                  </button>
                );
              })}
              {/* Recents filter button */}
              {recentFoods.length > 0 && (
                <button
                  className={`filter-btn ${selectedCategory === "recents" ? "active" : ""}`}
                  onClick={() => setSelectedCategory("recents")}
                  title={`${recentFoods.length} recently logged foods`}
                >
                  Recents
                  <span className="filter-count">({recentFoods.length})</span>
                </button>
              )}
            </div>
          )}

          {apiError && (
            <div role="alert" aria-live="polite" style={{ marginTop: "8px" }}>
              <p className="error-text">
                {apiError}
              </p>
              <button
                onClick={handleClearCache}
                className="btn btn-secondary"
                style={{ marginTop: "8px", fontSize: "14px" }}
              >
                Clear Cache & Reload
              </button>
            </div>
          )}

          {loading ? (
            <p className="search-hint">Loading foods...</p>
          ) : isSearching ? (
            <p className="search-hint">Searching...</p>
          ) : (
            <p className="search-hint">
              {searchQuery && searchQuery.trim().length >= 3 ? (
                <>
                  Found <strong>{filteredFoods.length}</strong> results for "{searchQuery}"
                </>
              ) : selectedCategory === "recents" ? (
                <>
                  Showing <strong>{filteredFoods.length}</strong> recently logged foods
                </>
              ) : selectedCategory !== null ? (
                <>
                  Showing <strong>{filteredFoods.length}</strong> {selectedCategory} foods
                </>
              ) : (
                <>
                  Showing all <strong>{searchResults.length}</strong> foods
                </>
              )}
            </p>
          )}
        </div>

        <div className="search-results">
          <div className="results-header">
            <h3>Results</h3>
          </div>

          <div className="foods-list">
            {loading || isSearching ? (
              // Skeleton loaders while searching
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="food-item-skeleton loading-skeleton"></div>
                ))}
              </>
            ) : (
              paginatedFoods.map((food, index) => (
                <div
                  key={food.id}
                  className="food-item"
                  style={{ '--item-index': index }}
                  onClick={() => handleFoodClick(food)}
                >
                  <div className="food-item-info">
                    <div className="food-item-header">
                      <div className="food-item-name">{food.name}</div>
                      <div className="food-item-category">
                        {food.category || "Food"}
                      </div>
                    </div>
                    <div className="food-item-serving">{food.serving}</div>
                    <div className="food-item-nutrition">
                      <div className="nutrition-badge">
                        <strong>{formatCalories(food.calories)}</strong> cal
                      </div>
                      <div className="nutrition-badge">
                        Protein: <strong>{formatMacros(food.protein)}g</strong>
                      </div>
                      <div className="nutrition-badge">
                        Carbs: <strong>{formatMacros(food.carbs)}g</strong>
                      </div>
                      <div className="nutrition-badge">
                        Fat: <strong>{formatMacros(food.fat)}g</strong>
                      </div>
                    </div>
                  </div>
                  <div className="food-item-actions">
                    <button
                      className="btn-quick-add"
                      onClick={(e) => handleQuickAdd(food, e)}
                      disabled={isSaving}
                      title="Quick add 1 serving"
                      aria-label={`Quick add ${food.food_name}, 1 serving`}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                    <div className="food-item-calories">{Math.round(food.calories)} cal</div>
                    <div className="food-item-arrow">›</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {!loading && !isSearching && filteredFoods.length === 0 && (
            <div className="empty-state">
              <h3>{searchResults.length === 0 ? 'No foods yet' : 'No foods found'}</h3>
              <p>
                {searchResults.length === 0
                  ? 'Start searching for foods. Try searching for "chicken", "rice", or "guava".'
                  : searchQuery
                    ? `No results found for "${searchQuery}". Try different keywords or create a custom meal.`
                    : 'Try different keywords or create a custom meal.'}
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setShowCustomMealModal(true)}
              >
                Create Custom Meal
              </button>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && !isSearching && filteredFoods.length > 0 && totalPages > 1 && (
            <div className="pagination-container">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                Previous
              </button>

              <div className="pagination-info">
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                <span className="pagination-count">
                  ({filteredFoods.length} total)
                </span>
              </div>

              <button
                className="pagination-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Food Modal */}
      {showAddModal && selectedFood && nutrition && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-content modal-compact"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close-btn"
              onClick={() => setShowAddModal(false)}
              aria-label="Close modal"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <h2>Add to Food Diary</h2>

            <div className="food-detail-card">
              <h3>{selectedFood.name}</h3>
              <p className="food-serving-detail">
                Nutrition based on selection
              </p>

              <div className="nutrition-grid">
                <div className="nutrition-item">
                  <span className="nutrition-label">Calories</span>
                  <span className="nutrition-value">{nutrition.calories}</span>
                </div>
                <div className="nutrition-item">
                  <span className="nutrition-label">Protein</span>
                  <span className="nutrition-value">
                    {nutrition.protein}g
                  </span>
                </div>
                <div className="nutrition-item">
                  <span className="nutrition-label">Carbs</span>
                  <span className="nutrition-value">{nutrition.carbs}g</span>
                </div>
                <div className="nutrition-item">
                  <span className="nutrition-label">Fat</span>
                  <span className="nutrition-value">{nutrition.fat}g</span>
                </div>
              </div>
            </div>

            <div className="modal-form">
              <div className="form-row" style={{ gridTemplateColumns: '3fr 2fr' }}>
                <div className="form-group">
                  <label>
                    Serving Size
                    {loadingServings && (
                      <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        (loading options...)
                      </span>
                    )}
                  </label>
                  <select
                    value={servingUnit}
                    onChange={(e) => setServingUnit(parseInt(e.target.value))}
                    className="meal-select"
                    disabled={loadingServings}
                  >
                    {(selectedFood.serving_options || []).map((opt, index) => (
                      <option key={index} value={index}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={servings}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty input for editing, otherwise parse the number
                      setServings(value === '' ? '' : parseFloat(value) || 0);
                    }}
                    onBlur={(e) => {
                      // When user leaves the field, ensure it has a valid value
                      if (servings === '' || servings <= 0) {
                        setServings(1);
                      }
                    }}
                    className="serving-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Add to Meal</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="meal-select"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <div className="modal-buttons">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddToLog}
                  disabled={isSaving}
                >
                  {isSaving ? "Adding..." : "Add to Diary"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Meal Modal */}
      {showCustomMealModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCustomMealModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close-btn"
              onClick={() => setShowCustomMealModal(false)}
              aria-label="Close modal"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <h2>Create Custom Meal</h2>
            <p className="modal-description">
              Enter nutrition information for a food not in the database
            </p>

            <form onSubmit={handleAddCustomMeal} className="modal-form">
              <div className="form-group">
                <label>Meal Name</label>
                <input
                  type="text"
                  name="name"
                  value={customMeal.name}
                  onChange={handleCustomMealChange}
                  placeholder="e.g., Homemade Protein Shake"
                  required
                  autoFocus
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Calories</label>
                  <input
                    type="number"
                    name="calories"
                    value={customMeal.calories}
                    onChange={handleCustomMealChange}
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Protein (g)</label>
                  <input
                    type="number"
                    name="protein"
                    value={customMeal.protein}
                    onChange={handleCustomMealChange}
                    placeholder="0"
                    min="0"
                    step="0.1"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Carbs (g)</label>
                  <input
                    type="number"
                    name="carbs"
                    value={customMeal.carbs}
                    onChange={handleCustomMealChange}
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
                    value={customMeal.fat}
                    onChange={handleCustomMealChange}
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
                    value={customMeal.fiber}
                    onChange={handleCustomMealChange}
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Add to Meal</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="meal-select"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCustomMealModal(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? "Creating..." : "Add Custom Meal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FoodSearchPage;
