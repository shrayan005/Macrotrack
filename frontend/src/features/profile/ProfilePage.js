/**
 * ProfilePage Component
 *
 * User profile management and account settings page with:
 * - Profile information: name, email, avatar picture
 * - Physical stats: age, gender, height, weight
 * - Nutrition preferences:
 *   - Calorie target (daily goal)
 *   - Macro ratio presets (balanced, high-protein, low-carb, custom)
 *   - Activity level (sedentary, lightly active, moderately active, very active)
 * - Account actions: password change, delete account
 * - Account stats: total logs, streaks, goal progress, joined date
 *
 * Features:
 * - Edit individual profile fields with validation
 * - Upload profile picture with preview
 * - Calculate BMI from height/weight
 * - AI-suggested calorie targets based on goals
 * - Visual account statistics
 *
 * Props:
 *   None — reads auth data from AuthContext
 *
 * Used in: App.js (protected route "/profile")
 */
import React, { useState, useEffect } from 'react';
import Navbar from '../../shared/Navbar';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../context/AuthContext';
import {
  getUserProfile,
  updateUserProfile,
  getAccountStats,
  deleteAccount,
} from '../../api/profileService';
import { uploadProfilePicture } from '../../api/userService';
import { showToast } from '../../utils/toast';

// Macro ratio presets
const MACRO_PRESETS = {
  balanced: { name: 'Balanced', protein: 30, carbs: 40, fat: 30 },
  high_protein: { name: 'High Protein', protein: 40, carbs: 30, fat: 30 },
  low_carb: { name: 'Low Carb', protein: 35, carbs: 20, fat: 45 },
  keto: { name: 'Keto', protein: 25, carbs: 5, fat: 70 },
};

