/**
 * DailyNote
 *
 * Collapsible card that lets users attach contextual tags, an activity level,
 * and a free-text note to a specific diary date. Fetches existing data from the
 * backend when the date prop changes.
 *
 * Props:
 *   date        (string)   — ISO date string "YYYY-MM-DD" for the diary entry
 *   initialData (object)   — optional pre-fetched note data (avoids extra API call)
 *   onSave      (function) — callback fired after a successful save
 *
 * Used in: DiaryPage.js
 */
import React, { useState, useEffect } from 'react';
import { getDailyNote, saveDailyNote } from '../../api/dailyNoteService';

const AVAILABLE_TAGS = [
    "Traveling", "Workout", "Busy", "Celebration", "Sick", "Restaurant", "Stressed"
];

const ACTIVITY_LEVELS = [
    { value: 'rest', label: 'Rest Day' },
    { value: 'light', label: 'Light' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'active', label: 'Active' },
];

function DailyNote({ date, initialData, onSave }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [noteData, setNoteData] = useState({
        tags: [],
        note_text: '',
        activity_level: 'moderate'
    });

    // Fetch note when date changes (only if no initialData provided)
    useEffect(() => {
        // Use initialData if provided
        if (initialData && initialData.date === date) {
            setNoteData({
                tags: initialData.tags || [],
                note_text: initialData.note_text || '',
                activity_level: initialData.activity_level || 'moderate'
            });
            return;
        }

        async function fetchNote() {
            setIsLoading(true);
            try {
                const data = await getDailyNote(date);
                if (data && data.date === date) {
                    setNoteData({
                        tags: data.tags || [],
                        note_text: data.note_text || '',
                        activity_level: data.activity_level || 'moderate'
                    });
                } else {
                    // Reset if no note found
                    setNoteData({
                        tags: [],
                        note_text: '',
                        activity_level: 'moderate'
                    });
                }
            } catch (err) {
                // Error handled silently - UI shows empty state
            } finally {
                setIsLoading(false);
            }
        }

        // Only fetch if no initialData
        if (!initialData) {
            fetchNote();
        } else {
            // Reset to defaults if initialData is null
            setNoteData({
                tags: [],
                note_text: '',
                activity_level: 'moderate'
            });
        }
    }, [date, initialData]);

    const handleSave = async (e) => {
        e.stopPropagation();
        setIsSaving(true);
        try {
            await saveDailyNote({
                date,
                ...noteData
            });
            setIsExpanded(false);
            // Call onSave callback to refresh parent data
            if (onSave) {
                onSave();
            }
        } catch (err) {
            alert("Failed to save note");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleTag = (tag) => {
        setNoteData(prev => {
            const tags = prev.tags.includes(tag)
                ? prev.tags.filter(t => t !== tag)
                : [...prev.tags, tag];
            return { ...prev, tags };
        });
    };

    if (isLoading) {
        return (
            <div className="card daily-note-card">
                <div className="loading-text">Loading daily note...</div>
            </div>
        );
    }

    return (
        <div className="card daily-note-card">
            <div className="daily-note-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="daily-note-title">
                    <h3>Day Notes</h3>
                    {!isExpanded && (
                        <div className="daily-note-preview">
                            {noteData.tags.length > 0 || noteData.note_text || noteData.activity_level !== 'moderate' ? (
                                <>
                                    <div className="preview-tags">
                                        {noteData.tags.map(tag => (
                                            <span key={tag} className="tag-chip selected">{tag}</span>
                                        ))}
                                    </div>
                                    {noteData.note_text && (
                                        <span className="preview-note-text truncate">{noteData.note_text}</span>
                                    )}
                                    <span className="preview-activity-badge">{noteData.activity_level}</span>
                                </>
                            ) : (
                                <span className="preview-text">Add context for today...</span>
                            )}
                        </div>
                    )}
                </div>
                <div className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
            </div>

            {isExpanded && (
                <div className="daily-note-content" onClick={(e) => e.stopPropagation()}>
                    {/* Activity Level Selector */}
                    <div className="daily-note-section">
                        <span className="section-label">Activity Level</span>
                        <div className="tags-container">
                            {ACTIVITY_LEVELS.map(level => (
                                <button
                                    key={level.value}
                                    onClick={() => setNoteData({ ...noteData, activity_level: level.value })}
                                    className={`activity-btn ${noteData.activity_level === level.value ? 'selected' : ''}`}
                                >
                                    {level.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tags Selector */}
                    <div className="daily-note-section">
                        <span className="section-label">Context Tags</span>
                        <div className="tags-container">
                            {AVAILABLE_TAGS.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`tag-chip ${noteData.tags.includes(tag) ? 'selected' : ''}`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Note Text Area */}
                    <div className="daily-note-section">
                        <span className="section-label">Additional Notes</span>
                        <textarea
                            value={noteData.note_text}
                            onChange={(e) => setNoteData({ ...noteData, note_text: e.target.value })}
                            placeholder="How were you feeling today? Any specific details?"
                            className="note-textarea"
                        />
                    </div>

                    <div className="daily-note-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(false);
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save Note'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DailyNote;
