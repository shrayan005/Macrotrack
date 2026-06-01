/**
 * EmptyState
 *
 * Presentational placeholder shown when a list or data section has no content.
 * Accepts an optional action button (e.g. "Add your first meal") to guide the
 * user toward the next step.
 *
 * Props:
 *   icon         (string)    — emoji or character displayed as the icon (default: '📊')
 *   title        (string)    — heading text (default: 'No Data Yet')
 *   message      (string)    — supporting text (default: 'Start by adding some data')
 *   actionButton (ReactNode) — optional CTA element rendered below the message
 *
 * Used in: features/diary/DiaryPage, features/progress/ProgressPage,
 *          features/exercises/ExercisesPage, features/recipes/RecipesPage
 */
import React from 'react';
import './EmptyState.css';

function EmptyState({
  icon = '📊',
  title = 'No Data Yet',
  message = 'Start by adding some data',
  actionButton = null,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      {/* Only render the action slot when a button is provided */}
      {actionButton && (
        <div className="empty-state-action">
          {actionButton}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