function ProfilePage() {
  const navigate = useNavigate();
  const { logout, setUser } = useAuth();

  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    display_name: '',
    bio: '',
    age: '',
    gender: 'male',
    height: '',
    weight: '',
    goal_weight: '',
    activity_level: 'sedentary',
    goal: 'maintain',
    rate: 'moderate',
    calorie_target: 2000,
    protein_target: '',
    carbs_target: '',
    fat_target: '',
    fiber_target: '',
    macro_preset: 'balanced',
    checkin_day: 'Sunday',
    date_joined: '',
  });

  const [accountStats, setAccountStats] = useState({
    total_meals_logged: 0,
    streak_days: 0,
    member_since: '',
  });

  const [profilePicture, setProfilePicture] = useState(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  const [originalData, setOriginalData] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Load user profile and stats on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError('');

        const [profile, stats] = await Promise.all([
          getUserProfile(),
          getAccountStats().catch(() => ({ total_meals_logged: 0, streak_days: 0, member_since: '' }))
        ]);

        const mappedProfile = {
          username: profile.username || '',
          email: profile.email || '',
          display_name: profile.display_name || '',
          bio: profile.bio || '',
          age: profile.age || '',
          gender: profile.gender || 'male',
          height: profile.height || '',
          weight: profile.weight || '',
          goal_weight: profile.goal_weight || '',
          activity_level: profile.activity_level || 'sedentary',
          goal: profile.goal || 'maintain',
          rate: profile.rate || 'moderate',
          calorie_target: profile.calorie_target || 2000,
          protein_target: profile.protein_target || '',
          carbs_target: profile.carbs_target || '',
          fat_target: profile.fat_target || '',
          fiber_target: profile.fiber_target || '',
          macro_preset: profile.macro_preset || 'balanced',
          checkin_day: profile.checkin_day || 'Sunday',
          date_joined: profile.date_joined || '',
        };

        setFormData(mappedProfile);
        setOriginalData(mappedProfile);
        setAccountStats(stats);
        if (profile.profile_picture) setProfilePicture(profile.profile_picture);
      } catch (err) {
        setError('Failed to load profile data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setUnsavedChanges(true);

    // Auto-calculate macro targets when preset changes
    if (name === 'macro_preset' && value !== 'custom') {
      const calories = formData.calorie_target || calculateCalories();
      const preset = MACRO_PRESETS[value];
      if (preset) {
        const proteinCals = calories * (preset.protein / 100);
        const carbsCals = calories * (preset.carbs / 100);
        const fatCals = calories * (preset.fat / 100);

        setFormData(prev => ({
          ...prev,
          macro_preset: value,
          protein_target: Math.round(proteinCals / 4),
          carbs_target: Math.round(carbsCals / 4),
          fat_target: Math.round(fatCals / 9),
        }));
      }
    }
  };

  const calculateCalories = () => {
    const { weight, height, age, gender, activity_level, goal, rate } = formData;

    if (!weight || !height || !age) {
      return formData.calorie_target || 2000;
    }

    let bmr;
    if (gender === 'male') {
      bmr = (10 * parseFloat(weight)) + (6.25 * parseFloat(height)) - (5 * parseFloat(age)) + 5;
    } else {
      bmr = (10 * parseFloat(weight)) + (6.25 * parseFloat(height)) - (5 * parseFloat(age)) - 161;
    }

    const activityMultipliers = {
      sedentary: 1.2,
      lightly: 1.375,
      moderately: 1.55,
      very: 1.725
    };

    let tdee = bmr * activityMultipliers[activity_level];

    if (goal === 'lose') {
      const deficits = { slow: 250, moderate: 500, aggressive: 750 };
      tdee -= deficits[rate] || 0;
    } else if (goal === 'gain') {
      const surpluses = { slow: 250, moderate: 500, aggressive: 750 };
      tdee += surpluses[rate] || 0;
    }

    return Math.round(tdee);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (saving) return;

    try {
      setSaving(true);
      setError('');

      const newCalorieTarget = calculateCalories();

      // Prepare update data with correct field names
      const updateData = {
        username: formData.username,
        email: formData.email,
        display_name: formData.display_name,
        bio: formData.bio,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        goal_weight: formData.goal_weight ? parseFloat(formData.goal_weight) : null,
        activity_level: formData.activity_level,
        goal: formData.goal,
        rate: formData.rate,
        calorie_target: newCalorieTarget,
        protein_target: formData.protein_target ? parseInt(formData.protein_target) : null,
        carbs_target: formData.carbs_target ? parseInt(formData.carbs_target) : null,
        fat_target: formData.fat_target ? parseInt(formData.fat_target) : null,
        fiber_target: formData.fiber_target ? parseInt(formData.fiber_target) : null,
        macro_preset: formData.macro_preset,
        checkin_day: formData.checkin_day,
      };

      const updatedProfile = await updateUserProfile(updateData);

      // Update form with response data
      const mappedProfile = {
        ...formData,
        ...updatedProfile,
        calorie_target: updatedProfile.calorie_target || newCalorieTarget,
      };

      setFormData(mappedProfile);
      setOriginalData(mappedProfile);
      setUnsavedChanges(false);

      showToast('✓ Settings saved successfully!');
    } catch (err) {
      // Show specific error messages if available
      let errorMessage = 'Failed to save settings. Please try again.';
      if (err && typeof err === 'object') {
        // If there are field-specific errors, show them
        const fieldErrors = Object.entries(err)
          .filter(([key]) => key !== 'detail')
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
          .join('; ');

        if (fieldErrors) {
          errorMessage = `Validation errors: ${fieldErrors}`;
        } else if (err.detail) {
          errorMessage = err.detail;
        }
      }

      setError(errorMessage);
      showToast(`${errorMessage.length > 50 ? 'Failed to save settings' : errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      showToast('Please type DELETE to confirm');
      return;
    }

    try {
      await deleteAccount();
      await logout();
      navigate('/');
      showToast('Account deleted successfully');
    } catch (err) {
      showToast('Failed to delete account');
    }
  };

  const handlePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPicture(true);
    try {
      const result = await uploadProfilePicture(file);
      setProfilePicture(result.profile_picture);
      setUser(prev => ({ ...prev, profile_picture: result.profile_picture }));
      showToast('Profile picture updated');
    } catch (err) {
      showToast(err.message || 'Failed to upload picture', true);
    } finally {
      setUploadingPicture(false);
      e.target.value = '';
    }
  };

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div className="page-container">
        <Navbar currentPage="profile" />
        <div className="page-content settings-page">
          <div className="skeleton skeleton-title" style={{ width: '25%', marginBottom: '24px' }} />
          <div className="skeleton-row" style={{ gap: '24px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div className="skeleton-card">
                <div className="skeleton skeleton-circle" style={{ margin: '0 auto 16px' }} />
                <div className="skeleton skeleton-text lg" style={{ width: '50%', margin: '0 auto 8px' }} />
                <div className="skeleton skeleton-text sm" style={{ width: '35%', margin: '0 auto' }} />
              </div>
              <div className="skeleton-card" style={{ marginTop: '16px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton skeleton-text" style={{ marginBottom: '12px' }} />
                ))}
              </div>
            </div>
            <div style={{ flex: 2 }}>
              <div className="skeleton-card" style={{ height: '320px' }}>
                <div className="skeleton skeleton-text lg" style={{ width: '30%', marginBottom: '20px' }} />
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="skeleton skeleton-text" style={{ marginBottom: '12px' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const weeklyRate = formData.goal !== 'maintain' ?
    { slow: '0.25 kg', moderate: '0.5 kg', aggressive: '0.75 kg' }[formData.rate] : 'N/A';

  const estimatedWeeks = formData.goal !== 'maintain' && formData.weight && formData.goal_weight ?
    Math.abs((parseFloat(formData.weight) - parseFloat(formData.goal_weight)) /
      ({ slow: 0.25, moderate: 0.5, aggressive: 0.75 }[formData.rate] || 0.5)) : 0;

  return (
    <div className="page-container">
      <Navbar currentPage="profile" />

      <div className="page-content settings-page">

        <div className="settings-header">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Manage your account and preferences</p>
          </div>

          {error && (
            <div style={{ color: 'var(--danger-color)', fontSize: '14px', marginTop: '8px' }}>
              {error}
            </div>
          )}

          {unsavedChanges && (
            <div className="unsaved-indicator">
              <span className="unsaved-dot"></span>
              Unsaved changes
            </div>
          )}
        </div>

        <div className="settings-layout">

          {/* LEFT SIDEBAR */}
          <div className="settings-sidebar">
            <nav className="settings-nav">
              <button
                className={`settings-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <span className="settings-nav-label">Profile</span>
              </button>

              <button
                className={`settings-nav-item ${activeTab === 'goals' ? 'active' : ''}`}
                onClick={() => setActiveTab('goals')}
              >
                <span className="settings-nav-label">Goals & Targets</span>
              </button>

              <button
                className={`settings-nav-item ${activeTab === 'danger' ? 'active' : ''}`}
                onClick={() => setActiveTab('danger')}
              >
                <span className="settings-nav-label">Account</span>
              </button>
            </nav>
          </div>

          {/* RIGHT CONTENT */}
          <div className="settings-content">
            <form onSubmit={handleSave}>

              {/* ----------- PROFILE TAB ----------- */}
              {activeTab === 'profile' && (
                <>
                  {/* Account Stats Card */}
                  <div className="settings-section">
                    <div className="section-header">
                      <h2>Account Overview</h2>
                      <p>Your nutrition tracking journey</p>
                    </div>

                    <div className="stats-grid">
                      <div className="stat-card">
                        <div className="stat-value">{accountStats.member_since || 'N/A'}</div>
                        <div className="stat-label">Member Since</div>
                      </div>

                      <div className="stat-card">
                        <div className="stat-value">{accountStats.total_meals_logged}</div>
                        <div className="stat-label">Meals Logged</div>
                      </div>

                      <div className="stat-card">
                        <div className="stat-value">{accountStats.streak_days} days</div>
                        <div className="stat-label">Current Streak</div>
                      </div>
                    </div>

                  </div>

                  {/* Profile Information */}
                  <div className="settings-section">
                    <div className="section-header">
                      <h2>Profile Information</h2>
                      <p>How you appear to others</p>
                    </div>

                    {/* Avatar upload */}
                    <div className="avatar-upload-row">
                      <div className="avatar-wrap">
                        {uploadingPicture ? (
                          <div className="avatar-circle avatar-loading">
                            <span className="avatar-spinner" />
                          </div>
                        ) : profilePicture ? (
                          <img src={profilePicture} alt="Profile" className="avatar-circle avatar-img" />
                        ) : (
                          <div className="avatar-circle avatar-initials">
                            {(formData.display_name || formData.username || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <label className="avatar-camera-btn" title="Change profile picture">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            style={{ display: 'none' }}
                            onChange={handlePictureChange}
                            disabled={uploadingPicture}
                          />
                        </label>
                      </div>
                      <div className="avatar-upload-info">
                        <span className="avatar-upload-label">Profile Picture</span>
                        <span className="avatar-upload-hint">JPEG, PNG or WebP · max 5 MB</span>
                      </div>
                    </div>

                    <div className="settings-grid">
                      <div className="settings-group full-width">
                        <label>Display Name</label>
                        <input
                          type="text"
                          name="display_name"
                          value={formData.display_name}
                          onChange={handleChange}
                          placeholder="How should we call you?"
                        />
                        <span className="field-hint">This name will be displayed throughout the app</span>
                      </div>

                      <div className="settings-group full-width">
                        <label>Bio</label>
                        <textarea
                          name="bio"
                          value={formData.bio}
                          onChange={handleChange}
                          placeholder="Tell us about your fitness journey..."
                          rows="3"
                          maxLength="500"
                          style={{ resize: 'vertical', fontFamily: 'inherit', padding: '10px' }}
                        />
                        <span className="field-hint">{formData.bio.length}/500 characters</span>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="settings-section">
                    <div className="section-header">
                      <h2>Personal Information</h2>
                      <p>Basic details about you</p>
                    </div>

                    <div className="settings-grid">
                      <div className="settings-group">
                        <label>Username</label>
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="settings-group">
                        <label>Email Address</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          readOnly
                          className="readonly-input"
                        />
                        <span className="field-hint">Email cannot be changed</span>
                      </div>

                      <div className="settings-group">
                        <label>Age</label>
                        <input
                          type="number"
                          name="age"
                          value={formData.age}
                          onChange={handleChange}
                          min="1"
                          max="120"
                        />
                        <span className="field-hint">Used for calorie calculations</span>
                      </div>

                      <div className="settings-group">
                        <label>Gender</label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>

                      <div className="settings-group">
                        <label>Height (cm)</label>
                        <input
                          type="number"
                          name="height"
                          value={formData.height}
                          onChange={handleChange}
                          min="100"
                          max="250"
                        />
                      </div>

                      <div className="settings-group">
                        <label>Current Weight (kg)</label>
                        <input
                          type="number"
                          name="weight"
                          value={formData.weight}
                          onChange={handleChange}
                          step="0.1"
                          min="30"
                          max="300"
                        />
                      </div>

                      <div className="settings-group full-width">
                        <label>Activity Level</label>
                        <select
                          name="activity_level"
                          value={formData.activity_level}
                          onChange={handleChange}
                        >
                          <option value="sedentary">Sedentary - Little to no exercise</option>
                          <option value="lightly">Lightly Active - 1–3 days/week</option>
                          <option value="moderately">Moderately Active - 3–5 days/week</option>
                          <option value="very">Very Active - 6–7 days/week</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ----------- GOALS TAB ----------- */}
              {activeTab === 'goals' && (
                <>
                  {/* Calorie Target Preview */}
                  <div className="settings-section">
                    <div className="calorie-preview-card">
                      <div className="calorie-preview-label">Your Daily Calorie Target</div>
                      <div className="calorie-preview-value">{calculateCalories()} calories</div>
                      <div className="calorie-preview-desc">Based on your current settings (TDEE)</div>
                    </div>
                  </div>

                  {/* Weight Goals */}
                  <div className="settings-section">
                    <div className="section-header">
                      <h2>Weight Goals</h2>
                      <p>Set your weight targets and timeline</p>
                    </div>

                    <div className="settings-grid">
                      <div className="settings-group">
                        <label>Primary Goal</label>
                        <select
                          name="goal"
                          value={formData.goal}
                          onChange={handleChange}
                        >
                          <option value="lose">Lose Weight</option>
                          <option value="maintain">Maintain Weight</option>
                          <option value="gain">Gain Weight</option>
                        </select>
                      </div>

                      <div className="settings-group">
                        <label>Target Weight (kg)</label>
                        <input
                          type="number"
                          name="goal_weight"
                          value={formData.goal_weight}
                          onChange={handleChange}
                          step="0.1"
                        />
                      </div>

                      <div className="settings-group">
                        {/* ── Added today: Configurable Check-in Day ── */}
                        <label>Weekly Check-in Day</label>
                        <select
                          name="checkin_day"
                          value={formData.checkin_day}
                          onChange={handleChange}
                        >
                          <option value="Monday">Monday</option>
                          <option value="Tuesday">Tuesday</option>
                          <option value="Wednesday">Wednesday</option>
                          <option value="Thursday">Thursday</option>
                          <option value="Friday">Friday</option>
                          <option value="Saturday">Saturday</option>
                          <option value="Sunday">Sunday</option>
                        </select>
                      </div>

                      {formData.goal !== 'maintain' && (
                        <>
                          <div className="settings-group">
                            <label>Rate of Change</label>
                            <select
                              name="rate"
                              value={formData.rate}
                              onChange={handleChange}
                            >
                              <option value="slow">Slow - 0.25 kg/week</option>
                              <option value="moderate">Moderate - 0.5 kg/week</option>
                              <option value="aggressive">Aggressive - 0.75 kg/week</option>
                            </select>
                          </div>

                          <div className="settings-group">
                            <label>Weekly Goal</label>
                            <input
                              type="text"
                              value={weeklyRate}
                              readOnly
                              className="readonly-input"
                            />
                          </div>
                        </>
                      )}

                      {formData.weight && formData.goal_weight && (
                        <>
                          <div className="settings-group">
                            <label>Weight to {formData.goal === 'lose' ? 'Lose' : 'Gain'}</label>
                            <input
                              type="text"
                              value={`${Math.abs(
                                parseFloat(formData.weight) - parseFloat(formData.goal_weight)
                              ).toFixed(1)} kg`}
                              readOnly
                              className="readonly-input"
                            />
                          </div>

                          {formData.goal !== 'maintain' && (
                            <div className="settings-group">
                              <label>Estimated Timeline</label>
                              <input
                                type="text"
                                value={`${Math.ceil(estimatedWeeks)} weeks (${Math.ceil(estimatedWeeks / 4)} months)`}
                                readOnly
                                className="readonly-input"
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Macro Targets */}
                  <div className="settings-section">
                    <div className="section-header">
                      <h2>Macro Targets</h2>
                      <p>Customize your protein, carbs, and fat goals</p>
                    </div>

                    <div className="settings-grid">
                      <div className="settings-group full-width">
                        <label>Macro Preset</label>
                        <div className="preset-buttons">
                          {Object.entries(MACRO_PRESETS).map(([key, preset]) => (
                            <button
                              key={key}
                              type="button"
                              className={`preset-btn ${formData.macro_preset === key ? 'active' : ''}`}
                              onClick={() => handleChange({ target: { name: 'macro_preset', value: key } })}
                            >
                              <div className="preset-name">{preset.name}</div>
                              <div className="preset-ratios">{preset.protein}% / {preset.carbs}% / {preset.fat}%</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="settings-group">
                        <label>Protein Target (g)</label>
                        <input
                          type="number"
                          name="protein_target"
                          value={formData.protein_target}
                          onChange={(e) => {
                            handleChange(e);
                            setFormData(prev => ({ ...prev, macro_preset: 'custom' }));
                          }}
                          min="0"
                        />
                      </div>

                      <div className="settings-group">
                        <label>Carbs Target (g)</label>
                        <input
                          type="number"
                          name="carbs_target"
                          value={formData.carbs_target}
                          onChange={(e) => {
                            handleChange(e);
                            setFormData(prev => ({ ...prev, macro_preset: 'custom' }));
                          }}
                          min="0"
                        />
                      </div>

                      <div className="settings-group">
                        <label>Fat Target (g)</label>
                        <input
                          type="number"
                          name="fat_target"
                          value={formData.fat_target}
                          onChange={(e) => {
                            handleChange(e);
                            setFormData(prev => ({ ...prev, macro_preset: 'custom' }));
                          }}
                          min="0"
                        />
                      </div>

                      <div className="settings-group">
                        <label>Fiber Target (g)</label>
                        <input
                          type="number"
                          name="fiber_target"
                          value={formData.fiber_target}
                          onChange={handleChange}
                          min="0"
                          max="100"
                          placeholder="25"
                        />
                        <span className="field-hint">Recommended: 25–38g/day</span>
                      </div>
                    </div>

                    {/* Macro breakdown visualization */}
                    {formData.protein_target && formData.carbs_target && formData.fat_target && (
                      <div className="macro-visualization" style={{ marginTop: '20px' }}>
                        <div className="macro-bars">
                          <div className="macro-bar">
                            <div className="macro-bar-label">Protein</div>
                            <div className="macro-bar-track">
                              <div
                                className="macro-bar-fill protein-bar"
                                style={{ width: `${(formData.protein_target * 4 / calculateCalories()) * 100}%` }}
                              ></div>
                            </div>
                            <div className="macro-bar-value">
                              {formData.protein_target}g ({Math.round((formData.protein_target * 4 / calculateCalories()) * 100)}%)
                            </div>
                          </div>

                          <div className="macro-bar">
                            <div className="macro-bar-label">Carbs</div>
                            <div className="macro-bar-track">
                              <div
                                className="macro-bar-fill carbs-bar"
                                style={{ width: `${(formData.carbs_target * 4 / calculateCalories()) * 100}%` }}
                              ></div>
                            </div>
                            <div className="macro-bar-value">
                              {formData.carbs_target}g ({Math.round((formData.carbs_target * 4 / calculateCalories()) * 100)}%)
                            </div>
                          </div>

                          <div className="macro-bar">
                            <div className="macro-bar-label">Fat</div>
                            <div className="macro-bar-track">
                              <div
                                className="macro-bar-fill fat-bar"
                                style={{ width: `${(formData.fat_target * 9 / calculateCalories()) * 100}%` }}
                              ></div>
                            </div>
                            <div className="macro-bar-value">
                              {formData.fat_target}g ({Math.round((formData.fat_target * 9 / calculateCalories()) * 100)}%)
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ----------- DANGER ZONE TAB ----------- */}
              {activeTab === 'danger' && (
                <div className="settings-section">
                  <div className="section-header">
                    <h2>Account Management</h2>
                    <p>Manage your account settings</p>
                  </div>

                  <div className="danger-zone">
                    <div className="danger-item danger">
                      <div className="danger-info">
                        <h3>Delete Account</h3>
                        <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => setShowDeleteModal(true)}
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SAVE BUTTONS */}
              {(activeTab === 'profile' || activeTab === 'goals') && (
                <div className="settings-footer">
                  <button
                    type="submit"
                    className="btn btn-primary btn-large"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>

                  {unsavedChanges && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        if (originalData) {
                          setFormData(originalData);
                          setUnsavedChanges(false);
                        }
                      }}
                      disabled={saving}
                    >
                      Discard Changes
                    </button>
                  )}
                </div>
              )}

            </form>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Account?</h2>
            <p className="modal-description" style={{ color: 'var(--danger-color)' }}>
              This will permanently delete your account and all associated data including meals, custom foods, and progress history. This action cannot be undone.
            </p>

            <div className="modal-form">
              <div className="form-group">
                <label>Type <strong>DELETE</strong> to confirm</label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoFocus
                />
              </div>

              <div className="modal-buttons">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                >
                  Cancel
                </button>

                <button
                  className="btn btn-danger"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE'}
                >
                  Delete My Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
