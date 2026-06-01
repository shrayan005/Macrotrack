# FILE: api/meals/viewset.py
# PURPOSE: DRF ViewSets for Meal and MealFood operations — provides
#          CRUD endpoints via the DRF router and custom actions.
# USED BY: api/viewsets.py (re-exporter), api/urls.py
# KEY CLASSES:
#   MealViewSet     — CRUD for Meal
#   MealFoodViewSet — add / remove / move foods within a meal
import logging
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action

logger = logging.getLogger(__name__)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
# Import models from their sub-packages
from api.meals.models import Meal, MealFood
from api.diary.models import DailyNote

# Import serializers from sub-packages
from api.meals.serializers import (
    MealSerializer,
    MealFoodSerializer,
    AddFoodToMealSerializer,
)
from api.diary.serializers import DailyNoteSerializer

# MealService handles all business logic (keeps views thin)
from api.meals.service import MealService

class MealViewSet(viewsets.ModelViewSet):
    """
    ViewSet for meal operations.

    Endpoints (registered via DRF router):
        GET    /api/v2/meals/            - List user's meals (filter: date, date_from/to, meal_type)
        POST   /api/v2/meals/            - Create meal
        GET    /api/v2/meals/{id}/       - Get meal details
        PUT    /api/v2/meals/{id}/       - Replace meal
        PATCH  /api/v2/meals/{id}/       - Partially update meal
        DELETE /api/v2/meals/{id}/       - Delete meal
    """

    # The serializer used for all standard actions
    serializer_class = MealSerializer

    # Only authenticated users can access this ViewSet
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Get meals for the current user with optimized prefetching.

        Supports both legacy (start_date/end_date) and v2 (date_from/date_to)
        query params to preserve frontend/backward compatibility.
        """
        # Initialize the service — all queries are scoped to this user
        meal_service = MealService(user=self.request.user)

        # Support both legacy and v2 date param names
        date_filter = self.request.query_params.get('date')
        date_from = self.request.query_params.get('date_from') or self.request.query_params.get('start_date')
        date_to = self.request.query_params.get('date_to') or self.request.query_params.get('end_date')
        meal_type = self.request.query_params.get('meal_type')

        # If 'date' is provided, use it as both start and end (exact date filter)
        effective_date_from = date_filter or date_from
        effective_date_to = date_filter or date_to

        return meal_service.get_user_meals(
            date_from=effective_date_from,
            date_to=effective_date_to,
            meal_type=meal_type
        )

    def list(self, request):
        """
        List meals. Returns {count, results, daily_note} to match frontend expectations.

        Query params:
            date:      Filter by exact date (YYYY-MM-DD)
            date_from / date_to: Date range filter
            meal_type: Filter by meal type
        """
        # get_queryset() already applies all filters
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        # Attach daily note if filtering by an exact date
        date_filter = request.query_params.get('date')
        daily_note_data = None
        if date_filter:
            try:
                note = DailyNote.objects.get(user=request.user, date=date_filter)
                daily_note_data = DailyNoteSerializer(note).data
            except DailyNote.DoesNotExist:
                # No note for this date — return null
                pass

        # Compute daily totals when filtering by an exact date (diary view)
        daily_totals = None
        if date_filter:
            from django.db.models import Sum
            agg = queryset.aggregate(
                calories=Sum('total_calories'),
                protein=Sum('total_protein'),
                carbs=Sum('total_carbs'),
                fat=Sum('total_fat'),
                fiber=Sum('total_fiber'),
            )
            daily_totals = {
                'calories': round(float(agg['calories'] or 0), 1),
                'protein':  round(float(agg['protein']  or 0), 1),
                'carbs':    round(float(agg['carbs']    or 0), 1),
                'fat':      round(float(agg['fat']      or 0), 1),
                'fiber':    round(float(agg['fiber']    or 0), 1),
            }

        return Response({
            'count': queryset.count(),
            'results': serializer.data,
            'daily_note': daily_note_data,
            'daily_totals': daily_totals,
        })

    def perform_create(self, serializer):
        """Create a meal and automatically link it to the requesting user."""
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        """Update a meal (ownership is verified via queryset scoping)."""
        serializer.save()

    def perform_destroy(self, instance):
        """Delete a meal (ownership is verified via queryset scoping)."""
        instance.delete()

class MealFoodViewSet(viewsets.ViewSet):
    """
    ViewSet for managing foods within meals.

    Endpoints (registered manually in urls.py):
        POST   /api/v2/meals/{meal_id}/foods/           - Add food to meal
        DELETE /api/v2/meals/{meal_id}/foods/{id}/      - Remove food from meal
        POST   /api/v2/meals/{meal_id}/foods/{id}/move/ - Move food to another meal
    """
    permission_classes = [IsAuthenticated]

    def create(self, request, meal_id=None):
        """Add a food to a meal."""
        serializer = AddFoodToMealSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        # Use MealService to handle the business logic
        meal_service = MealService(user=request.user)

        try:
            meal_food = meal_service.add_food_to_meal(
                meal_id=meal_id,
                food_id=serializer.validated_data['food_id'],
                serving_data={
                    'serving_size': serializer.validated_data['serving_size'],
                    'serving_unit': serializer.validated_data['serving_unit'],
                    'serving_grams': serializer.validated_data['serving_grams'],
                }
            )

            response_serializer = MealFoodSerializer(meal_food)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error("Failed to add food to meal %s for user %s: %s", meal_id, request.user.id, e, exc_info=True)
            return Response(
                {'error': 'Failed to add food to meal. Please try again.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def destroy(self, request, meal_id=None, pk=None):
        """Remove a food from a meal."""
        meal_service = MealService(user=request.user)

        try:
            meal_service.remove_food_from_meal(
                meal_id=meal_id,
                meal_food_id=pk
            )
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error("Failed to remove food from meal %s for user %s: %s", meal_id, request.user.id, e, exc_info=True)
            return Response(
                {'error': 'Failed to remove food from meal. Please try again.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def move(self, request, meal_id=None, pk=None):
        """
        Move a food item to another meal type on the same date.

        Body params:
            new_meal_type (str): Target meal type ('breakfast', 'lunch', 'dinner', 'snack')
        """
        new_meal_type = request.data.get('new_meal_type')

        valid_meal_types = ['breakfast', 'lunch', 'dinner', 'snack']
        if new_meal_type not in valid_meal_types:
            return Response(
                {'error': f'Invalid meal type. Must be one of: {", ".join(valid_meal_types)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify meal belongs to user
        meal = get_object_or_404(Meal, id=meal_id, user=request.user)
        # Verify the food belongs to this meal
        meal_food = get_object_or_404(MealFood, id=pk, meal=meal)

        if meal.meal_type == new_meal_type:
            return Response(
                {'message': 'Food item is already in this meal type'},
                status=status.HTTP_200_OK
            )

        # Find or create the target meal (same date, new type)
        new_meal, _ = Meal.objects.get_or_create(
            user=request.user,
            meal_type=new_meal_type,
            date=meal.date,
            defaults={'time': meal.time}
        )

        meal_food.meal = new_meal
        meal_food.save()

        # Recalculate both meals' nutrition totals
        meal.calculate_nutrition_totals()
        new_meal.calculate_nutrition_totals()

        # Delete source meal if now empty to keep diary clean
        if meal.meal_foods.count() == 0:
            meal.delete()

        return Response({
            'message': 'Food item moved successfully',
            'new_meal_id': new_meal.id,
            'new_meal_type': new_meal_type,
        }, status=status.HTTP_200_OK)
