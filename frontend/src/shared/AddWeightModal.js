/**
 * AddWeightModal
 *
 * Modal form for logging the user's body weight in kg.
 *
 * Props:
 *   onClose       (function) — called to dismiss the modal
 *   onSave        (function) — called with the weight value in kg on submit
 *   currentWeight (number)  — pre-fills the input with the latest logged weight (in kg)
 *
 * Used in: features/progress/ProgressPage, features/dashboard/DashboardPage
 */
import { useState, useEffect } from 'react';

function AddWeightModal({ onClose, onSave, currentWeight }) {
  const [weight, setWeight] = useState(
    currentWeight ? parseFloat(currentWeight).toFixed(1) : ''
  );

  useEffect(() => {
    if (currentWeight) {
      setWeight(parseFloat(currentWeight).toFixed(1));
    }
  }, [currentWeight]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (weight && parseFloat(weight) > 0) {
      onSave(parseFloat(weight));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
        <h2>Log Weight</h2>
        <p className="modal-description">Track your weight to monitor progress over time</p>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label>Weight (kg)</label>
            </div>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="70.0"
              min="0"
              max="500"
              required
              autoFocus
              className="weight-input"
            />
          </div>

          <div className="modal-buttons">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Weight
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddWeightModal;
