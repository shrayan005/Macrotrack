/**
 * ProgressPage Component
 *
 * Comprehensive progress analytics dashboard showing:
 * - Weight trend chart (30-day line graph)
 * - Macro breakdown charts (protein, carbs, fat distribution)
 * - Calorie intake vs target (bar chart)
 * - Streak tracking (consecutive days)
 * - Goal progress visualization
 *
 * Features:
 * - Multiple time windows (7d, 30d, custom range)
 * - Interactive charts with tooltips
 * - Filters for meal types and nutrients
 * - Export data option
 *
 * Props:
 *   None — reads auth data from AuthContext
 *
 * Used in: App.js (protected route "/progress")
 */
import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../../shared/Navbar";
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
  Legend,
  ReferenceLine,
  Cell,
} from "recharts";
import { getUserProfile } from "../../api/profileService";
import { getProgressStats } from "../../api/reportsService";

function ProgressPage() {
  const [range, setRange] = useState("7"); // "7", "14", "30", "90"

  // Data state
  const [userData, setUserData] = useState(null);
  const [statsData, setStatsData] = useState(null);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProgressData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const n = parseInt(range, 10);

      // Fetch profile + pre-aggregated stats in parallel
      const [profileData, stats] = await Promise.all([
        getUserProfile(),
        getProgressStats(n),
      ]);

      setUserData(profileData);
      setStatsData(stats);

      setLoading(false);
    } catch (err) {
      setError("Failed to load progress data. Please try again.");
      setLoading(false);
    }
  }, [range]);

  // Fetch data on mount and when range changes
  useEffect(() => {
    fetchProgressData();
  }, [fetchProgressData]);

  // All aggregations come pre-computed from the backend — no client-side calculation.
  const dailyCalories = statsData?.daily_breakdown || [];
  const dailyWeight   = statsData?.daily_weight    || [];

  const calorieTarget    = statsData?.calories?.target      || userData?.calorie_target || 2000;
  const avgCalories      = statsData?.calories?.average     || 0;
  const calorieCompliance = statsData?.calories?.compliance_pct ?? 0;

  const weightChange = statsData?.weight?.change != null
    ? statsData.weight.change.toFixed(1)
    : null;

  const avgProtein = statsData?.macros?.protein_avg || 0;
  const avgCarbs   = statsData?.macros?.carbs_avg   || 0;
  const avgFat     = statsData?.macros?.fat_avg     || 0;

  const macroChartData = [
    { name: "Protein", grams: avgProtein, fill: "#ef4444" },
    { name: "Carbs",   grams: avgCarbs,   fill: "#3b82f6" },
    { name: "Fat",     grams: avgFat,     fill: "#f59e0b" },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="page-container">
        <Navbar currentPage="progress" />
        <div className="page-content">
          <div className="skeleton skeleton-title" style={{ width: '35%', marginBottom: '24px' }} />
          <div className="skeleton-row" style={{ marginBottom: '8px' }}>
            {['7 Days','14 Days','30 Days','90 Days'].map(l => (
              <div key={l} className="skeleton" style={{ width: '90px', height: '36px', borderRadius: '8px' }} />
            ))}
          </div>
          <div className="skeleton-row" style={{ marginTop: '24px' }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-stat" />)}
          </div>
          {[1,2].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton skeleton-text lg" style={{ width: '30%', marginBottom: '16px' }} />
              <div className="skeleton" style={{ height: '200px', borderRadius: '8px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="page-container">
        <Navbar currentPage="progress" />
        <div className="page-content">
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ fontSize: "18px", color: "var(--danger-color)", marginBottom: "20px" }}>
              {error}
            </p>
            <button className="btn btn-primary" onClick={fetchProgressData}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Navbar currentPage="progress" />

      <div className="page-content">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Progress</h1>
            <p className="page-subtitle">
              Visualize your calorie trends, weight changes, and macro balance
            </p>
          </div>
          <div className="header-actions">
            <label className="range-label">
              Range:
              <select
                className="select-input"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </label>
          </div>
        </div>

        {/* Summary cards */}
        <div className="progress-summary-grid">
          <div className="summary-card">
            <div className="summary-icon calories-icon"></div>
            <div className="summary-content">
              <div className="summary-label">Average Calories</div>
              <div className="summary-value">{avgCalories}</div>
              <div className="summary-target">Goal: {calorieTarget}</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon progress-icon"></div>
            <div className="summary-content">
              <div className="summary-label">Calorie Compliance</div>
              <div className="summary-value">{calorieCompliance}%</div>
              <div className="summary-target">
                Days near your target calories
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon weight-icon"></div>
            <div className="summary-content">
              <div className="summary-label">Weight Change</div>
              <div className="summary-value">
                {weightChange != null ? (
                  <>
                    {parseFloat(weightChange) > 0 ? "+" : ""}
                    {weightChange} kg
                  </>
                ) : (
                  "—"
                )}
              </div>
              <div className="summary-target">
                From first to latest in range
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon macro-icon"></div>
            <div className="summary-content">
              <div className="summary-label">Macro Focus</div>
              <div className="summary-value macro-value">
                P {avgProtein}g • C {avgCarbs}g • F {avgFat}g
              </div>
              <div className="summary-target">
                Average per day in selected range
              </div>
            </div>
          </div>
        </div>

        {/* Charts layout */}
        <div className="charts-grid">
          {/* Daily calories vs target */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Daily Calories vs Target</h3>
            </div>
            <div className="chart-wrapper">
              {dailyCalories.every((d) => d.calories === 0) ? (
                <div className="empty-state">
                  <p>No meals logged yet for this range.</p>
                  <p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginTop: "8px" }}>
                    Start logging meals to see your calorie trends.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dailyCalories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="label"
                      stroke="#999"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      stroke="#999"
                      style={{ fontSize: "12px" }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="calories"
                      name="Calories"
                      stroke="#000000"
                      strokeWidth={2}
                      dot={{ fill: "#000000", r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey={() => calorieTarget}
                      name="Target"
                      stroke="#94a3b8"
                      strokeDasharray="5 5"
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Weight trend */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Weight Trend</h3>
            </div>
            <div className="chart-wrapper">
              {dailyWeight.every((d) => d.weight == null) ? (
                <div className="empty-state">
                  <p>No weight entries yet in this range.</p>
                  <p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginTop: "8px" }}>
                    Log your weight regularly to track your progress.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dailyWeight}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="label"
                      stroke="#999"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      stroke="#999"
                      style={{ fontSize: "12px" }}
                      domain={['dataMin - 2', 'dataMax + 2']}
                      tickFormatter={(value) => Math.round(value)}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      name="Weight (kg)"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#22c55e" }}
                      connectNulls={true}
                    />
                    {userData?.goal_weight && (
                      <ReferenceLine
                        y={parseFloat(userData.goal_weight)}
                        stroke="#f59e0b"
                        strokeDasharray="6 3"
                        strokeWidth={2}
                        label={{ value: "Goal", position: "right", fill: "#f59e0b", fontSize: 12 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>


          {/* Daily Macro Split stacked bar */}
          <div className="chart-card full-width">
            <div className="chart-header">
              <h3>Daily Macro Split</h3>
            </div>
            <div className="chart-wrapper">
              {dailyCalories.every(d => d.protein === 0 && d.carbs === 0 && d.fat === 0) ? (
                <div className="empty-state">
                  <p>No macro data yet for this range.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dailyCalories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" stroke="#999" style={{ fontSize: "11px" }} />
                    <YAxis stroke="#999" style={{ fontSize: "12px" }} unit="g" />
                    <Tooltip formatter={(v, name) => [`${v}g`, name]} />
                    <Legend />
                    <Bar dataKey="protein" name="Protein" stackId="macros" fill="#3b82f6" />
                    <Bar dataKey="carbs"   name="Carbs"   stackId="macros" fill="#f97316" />
                    <Bar dataKey="fat"     name="Fat"     stackId="macros" fill="#eab308" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Macro distribution */}
          <div className="chart-card full-width">
            <div className="chart-header">
              <h3>Average Daily Macros</h3>
            </div>
            <div className="chart-wrapper">
              {avgProtein === 0 && avgCarbs === 0 && avgFat === 0 ? (
                <div className="empty-state">
                  <p>No macro data yet.</p>
                  <p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginTop: "8px" }}>
                    Start logging meals to see your macro breakdowns.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={macroChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      stroke="#999"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      stroke="#999"
                      style={{ fontSize: "12px" }}
                    />
                    <Tooltip formatter={(value, name, props) => [`${value}g`, props.payload.name]} />
                    <Bar dataKey="grams" radius={[6, 6, 0, 0]}>
                      {macroChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Summary insights */}
        <div className="dashboard-section">
          <h2 className="section-title">Summary Insights</h2>
          <div className="insights-grid">
            <div className="insight-card">
              <h3>Calorie Pattern</h3>
              {avgCalories > 0 ? (
                <p>
                  Your average intake over the last {range} days is{" "}
                  <strong>{avgCalories} kcal</strong> per day compared to a
                  target of <strong>{calorieTarget} kcal</strong>. Your
                  compliance rate is <strong>{calorieCompliance}%</strong>.
                  {avgCalories > calorieTarget * 1.1 && (
                    <span style={{ color: "var(--warning-color)", display: "block", marginTop: "8px" }}>
                      You're consistently above your target. Consider reducing portion sizes.
                    </span>
                  )}
                  {avgCalories < calorieTarget * 0.9 && (
                    <span style={{ color: "var(--info-color)", display: "block", marginTop: "8px" }}>
                      You're below your target. Make sure you're eating enough to fuel your activities.
                    </span>
                  )}
                </p>
              ) : (
                <p>
                  No meals logged in this range yet. Start tracking to see your
                  calorie patterns and compliance.
                </p>
              )}
            </div>

            <div className="insight-card">
              <h3>Weight Direction</h3>
              {weightChange != null ? (
                <p>
                  Your weight changed by{" "}
                  <strong>
                    {parseFloat(weightChange) > 0 ? "+" : ""}
                    {weightChange} kg
                  </strong>{" "}
                  over this period.{" "}
                  {parseFloat(weightChange) > 0
                    ? "If you're trying to lose weight, consider reviewing your calorie intake."
                    : parseFloat(weightChange) < 0
                    ? "Great progress! Keep tracking to maintain this trend."
                    : "Your weight has been stable."
                  }
                </p>
              ) : (
                <p>
                  Not enough weight entries in this range. Log your weight
                  regularly (at least weekly) to see meaningful trends.
                </p>
              )}
            </div>

            <div className="insight-card">
              <h3>Macro Balance</h3>
              {avgProtein > 0 || avgCarbs > 0 || avgFat > 0 ? (
                <p>
                  On average, you're consuming{" "}
                  <strong>{avgProtein}g protein</strong>,{" "}
                  <strong>{avgCarbs}g carbs</strong>, and{" "}
                  <strong>{avgFat}g fat</strong> each day.
                  {userData?.protein_target && avgProtein < userData.protein_target * 0.8 && (
                    <span style={{ color: "var(--warning-color)", display: "block", marginTop: "8px" }}>
                      Consider increasing protein intake to meet your target of {userData.protein_target}g.
                    </span>
                  )}
                </p>
              ) : (
                <p>
                  No macro data available yet. Log meals to track your protein,
                  carbs, and fat intake. Adjust these to fit your specific goals.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgressPage;
