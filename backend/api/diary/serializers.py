# FILE: api/diary/serializers.py
# PURPOSE: DRF serializers for DailyNote and WaterLog models.
# USED BY: api/serializers.py (re-exporter), api/diary/views.py, api/viewsets.py
# KEY CLASSES:
#   DailyNoteSerializer — validates + converts daily diary notes
from rest_framework import serializers
from api.diary.models import DailyNote

class DailyNoteSerializer(serializers.ModelSerializer):
    """
    Serializer for DailyNote model.

    Used in the daily-notes endpoint to GET, create, or update a note
    for a specific date. The 'user' field is not exposed — it's set
    automatically in the create() method from the request context.
    """

    class Meta:
        # Which model this serializer handles
        model = DailyNote

        fields = [
            'id',
            'date',
            'tags',           # JSON list of tag strings (e.g. ["Traveling", "Sick"])
            'note_text',      # Free-text journaling
            'activity_level', # 'rest', 'light', 'moderate', or 'active'
            'created_at',
            'updated_at',
        ]

        # Server-managed fields — clients cannot set these
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        """
        Create a DailyNote and automatically link it to the requesting user.
        """
        # Inject the user from the request context (set by the view)
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
