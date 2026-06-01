# FILE: api/recipes/serializers.py
# PURPOSE: DRF serializer for Recipe model — validates and converts
#          user-defined recipe records.
# USED BY: api/serializers.py (re-exporter), api/recipes/viewset.py,
#          api/viewsets.py
# KEY CLASSES:
#   RecipeSerializer — validates + converts recipe records
from rest_framework import serializers
from api.recipes.models import Recipe

class RecipeSerializer(serializers.ModelSerializer):
    """
    Serializer for Recipe model.

    Validates that all nutrition values are non-negative and within
    a reasonable range (< 10,000) to catch obvious data entry errors.
    """

    class Meta:
        # Which model this serializer handles
        model = Recipe

        fields = [
            'id',
            'name',
            'description',
            'calories',
            'protein',
            'carbs',
            'fat',
            'fiber',
            'serving_description',
            'created_at',
            'updated_at',
        ]

        # Server-managed fields — clients cannot set these
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """
        Validate all nutrition fields are non-negative and reasonable.

        10,000 is an extremely conservative upper bound — no single meal
        should ever contain 10,000g of any macronutrient.
        """
        nutrition_fields = ['calories', 'protein', 'carbs', 'fat', 'fiber']

        for field in nutrition_fields:
            value = data.get(field)
            if value is not None:
                try:
                    float_value = float(value)
                    if float_value < 0:
                        raise serializers.ValidationError({
                            field: f'{field.capitalize()} cannot be negative'
                        })
                    if float_value > 10000:
                        raise serializers.ValidationError({
                            field: f'{field.capitalize()} value seems unreasonably high'
                        })
                except (ValueError, TypeError):
                    raise serializers.ValidationError({
                        field: f'{field.capitalize()} must be a valid number'
                    })
        return data

    def create(self, validated_data):
        """
        Create a recipe and link it to the requesting user.
        """
        # Inject the user from the request context
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
