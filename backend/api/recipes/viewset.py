# FILE: api/recipes/viewset.py
# PURPOSE: DRF ViewSet for recipe operations — CRUD and log-to-meal action.
# USED BY: api/viewsets.py (re-exporter), api/urls.py
# KEY CLASSES:
#   RecipeViewSet — CRUD for recipes + log_to_meal action
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

# Import models from sub-packages
from api.recipes.models import Recipe
from api.meals.models import Meal, MealFood
from api.foods.models import Food

# Import serializers from sub-packages
from api.recipes.serializers import RecipeSerializer

class RecipeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for recipe operations.

    Endpoints (registered via DRF router):
        GET    /api/v2/recipes/          - List user's recipes (filter: search)
        POST   /api/v2/recipes/          - Create recipe
        GET    /api/v2/recipes/{id}/     - Get recipe details
        PUT    /api/v2/recipes/{id}/     - Replace recipe
        PATCH  /api/v2/recipes/{id}/     - Partially update recipe
        DELETE /api/v2/recipes/{id}/     - Delete recipe
        POST   /api/v2/recipes/{id}/log/ - Log recipe to diary
    """

    # Default serializer for all actions
    serializer_class = RecipeSerializer

    # Only authenticated users can manage their recipes
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Get recipes for the current user with optional name search.

        Query params:
            search: Case-insensitive name filter
        """
        # Start with all recipes for the current user
        queryset = Recipe.objects.filter(user=self.request.user)

        search = self.request.query_params.get('search', '').strip()
        if search:
            # icontains = case-insensitive "contains" filter
            queryset = queryset.filter(name__icontains=search)

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        """Create a recipe and automatically link it to the requesting user."""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='log')
    def log_to_meal(self, request, pk=None):
        """
        Log a recipe to the diary.

        This creates a temporary Food object from the recipe's nutrition values,
        then adds it to a Meal as a MealFood entry.

        Body params:
            meal_type (str): 'breakfast', 'lunch', 'dinner', or 'snack'
            date (str): YYYY-MM-DD (defaults to today)
            serving_multiplier (float): Servings to log (default: 1.0)
        """
        from decimal import Decimal
        from django.utils import timezone

        # get_object_or_404 verifies the recipe belongs to this user
        recipe = get_object_or_404(Recipe, id=pk, user=request.user)

        meal_type = request.data.get('meal_type', 'breakfast')
        date_str = request.data.get('date', timezone.now().date().isoformat())

        # Validate serving_multiplier
        try:
            serving_multiplier = Decimal(str(request.data.get('serving_multiplier', '1.0')))
            if serving_multiplier <= 0:
                return Response(
                    {'error': 'Serving multiplier must be greater than 0'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception:
            return Response({'error': 'Invalid serving_multiplier'}, status=status.HTTP_400_BAD_REQUEST)

        valid_meal_types = ['breakfast', 'lunch', 'dinner', 'snack']
        if meal_type not in valid_meal_types:
            return Response(
                {'error': f'Invalid meal type. Must be one of: {", ".join(valid_meal_types)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create a transient Food object from recipe nutrition.
        # Nutrition values are stored as absolute values (per serving).
        # Using serving_grams=100 means:
        #   MealFood.save() multiplier = (serving_multiplier × 100) / 100 = serving_multiplier
        # so the nutrition scales correctly with serving_multiplier.
        food = Food.objects.create(
            name=f"{recipe.name} (Recipe)",
            source='custom',
            calories=recipe.calories,
            protein=recipe.protein,
            carbs=recipe.carbs,
            fat=recipe.fat,
            fiber=recipe.fiber,
            serving_description=recipe.serving_description,
            created_by=request.user,
            is_verified=False,
        )

        # Get or create the meal for this date and meal type
        meal, _ = Meal.objects.get_or_create(
            user=request.user,
            meal_type=meal_type,
            date=date_str,
        )

        # Add the recipe as a food item with the requested serving multiplier
        meal_food = MealFood.objects.create(
            meal=meal,
            food=food,
            serving_size=serving_multiplier,
            serving_unit=recipe.serving_description,
            serving_grams=Decimal('100'),
        )

        return Response({
            'message': f'Recipe logged to {meal_type} successfully',
            'meal_food_id': meal_food.id,
            'meal_id': meal.id,
            'meal_type': meal_type,
            'date': date_str,
            'nutrition_logged': {
                'calories': float(meal_food.calories),
                'protein': float(meal_food.protein),
                'carbs': float(meal_food.carbs),
                'fat': float(meal_food.fat),
                'fiber': float(meal_food.fiber) if meal_food.fiber is not None else None,
            }
        }, status=status.HTTP_201_CREATED)
