# FILE: api/diary/models.py
# PURPOSE: Defines DailyNote and WaterLog models — supplementary
#          diary entries that add context to food logs.
# USED BY: api/models.py (re-exporter), api/diary/views.py,
#          api/viewsets.py, api/reports_service-related code
# KEY CLASSES:
#   DailyNote — one qualitative note per user per day (tags, mood, activity)
#   WaterLog  — a single water intake entry (can have multiple per day)
from django.db import models
from django.conf import settings
from django.core.validators import MaxValueValidator

class DailyNote(models.Model):
    """
    Daily notes for users to add context to their food diary.

    Tracks qualitative factors like stress, activity level, travel, etc.
    These are correlated with calorie data in the Reports feature to show
    patterns like "You eat 200 more calories on weekends".

    One note per user per day (enforced by the unique_together constraint).
    """

    # Allowed values for the activity_level field
    ACTIVITY_LEVEL_CHOICES = [
        ('rest', 'Rest day'),
        ('light', 'Light'),
        ('moderate', 'Moderate'),
        ('active', 'Active'),
    ]

    # The user this note belongs to
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_notes',
        help_text="User who created this note"
    )

    # The calendar date this note is for
    date = models.DateField(help_text="Date for the note")

    # ------------------------------------------------------------------
    # Note content
    # ------------------------------------------------------------------

    # A JSON list of short tag strings the user selects from a preset list
    # e.g. ["Traveling", "Sick", "Eating Out"]
    # default=list means each row gets an empty list [] rather than sharing one object
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="List of selected tags (e.g., 'Traveling', 'Sick')"
    )

    # Free-text journaling/context the user can type
    note_text = models.TextField(
        null=True,
        blank=True,
        help_text="Additional context/journaling"
    )

    # How active the user was on this day — used in Reports correlations
    activity_level = models.CharField(
        max_length=20,
        choices=ACTIVITY_LEVEL_CHOICES,
        default='moderate',
        help_text="General activity level for the day"
    )

    # ------------------------------------------------------------------
    # Timestamps
    # ------------------------------------------------------------------
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Tell Django this model belongs to the existing 'api' app
        app_label = 'api'

        # Newest notes first
        ordering = ['-date']

        indexes = [
            # Fast lookup: get the note for a specific user + date
            models.Index(fields=['user', 'date']),
        ]

        # A user can only have one note per day
        unique_together = ['user', 'date']

    def __str__(self):
        return f"{self.user.email} - Note for {self.date}"

class WaterLog(models.Model):
    """
    Tracks individual water intake entries for a user.

    Unlike DailyNote (one per day), a user can have many WaterLog entries
    per day (e.g. one entry for each glass of water). The total for the day
    is calculated by summing amount_ml for all entries on that date.
    """

    # The user who logged this water intake
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='water_logs'
    )

    # The date this water was consumed
    date = models.DateField()

    # Amount in millilitres (e.g. 250 for one glass, 500 for a bottle)
    # Capped at 10 000 ml (10 litres) — anything higher is a data entry error.
    amount_ml = models.PositiveIntegerField(validators=[MaxValueValidator(10000)])

    # When the log entry was created
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Tell Django this model belongs to the existing 'api' app
        app_label = 'api'

        # Most recent entries first
        ordering = ['-created_at']

        indexes = [
            # Fast lookup: all water logs for a user on a specific date
            models.Index(fields=['user', 'date']),
        ]

    def __str__(self):
        # Example: "user@email.com - 2024-01-15 - 250ml"
        return f"{self.user.email} - {self.date} - {self.amount_ml}ml"
