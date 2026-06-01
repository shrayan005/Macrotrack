# FILE: api/coach/serializers.py
# PURPOSE: DRF serializer for UserCheckIn model — converts check-in
#          records to/from JSON for the coach API endpoints.
# USED BY: api/serializers.py (re-exporter), api/coach/views.py
# KEY CLASSES:
#   UserCheckInSerializer — validates + converts weekly check-in records
from rest_framework import serializers
from api.coach.models import UserCheckIn

class UserCheckInSerializer(serializers.ModelSerializer):
    """
    Serializer for UserCheckIn model.

    Used to serialize check-in history records for the coach feature.
    The 'user' field is not exposed — it is set automatically from
    the request context (the currently authenticated user).
    """

    class Meta:
        # Which model this serializer handles
        model = UserCheckIn

        fields = [
            'id',
            'date',               # Date the check-in was submitted
            'weight_at_checkin',  # User's weight at check-in time (optional)
            'calorie_target_before',  # Target before any adjustment
            'calorie_target_after',   # Target after adjustment
            'reflection',         # How user felt: 'great', 'okay', 'struggled'
            'notes',              # Optional free-text notes
            'accepted_adjustment',  # Whether user accepted the AI recommendation
            'goal_changed',       # Whether user changed their goal
            'rate_changed',       # Whether user changed their rate preference
            'weekly_rate',        # Weight change rate (kg/week) at check-in
            'adherence_percent',  # Calorie adherence % at check-in
            'created_at',         # When the check-in was created
        ]

        # Server-managed fields — clients cannot set these
        read_only_fields = ['id', 'created_at']
