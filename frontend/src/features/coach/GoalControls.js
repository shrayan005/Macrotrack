/**
 * GoalControls Component
 *
 * Allows users to adjust their weight loss/gain rate and calorie targets.
 * Provides sliders and input fields for:
 * - Weight loss/gain rate (per week)
 * - Goal weight selector
 * - Daily calorie target
 *
 * Props:
 *   currentGoal (string)    - The user's current goal type
 *   currentRate (number)    - Current weekly rate (e.g., 0.5 kg/week)
 *   calorieTarget (number)  - Current daily calorie target
 *   onGoalChange (function) - Callback when goal is changed
 *   onRateChange (function) - Callback when rate is adjusted
 *   onCalorieChange (function) - Callback when calorie target is changed
 *   loading (boolean)       - Disables controls during API requests
 *
 * Used in: CoachPage.js (displays controls for goal adjustment)
 */
import React, { useState } from "react";

function GoalControls({
  currentGoal,
  currentRate,
  calorieTarget,
  onGoalChange,
  onRateChange,
  onCalorieChange,
  loading = false,
}) {
  const [isEditingCalories, setIsEditingCalories] = useState(false);
  const [tempCalories, setTempCalories] = useState(calorieTarget);

  const goals = [
    { value: "lose", label: "Lose Weight", icon: "↓" },
    { value: "maintain", label: "Maintain", icon: "↔" },
    { value: "gain", label: "Gain Weight", icon: "↑" },
  ];

  const rates = [
    { value: "slow", label: "Slow", description: "0.25 kg/wk" },
    { value: "moderate", label: "Moderate", description: "0.5 kg/wk" },
    { value: "aggressive", label: "Aggressive", description: "0.75 kg/wk" },
  ];

  const handleGoalChange = async (newGoal) => {
    if (newGoal !== currentGoal && onGoalChange) {
      await onGoalChange(newGoal);
    }
  };

  const handleRateChange = async (newRate) => {
    if (newRate !== currentRate && onRateChange) {
      await onRateChange(newRate);
    }
  };

  const handleCalorieSubmit = async () => {
    const newTarget = parseInt(tempCalories, 10);
    if (!isNaN(newTarget) && newTarget !== calorieTarget && onCalorieChange) {
      await onCalorieChange(newTarget);
    }
    setIsEditingCalories(false);
  };

  const handleCalorieKeyDown = (e) => {
    if (e.key === "Enter") {
      handleCalorieSubmit();
    } else if (e.key === "Escape") {
      setTempCalories(calorieTarget);
      setIsEditingCalories(false);
    }
  };

  return (
    <div className={`goal-controls-card ${loading ? "loading" : ""}`}>
      <div className="goal-section">
        <label className="control-label">Your Goal</label>
        <div className="goal-options">
          {goals.map((g) => (
            <button
              key={g.value}
              className={`goal-option ${currentGoal === g.value ? "active" : ""}`}
              onClick={() => handleGoalChange(g.value)}
              disabled={loading}
            >
              <span className="goal-icon">{g.icon}</span>
              <span className="goal-label">{g.label}</span>
            </button>
          ))}
        </div>
      </div>

      {currentGoal !== "maintain" && (
        <div className="rate-section">
          <label className="control-label">Rate of Change</label>
          <div className="rate-options">
            {rates.map((r) => (
              <button
                key={r.value}
                className={`rate-option ${currentRate === r.value ? "active" : ""}`}
                onClick={() => handleRateChange(r.value)}
                disabled={loading}
              >
                <span className="rate-label">{r.label}</span>
                <span className="rate-desc">{r.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="calorie-target-section">
        <label className="control-label">Daily Calorie Target</label>
        <div className="calorie-display">
          {isEditingCalories ? (
            <input
              type="number"
              value={tempCalories}
              onChange={(e) => setTempCalories(e.target.value)}
              onKeyDown={handleCalorieKeyDown}
              onBlur={handleCalorieSubmit}
              className="calorie-input"
              autoFocus
              min="1000"
              max="10000"
              step="50"
            />
          ) : (
            <span className="calorie-value">
              {calorieTarget?.toLocaleString() || "—"}
            </span>
          )}
          <span className="calorie-unit">cal/day</span>
          <button
            className="btn-icon"
            onClick={() => {
              if (isEditingCalories) {
                handleCalorieSubmit();
              } else {
                setTempCalories(calorieTarget);
                setIsEditingCalories(true);
              }
            }}
            disabled={loading}
            title={isEditingCalories ? "Save" : "Edit"}
          >
            {isEditingCalories ? "✓" : "✎"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GoalControls;
