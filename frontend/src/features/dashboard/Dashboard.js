/**
 * Dashboard
 *
 * Main landing page after login. Shows today's calorie balance, macros,
 * weight progress, water intake, meal breakdown, and a 30-day habit grid.
 * Kicks off the guided tour for first-time users.
 *
 * Props:
 *   None — all data is fetched from the backend on mount.
 *
 * Used in: App.js (protected route "/dashboard")
 *
 * DATA FLOW OVERVIEW:
 *   1. Component mounts → fetchDashboardData() runs
 *   2. Fetches: user profile, meals (30 days), weight logs (30 days),
 *               streak (from backend), today's exercise summary, today's water
 *   3. All data stored in React state (useState hooks)
 *   4. Numbers computed on the fly from state (calories, macros, streaks)
 *   5. JSX renders the computed values as cards, rings, charts
 */
// src/features/dashboard/Dashboard.js

import React, { useState, useEffect } from 'react';
import Navbar from '../../shared/Navbar';
import AddWeightModal from '../../shared/AddWeightModal';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, getDashboardSummary } from '../../api/profileService';
import { createWeightLog } from '../../api/weightService';
import { getExerciseSummary } from '../../api/exerciseService';
import { getWaterLogs, addWater } from '../../api/waterService';
import { showToast } from '../../utils/toast';

