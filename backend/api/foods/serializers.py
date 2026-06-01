# FILE: api/foods/serializers.py
# PURPOSE: DRF serializers for the Food model — convert Food objects
#          to/from JSON for API responses.
# USED BY: api/serializers.py (re-exporter), api/foods/service.py,
#          api/viewsets.py, api/views.py
# KEY CLASSES:
#   FoodSerializer            — read-only food details (search results)
#   CustomFoodSerializer      — validates + creates custom user foods
#   FoodSearchResponseSerializer — documents the search response shape
from rest_framework import serializers

# Import from the sub-package model (not from api.models) to avoid circular imports
from api.foods.models import Food

class FoodSerializer(serializers.ModelSerializer):
    """
    Serializer for reading Food records.

    Used in search results, recent foods, and food detail responses.
    Most fields are read-only because food data comes from external APIs
    and should not be edited through this serializer.
    """

    class Meta:
        # Which Django model this serializer converts to/from JSON
        model = Food

        # Explicitly list the fields to expose (never use '__all__' in APIs
        # — it leaks internal fields like is_archived, last_used_at)
        fields = [
            'id',
            'name',
            'fdc_id',
            'source',
            'calories',
            'protein',
            'carbs',
            'fat',
            'fiber',
            'category',
            'serving_description',
            'is_verified',
            'created_at',
        ]

        # These fields are set by the server — clients cannot modify them
        read_only_fields = ['id', 'created_at', 'fdc_id', 'is_verified']

class CustomFoodSerializer(serializers.ModelSerializer):
    """
    Serializer for creating custom user-defined food entries.

    Validates that all nutrition values are reasonable numbers,
    then sets source='custom' and links the food to the requesting user.
    """

    class Meta:
        model = Food

        # Only expose the fields a user needs to create a custom food.
        # We deliberately omit source, fdc_id, is_verified — these are
        # set programmatically in create().
        fields = [
            'id',
            'name',
            'calories',
            'protein',
            'carbs',
            'fat',
            'fiber',
            'category',
            'serving_description',
        ]

        # id is auto-assigned by the database
        read_only_fields = ['id']

    def validate(self, data):
        """
        Validate that all nutrition fields are finite, non-negative numbers.

        This catches values like NaN, Infinity, or negative numbers that would
        corrupt nutrition calculations.
        """
        # The nutrition fields we need to validate
        nutrition_fields = ['calories', 'protein', 'carbs', 'fat', 'fiber']

        for field in nutrition_fields:
            value = data.get(field)
            if value is not None:
                # Check for NaN, Infinity, negative values, or unreasonably large values
                try:
                    float_value = float(value)
                    if not (0 <= float_value < 1000000):
                        raise serializers.ValidationError({
                            field: f'{field.capitalize()} must be between 0 and 1,000,000'
                        })
                except (ValueError, TypeError):
                    raise serializers.ValidationError({
                        field: f'{field.capitalize()} must be a valid number'
                    })

        return data

    def create(self, validated_data):
        """
        Create a custom food and link it to the requesting user.

        We set source='custom' and is_verified=False here rather than
        asking the client to send these values (which would allow spoofing).
        """
        # Mark as user-created, not from an external API
        validated_data['source'] = 'custom'

        # Link to the user making the request (passed via serializer context)
        validated_data['created_by'] = self.context['request'].user

        # Custom foods are unverified until an admin reviews them
        validated_data['is_verified'] = False

        return super().create(validated_data)

class FoodSearchResponseSerializer(serializers.Serializer):
    """
    Documents the shape of the food search API response.

    This is a read-only serializer used for API documentation only —
    it doesn't map to a database model. The actual response data comes
    from the FatSecret API and is passed through without a model.
    """

    id = serializers.IntegerField()
    fdc_id = serializers.IntegerField(allow_null=True)
    name = serializers.CharField()
    calories = serializers.FloatField()
    protein = serializers.FloatField()
    carbs = serializers.FloatField()
    fat = serializers.FloatField()
    fiber = serializers.FloatField(allow_null=True)
    serving = serializers.CharField()
    category = serializers.CharField()
    source = serializers.CharField()
    is_verified = serializers.BooleanField()
