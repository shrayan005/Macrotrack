# FILE: api/weight/serializers.py
# PURPOSE: DRF serializer for WeightLog model.
# USED BY: api/serializers.py (re-exporter), api/weight/viewset.py,
#          api/viewsets.py, api/views.py
# KEY CLASSES:
#   WeightLogSerializer — validates + converts weight log entries
from rest_framework import serializers
from api.weight.models import WeightLog

class WeightLogSerializer(serializers.ModelSerializer):
    """
    Serializer for WeightLog model.

    The 'user' field is not exposed — it is set automatically from the
    request context in create(), preventing users from logging weight
    for other accounts.
    """

    class Meta:
        # Which model this serializer handles
        model = WeightLog

        fields = [
            'id',
            'weight',   # Weight in kg
            'date',     # Date of measurement
            'notes',    # Optional notes
            'created_at',
            'updated_at',
        ]

        # Server-managed fields — clients cannot set these
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        """
        Create a weight log and link it to the requesting user.
        """
        # Inject the user from the request context
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
