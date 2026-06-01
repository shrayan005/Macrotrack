# FILE: api/exercise/serializers.py
# PURPOSE: DRF serializer for ExerciseLog model.
# USED BY: api/serializers.py (re-exporter), api/exercise/viewset.py,
#          api/viewsets.py
# KEY CLASSES:
#   ExerciseLogSerializer — validates + converts exercise log entries
from rest_framework import serializers
from api.exercise.models import ExerciseLog

class ExerciseLogSerializer(serializers.ModelSerializer):
    """
    Serializer for ExerciseLog model.

    Includes field-level validation for duration_minutes (must be >= 1)
    and calories_burned (must be >= 0).
    """

    class Meta:
        # Which model this serializer handles
        model = ExerciseLog

        fields = [
            'id',
            'date',
            'exercise_name',
            'duration_minutes',
            'calories_burned',
            'notes',
            'created_at',
            'updated_at',
        ]

        # Server-managed fields — clients cannot set these
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_duration_minutes(self, value):
        """Ensure the exercise duration is at least 1 minute."""
        if value < 1:
            raise serializers.ValidationError("Duration must be at least 1 minute")
        return value

    def validate_calories_burned(self, value):
        """Ensure calories burned is a non-negative number."""
        if value < 0:
            raise serializers.ValidationError("Calories burned cannot be negative")
        return value
