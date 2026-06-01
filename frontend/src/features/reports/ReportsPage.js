/**
 * ReportsPage Component
 *
 * Generate and export detailed nutrition/health reports for:
 * - Custom date ranges (7d, 30d, 90d, or custom start/end dates)
 * - PDF export: professional formatted reports with charts
 * - CSV export: raw data for external analysis
 * - Report types:
 *   - Nutrition report: calories, macros, micronutrients summary
 *   - Progress report: weight trend, goals achieved, streaks
 *   - Exercise report: workouts logged, calories burned
 *   - Summary report: overall health metrics
 *
 * Features:
 * - Date range selector with preset options
 * - Real-time report preview
 * - Download in multiple formats
 * - Customizable report sections
 *
 * Props:
 *   None — reads auth data from AuthContext
 *
 * Used in: App.js (protected route "/reports")
 */
import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../../shared/Navbar";
import { getReports } from "../../api/reportsService";

function ReportsPage() {
  const [period, setPeriod] = useState("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let periodParam = period;
      if (period === "custom" && customStart && customEnd) {
        periodParam = `custom:${customStart}:${customEnd}`;
      }

      const data = await getReports(periodParam);
      setReportData(data);
    } catch (err) {
      setError("Failed to load reports. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd]);

  useEffect(() => {
    if (period !== "custom" || (customStart && customEnd)) {
      fetchReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customStart, customEnd]); // Remove fetchReports to prevent double-fetch

  const handlePeriodChange = (newPeriod) => {
    if (newPeriod === "custom") {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      setPeriod(newPeriod);
    }
  };

  const applyCustomRange = () => {
    if (customStart && customEnd) {
      setPeriod("custom");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="page-container">
        <Navbar currentPage="reports" />
        <div className="page-content">
          <div className="loading-container">
            <p>Loading reports...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="page-container">
        <Navbar currentPage="reports" />
        <div className="page-content">
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button className="btn btn-primary" onClick={fetchReports}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Safely destructure with defaults to prevent null reference errors
  const {
    summary = null,
    top_foods = { most_frequent: [], highest_calories: [] },
    meal_distribution = {},
    patterns = {},
    nutrition_breakdown = {},
    notes_insights = null,
    exercise_summary = null,
  } = reportData || {};

  return (
    <div className="page-container">
      <Navbar currentPage="reports" />

      <div className="page-content">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Reports</h1>
            <p className="page-subtitle">
              Detailed analytics and insights about your nutrition
            </p>
          </div>
          <div className="header-actions">
            <div className="period-selector">
              <button
                className={`period-btn ${period === "7d" && !showCustom ? "active" : ""}`}
                onClick={() => handlePeriodChange("7d")}
              >
                Last 7 Days
              </button>
              <button
                className={`period-btn ${period === "30d" && !showCustom ? "active" : ""}`}
                onClick={() => handlePeriodChange("30d")}
              >
                Last 30 Days
              </button>
              <button
                className={`period-btn ${period === "this_month" && !showCustom ? "active" : ""}`}
                onClick={() => handlePeriodChange("this_month")}
              >
                This Month
              </button>
              <button
                className={`period-btn ${showCustom || period === "custom" ? "active" : ""}`}
                onClick={() => handlePeriodChange("custom")}
              >
                Custom
              </button>
            </div>
          </div>
        </div>

        {/* Custom Date Range */}
        {showCustom && (
          <div className="custom-range-card">
            <div className="custom-range-inputs">
              <div className="date-input-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="date-input"
                />
              </div>
              <div className="date-input-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="date-input"
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={applyCustomRange}
                disabled={!customStart || !customEnd}
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Period Label */}
        {reportData?.period && (
          <div className="period-label-card">
            <span className="period-label-text">{reportData.period.label}</span>
          </div>
        )}

        {/* Summary Card */}
        {summary && (
          <div className="report-card">
            <h3 className="report-card-title">Summary</h3>
            <div className="summary-stats-grid">
              <div className="stat-block">
                <div className="stat-number">{summary.total_calories.toLocaleString()}</div>
                <div className="stat-label">Total Calories</div>
              </div>
              <div className="stat-block">
                <div className="stat-number">{summary.avg_calories.toLocaleString()}</div>
                <div className="stat-label">Avg Calories/Day</div>
              </div>
              <div className="stat-block">
                <div className="stat-number">{summary.days_logged}/{summary.total_days}</div>
                <div className="stat-label">Days Logged</div>
              </div>
              <div className="stat-block">
                <div className="stat-number">{summary.tracking_rate}%</div>
                <div className="stat-label">Tracking Rate</div>
              </div>
            </div>

            <div className="summary-divider"></div>

            <div className="macro-summary-grid">
              <div className="macro-stat">
                <div className="macro-value">{summary.total_protein}g</div>
                <div className="macro-label">Total Protein</div>
                <div className="macro-avg">{summary.avg_protein}g/day avg</div>
              </div>
              <div className="macro-stat">
                <div className="macro-value">{summary.total_carbs}g</div>
                <div className="macro-label">Total Carbs</div>
                <div className="macro-avg">{summary.avg_carbs}g/day avg</div>
              </div>
              <div className="macro-stat">
                <div className="macro-value">{summary.total_fat}g</div>
                <div className="macro-label">Total Fat</div>
                <div className="macro-avg">{summary.avg_fat}g/day avg</div>
              </div>
            </div>

            {summary.daily_difference !== 0 && (
              <div className={`calorie-balance ${summary.is_surplus ? 'surplus' : 'deficit'}`}>
                <span className="balance-icon">{summary.is_surplus ? '+' : ''}</span>
                <span className="balance-value">{summary.daily_difference}</span>
                <span className="balance-label">cal/day {summary.is_surplus ? 'surplus' : 'deficit'}</span>
              </div>
            )}
          </div>
        )}

        {/* Two Column Layout */}
        <div className="reports-grid">
          {/* Top Foods Card */}
          {top_foods && (
            <div className="report-card">
              <h3 className="report-card-title">Top Foods</h3>

              <div className="top-foods-section">
                <h4 className="subsection-title">Most Frequently Eaten</h4>
                {top_foods.most_frequent.length > 0 ? (
                  <div className="food-list">
                    {top_foods.most_frequent.map((food, index) => (
                      <div key={food.food_id} className="food-list-item">
                        <div className="food-rank">{index + 1}</div>
                        <div className="food-info">
                          <div className="food-name">{food.name}</div>
                          <div className="food-meta">
                            {food.times_eaten}x eaten
                          </div>
                        </div>
                        <div className="food-calories">{food.total_calories} cal</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-text">No foods logged yet</p>
                )}
              </div>

              <div className="section-divider"></div>

              <div className="top-foods-section">
                <h4 className="subsection-title">Biggest Calorie Contributors</h4>
                {top_foods.highest_calories.length > 0 ? (
                  <div className="food-list">
                    {top_foods.highest_calories.slice(0, 5).map((food, index) => (
                      <div key={food.food_id} className="food-list-item">
                        <div className="food-rank">{index + 1}</div>
                        <div className="food-info">
                          <div className="food-name">{food.name}</div>
                          <div className="food-meta">
                            {food.times_eaten}x eaten
                          </div>
                        </div>
                        <div className="food-calories highlight">{food.total_calories} cal</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-text">No foods logged yet</p>
                )}
              </div>
            </div>
          )}

          {/* Meal Distribution Card */}
          {meal_distribution && (
            <div className="report-card">
              <h3 className="report-card-title">Meal Distribution</h3>

              <div className="meal-distribution-list">
                {['breakfast', 'lunch', 'dinner', 'snack'].map((mealType) => {
                  const meal = meal_distribution[mealType];
                  const mealLabels = {
                    breakfast: 'Breakfast',
                    lunch: 'Lunch',
                    dinner: 'Dinner',
                    snack: 'Snacks'
                  };

                  return (
                    <div key={mealType} className="meal-distribution-item">
                      <div className="meal-type-header">
                        <span className="meal-type-name">{mealLabels[mealType]}</span>
                        <span className="meal-percentage">{meal.percentage}%</span>
                      </div>
                      <div className="meal-progress-bar">
                        <div
                          className="meal-progress-fill"
                          style={{ width: `${meal.percentage}%` }}
                        ></div>
                      </div>
                      <div className="meal-stats">
                        <span>{meal.total_calories} cal total</span>
                        <span>{meal.meal_count} meals</span>
                        <span>{meal.avg_calories} cal avg</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Daily Patterns Card */}
        {patterns && (
          <div className="report-card full-width">
            <h3 className="report-card-title">Daily Patterns</h3>

            <div className="patterns-grid">
              <div className="pattern-block">
                <div className="pattern-comparison">
                  <div className="comparison-item">
                    <div className="comparison-label">Weekday Avg</div>
                    <div className="comparison-value">{patterns.weekday_avg} cal</div>
                  </div>
                  <div className="comparison-vs">vs</div>
                  <div className="comparison-item">
                    <div className="comparison-label">Weekend Avg</div>
                    <div className="comparison-value">{patterns.weekend_avg} cal</div>
                  </div>
                </div>
                {patterns.weekday_weekend_diff !== 0 && (
                  <div className={`difference-badge ${patterns.weekday_weekend_diff > 0 ? 'higher' : 'lower'}`}>
                    {patterns.weekday_weekend_diff > 0 ? '+' : ''}{patterns.weekday_weekend_diff} cal on weekends
                  </div>
                )}
              </div>

              <div className="pattern-block">
                <div className="pattern-stat">
                  <div className="pattern-stat-label">Highest Day</div>
                  {patterns.highest_day ? (
                    <div className="pattern-stat-value">
                      <span className="day-name">{patterns.highest_day.day_name}</span>
                      <span className="day-calories">{patterns.highest_day.calories} cal</span>
                    </div>
                  ) : (
                    <div className="pattern-stat-value empty">No data</div>
                  )}
                </div>
              </div>

              <div className="pattern-block">
                <div className="pattern-stat">
                  <div className="pattern-stat-label">Lowest Day</div>
                  {patterns.lowest_day ? (
                    <div className="pattern-stat-value">
                      <span className="day-name">{patterns.lowest_day.day_name}</span>
                      <span className="day-calories">{patterns.lowest_day.calories} cal</span>
                    </div>
                  ) : (
                    <div className="pattern-stat-value empty">No data</div>
                  )}
                </div>
              </div>

              <div className="pattern-block">
                <div className="pattern-stat">
                  <div className="pattern-stat-label">Most Consistent</div>
                  <div className="pattern-stat-value">
                    {patterns.most_consistent_day || 'Not enough data'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nutrition Breakdown Card */}
        {nutrition_breakdown && (
          <div className="report-card full-width">
            <h3 className="report-card-title">Nutrition Breakdown</h3>

            <div className="nutrition-breakdown-grid">
              <div className="macro-breakdown">
                <h4 className="subsection-title">Average Daily Macros</h4>
                <div className="macro-circles">
                  <div className="macro-circle protein">
                    <div className="circle-value">{nutrition_breakdown.protein_percentage}%</div>
                    <div className="circle-label">Protein</div>
                    <div className="circle-grams">{nutrition_breakdown.avg_protein}g</div>
                  </div>
                  <div className="macro-circle carbs">
                    <div className="circle-value">{nutrition_breakdown.carbs_percentage}%</div>
                    <div className="circle-label">Carbs</div>
                    <div className="circle-grams">{nutrition_breakdown.avg_carbs}g</div>
                  </div>
                  <div className="macro-circle fat">
                    <div className="circle-value">{nutrition_breakdown.fat_percentage}%</div>
                    <div className="circle-label">Fat</div>
                    <div className="circle-grams">{nutrition_breakdown.avg_fat}g</div>
                  </div>
                </div>
              </div>

              <div className="goal-tracking">
                <h4 className="subsection-title">Protein Goal Tracking</h4>
                <div className="goal-stats">
                  <div className="goal-stat">
                    <div className="goal-stat-value success">{nutrition_breakdown.protein_goal_days}</div>
                    <div className="goal-stat-label">Days hit goal ({nutrition_breakdown.protein_target}g+)</div>
                  </div>
                  <div className="goal-stat">
                    <div className={`goal-stat-value ${nutrition_breakdown.low_protein_days > 0 ? 'warning' : ''}`}>
                      {nutrition_breakdown.low_protein_days}
                    </div>
                    <div className="goal-stat-label">Low protein days (&lt;80% goal)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Exercise Summary Card */}
        {exercise_summary && (
          <div className="report-card full-width">
            <h3 className="report-card-title">Exercise</h3>

            {/* Top stats row */}
            <div className="exercise-stats-grid">
              <div className="stat-block">
                <div className="stat-number">{exercise_summary.total_workouts}</div>
                <div className="stat-label">Total Workouts</div>
              </div>
              <div className="stat-block">
                <div className="stat-number">{exercise_summary.active_days}</div>
                <div className="stat-label">Active Days</div>
              </div>
              <div className="stat-block">
                <div className="stat-number">{exercise_summary.total_minutes}</div>
                <div className="stat-label">Total Minutes</div>
              </div>
              <div className="stat-block">
                <div className="stat-number">{exercise_summary.total_calories_burned.toLocaleString()}</div>
                <div className="stat-label">Calories Burned</div>
              </div>
            </div>

            <div className="section-divider"></div>

            {/* Two-column breakdown */}
            <div className="exercise-breakdown-grid">
              <div className="exercise-breakdown-col">
                <h4 className="subsection-title">Most Frequent Exercises</h4>
                {exercise_summary.most_frequent.length > 0 ? (
                  <div className="food-list">
                    {exercise_summary.most_frequent.map((ex, index) => (
                      <div key={ex.name} className="food-list-item">
                        <div className="food-rank">{index + 1}</div>
                        <div className="food-info">
                          <div className="food-name">{ex.name}</div>
                          <div className="food-meta">{ex.times_done}x · {ex.total_minutes} min total</div>
                        </div>
                        <div className="exercise-cal-burned">{ex.total_calories_burned} cal</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-text">No exercises logged</p>
                )}
              </div>

              <div className="exercise-breakdown-col">
                <h4 className="subsection-title">Most Calories Burned</h4>
                {exercise_summary.most_calories.length > 0 ? (
                  <div className="food-list">
                    {exercise_summary.most_calories.map((ex, index) => (
                      <div key={ex.name} className="food-list-item">
                        <div className="food-rank">{index + 1}</div>
                        <div className="food-info">
                          <div className="food-name">{ex.name}</div>
                          <div className="food-meta">{ex.times_done}x · {ex.total_minutes} min total</div>
                        </div>
                        <div className="exercise-cal-burned highlight">{ex.total_calories_burned} cal</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-text">No exercises logged</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notes Insights Section */}
        {notes_insights && (
          <div className="report-card full-width">
            <h3 className="report-card-title">Notes Insights</h3>

            {/* Tag Frequency */}
            <div className="notes-insights-section">
              <h4 className="subsection-title">Tag Frequency</h4>
              {notes_insights.tag_frequency.length > 0 ? (
                <div className="tag-frequency-list">
                  {notes_insights.tag_frequency.map(item => (
                    <span key={item.tag} className="tag-frequency-item">
                      <span className="tag-name">{item.tag}</span>
                      <span className="tag-count">{item.count} days</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="empty-text" style={{ textAlign: 'left', padding: '0' }}>No tags used yet</p>
              )}
            </div>

            {/* Calories by Tag */}
            <div className="section-divider"></div>
            <div className="notes-insights-section">
              <h4 className="subsection-title">Calories by Tag</h4>
              {notes_insights.calorie_correlations.length > 0 ? (
                <div className="calorie-correlation-list">
                  {notes_insights.calorie_correlations.map(item => (
                    <div key={item.tag} className="correlation-item">
                      <span className="correlation-tag">{item.tag}</span>
                      <span className="correlation-value">
                        {item.avg_calories} cal avg
                      </span>
                      <span className={`correlation-diff ${item.difference > 0 ? 'higher' : 'lower'}`}>
                        {item.difference > 0 ? '+' : ''}{item.difference} vs regular
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-text" style={{ textAlign: 'left', padding: '0' }}>Not enough data for correlations</p>
              )}
            </div>

            {/* Activity Level Breakdown */}
            <div className="section-divider"></div>
            <div className="notes-insights-section">
              <h4 className="subsection-title">Calories by Activity Level</h4>
              <div className="activity-breakdown-grid">
                {notes_insights.activity_breakdown.map(item => (
                  <div key={item.level} className="activity-item">
                    <div className="activity-level">{item.label}</div>
                    <div className="activity-calories">{item.avg_calories} cal</div>
                    <div className="activity-days">{item.days_count} days</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Outlier Explanations */}
            <div className="section-divider"></div>
            <div className="notes-insights-section">
              <h4 className="subsection-title">Calorie Outliers</h4>
              <div className="outliers-grid">
                <div className="outliers-column">
                  <h5>Highest Days</h5>
                  {notes_insights.outlier_explanations.highest_days.length > 0 ? (
                    notes_insights.outlier_explanations.highest_days.map(day => (
                      <div key={day.date} className="outlier-card">
                        <div className="outlier-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span className="outlier-date">{new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          <span className="outlier-calories">{day.calories} cal</span>
                        </div>
                        {day.tags && day.tags.length > 0 && (
                          <div className="outlier-tags">
                            {day.tags.map(tag => (
                              <span key={tag} className="tag-chip-small">{tag}</span>
                            ))}
                          </div>
                        )}
                        {day.note_text && (
                          <div className="outlier-note">"{day.note_text}"</div>
                        )}
                        {day.activity_level && !day.note_text && !day.tags.length && (
                          <div className="outlier-note">{day.activity_level}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="empty-text">No data</p>
                  )}
                </div>
                <div className="outliers-column">
                  <h5>Lowest Days</h5>
                  {notes_insights.outlier_explanations.lowest_days.length > 0 ? (
                    notes_insights.outlier_explanations.lowest_days.map(day => (
                      <div key={day.date} className="outlier-card">
                        <div className="outlier-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span className="outlier-date">{new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          <span className="outlier-calories">{day.calories} cal</span>
                        </div>
                        {day.tags && day.tags.length > 0 && (
                          <div className="outlier-tags">
                            {day.tags.map(tag => (
                              <span key={tag} className="tag-chip-small">{tag}</span>
                            ))}
                          </div>
                        )}
                        {day.note_text && (
                          <div className="outlier-note">"{day.note_text}"</div>
                        )}
                        {day.activity_level && !day.note_text && !day.tags.length && (
                          <div className="outlier-note">{day.activity_level}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="empty-text">No data</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nutrition Breakdown Card */}

        {/* Empty State */}
        {(!summary || summary.days_logged === 0) && (
          <div className="empty-state-card">
            <h3>No Data Available</h3>
            <p>Start logging your meals to see detailed reports and analytics.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportsPage;
