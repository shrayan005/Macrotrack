# FILE: api/coach/models.py
# PURPOSE: Defines the UserCheckIn model — records weekly AI coach
#          check-ins including calorie adjustments and user reflections.
# USED BY: api/models.py (re-exporter), api/coach/views.py,
#          api/views.py, api/admin.py
# KEY CLASSES:
#   UserCheckIn — one weekly check-in session with metrics snapshot
from django.db import models
from django.conf import settings

class UserCheckIn(models.Model):
    """
    Track weekly check-in history for the AI coach feature.

    Each time the user completes a weekly check-in, a row is created
    here capturing:
    - Key metrics at that moment (weight, calorie target, adherence)
    - User feedback (how they felt about the week)
    - Whether they accepted the AI's calorie adjustment recommendation
    - Any goal or rate changes they made

    This history is used to show the user their progress over time and
    to hold the AI accountable for its past recommendations.
    """

    # Allowed values for the reflection field
    REFLECTION_CHOICES = [
        ('great', 'Great'),
        ('okay', 'Okay'),
        ('struggled', 'Struggled'),
    ]

    # The user who completed this check-in
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='check_ins',
        help_text="User who completed this check-in"
    )

    # The date the check-in was submitted
    date = models.DateField(help_text="Date of the check-in")

    # ------------------------------------------------------------------
    # Metrics snapshot at check-in time
    # ------------------------------------------------------------------

    # The user's weight when they submitted the check-in (optional — they may skip)
    weight_at_checkin = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="User's weight at check-in time"
    )

    # What the calorie target was BEFORE any adjustment
    calorie_target_before = models.IntegerField(
        help_text="Calorie target before any adjustment"
    )

    # What the calorie target is AFTER any adjustment (may equal before)
    calorie_target_after = models.IntegerField(
        help_text="Calorie target after adjustment (may be same as before)"
    )

    # ------------------------------------------------------------------
    # User feedback
    # ------------------------------------------------------------------

    # How the user felt about their week
    reflection = models.CharField(
        max_length=20,
        choices=REFLECTION_CHOICES,
        null=True,
        blank=True,
        help_text="How the user felt about their week"
    )

    # Optional free-text notes from the user about the week
    notes = models.TextField(
        null=True,
        blank=True,
        help_text="Optional notes from the user"
    )

    # ------------------------------------------------------------------
    # What changed during this check-in
    # ------------------------------------------------------------------

    # Did the user tap "Accept" on the AI's calorie recommendation?
    accepted_adjustment = models.BooleanField(
        default=False,
        help_text="Whether user accepted the calorie adjustment"
    )

    # Did the user change their goal (e.g. from 'lose' to 'maintain')?
    goal_changed = models.BooleanField(
        default=False,
        help_text="Whether user changed their goal during check-in"
    )

    # Did the user change their preferred rate (slow/moderate/aggressive)?
    rate_changed = models.BooleanField(
        default=False,
        help_text="Whether user changed their rate preference"
    )

    # ------------------------------------------------------------------
    # Key metrics at check-in time (for historical trend graphs)
    # ------------------------------------------------------------------

    # The calculated weekly weight change rate when this check-in was submitted
    weekly_rate = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Weight change rate (kg/week) at check-in"
    )

    # What percentage of days the user hit their calorie target
    adherence_percent = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Calorie adherence percentage at check-in"
    )

    # When the check-in was submitted
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Tell Django this model belongs to the existing 'api' app
        app_label = 'api'

        # Newest check-ins first
        ordering = ['-date', '-created_at']

        # Prevent duplicate check-ins for the same user on the same date at DB level
        unique_together = [('user', 'date')]

        indexes = [
            # Fast lookup: all check-ins for a user, newest first
            models.Index(fields=['user', '-date']),
            # Covering index for trend analysis queries (includes weekly_rate)
            models.Index(fields=['user', '-date', 'weekly_rate']),
            # For compliance tracking queries
            models.Index(fields=['user', 'accepted_adjustment']),
        ]

    def __str__(self):
        # Example: "user@email.com - Check-in on 2024-01-15"
        return f"{self.user.email} - Check-in on {self.date}"
