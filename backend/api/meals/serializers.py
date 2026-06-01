# FILE: api/meals/serializers.py
# PURPOSE: DRF serializers for Meal and MealFood models.
# USED BY: api/serializers.py (re-exporter), api/viewsets.py, api/views.py
# KEY CLASSES:
#   MealFoodSerializer     — one food item within a meal (with nested food name)
#   MealSerializer         — full meal with all its food items nested inside
#   AddFoodToMealSerializer  — validates a request to add one food to a meal
#   QuickLogMealSerializer — validates a full meal + foods in one POST body
from rest_framework import serializers

# Import models from their sub-packages (not from api.models) to avoid circular imports
from api.meals.models import Meal, MealFood
from api.foods.models import Food

class MealFoodSerializer(serializers.ModelSerializer):
    """
    Serializer for a single food item within a meal.

    Includes the food name and category as read-only convenience fields
    (pulled from the related Food model) so the frontend doesn't need
    a second request to get the food name.
    """

    # Read-only fields that "reach into" the related Food model
    # source='food.name' tells DRF to follow the FK relationship
    food_name = serializers.CharField(source='food.name', read_only=True)
    food_category = serializers.CharField(source='food.category', read_only=True)

    class Meta:
        # Which model this serializer handles
        model = MealFood

        fields = [
            'id',
            'food',          # FK ID — writable (the client sends the food ID)
            'food_name',     # Read-only derived field
            'food_category', # Read-only derived field
            'serving_size',
            'serving_unit',
            'serving_grams',
            # These are calculated automatically in MealFood.save()
            # so they are read-only
            'calories',
            'protein',
            'carbs',
            'fat',
            'fiber',
            'source',
            'created_at',
        ]

        # Nutrition fields are auto-calculated — clients must NOT send them
        read_only_fields = ['id', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'created_at']

    def validate(self, data):
        """
        Validate that serving_size and serving_grams are positive numbers.
        """
        serving_size = data.get('serving_size')
        serving_grams = data.get('serving_grams')

        if serving_size is not None and serving_size <= 0:
            raise serializers.ValidationError({'serving_size': 'Serving size must be greater than 0'})
        if serving_grams is not None and serving_grams <= 0:
            raise serializers.ValidationError({'serving_grams': 'Serving grams must be greater than 0'})

        return data

class MealSerializer(serializers.ModelSerializer):
    """
    Serializer for a full meal with all its food items nested inside.

    The meal_foods list is read-only and is populated automatically from
    the related MealFood objects. When creating a meal, the client sends
    just the meal metadata — foods are added separately using the
    add-food-to-meal endpoint.
    """

    # Nest all food items inside the meal response.
    # many=True means a list of MealFoodSerializer objects.
    # read_only=True means the client can't create MealFoods through this serializer.
    meal_foods = MealFoodSerializer(many=True, read_only=True)

    class Meta:
        model = Meal

        fields = [
            'id',
            'meal_type',
            'date',
            'time',
            # These totals are auto-calculated — read-only
            'total_calories',
            'total_protein',
            'total_carbs',
            'total_fat',
            'total_fiber',
            'notes',
            # The nested list of food items
            'meal_foods',
            'created_at',
            'updated_at',
        ]

        # Auto-calculated and auto-set fields that clients cannot override
        read_only_fields = [
            'id',
            'total_calories',
            'total_protein',
            'total_carbs',
            'total_fat',
            'total_fiber',
            'created_at',
            'updated_at',
        ]

    def create(self, validated_data):
        """
        Create a meal and automatically link it to the requesting user.

        The `user` field is not in the serializer's `fields` list (so clients
        can't set it), but we inject it here from the request context.
        """
        # Set the user from the request context (injected by the view)
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class AddFoodToMealSerializer(serializers.Serializer):
    """
    Validates the request body for adding a single food to an existing meal.

    This is a plain Serializer (not ModelSerializer) because we're validating
    individual fields rather than creating a model instance directly.
    """

    # The ID of the food to add — must reference an existing Food record
    food_id = serializers.IntegerField(required=True)

    # How many servings to add (e.g. 1.5 means 1.5 × serving_grams grams)
    serving_size = serializers.DecimalField(max_digits=8, decimal_places=2, default=1)

    # The display label for the unit (e.g. "serving", "grams", "cup")
    serving_unit = serializers.CharField(max_length=50, default='serving')

    # Grams per one serving_unit (used for nutrition calculation)
    serving_grams = serializers.DecimalField(max_digits=8, decimal_places=2, default=100)

    # How the food was added — defaults to manual, AI pipeline sends 'ai'
    source = serializers.ChoiceField(choices=['manual', 'ai'], default='manual')

    def validate_food_id(self, value):
        """
        Verify the food_id references an actual food in the database.
        Returns the value unchanged if valid, raises a validation error if not.
        """
        if not Food.objects.filter(id=value).exists():
            raise serializers.ValidationError("Food not found")
        return value

class QuickLogMealSerializer(serializers.Serializer):
    """
    Validates the request body for the quick-log endpoint.

    The quick-log endpoint creates a meal AND adds food items to it in one
    request, saving the client from making multiple API calls.

    Example POST body:
    {
        "meal_type": "lunch",
        "date": "2024-01-15",
        "foods": [
            {"food_id": 42, "serving_size": 1.5, "serving_unit": "cup", "serving_grams": 240},
            {"food_id": 77, "serving_size": 1, "serving_unit": "serving", "serving_grams": 100}
        ]
    }
    """

    # Which meal slot this belongs to
    meal_type = serializers.ChoiceField(
        choices=['breakfast', 'lunch', 'dinner', 'snack'],
        default='breakfast'
    )

    # The date for the meal
    date = serializers.DateField()

    # Optional time
    time = serializers.TimeField(required=False, allow_null=True)

    # Optional notes
    notes = serializers.CharField(required=False, allow_blank=True)

    # A list of food items (at least one required)
    foods = serializers.ListField(
        child=serializers.DictField(),
        required=True,
        min_length=1
    )

    def validate_foods(self, value):
        """
        Validate each food item in the list.

        Checks:
        - food_id is present
        - food_id references an existing food
        - serving_size is a valid positive decimal
        - serving_grams is a valid positive decimal
        """
        for item_index, food_item in enumerate(value):
            item_number = item_index + 1  # Human-readable position (1-based)

            # food_id is required
            if 'food_id' not in food_item:
                raise serializers.ValidationError(f"Food item {item_number}: must have a food_id")

            # food_id must reference a real food
            if not Food.objects.filter(id=food_item['food_id']).exists():
                raise serializers.ValidationError(
                    f"Food item {item_number}: Food with id {food_item['food_id']} not found"
                )

            # Validate serving_size if provided
            serving_size = food_item.get('serving_size', 1)
            try:
                serving_size_decimal = float(serving_size)
                if serving_size_decimal < 0.01:
                    raise serializers.ValidationError(
                        f"Food item {item_number}: serving_size must be at least 0.01"
                    )
            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    f"Food item {item_number}: serving_size must be a valid number"
                )

            # Validate serving_grams if provided
            serving_grams = food_item.get('serving_grams', 100)
            try:
                serving_grams_decimal = float(serving_grams)
                if serving_grams_decimal < 0.01:
                    raise serializers.ValidationError(
                        f"Food item {item_number}: serving_grams must be at least 0.01 "
                        f"(received {serving_grams})"
                    )
            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    f"Food item {item_number}: serving_grams must be a valid number"
                )

        return value
