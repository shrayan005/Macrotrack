# FILE: api/weight/models.py
# PURPOSE: Defines the WeightLog model — tracks the user's body weight
#          over time for trend analysis and goal projection.
# USED BY: api/models.py (re-exporter), api/weight/viewset.py,
#          api/viewsets.py, api/analytics/service.py, api/signals.py
# KEY CLASSES:
#   WeightLog — one weight measurement on a given date
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class WeightLog(models.Model):
    """
    Weight logging model for tracking user's weight over time.

    One log per user per day (enforced by unique_together).
    The coach feature uses these logs to calculate TDEE and weekly
    rate of change.
    """

    # The user this weight log belongs to
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='weight_logs',
        help_text="User who logged this weight"
    )

    # The weight measurement in kilograms
    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            # Sanity checks — 20 kg minimum, 500 kg maximum
            MinValueValidator(20, message="Weight must be at least 20 kg"),
            MaxValueValidator(500, message="Weight cannot exceed 500 kg")
        ],
        help_text="Weight in kilograms"
    )

    # The date the weight was measured
    date = models.DateField(help_text="Date of weight measurement")

    # Optional notes (e.g. "after gym", "morning weight")
    notes = models.TextField(null=True, blank=True, help_text="Optional notes")

    # ------------------------------------------------------------------
    # Timestamps
    # ------------------------------------------------------------------
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Tell Django this model belongs to the existing 'api' app
        app_label = 'api'

        # Most recent logs first
        ordering = ['-date', '-created_at']

        indexes = [
            # Fast lookup: all weight logs for a user
            models.Index(fields=['user']),
            # Fast lookup: weight logs for a user on a specific date
            models.Index(fields=['user', 'date']),
            # Covering index for weight trend queries (includes weight value)
            models.Index(fields=['user', 'date', 'weight']),
        ]

        # Only one weight log per user per day
        unique_together = ['user', 'date']

    def __str__(self):
        # Example: "user@email.com - 72.50kg on 2024-01-15"
        return f"{self.user.email} - {self.weight}kg on {self.date}"
