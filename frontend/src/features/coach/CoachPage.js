// Coach page — shows the user's TDEE, calorie recommendation, and
// personalized insights based on their meal + weight history.
// Three tabs: Insights, Goals, Tips

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../../shared/Navbar";
import GoalControls from "./GoalControls";
import GoalProjection from "./GoalProjection";
import {
  getCoachAnalysis,
  updateCoachGoal,
  acceptCalorieAdjustment,
  submitCheckIn,
} from "../../api/coachService";

function CoachPage() {
  const [activeTab, setActiveTab] = useState("insights");

  // all data from GET /api/coach/analysis/
  const [coachData, setCoachData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // true while a goal/calorie save is in progress — disables buttons
  const [updating, setUpdating] = useState(false);

  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInData, setCheckInData] = useState({
    reflection: "okay",
    notes: "",
    accepted_adjustment: false,
    weight: "",
  });
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

  // useCallback so this function reference stays stable and the useEffect below fires only once
  const fetchCoachData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCoachAnalysis();
      setCoachData(data);
    } catch {
      setError("Failed to load coach data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoachData();
  }, [fetchCoachData]);

  // all three goal handlers do the same thing: save → re-fetch so the UI updates
  const handleGoalChange = async (newGoal) => {
    try { setUpdating(true); await updateCoachGoal({ goal: newGoal }); await fetchCoachData(); }
    catch { setError("Failed to update goal. Please try again."); } finally { setUpdating(false); }
  };

  const handleRateChange = async (newRate) => {
    try { setUpdating(true); await updateCoachGoal({ rate: newRate }); await fetchCoachData(); }
    catch { setError("Failed to update rate. Please try again."); } finally { setUpdating(false); }
  };

  const handleCalorieChange = async (newTarget) => {
    try { setUpdating(true); await updateCoachGoal({ calorie_target: newTarget }); await fetchCoachData(); }
    catch { setError("Failed to update calorie target. Please try again."); } finally { setUpdating(false); }
  };

  // saves the AI's recommended_target as the user's new calorie goal
  const handleAcceptAdjustment = async () => {
    if (!coachData?.calorie_adjustment?.recommended_target) return;
    try {
      setUpdating(true);
      await acceptCalorieAdjustment(coachData.calorie_adjustment.recommended_target);
      await fetchCoachData();
    } catch (err) { setError(err.error || "Failed to apply adjustment. Please try again."); } finally { setUpdating(false); }
  };

  const handleSubmitCheckIn = async () => {
    try {
      setSubmittingCheckIn(true);
      await submitCheckIn({
        ...checkInData,
        // fall back to the last known weight if user left the field blank
        current_weight: checkInData.weight || coachData?.goal_projection?.current_weight,
        weekly_rate: coachData?.key_metrics?.weekly_rate,
        adherence_percent: coachData?.key_metrics?.adherence,
        // only send the new target if the user ticked the checkbox
        new_calorie_target: checkInData.accepted_adjustment
          ? coachData?.calorie_adjustment?.recommended_target
          : null,
      });
      setShowCheckIn(false);
      setCheckInData({ reflection: "okay", notes: "", accepted_adjustment: false, weight: coachData?.goal_projection?.current_weight || "" });
      await fetchCoachData();
    } catch { setError("Failed to submit check-in. Please try again."); } finally { setSubmittingCheckIn(false); }
  };

  // Insights come fully formed from the backend — nothing to compute here.

  // skeleton placeholders while the API call is running
  if (loading) {
    return (
      <div className="page-container">
        <Navbar currentPage="coach" />
        <div className="page-content">
          <div className="skeleton skeleton-title" style={{ width: '30%', marginBottom: '8px' }} />
          <div className="skeleton skeleton-text sm" style={{ width: '50%', marginBottom: '32px' }} />
          <div className="skeleton-row" style={{ marginBottom: '24px' }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ width: '100px', height: '36px', borderRadius: '8px' }} />)}
          </div>
          <div className="skeleton-row" style={{ marginBottom: '24px' }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton skeleton-stat" />)}
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-card" style={{ marginBottom: '16px' }}>
              <div className="skeleton skeleton-text lg" style={{ width: '40%', marginBottom: '12px' }} />
              <div className="skeleton skeleton-text" style={{ marginBottom: '8px' }} />
              <div className="skeleton skeleton-text" style={{ width: '70%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !coachData) {
    return (
      <div className="page-container">
        <Navbar currentPage="coach" />
        <div className="page-content" style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ fontSize: "18px", color: "var(--danger-color)", marginBottom: "16px" }}>
            {error || "Failed to load coach data"}
          </p>
          <button className="btn btn-primary" onClick={fetchCoachData}>Try Again</button>
        </div>
      </div>
    );
  }

  // pull out the parts of the response we need in the JSX below
  // calorie_adjustment: { adjustment, recommended_target, current_target, reason }
  // tdee: { calculated, value, confidence, confidence_range }
  // key_metrics: { average_calories, adherence, streak, days_logged, weekly_rate }
  const { calorie_adjustment, tdee, key_metrics, goal_projection, recommendations, user_settings, last_checkin } = coachData;

  // Insights are now fully computed on the backend — just use them directly
  const insights = coachData.insights || [];

  // Flexible check-in window: available any time it's been 5+ days since the last
  // check-in (not locked to one specific day). This prevents users from missing a
  // week because they forgot to log on the exact configured day.
  const needsCheckIn = !last_checkin?.date || (last_checkin?.days_since != null && last_checkin.days_since >= 5);

  return (
    <div className="page-container">
      <Navbar currentPage="coach" />

      <div className="page-content">
        <div className="coach-header">
          <div>
            <h1 className="page-title">Coach</h1>
            <p className="page-subtitle">Personalized insights and recommendations</p>
          </div>
          {/* only show check-in button once they have 7 days of data to review */}
          {needsCheckIn && key_metrics?.days_logged >= 7 && (
            <button
              className="btn btn-primary"
              onClick={() => {
                // pre-fill weight so the user doesn't have to type it manually
                setCheckInData(prev => ({ ...prev, weight: goal_projection?.current_weight || "" }));
                setShowCheckIn(true);
              }}
            >
              Weekly Check-in
            </button>
          )}
        </div>

        {/* tab bar — clicking a tab just swaps which section renders below */}
        <div className="coach-tabs">
          {[
            { id: "insights", label: "Insights" },
            { id: "goals", label: "Goals" },
            { id: "recommendations", label: "Tips" },
          ].map(tab => (
            <button
              key={tab.id}
              className={`coach-tab${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* INSIGHTS TAB */}
        {activeTab === "insights" && (
          <div className="coach-content">

            {/* 4 summary stats at the top — data straight from key_metrics */}
            <div className="coach-metrics-row">
              <div className="coach-metric-card">
                <span className="coach-metric-label">Avg Daily Calories</span>
                <span className="coach-metric-value">
                  {key_metrics?.average_calories ? `${key_metrics.average_calories}` : "—"}
                </span>
                <span className="coach-metric-unit">kcal / day</span>
              </div>
              <div className="coach-metric-card">
                <span className="coach-metric-label">TDEE</span>
                <span className="coach-metric-value">
                  {tdee?.calculated ? `${tdee.value}` : "—"}
                </span>
                {/* tdee.calculated is false when there's not enough data for the formula */}
                <span className="coach-metric-unit">
                  {tdee?.calculated ? "kcal / day" : "need more data"}
                </span>
              </div>
              <div className="coach-metric-card">
                <span className="coach-metric-label">Adherence</span>
                <span className="coach-metric-value">
                  {key_metrics?.adherence != null ? `${key_metrics.adherence.toFixed(0)}` : "—"}
                </span>
                <span className="coach-metric-unit">
                  {key_metrics?.adherence != null ? "% on target" : "no data yet"}
                </span>
              </div>
              <div className="coach-metric-card">
                <span className="coach-metric-label">Logging Streak</span>
                <span className="coach-metric-value">
                  {key_metrics?.streak != null ? `${key_metrics.streak}` : "—"}
                </span>
                <span className="coach-metric-unit">days</span>
              </div>
            </div>

            {/* calorie recommendation card
                if the user has 14+ days logged: show the actual recommendation
                otherwise: show a progress bar toward the 28-day minimum */}
            {calorie_adjustment && key_metrics?.days_logged >= 14 ? (
              <div className={`coach-card calorie-rec-card${calorie_adjustment.adjustment === 0 ? " calorie-rec-ok" : ""}`}>
                <div className="coach-card-header">
                  <h3>Calorie Recommendation</h3>
                  {calorie_adjustment.adjustment === 0 && (
                    <span className="status-badge status-green">On Track</span>
                  )}
                </div>
                {/* backend writes this in plain English explaining why the change is suggested */}
                <p className="coach-card-desc">{calorie_adjustment.reason}</p>

                {/* current target → recommended target, side by side */}
                <div className="calorie-rec-row">
                  <div className="calorie-rec-cell">
                    <span className="calorie-rec-label">Current</span>
                    <span className="calorie-rec-value">{calorie_adjustment.current_target}</span>
                    <span className="calorie-rec-unit">cal/day</span>
                  </div>
                  <svg className="calorie-rec-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  <div className="calorie-rec-cell">
                    <span className="calorie-rec-label">Recommended</span>
                    <span className="calorie-rec-value calorie-rec-highlight">
                      {calorie_adjustment.recommended_target}
                      {/* show +100 / -50 delta next to the number */}
                      {calorie_adjustment.adjustment !== 0 && (
                        <span className={`calorie-delta${calorie_adjustment.adjustment > 0 ? " up" : " down"}`}>
                          {calorie_adjustment.adjustment > 0 ? "+" : ""}{calorie_adjustment.adjustment}
                        </span>
                      )}
                    </span>
                    <span className="calorie-rec-unit">cal/day</span>
                  </div>
                </div>

                {/* only show accept button when an actual change is being suggested */}
                {calorie_adjustment.adjustment !== 0 && (
                  <div className="coach-card-action" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <button 
                        className="btn btn-primary" 
                        onClick={handleAcceptAdjustment} 
                        disabled={updating || !needsCheckIn}
                      >
                        {updating ? "Updating..." : "Accept Recommendation"}
                      </button>
                      <span className="coach-card-meta">
                        Weight trend: {key_metrics.weekly_rate > 0 ? "+" : ""}{key_metrics.weekly_rate} kg/week
                      </span>
                    </div>
                    {!needsCheckIn && (
                      <span className="coach-card-meta" style={{ color: "var(--text-secondary)", fontStyle: "italic", marginTop: "-4px" }}>
                        Calorie adjustments are limited to once per 5 days for stable, sustainable progress.
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* not enough data yet — show how far along they are */
              <div className="coach-card">
                <div className="coach-card-header">
                  <h3>Calorie Recommendation</h3>
                  <span className="status-badge status-neutral">Needs Data</span>
                </div>
                <p className="coach-card-desc">
                  Log meals and weight for at least 14 days to get TDEE-based calorie recommendations.
                  This uses the energy balance equation from your actual data.
                </p>
                <div className="data-progress-row">
                  {/* bar fills to (days_logged / 28) × 100%, capped at 100% */}
                  <div className="data-progress-bar">
                    <div
                      className="data-progress-fill"
                      style={{ width: `${Math.min(((key_metrics?.days_logged || 0) / 28) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="data-progress-label">
                    {key_metrics?.days_logged || 0} / 28 days logged
                  </span>
                </div>
              </div>
            )}

            {/* TDEE breakdown card — only shows once the backend has enough data to calculate it */}
            {tdee?.calculated && (
              <div className="coach-card tdee-card">
                <div className="coach-card-header">
                  <h3>Total Daily Energy Expenditure</h3>
                  {/* confidence: 0.7+ = high (green), 0.5+ = medium (amber), below = low */}
                  <span className={`status-badge ${tdee.confidence >= 0.7 ? "status-green" : tdee.confidence >= 0.5 ? "status-amber" : "status-neutral"}`}>
                    {tdee.confidence >= 0.7 ? "High" : tdee.confidence >= 0.5 ? "Medium" : "Low"} Confidence
                  </span>
                </div>

                <div className="tdee-main-row">
                  <div className="tdee-big-value">
                    <span className="tdee-number">{tdee.value}</span>
                    <span className="tdee-unit">cal/day</span>
                  </div>
                  {tdee.confidence_range > 0 && (
                    <span className="tdee-range">± {tdee.confidence_range} cal</span>
                  )}
                </div>

                {/* visual bar showing how confident the estimate is */}
                <div className="confidence-bar-wrap">
                  <div className="confidence-bar-track">
                    <div
                      className="confidence-bar-fill"
                      style={{
                        width: `${tdee.confidence * 100}%`,
                        background: tdee.confidence >= 0.7 ? 'var(--success-color)' : tdee.confidence >= 0.5 ? '#f59e0b' : 'var(--danger-color)',
                      }}
                    />
                  </div>
                </div>

                <div className="tdee-breakdown-grid">
                  <div className="tdee-breakdown-item">
                    <span className="tdee-bd-label">Your Avg Intake</span>
                    <span className="tdee-bd-value">{Math.round(key_metrics.average_calories)} cal/day</span>
                  </div>
                  <div className="tdee-breakdown-item">
                    <span className="tdee-bd-label">Weight Trend</span>
                    <span className="tdee-bd-value">
                      {key_metrics.weekly_rate > 0 ? "+" : ""}{key_metrics.weekly_rate} kg/week
                    </span>
                  </div>
                  <div className="tdee-breakdown-item">
                    <span className="tdee-bd-label">Daily Deficit / Surplus</span>
                    {/* positive TDEE - intake means burning more than eating (deficit) */}
                    <span className="tdee-bd-value">
                      {tdee.value - Math.round(key_metrics.average_calories) > 0 ? "−" : "+"}
                      {Math.abs(tdee.value - Math.round(key_metrics.average_calories))} cal
                    </span>
                  </div>
                </div>

                <p className="tdee-note">
                  TDEE is calculated from your actual food intake and weight changes using the energy balance equation.
                </p>
              </div>
            )}

            <GoalProjection goalProjection={goal_projection} goal={user_settings?.goal} />

            {/* insight cards — green/orange/blue depending on insight.type */}
            {insights.length > 0 ? (
              <div className="insights-list">
                {insights.map((insight, index) => (
                  <div key={index} className={`insight-card insight-${insight.type}`}>
                    <div className="insight-stripe" />
                    <div className="insight-body">
                      <h4 className="insight-title">{insight.title}</h4>
                      <p className="insight-message">{insight.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* shown to new users who haven't started logging yet */
              <div className="coach-empty-state">
                <h3>Get Started with Your Coach</h3>
                <p>Start logging meals and weight to get personalized insights.</p>
                <div className="coach-empty-actions">
                  <a href="/diary" className="btn btn-primary" style={{ textDecoration: "none" }}>Log Meals</a>
                  <a href="/progress" className="btn btn-secondary" style={{ textDecoration: "none" }}>Track Weight</a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GOALS TAB */}
        {activeTab === "goals" && (
          <div className="coach-content">
            {/* GoalControls handles lose/gain/maintain picker + rate + manual calorie input */}
            <GoalControls
              currentGoal={user_settings?.goal || "maintain"}
              currentRate={user_settings?.rate || "moderate"}
              calorieTarget={user_settings?.calorie_target || 2000}
              onGoalChange={handleGoalChange}
              onRateChange={handleRateChange}
              onCalorieChange={handleCalorieChange}
              loading={updating}
            />

            <GoalProjection goalProjection={goal_projection} goal={user_settings?.goal} />

            <div className="coach-card">
              <div className="coach-card-header">
                <h3>Goal Summary</h3>
              </div>
              <div className="goal-summary-grid">
                <div className="goal-summary-item">
                  <span className="goal-summary-label">Current Weight</span>
                  <span className="goal-summary-value">
                    {goal_projection?.current_weight ? `${goal_projection.current_weight.toFixed(1)} kg` : "—"}
                  </span>
                </div>
                <div className="goal-summary-item">
                  <span className="goal-summary-label">Goal Weight</span>
                  <span className="goal-summary-value">
                    {goal_projection?.goal_weight ? `${goal_projection.goal_weight.toFixed(1)} kg` : "Not set"}
                  </span>
                </div>
                <div className="goal-summary-item">
                  <span className="goal-summary-label">Remaining</span>
                  <span className="goal-summary-value">
                    {goal_projection?.current_weight && goal_projection?.goal_weight
                      ? `${Math.abs(goal_projection.current_weight - goal_projection.goal_weight).toFixed(1)} kg`
                      : "—"}
                  </span>
                </div>
                <div className="goal-summary-item">
                  <span className="goal-summary-label">Target Rate</span>
                  {/* map the rate key to the actual kg/week number */}
                  <span className="goal-summary-value">
                    {{ slow: "0.25 kg/wk", moderate: "0.5 kg/wk", aggressive: "0.75 kg/wk" }[user_settings?.rate] || "0.5 kg/wk"}
                  </span>
                </div>
              </div>
              {/* goal weight lives in Profile, not here */}
              <p className="coach-card-meta" style={{ marginTop: '16px' }}>
                To update your goal weight, visit your{" "}
                <a href="/profile" style={{ color: "var(--primary-color)", fontWeight: "600" }}>
                  Profile Settings
                </a>.
              </p>
            </div>
          </div>
        )}

        {/* TIPS TAB */}
        {activeTab === "recommendations" && (
          <div className="coach-content">
            <div className="recommendations-grid">
              {/* use backend recommendations when available, fall back to hardcoded defaults */}
              {(recommendations?.length > 0 ? recommendations : defaultRecommendations).map((rec, index) => (
                <div key={index} className="rec-card">
                  <div className="rec-card-header">
                    <h4 className="rec-card-title">{rec.title}</h4>
                    {(rec.priority || rec.difficulty) && (
                      <span className={`status-badge status-${getPriorityClass(rec.priority || rec.difficulty)}`}>
                        {rec.priority || rec.difficulty}
                      </span>
                    )}
                  </div>
                  <p className="rec-card-desc">{rec.description}</p>
                  {rec.action && (
                    <p className="rec-card-action">{rec.action}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* check-in modal — clicking the dark overlay closes it */}
      {showCheckIn && (
        <div className="modal-overlay" onClick={() => setShowCheckIn(false)}>
          {/* stopPropagation so clicking inside doesn't bubble up and close the modal */}
          <div className="modal-content checkin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Weekly Check-in</h2>
              <button className="modal-close" onClick={() => setShowCheckIn(false)} aria-label="Close">×</button>
            </div>
            <div className="modal-body">

              {/* how did the week feel — 3 mutually exclusive options */}
              <div className="checkin-section">
                <label className="checkin-label">How was your week?</label>
                <div className="reflection-options">
                  {[
                    { key: "great", label: "Great" },
                    { key: "okay", label: "Okay" },
                    { key: "struggled", label: "Struggled" },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      className={`reflection-option${checkInData.reflection === opt.key ? " active" : ""}`}
                      onClick={() => setCheckInData({ ...checkInData, reflection: opt.key })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="checkin-section">
                <label className="checkin-label">Notes <span style={{ fontWeight: 'normal', color: 'var(--text-secondary)' }}>optional</span></label>
                <textarea
                  className="checkin-notes"
                  placeholder="Any challenges or wins this week?"
                  value={checkInData.notes}
                  onChange={(e) => setCheckInData({ ...checkInData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              {/* only show this checkbox when there's actually an adjustment to accept */}
              {calorie_adjustment?.adjustment !== 0 && (
                <div className="checkin-section">
                  <label className="checkin-toggle">
                    <input
                      type="checkbox"
                      checked={checkInData.accepted_adjustment}
                      onChange={(e) => setCheckInData({ ...checkInData, accepted_adjustment: e.target.checked })}
                    />
                    <span>
                      Accept calorie adjustment ({calorie_adjustment.adjustment > 0 ? "+" : ""}{calorie_adjustment.adjustment} cal/day)
                    </span>
                  </label>
                </div>
              )}

              <div className="checkin-summary">
                <div className="summary-row">
                  <span>Current Weight</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="number"
                      value={checkInData.weight}
                      onChange={(e) => setCheckInData({ ...checkInData, weight: e.target.value })}
                      placeholder={goal_projection?.current_weight}
                      className="checkin-notes"
                      style={{ width: "100px", padding: "4px 8px", textAlign: "right" }}
                    />
                    <span>kg</span>
                  </div>
                </div>
                <div className="summary-row">
                  <span>Weekly Change</span>
                  <strong>{key_metrics?.weekly_rate != null ? `${key_metrics.weekly_rate > 0 ? "+" : ""}${key_metrics.weekly_rate} kg` : "—"}</strong>
                </div>
                <div className="summary-row">
                  <span>Adherence</span>
                  <strong>{key_metrics?.adherence != null ? `${key_metrics.adherence.toFixed(0)}%` : "—"}</strong>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCheckIn(false)} disabled={submittingCheckIn}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmitCheckIn} disabled={submittingCheckIn}>
                {submittingCheckIn ? "Submitting..." : "Submit Check-in"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// maps priority string → CSS class for the badge colour
// "high"/"easy" = green, "medium" = amber, everything else = grey
function getPriorityClass(priority) {
  if (!priority) return "neutral";
  const p = priority.toLowerCase();
  if (p === "high" || p === "easy") return "green";
  if (p === "medium") return "amber";
  return "neutral";
}

// shown in Tips tab when the backend hasn't returned personalised recommendations yet
const defaultRecommendations = [
  { title: "Meal Prep Sunday", description: "Prepare 3–4 meals in advance to stay on track during busy weekdays.", difficulty: "Medium" },
  { title: "Protein with Every Meal", description: "Include a palm-sized portion of protein in each meal to support muscle and satiety.", difficulty: "Easy" },
  { title: "Track Before You Eat", description: "Log your meals before eating to make more mindful choices.", difficulty: "Easy" },
  { title: "Weekly Weigh-Ins", description: "Weigh yourself once per week at the same time to track trends without daily stress.", difficulty: "Easy" },
  { title: "Hydration First", description: "Drink a glass of water before each meal to support digestion and reduce overeating.", difficulty: "Easy" },
];

export default CoachPage;
