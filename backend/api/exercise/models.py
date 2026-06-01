# FILE: api/exercise/models.py
# PURPOSE: Defines the ExerciseLog model — tracks physical activity
#          sessions logged by the user.
# USED BY: api/models.py (re-exporter), api/exercise/viewset.py,
#          api/viewsets.py, api/admin.py
# KEY CLASSES:
#   ExerciseLog — one exercise session (name, duration, calories burned)
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator

class ExerciseLog(models.Model):
    """
    Exercise logging model for tracking user's physical activity.

    Users can log multiple exercises per day. The calories_burned field
    is user-provided or estimated — MacroTrack does not calculate it
    automatically from formulas.
    """

    # The user who performed this exercise
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='exercise_logs',
        help_text="User who logged this exercise"
    )

    # The date when the exercise was performed
    date = models.DateField(help_text="Date when the exercise was performed")

    # A free-text name for the activity (e.g. "Running", "HIIT Workout")
    exercise_name = models.CharField(max_length=200, help_text="Name of the exercise activity")

    # How long the session lasted, in whole minutes
    duration_minutes = models.PositiveIntegerField(
        help_text="Duration of exercise in minutes",
        validators=[MinValueValidator(1, message="Duration must be at least 1 minute")]
    )

    # Estimated calories burned during this session
    calories_burned = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(0, message="Calories burned cannot be negative")],
        help_text="Estimated calories burned"
    )

    # Optional free-text notes (e.g. "felt tired", "PR on bench press")
    notes = models.TextField(null=True, blank=True, help_text="Optional notes about the exercise")

    # ------------------------------------------------------------------
    # Timestamps
    # ------------------------------------------------------------------
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Tell Django this model belongs to the existing 'api' app
        app_label = 'api'

        # Most recent exercises first
        ordering = ['-date', '-created_at']

        indexes = [
            # Fast lookup: all exercises for a user on a date
            models.Index(fields=['user', 'date']),
            # Fast lookup: all exercises for a user, newest first
            models.Index(fields=['user', '-date']),
        ]

    def __str__(self):
        # Example: "user@email.com - Running on 2024-01-15 (30 min)"
        return f"{self.user.email} - {self.exercise_name} on {self.date} ({self.duration_minutes} min)"
