/**
 * ExercisePage Component
 *
 * Complete exercise logging and tracking interface with:
 * - Exercise library: 100+ exercises with MET (Metabolic Equivalent) values
 * - Exercise logging: duration, intensity, calories burned calculation
 * - Edit & delete existing exercise logs
 * - Date navigation for historical tracking
 * - Calorie counters: shows calories burned vs daily expenditure
 *
 * Features:
 * - Auto-calculate calories from MET values and user weight
 * - Filter by exercise category (cardio, strength, sports, etc)
 * - Sort by date or calories burned
 * - Quick-add for recently used exercises
 *
 * Props:
 *   None — reads auth data and weight from AuthContext and profileService
 *
 * Used in: App.js (protected route "/exercise")
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../../shared/Navbar';
import {
  getExerciseLogs,
  createExerciseLog,
  updateExerciseLog,
  deleteExerciseLog,
} from '../../api/exerciseService';
import { getUserProfile } from '../../api/profileService';
import { EXERCISE_LIBRARY, EXERCISE_CATEGORIES, calcCaloriesFromMET } from '../../data/exerciseLibrary';
import { showToast } from '../../utils/toast';
import '../../styles/exercise.css';

const emptyForm = {
  exercise_name: '',
  duration_minutes: '',
  calories_burned: '',
  notes: '',
};

function ExercisePage() {
  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editLog, setEditLog] = useState(null);
  const [logToDelete, setLogToDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  // Exercise library state
  const [userWeightKg, setUserWeightKg] = useState(70);
  const [selectedMET, setSelectedMET] = useState(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const libraryRef = useRef(null);

  // Fetch user weight for MET calculation
  // 👉 BACKEND CALL: Fetches user profile data from the server
  useEffect(() => {
    getUserProfile()
      .then((p) => { if (p.weight) setUserWeightKg(parseFloat(p.weight)); })
      .catch(() => {});
  }, []);

  // Auto-calculate calories when duration or selected MET changes
  useEffect(() => {
    if (selectedMET && formData.duration_minutes) {
      const calc = calcCaloriesFromMET(selectedMET, userWeightKg, parseFloat(formData.duration_minutes));
      setFormData((prev) => ({ ...prev, calories_burned: String(calc) }));
    }
  }, [formData.duration_minutes, selectedMET, userWeightKg]);

  // Close library dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (libraryRef.current && !libraryRef.current.contains(e.target)) {
        setShowLibrary(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      // 👉 BACKEND CALL: Fetches all exercise logs for the selected date from the server
      const response = await getExerciseLogs({ date: selectedDate });
      setLogs(response.results || response || []);
    } catch {
      showToast('Failed to load exercise logs', true);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const openCreateModal = () => {
    setEditLog(null);
    setFormData(emptyForm);
    setSelectedMET(null);
    setLibrarySearch('');
    setShowLibrary(false);
    setActiveCategory('All');
    setShowLogModal(true);
  };

  const openEditModal = (log) => {
    setEditLog(log);
    setFormData({
      exercise_name: log.exercise_name,
      duration_minutes: String(log.duration_minutes),
      calories_burned: String(log.calories_burned),
      notes: log.notes || '',
    });
    setSelectedMET(null);
    setLibrarySearch('');
    setShowLibrary(false);
    setActiveCategory('All');
    setShowLogModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    // If user manually edits calories_burned, disable MET auto-calc
    if (name === 'calories_burned') {
      setSelectedMET(null);
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectFromLibrary = (exercise) => {
    setSelectedMET(exercise.met);
    const calc = formData.duration_minutes
      ? calcCaloriesFromMET(exercise.met, userWeightKg, parseFloat(formData.duration_minutes))
      : '';
    setFormData((prev) => ({
      ...prev,
      exercise_name: exercise.name,
      calories_burned: calc ? String(calc) : prev.calories_burned,
    }));
    setShowLibrary(false);
    setLibrarySearch('');
  };

  const filteredLibrary = EXERCISE_LIBRARY.filter((ex) => {
    const matchesCategory = activeCategory === 'All' || ex.category === activeCategory;
    const matchesSearch = ex.name.toLowerCase().includes(librarySearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    const duration = parseInt(formData.duration_minutes);
    const calories = parseFloat(formData.calories_burned);

    if (!formData.exercise_name.trim()) {
      showToast('Exercise name is required', true);
      return;
    }
    if (!duration || duration < 1) {
      showToast('Duration must be at least 1 minute', true);
      return;
    }
    if (isNaN(calories) || calories < 0) {
      showToast('Calories burned must be 0 or more', true);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        exercise_name: formData.exercise_name.trim(),
        duration_minutes: duration,
        calories_burned: calories,
        notes: formData.notes.trim() || null,
        date: selectedDate,
      };

      if (editLog) {
        // 👉 BACKEND CALL: Updates an existing exercise log on the server
        await updateExerciseLog(editLog.id, payload);
        showToast('Exercise updated');
      } else {
        // 👉 BACKEND CALL: Creates a new exercise log on the server
        await createExerciseLog(payload);
        showToast('Exercise logged');
      }

      setShowLogModal(false);
      fetchLogs();
    } catch (err) {
      showToast(err.message || 'Failed to save exercise', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!logToDelete) return;
    try {
      // 👉 BACKEND CALL: Deletes the chosen exercise log from the server
      await deleteExerciseLog(logToDelete.id);
      showToast('Exercise deleted');
      setLogToDelete(null);
      fetchLogs();
    } catch {
      showToast('Failed to delete exercise', true);
    }
  };

  const totalCaloriesBurned = logs.reduce(
    (sum, l) => sum + parseFloat(l.calories_burned || 0),
    0
  );
  const totalDuration = logs.reduce(
    (sum, l) => sum + parseInt(l.duration_minutes || 0),
    0
  );

  return (
    <div className="page-container">
      <Navbar currentPage="exercise" />

      <div className="page-content">
        {/* Header */}
        <div className="exercise-header">
          <div>
            <h1 className="exercise-title">Exercise</h1>
            <p className="exercise-subtitle">Track your workouts and calories burned</p>
          </div>
          <div className="exercise-controls">
            <input
              type="date"
              className="exercise-date-picker"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
            />
            <button className="btn btn-primary" onClick={openCreateModal}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px', flexShrink: 0 }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Log Exercise
            </button>
          </div>
        </div>

        {/* Summary Row */}
        <div className="exercise-summary-row">
          <div className="exercise-summary-card">
            <div className="exercise-summary-icon exercise-icon-calories">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
            <div className="exercise-summary-content">
              <span className="exercise-summary-label">Calories Burned</span>
              <span className="exercise-summary-value">{Math.round(totalCaloriesBurned)}</span>
            </div>
          </div>

          <div className="exercise-summary-card">
            <div className="exercise-summary-icon exercise-icon-duration">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="exercise-summary-content">
              <span className="exercise-summary-label">Total Duration</span>
              <span className="exercise-summary-value">{totalDuration} min</span>
            </div>
          </div>

          <div className="exercise-summary-card">
            <div className="exercise-summary-icon exercise-icon-count">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            <div className="exercise-summary-content">
              <span className="exercise-summary-label">Exercises</span>
              <span className="exercise-summary-value">{logs.length}</span>
            </div>
          </div>
        </div>

        {/* Exercise List */}
        <div className="exercise-list-card">
          <div className="exercise-list-header">
            <h3>
              {selectedDate === today ? "Today's Exercises" : `Exercises on ${selectedDate}`}
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading...
            </div>
          ) : logs.length === 0 ? (
            <div className="exercise-empty-state">
              <div className="exercise-empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6.5 6.5h11M6.5 12h11M6.5 17.5h11" />
                </svg>
              </div>
              <h3>No exercises logged</h3>
              <p>Start tracking your workouts to see them here</p>
              <button className="btn btn-primary" onClick={openCreateModal}>
                Log Your First Exercise
              </button>
            </div>
          ) : (
            <div className="exercise-list">
              {logs.map((log) => (
                <div key={log.id} className="exercise-item">
                  <div className="exercise-item-info">
                    <div className="exercise-item-name">{log.exercise_name}</div>
                    <div className="exercise-item-details">
                      <span className="exercise-item-detail">
                        {log.duration_minutes} min
                      </span>
                      <span className="exercise-item-detail">
                        {Math.round(parseFloat(log.calories_burned))} cal burned
                      </span>
                      {log.notes && (
                        <span className="exercise-item-detail" style={{ fontStyle: 'italic' }}>
                          {log.notes}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="exercise-item-actions">
                    <button
                      className="btn-icon-sm"
                      onClick={() => openEditModal(log)}
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      className="btn-icon-sm danger"
                      onClick={() => setLogToDelete(log)}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log / Edit Modal */}
      {showLogModal && (
        <div className="modal-overlay" onClick={() => !isSaving && setShowLogModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editLog ? 'Edit Exercise' : 'Log Exercise'}</h2>

            <form onSubmit={handleSave} className="modal-form">
              {/* Exercise Library Picker */}
              <div className="form-group" ref={libraryRef} style={{ position: 'relative' }}>
                <label>Exercise Name</label>
                <div className="exercise-name-row">
                  <input
                    type="text"
                    name="exercise_name"
                    value={formData.exercise_name}
                    onChange={(e) => {
                      setSelectedMET(null);
                      setFormData((prev) => ({ ...prev, exercise_name: e.target.value }));
                    }}
                    placeholder="e.g., Running, Cycling, Push-ups"
                    required
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowLibrary((v) => !v)}
                    title="Browse exercise library"
                  >
                    Browse
                  </button>
                </div>

                {showLibrary && (
                  <div className="exercise-library-dropdown">
                    {/* Search */}
                    <div className="library-search-row">
                      <input
                        type="text"
                        placeholder="Search exercises..."
                        value={librarySearch}
                        onChange={(e) => setLibrarySearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    {/* Category tabs */}
                    <div className="library-category-tabs">
                      {['All', ...EXERCISE_CATEGORIES].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`library-cat-tab${activeCategory === cat ? ' active' : ''}`}
                          onClick={() => setActiveCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    {/* Exercise list */}
                    <div className="library-exercise-list">
                      {filteredLibrary.length === 0 ? (
                        <div className="library-empty">No exercises found</div>
                      ) : (
                        filteredLibrary.map((ex) => (
                          <button
                            key={ex.name}
                            type="button"
                            className="library-exercise-item"
                            onClick={() => handleSelectFromLibrary(ex)}
                          >
                            <span className="library-exercise-name">{ex.name}</span>
                            <span className="library-exercise-meta">
                              {ex.category} &middot; MET {ex.met}
                              {formData.duration_minutes
                                ? ` · ~${calcCaloriesFromMET(ex.met, userWeightKg, parseFloat(formData.duration_minutes))} cal`
                                : ''}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="library-footer">
                      Based on your weight ({userWeightKg} kg) &middot; MET values per Ainsworth et al.
                    </div>
                  </div>
                )}
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    name="duration_minutes"
                    value={formData.duration_minutes}
                    onChange={handleFormChange}
                    placeholder="30"
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Calories Burned
                    {selectedMET && (
                      <span className="label-badge label-badge-green">auto-calculated</span>
                    )}
                  </label>
                  <input
                    type="number"
                    name="calories_burned"
                    value={formData.calories_burned}
                    onChange={handleFormChange}
                    placeholder="0"
                    min="0"
                    step="1"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes <span className="label-badge">optional</span></label>
                <input
                  type="text"
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  placeholder="e.g., Felt great, high intensity"
                />
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowLogModal(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editLog ? 'Update' : 'Log Exercise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {logToDelete && (
        <div className="modal-overlay" onClick={() => setLogToDelete(null)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Exercise?</h2>
            <p className="modal-description">
              Are you sure you want to delete <strong>{logToDelete.exercise_name}</strong>? This cannot be undone.
            </p>
            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setLogToDelete(null)}>
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

export default ExercisePage;
