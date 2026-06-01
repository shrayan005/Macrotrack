/**
 * GoalProjection Component
 *
 * Displays AI-calculated weight loss/gain projection based on current weight,
 * goal weight, and estimated weekly rate of change. Shows:
 * - Target weight and timeline
 * - Estimated weeks to reach goal
 * - Projected completion date
 * - Progress percentage toward goal
 *
 * Props:
 *   goalProjection (object) - Contains current_weight, goal_weight, start_weight,
 *                             weekly_rate, estimated_weeks, estimated_date, progress_percent
 *   goal (string)           - User's goal type (e.g., "lose", "gain", "maintain")
 *
 * Used in: CoachPage.js (displays inside AI coach analysis section)
 */
import React from "react";

function GoalProjection({ goalProjection, goal }) {
  if (!goalProjection) return null;

  const {
    current_weight,
    goal_weight,
    start_weight,
    weekly_rate,
    estimated_weeks,
    estimated_date,
    progress_percent,
  } = goalProjection;

  // Don't show for maintain goal or if no goal weight set
  if (goal === "maintain" || !goal_weight) {
    return null;
  }

  // Format the estimated date
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate if on track
  const isLosingGoal = goal === "lose" || goal === "lose_weight";
  const isOnTrack = isLosingGoal ? weekly_rate < 0 : weekly_rate > 0;

  // Generate progress message
  const getProgressMessage = () => {
    if (!weekly_rate || weekly_rate === 0) {
      return "Log more weight data to see your projected timeline.";
    }

    const absRate = Math.abs(weekly_rate).toFixed(2);
    const direction = weekly_rate < 0 ? "losing" : "gaining";

    if (estimated_weeks && estimated_date) {
      return `At your current rate of ${direction} ${absRate} kg/week, you'll reach your goal by ${formatDate(estimated_date)}.`;
    }

    return `You're currently ${direction} ${absRate} kg/week.`;
  };

  return (
    <div className="goal-projection-card">
      <h3>Goal Progress</h3>

      <div className="projection-content">
        {/* Progress Bar */}
        <div className="projection-progress">
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, progress_percent || 0))}%` }}
              />
              {/* Current position marker */}
              <div
                className="progress-marker"
                style={{ left: `${Math.min(100, Math.max(0, progress_percent || 0))}%` }}
              />
            </div>
          </div>
          <div className="progress-labels">
            <span className="start-label">
              {start_weight ? `${start_weight.toFixed(1)} kg` : "Start"}
            </span>
            <span className="current-label">
              {current_weight ? `${current_weight.toFixed(1)} kg` : "—"}
            </span>
            <span className="goal-label">
              {goal_weight ? `${goal_weight.toFixed(1)} kg` : "Goal"}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="projection-stats">
          <div className="stat">
            <span className="stat-value">
              {progress_percent != null ? `${progress_percent.toFixed(0)}%` : "—"}
            </span>
            <span className="stat-label">Complete</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {estimated_weeks != null ? estimated_weeks : "—"}
            </span>
            <span className="stat-label">Weeks Left</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {estimated_date
                ? new Date(estimated_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "—"}
            </span>
            <span className="stat-label">Est. Goal Date</span>
          </div>
        </div>

        {/* Progress Message */}
        <div className={`projection-message ${isOnTrack ? "on-track" : "off-track"}`}>
          {getProgressMessage()}
        </div>
      </div>
    </div>
  );
}

export default GoalProjection;