function Dashboard() {
  // useNavigate lets us programmatically change pages (e.g. navigate('/foods'))
  const navigate = useNavigate();

  // Each useState() creates a piece of state:
  //   [currentValue, setterFunction] = useState(initialValue)
  // React re-renders the component whenever a setter is called.

  // User profile data: name, calorie target, weight, goal weight, fiber target
  const [userData, setUserData] = useState(null);

  // Pre-computed dashboard data from backend (totals, streaks, habit grid, chart)
  const [dashboardSummary, setDashboardSummary] = useState(null);

  // Controls the loading skeleton shown while API calls are in progress
  const [loading, setLoading] = useState(true);

  // Holds an error message if any API call fails
  const [error, setError] = useState(null);

  // Controls whether the "Add Weight" modal is visible
  const [showWeightModal, setShowWeightModal] = useState(false);

  // Today's exercise summary — { total_calories_burned: number }
  const [exerciseSummary, setExerciseSummary] = useState({ total_calories_burned: 0 });

  // Today's water intake — { total_ml: number, entries: [] }
  const [waterData, setWaterData] = useState({ total_ml: 0, entries: [] });

  // Prevents double-clicking water buttons while the POST request is in flight
  const [addingWater, setAddingWater] = useState(false);

  // useEffect with [] runs once when the component mounts (like componentDidMount).
  // This triggers all the API calls that populate the dashboard.
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // This function calls multiple backend endpoints in parallel where possible.
  // Non-critical calls (exercise, water, streak) are wrapped in their own
  // try/catch so a failure in one doesn't break the entire dashboard.
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // STEP 1: Fetch profile + dashboard summary in parallel
      const [profile, summary] = await Promise.all([
        getUserProfile(),
        getDashboardSummary(),
      ]);

      setUserData({
        name: profile.display_name || profile.first_name || profile.username || "User",
        email: profile.email || "",
        weight: profile.weight,
        goalWeight: profile.goal_weight,
        calorieTarget: profile.calorie_target,
        fiberTarget: profile.fiber_target || 25,
        proteinTarget: profile.protein_target,
        carbsTarget: profile.carbs_target,
        fatTarget: profile.fat_target,
      });
      setDashboardSummary(summary);

      // STEP 2: Fetch today's exercise calories burned
      // GET /api/exercise-logs/summary/?date=YYYY-MM-DD
      // Non-critical: dashboard still works without it (just shows 0)
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const exSummary = await getExerciseSummary(todayStr);
        setExerciseSummary(exSummary || { total_calories_burned: 0 });
      } catch {
        // Non-critical — exercise section will show 0
      }

      // STEP 3: Fetch today's water intake
      // GET /api/water-logs/?date=YYYY-MM-DD → { total_ml: number, entries: [] }
      // Non-critical: water card shows 0 if this fails
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const water = await getWaterLogs(todayStr);
        setWaterData(water || { total_ml: 0, entries: [] });
      } catch {
        // Non-critical
      }

    } catch (err) {
      // If the critical calls (profile or meals) fail, show an error message
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      // Always turn off loading, whether we succeeded or failed
      setLoading(false);
    }
  };

  // Called when the user saves a weight entry in the AddWeightModal.
  // POST /api/weight-logs/ → then refreshes all dashboard data so charts update.
  const handleAddWeight = async (weight) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Create or update weight log via API
      await createWeightLog({
        weight: parseFloat(weight),
        date: today,
      });

      // Close modal first for better UX
      setShowWeightModal(false);

      // Refresh dashboard data to show new/updated weight
      await fetchDashboardData();

      // Show success message if weight was updated (not created)
      // Weight logged/updated successfully
    } catch (error) {
      // Show the actual error message from the API
      const errorMessage = error.message || 'Failed to add weight. Please try again.';
      showToast(errorMessage, true);
    }
  };

  // Called when the user clicks one of the +250ml / +500ml / +750ml buttons.
  // POST /api/water-logs/ → then re-fetches today's water total to update the bar.
  const handleAddWater = async (amount_ml) => {
    setAddingWater(true); // Disable buttons while request is in flight
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await addWater(amount_ml, todayStr);
      // Re-fetch to get the updated total (simpler than trying to add locally)
      const updated = await getWaterLogs(todayStr);
      setWaterData(updated || { total_ml: 0, entries: [] });
    } catch {
      showToast('Failed to log water', true);
    } finally {
      setAddingWater(false); // Re-enable buttons
    }
  };

  // Habit grid, streaks, and daily totals all come pre-computed from the backend.

  // While the API calls are running, show skeleton placeholders.
  // These are grey animated boxes that take the shape of the real content.
  if (loading) {
    return (
      <div className="page-container">
        <Navbar currentPage="dashboard" />
        <div className="page-content">
          <div className="skeleton skeleton-title" style={{ width: '40%', marginBottom: '24px' }} />
          <div className="skeleton-row">
            {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-stat" />)}
          </div>
          <div className="skeleton-row" style={{ gap: '24px', alignItems: 'flex-start' }}>
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="skeleton-card">
                <div className="skeleton skeleton-text lg" style={{ width: '30%' }} />
                <div className="skeleton-row" style={{ justifyContent: 'center', gap: '32px', marginTop: '16px' }}>
                  {[1,2,3].map(i => <div key={i} className="skeleton skeleton-circle" />)}
                </div>
              </div>
              <div className="skeleton-card">
                <div className="skeleton skeleton-text lg" style={{ width: '25%', marginBottom: '16px' }} />
                {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-text" />)}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="skeleton-card" style={{ height: '240px' }}>
                <div className="skeleton skeleton-text lg" style={{ width: '40%', marginBottom: '16px' }} />
                <div className="skeleton" style={{ height: '160px', borderRadius: '8px' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If a critical API call failed, show an error message and a retry button.
  if (error || !userData) {
    return (
      <div className="page-container">
        <Navbar currentPage="dashboard" />
        <div className="page-content" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: '18px', color: 'var(--danger-color)', marginBottom: '16px' }}>{error || 'Failed to load data'}</p>
          <button className="btn btn-primary" onClick={fetchDashboardData}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // All numbers come from the backend summary — no client-side calculation needed.
  const {
    daily_totals    = {},
    meal_breakdown  = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 },
    habit_grid      = [],
    calorie_chart   = [],
    meal_streak     = 0,
    weight_streak   = 0,
    recent_weight_change = 0,
    current_weight  = null,
    calorie_target: backendCalorieTarget = 2000,
  } = dashboardSummary || {};

  const totalCalories = daily_totals.calories ?? 0;
  const totalProtein  = daily_totals.protein  ?? 0;
  const totalCarbs    = daily_totals.carbs    ?? 0;
  const totalFat      = daily_totals.fat      ?? 0;
  const totalFiber    = daily_totals.fiber    ?? 0;

  // Macro goals: use the targets already stored on the profile (set during onboarding)
  const calorieTarget  = backendCalorieTarget || userData.calorieTarget || 2000;
  const proteinGoal    = Math.max(1, userData.proteinTarget || Math.round((calorieTarget * 0.30) / 4));
  const carbsGoal      = Math.max(1, userData.carbsTarget   || Math.round((calorieTarget * 0.40) / 4));
  const fatGoal        = Math.max(1, userData.fatTarget     || Math.round((calorieTarget * 0.30) / 9));
  const fiberGoal      = Math.max(1, userData.fiberTarget   || 25);

  // Net calories accounts for exercise calories burned
  const caloriesBurned    = parseFloat(exerciseSummary.total_calories_burned) || 0;
  const netCalories       = Math.max(0, totalCalories - caloriesBurned);
  const remainingCalories = Math.round(calorieTarget - netCalories);
  const percentComplete   = Math.min((netCalories / calorieTarget) * 100, 100);

  const mealStreak         = meal_streak;
  const weightStreak       = weight_streak;
  const recentWeightChange = recent_weight_change ?? 0;
  const currentWeight      = current_weight ?? userData.weight;
  const habitGrid          = habit_grid;
  const last7DaysCalories  = calorie_chart;
  const weightChart        = dashboardSummary?.weight_chart || [];
  const mealBreakdown      = meal_breakdown;
  // Count meal types that have calories logged today
  const mealCountToday = Object.values(mealBreakdown).filter(v => v > 0).length;

  // Picks a personalised motivational message based on the user's current state.
  // Priority order:
  //   1. Milestone streaks (7, 14, 30 days)
  //   2. Nothing logged yet today (time-aware prompt)
  //   3. Calorie target progress (50%, 85%, 100%)
  //   4. Weight trend vs goal direction
  //   5. Short streak encouragement (3+ days)
  //   6. Generic time-of-day fallback
  const getMotivation = () => {
    const firstName = (userData.name || 'there').split(' ')[0]; // Use first name only
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    // Infer goal direction (lose / gain / maintain) from weight vs goal weight
    const weightGoal =
      userData.goalWeight && userData.weight
        ? userData.goalWeight < userData.weight
          ? 'lose'
          : userData.goalWeight > userData.weight
          ? 'gain'
          : 'maintain'
        : null;

    // 1. Milestone streaks — highest priority
    if (mealStreak >= 30)
      return { title: '30-Day Streak!', message: `Incredible, ${firstName}! You have logged meals every day for a full month.` };
    if (mealStreak >= 14)
      return { title: '2-Week Streak!', message: `On fire, ${firstName}! 14 days of consistent tracking. Keep it going!` };
    if (mealStreak >= 7)
      return { title: 'One Week Strong!', message: `Great consistency, ${firstName}! You are on a 7-day logging streak.` };

    // 2. Nothing logged today — prompt based on time of day
    if (mealCountToday === 0) {
      if (timeOfDay === 'morning')
        return { title: `Good morning, ${firstName}!`, message: 'Start your day right — log your breakfast to stay on track.' };
      if (timeOfDay === 'afternoon')
        return { title: 'Log your lunch!', message: `Hey ${firstName}, you haven't logged anything yet today. Every meal counts.` };
      return { title: 'Don\'t forget to log!', message: `${firstName}, it's not too late to log your meals for today.` };
    }

    // 3. Calorie target progress
    if (percentComplete >= 100)
      return { title: 'Daily Target Hit!', message: `You reached your ${userData.calorieTarget} kcal goal today, ${firstName}. Excellent work!` };
    if (percentComplete >= 85)
      return { title: 'Almost There!', message: `Just ${remainingCalories} kcal remaining, ${firstName}. You are so close!` };
    if (percentComplete >= 50)
      return { title: 'Halfway Through!', message: `Good effort, ${firstName}. ${remainingCalories} kcal left to hit your daily target.` };

    // 4. Weight trend (only meaningful if we have at least 2 data points)
    if (weightChart.length >= 2) {
      const change = parseFloat(recentWeightChange);
      if (weightGoal === 'lose' && change < 0)
        return { title: 'Weight Trending Down!', message: `You are ${Math.abs(change)} kg lighter than last week, ${firstName}. Keep it up!` };
      if (weightGoal === 'gain' && change > 0)
        return { title: 'Gaining Steadily!', message: `Up ${change} kg this week, ${firstName}. Solid progress toward your goal!` };
      if (weightGoal === 'maintain' && Math.abs(change) <= 0.5)
        return { title: 'Weight Stable!', message: `Great control, ${firstName}. Your weight is right on target this week.` };
    }

    // 5. Short streak encouragement
    if (mealStreak >= 3)
      return { title: `${mealStreak}-Day Streak!`, message: `Nice consistency, ${firstName}! Every day logged brings you closer to your goal.` };

    // 6. Time-of-day fallback (when no other condition matched)
    const fallbacks = {
      morning: { title: `Good morning, ${firstName}!`, message: 'A great day starts with great nutrition. Make today count.' },
      afternoon: { title: 'Keep Going!', message: `You are making progress, ${firstName}. Consistency is the key to reaching your goals.` },
      evening: { title: `Nice effort today, ${firstName}!`, message: 'Every logged meal is a step closer to your goal. See you tomorrow!' },
    };
    return fallbacks[timeOfDay];
  };

  const motivation = getMotivation();

  // The JSX below is laid out as:
  //   Navbar              (top navigation bar)
  //   page-content
  //     Header            (greeting + Log Food / Weight / Exercise buttons)
  //     Stats Overview    (calorie balance bar, weight card, streak card, 7-day change)
  //     Water Card        (progress bar + quick-add buttons)
  //     Main Grid (2-col)
  //       Left:  Nutrition rings, Meals Today, Habit grid, Calorie bar chart
  //       Right: Weight line chart, Quick Actions, Streaks, Motivation card
  //   AddWeightModal      (shown only when showWeightModal === true)

  return (
    <div className="page-container">


      {/* Navbar now only needs currentPage */}
      <Navbar currentPage="dashboard" />

      <div className="page-content">
        {/* ── HEADER ── Greeting + quick-action buttons */}
        <div className="dashboard-header-section">
          <div className="dashboard-greeting">
            {/* userData.name is resolved as: display_name > first_name > username > "User" */}
            <h1 className="dashboard-title">Welcome back, {userData.name}</h1>
            <p className="dashboard-date">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          {/* Quick-action buttons at the top right */}
          <div className="dashboard-quick-actions">
            <button
              className="btn btn-primary"
              onClick={() => navigate('/foods')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px', flexShrink: 0 }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Log Food
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowWeightModal(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px', flexShrink: 0 }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Log Weight
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/exercises')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px', flexShrink: 0 }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Log Exercise
            </button>
          </div>
        </div>

        {/* ── STATS OVERVIEW ── 4 summary cards across the top */}
        <div className="stats-overview">

          {/* Card 1: Calorie balance equation — Goal − Food + Exercise = Remaining */}
          <div className="stat-overview-card primary calorie-balance-card">
            <div className="calorie-balance-grid">
              <div className="calorie-balance-cell">
                <span className="calorie-balance-label">Goal</span>
                <span className="calorie-balance-value">{Math.round(userData.calorieTarget)}</span>
              </div>
              <span className="calorie-balance-op">−</span>
              <div className="calorie-balance-cell">
                <span className="calorie-balance-label">Food</span>
                <span className="calorie-balance-value">{Math.round(totalCalories)}</span>
              </div>
              <span className="calorie-balance-op">+</span>
              <div className="calorie-balance-cell">
                <span className="calorie-balance-label">Exercise</span>
                <span className="calorie-balance-value exercise-burned">{Math.round(caloriesBurned)}</span>
              </div>
              <span className="calorie-balance-op">=</span>
              <div className="calorie-balance-cell">
                <span className="calorie-balance-label">Remaining</span>
                {/* "over-goal" class turns the number red when remaining goes negative */}
                <span className={`calorie-balance-value calorie-remaining${remainingCalories < 0 ? ' over-goal' : ''}`}>
                  {remainingCalories}
                </span>
              </div>
            </div>
            {/* Progress bar showing what % of the calorie target has been consumed */}
            <div className="stat-overview-bar" style={{ marginTop: '10px' }}>
              <div
                className="stat-overview-bar-fill"
                style={{ width: `${Math.min(percentComplete, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Card 2: Current weight vs goal weight */}
          <div className="stat-overview-card">
            <div className="stat-overview-icon weight-bg">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div className="stat-overview-content">
              <span className="stat-overview-label">Current Weight</span>
              <span className="stat-overview-value">{parseFloat(currentWeight).toFixed(1)} kg</span>
              <span className="stat-overview-sublabel">
                Goal: {parseFloat(userData.goalWeight).toFixed(1)} kg
              </span>
            </div>
          </div>

          {/* Card 3: Consecutive days of meal logging (streak) */}
          <div className="stat-overview-card">
            <div className="stat-overview-icon streak-bg">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="stat-overview-content">
              <span className="stat-overview-label">Logging Streak</span>
              <span className="stat-overview-value">{mealStreak} days</span>
              <span className="stat-overview-sublabel">Keep it going!</span>
            </div>
          </div>

          {/* Card 4: Weight change over the past 7 days */}
          <div className="stat-overview-card">
            <div className="stat-overview-icon change-bg">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </div>
            <div className="stat-overview-content">
              <span className="stat-overview-label">7-Day Change</span>
              <span className="stat-overview-value">
                {recentWeightChange > 0 ? '+' : ''}
                {recentWeightChange} kg
              </span>
              <span className="stat-overview-sublabel">Last week</span>
            </div>
          </div>
        </div>

        {/* ── WATER TRACKING CARD ── Shows daily water progress + quick-add buttons */}
        {(() => {
          const WATER_GOAL_ML = 2000; // Recommended daily water intake: 2 litres
          const waterPct = Math.min(100, Math.round((waterData.total_ml / WATER_GOAL_ML) * 100));
          const waterL = (waterData.total_ml / 1000).toFixed(1);
          const goalL = (WATER_GOAL_ML / 1000).toFixed(1);
          return (
            <div className="card water-card">
              <div className="water-card-header">
                <div className="water-card-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2C6 10 4 14 4 17a8 8 0 0 0 16 0c0-3-2-7-8-15z" />
                  </svg>
                  <span>Water</span>
                </div>
                {/* e.g. "1.2 / 2.0 L" */}
                <span className="water-card-amount">{waterL} / {goalL} L</span>
              </div>
              {/* Blue fill bar — width is the percentage of goal consumed */}
              <div className="water-progress-bar">
                <div className="water-progress-fill" style={{ width: `${waterPct}%` }} />
              </div>
              <div className="water-card-actions">
                {/* Each button calls handleAddWater(ml) which POSTs to the backend */}
                <button
                  className="btn-water"
                  onClick={() => handleAddWater(250)}
                  disabled={addingWater}
                >
                  +250 ml
                </button>
                <button
                  className="btn-water"
                  onClick={() => handleAddWater(500)}
                  disabled={addingWater}
                >
                  +500 ml
                </button>
                <button
                  className="btn-water"
                  onClick={() => handleAddWater(750)}
                  disabled={addingWater}
                >
                  +750 ml
                </button>
                <span className="water-pct-label">{waterPct}%</span>
              </div>
            </div>
          );
        })()}

        {/* ── MAIN GRID ── Two-column layout: left (wider) and right (narrower) */}
        <div className="dashboard-main-grid">
          {/* ── LEFT COLUMN ── */}
          <div className="dashboard-left">

            {/* NUTRITION RINGS — circular progress indicators for each macro */}
            {/* Each ring uses an SVG circle with strokeDasharray to draw the arc.
                The formula: (actual / goal) * 251.2 gives the filled arc length.
                251.2 = circumference of a circle with r=40 (2 * π * 40 ≈ 251.2) */}
            <div className="card nutrition-card">
              <div className="card-header-flex">
                <h3>Today's Nutrition</h3>
                <span className="card-badge">
                  {mealCountToday} meals logged
                </span>
              </div>

              <div className="nutrition-rings">
                {/* Protein ring */}
                <div className="nutrition-ring-item">
                  <svg className="nutrition-ring" viewBox="0 0 100 100">
                    <circle className="ring-bg" cx="50" cy="50" r="40" />
                    <circle
                      className="ring-progress protein-ring"
                      cx="50"
                      cy="50"
                      r="40"
                      style={{
                        strokeDasharray: `${Math.min(
                          (totalProtein / proteinGoal) * 251.2,
                          251.2
                        )} 251.2`,
                      }}
                    />
                    <text
                      x="50"
                      y="50"
                      className="ring-text"
                      textAnchor="middle"
                      dy="7"
                    >
                      {proteinGoal > 0
                        ? Math.min(
                            Math.round((totalProtein / proteinGoal) * 100),
                            100
                          )
                        : 0}
                      %
                    </text>
                  </svg>
                  <div className="ring-label">
                    <span className="ring-name">Protein</span>
                    <span className="ring-value">
                      {Math.round(totalProtein)}g / {proteinGoal}g
                    </span>
                  </div>
                </div>

                {/* Carbs ring */}
                <div className="nutrition-ring-item">
                  <svg className="nutrition-ring" viewBox="0 0 100 100">
                    <circle className="ring-bg" cx="50" cy="50" r="40" />
                    <circle
                      className="ring-progress carbs-ring"
                      cx="50"
                      cy="50"
                      r="40"
                      style={{
                        strokeDasharray: `${Math.min(
                          (totalCarbs / carbsGoal) * 251.2,
                          251.2
                        )} 251.2`,
                      }}
                    />
                    <text
                      x="50"
                      y="50"
                      className="ring-text"
                      textAnchor="middle"
                      dy="7"
                    >
                      {carbsGoal > 0
                        ? Math.min(
                            Math.round((totalCarbs / carbsGoal) * 100),
                            100
                          )
                        : 0}
                      %
                    </text>
                  </svg>
                  <div className="ring-label">
                    <span className="ring-name">Carbs</span>
                    <span className="ring-value">
                      {Math.round(totalCarbs)}g / {carbsGoal}g
                    </span>
                  </div>
                </div>

                {/* Fat ring */}
                <div className="nutrition-ring-item">
                  <svg className="nutrition-ring" viewBox="0 0 100 100">
                    <circle className="ring-bg" cx="50" cy="50" r="40" />
                    <circle
                      className="ring-progress fat-ring"
                      cx="50"
                      cy="50"
                      r="40"
                      style={{
                        strokeDasharray: `${Math.min(
                          (totalFat / fatGoal) * 251.2,
                          251.2
                        )} 251.2`,
                      }}
                    />
                    <text
                      x="50"
                      y="50"
                      className="ring-text"
                      textAnchor="middle"
                      dy="7"
                    >
                      {fatGoal > 0
                        ? Math.min(
                            Math.round((totalFat / fatGoal) * 100),
                            100
                          )
                        : 0}
                      %
                    </text>
                  </svg>
                  <div className="ring-label">
                    <span className="ring-name">Fat</span>
                    <span className="ring-value">
                      {Math.round(totalFat)}g / {fatGoal}g
                    </span>
                  </div>
                </div>

                {/* Fiber ring */}
                <div className="nutrition-ring-item">
                  <svg className="nutrition-ring" viewBox="0 0 100 100">
                    <circle className="ring-bg" cx="50" cy="50" r="40" />
                    <circle
                      className="ring-progress fiber-ring"
                      cx="50"
                      cy="50"
                      r="40"
                      style={{
                        strokeDasharray: `${Math.min(
                          (totalFiber / fiberGoal) * 251.2,
                          251.2
                        )} 251.2`,
                      }}
                    />
                    <text
                      x="50"
                      y="50"
                      className="ring-text"
                      textAnchor="middle"
                      dy="7"
                    >
                      {fiberGoal > 0
                        ? Math.min(
                            Math.round((totalFiber / fiberGoal) * 100),
                            100
                          )
                        : 0}
                      %
                    </text>
                  </svg>
                  <div className="ring-label">
                    <span className="ring-name">Fiber</span>
                    <span className="ring-value">
                      {Math.round(totalFiber)}g / {fiberGoal}g
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* MEALS TODAY — shows calories per meal type */}
            <div className="card meals-breakdown-card">
              <h3>Meals Today</h3>
              <div className="meals-breakdown-list">
                <div className="meal-breakdown-item">
                  <span className="meal-breakdown-name">Breakfast</span>
                  <span className="meal-breakdown-cals">
                    {Math.round(mealBreakdown.breakfast)} cal
                  </span>
                </div>
                <div className="meal-breakdown-item">
                  <span className="meal-breakdown-name">Lunch</span>
                  <span className="meal-breakdown-cals">
                    {Math.round(mealBreakdown.lunch)} cal
                  </span>
                </div>
                <div className="meal-breakdown-item">
                  <span className="meal-breakdown-name">Dinner</span>
                  <span className="meal-breakdown-cals">
                    {Math.round(mealBreakdown.dinner)} cal
                  </span>
                </div>
                <div className="meal-breakdown-item">
                  <span className="meal-breakdown-name">Snacks</span>
                  <span className="meal-breakdown-cals">
                    {Math.round(mealBreakdown.snack)} cal
                  </span>
                </div>
              </div>
              {/* Link to the full diary page where users can see/edit individual foods */}
              <button
                className="btn-link-full"
                onClick={() => navigate('/diary')}
              >
                View Full Diary
              </button>
            </div>

            {/* HABIT TRACKER — 30-day grid showing which days had logs */}
            {/* Each cell is coloured based on what was logged that day:
                Green = both meal + weight, Blue = meal only, Purple = weight only, Grey = nothing */}
            <div className="card habit-tracker-card">
              <div className="card-header-flex">
                <h3>Tracking Habits</h3>
                <div className="habit-legend-inline">
                  <span className="legend-item">
                    <span className="legend-dot meal-logged"></span> Meal
                  </span>
                  <span className="legend-item">
                    <span className="legend-dot weight-logged"></span> Weight
                  </span>
                  <span className="legend-item">
                    <span className="legend-dot both-logged"></span> Both
                  </span>
                </div>
              </div>

              <div className="habit-grid-container">
                <div
                  className="habit-grid-dashboard"
                  role="grid"
                  aria-label="30-day tracking habit grid"
                >
                  {/* habitGrid is built by useMemo() above — one entry per day */}
                  {habitGrid.map((day, idx) => {
                    // Apply CSS class based on what was logged that day
                    let cellClass = 'habit-cell-dashboard';
                    if (day.bothLogged) cellClass += ' both-logged';
                    else if (day.mealLogged) cellClass += ' meal-logged';
                    else if (day.weightLogged) cellClass += ' weight-logged';

                    const ariaLabel = `${day.date}: ${
                      day.bothLogged ? 'Meal and weight logged' :
                      day.mealLogged ? 'Meal logged' :
                      day.weightLogged ? 'Weight logged' :
                      'Nothing logged'
                    }`;

                    return (
                      <div
                        key={idx}
                        className={cellClass}
                        role="gridcell"
                        title={`${day.date}\n${day.mealLogged ? 'Meal logged' : 'No meal'}\n${day.weightLogged ? 'Weight logged' : 'No weight'}`}
                        aria-label={ariaLabel}
                      />
                    );
                  })}
                </div>
                <div className="habit-grid-labels">
                  <span>30 days ago</span>
                  <span>Today</span>
                </div>
              </div>

              {/* Summary counts below the grid */}
              <div className="habit-stats">
                <div className="habit-stat-item">
                  <span className="habit-stat-label">Meal Logging</span>
                  <span className="habit-stat-value">
                    {habitGrid.filter((d) => d.mealLogged).length}/30 days
                  </span>
                </div>
                <div className="habit-stat-item">
                  <span className="habit-stat-label">Weight Tracking</span>
                  <span className="habit-stat-value">
                    {habitGrid.filter((d) => d.weightLogged).length}/30 days
                  </span>
                </div>
                <div className="habit-stat-item">
                  <span className="habit-stat-label">Perfect Days</span>
                  <span className="habit-stat-value">
                    {habitGrid.filter((d) => d.bothLogged).length}/30 days
                  </span>
                </div>
              </div>
            </div>

            {/* CALORIE BAR CHART — last 7 days of intake vs target */}
            {/* Black bars = actual calories eaten; Grey bars = daily target for comparison */}
            <div className="card chart-card-dashboard">
              <h3>Calorie Intake (7 Days)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={last7DaysCalories}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) =>
                      new Date(date).toLocaleDateString('en-US', {
                        weekday: 'short', // e.g. "Mon", "Tue"
                      })
                    }
                    stroke="#999"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke="#999" style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Bar
                    dataKey="calories"  // Actual calories eaten
                    fill="#000000"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="target"    // Daily target (grey reference bar)
                    fill="#e0e0e0"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="dashboard-right">

            {/* WEIGHT PROGRESS CARD — line chart + current/goal/remaining stats */}
            <div className="card weight-progress-card">
              <h3>Weight Progress</h3>
              <div className="weight-progress-stats">
                <div className="weight-stat-item">
                  <span className="weight-stat-label">Current</span>
                  <span className="weight-stat-value">
                    {parseFloat(currentWeight).toFixed(1)} kg
                  </span>
                </div>
                <div className="weight-stat-divider"></div>
                <div className="weight-stat-item">
                  <span className="weight-stat-label">Goal</span>
                  <span className="weight-stat-value">
                    {parseFloat(userData.goalWeight).toFixed(1)} kg
                  </span>
                </div>
                <div className="weight-stat-divider"></div>
                <div className="weight-stat-item">
                  <span className="weight-stat-label">Remaining</span>
                  {/* Absolute difference between current and goal — always positive */}
                  <span className="weight-stat-value">
                    {Math.abs(
                      parseFloat(currentWeight) - parseFloat(userData.goalWeight)
                    ).toFixed(1)}{' '}
                    kg
                  </span>
                </div>
              </div>
              {/* Line chart — oldest weight logs on the left */}
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={weightChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).getDate()} // e.g. "28", "29"
                    stroke="#999"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    domain={['dataMin - 0.5', 'dataMax + 0.5']} // Small padding so the line isn't at the edge
                    stroke="#999"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#000000"
                    strokeWidth={3}
                    dot={{ fill: '#000000', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* QUICK ACTIONS — shortcut buttons to common pages */}
            <div className="card quick-links-card">
              <h3>Quick Actions</h3>
              <div className="quick-links-grid">
                <button
                  className="quick-link-btn"
                  onClick={() => navigate('/foods')}
                >
                  <span className="quick-link-text">Search Foods</span>
                </button>
                <button
                  className="quick-link-btn"
                  onClick={() => navigate('/diary')}
                >
                  <span className="quick-link-text">View Diary</span>
                </button>
                <button
                  className="quick-link-btn"
                  onClick={() => navigate('/progress')}
                >
                  <span className="quick-link-text">Progress</span>
                </button>
                <button
                  className="quick-link-btn"
                  onClick={() => navigate('/coach')}
                >
                  <span className="quick-link-text">Coach</span>
                </button>
              </div>
            </div>

            {/* STREAKS CARD — consecutive days logged for meals and weight */}
            <div className="card streaks-card-compact">
              <h3>Your Streaks</h3>
              <div className="streaks-compact-list">
                <div className="streak-compact-item">
                  <div className="streak-compact-icon meal-streak">M</div>
                  <div className="streak-compact-content">
                    <span className="streak-compact-label">Meal Logging</span>
                    <span className="streak-compact-value">
                      {mealStreak} days
                    </span>
                  </div>
                </div>
                <div className="streak-compact-item">
                  <div className="streak-compact-icon weight-streak">W</div>
                  <div className="streak-compact-content">
                    <span className="streak-compact-label">
                      Weight Tracking
                    </span>
                    <span className="streak-compact-value">
                      {weightStreak} days
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* MOTIVATION CARD — personalised message chosen by getMotivation() */}
            <div className="card motivation-card">
              <h4>{motivation.title}</h4>
              <p>{motivation.message}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ADD WEIGHT MODAL — only rendered when "Log Weight" button is clicked */}
      {showWeightModal && (
        <AddWeightModal
          onClose={() => setShowWeightModal(false)}
          onSave={handleAddWeight}        // handleAddWeight POSTs to backend then refreshes
          currentWeight={currentWeight}   // Pre-fills the input with the current weight
        />
      )}
    </div>
  );
}

export default Dashboard;
