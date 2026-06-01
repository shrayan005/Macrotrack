# FILE: api/meals/views.py
# PURPOSE: Function-based views for all meal-related HTTP endpoints —
#          creating, updating, deleting, copying meals, and managing
#          foods within meals (add / remove / move / quick-log).
# USED BY: api/urls.py (URL routing), api/views.py (re-exporter)
# KEY FUNCTIONS:
#   quick_log_meal        — create a meal + foods in one POST request
#   get_user_meals        — list meals with optional date filtering
#   get_meal_detail       — retrieve one meal with all its foods
#   update_meal           — update meal metadata (type, date, notes)
#   delete_meal           — delete a meal and all its MealFood rows
#   add_food_to_meal      — add one food to an existing meal
#   remove_food_from_meal — remove one food from a meal
#   move_meal_food        — move a food from one meal type to another
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
import logging

# Import models from their sub-packages to avoid circular imports with api.models
from api.meals.models import Meal, MealFood
from api.foods.models import Food
from api.diary.models import DailyNote

# Import serializers from sub-packages
from api.meals.serializers import (
    MealSerializer,
    MealFoodSerializer,
    AddFoodToMealSerializer,
    QuickLogMealSerializer,
)
from api.diary.serializers import DailyNoteSerializer

logger = logging.getLogger(__name__)

def error_response(message, status_code=status.HTTP_400_BAD_REQUEST, **extra_fields):
    """
    Standardized error response format used by all views in this module.

    Args:
        message: Error message string
        status_code: HTTP status code (default: 400)
        **extra_fields: Additional key-value pairs to include in the response

    Returns:
        Response object with {'error': message, ...extra_fields}
    """
    error_data = {'error': message}
    error_data.update(extra_fields)
    return Response(error_data, status=status_code)

def validate_date_string(date_string):
    """
    Validate and parse a date string in YYYY-MM-DD format.

    Args:
        date_string: The date string to validate

    Returns:
        The date string unchanged if valid

    Raises:
        ValueError: If the format is wrong
    """
    from datetime import datetime
    try:
        datetime.strptime(date_string, '%Y-%m-%d')
        return date_string
    except ValueError:
        raise ValueError(f"Invalid date format: {date_string}. Expected YYYY-MM-DD")

# QUICK LOG
@api_view(['POST'])
@permission_classes([IsAuthenticated])  # Only logged-in users can log meals
def quick_log_meal(request):
    """
    Quickly log a meal with one or more food items in a single request.

    This is a convenience endpoint that creates a meal and adds food items to it
    in one API call, perfect for logging from the food search page.

    Body params:
        meal_type (str): breakfast, lunch, dinner, or snack
        date (str): Date in YYYY-MM-DD format
        time (str): Time in HH:MM format (optional)
        notes (str): Optional notes about the meal
        foods (list): List of food objects, each containing:
            - food_id (int): ID of the food to add
            - serving_size (decimal): Number of servings (default: 1)
            - serving_unit (str): Unit of measurement (default: 'serving')
            - serving_grams (decimal): Grams per serving unit (default: 100)

    Returns:
        201: Meal created with foods
        400: Invalid data
    """
    # Validate the request body using the QuickLogMealSerializer
    serializer = QuickLogMealSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    validated_data = serializer.validated_data

    # Get or create the meal (avoids duplicate key error if meal already exists)
    # get_or_create returns (instance, created_bool)
    meal, _ = Meal.objects.get_or_create(
        user=request.user,
        meal_type=validated_data['meal_type'],
        date=validated_data['date'],
        defaults={
            'time': validated_data.get('time'),
            'notes': validated_data.get('notes', '')
        }
    )

    # Add each food to the meal
    for food_item in validated_data['foods']:
        # get_object_or_404 fetches the Food by pk and returns 404 if not found
        food = get_object_or_404(Food, id=food_item['food_id'])

        # MealFood.save() automatically calculates nutrition from serving info
        MealFood.objects.create(
            meal=meal,
            food=food,
            serving_size=food_item.get('serving_size', 1),
            serving_unit=food_item.get('serving_unit', 'serving'),
            serving_grams=food_item.get('serving_grams', 100),
            source=food_item.get('source', 'manual'),
        )

    # Return the complete meal with all its foods nested inside
    response_serializer = MealSerializer(meal)
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)

# MEAL LISTING / DETAIL
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_meals(request):
    """
    Get all meals for the current user with optional date filtering.

    Query params:
        date (str): Filter by specific date (YYYY-MM-DD format)
        start_date (str): Filter meals from this date onwards
        end_date (str): Filter meals up to this date
        meal_type (str): Filter by meal type (breakfast, lunch, dinner, snack)

    Returns:
        200: List of meals with optional daily_note
    """
    # Optimize query: prefetch related meal_foods and their foods to avoid N+1 queries
    # Without prefetch_related, accessing meal.meal_foods in the serializer would
    # fire a separate SQL query for each meal.
    meals = Meal.objects.filter(user=request.user).prefetch_related(
        'meal_foods',         # Load all meal_foods in one query
        'meal_foods__food'    # Load all related foods in one query
    )

    # Apply filters with validation
    date_filter = request.GET.get('date')
    if date_filter:
        try:
            validate_date_string(date_filter)
            meals = meals.filter(date=date_filter)
        except ValueError as e:
            return error_response(str(e))

    start_date = request.GET.get('start_date')
    if start_date:
        try:
            validate_date_string(start_date)
            # date__gte = "date greater than or equal to" — ORM filter
            meals = meals.filter(date__gte=start_date)
        except ValueError as e:
            return error_response(str(e))

    end_date = request.GET.get('end_date')
    if end_date:
        try:
            validate_date_string(end_date)
            # date__lte = "date less than or equal to"
            meals = meals.filter(date__lte=end_date)
        except ValueError as e:
            return error_response(str(e))

    meal_type = request.GET.get('meal_type')
    if meal_type:
        meals = meals.filter(meal_type=meal_type)

    # Include daily note when date filter is provided
    # (the frontend shows the note alongside the diary for that day)
    daily_note_data = None
    if date_filter:
        try:
            note = DailyNote.objects.get(user=request.user, date=date_filter)
            daily_note_data = DailyNoteSerializer(note).data
        except DailyNote.DoesNotExist:
            # No note for this date — that's fine, just return null
            pass

    serializer = MealSerializer(meals, many=True)
    return Response({
        'count': meals.count(),
        'results': serializer.data,
        'daily_note': daily_note_data
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_meal_detail(request, meal_id):
    """
    Get detailed information for a specific meal.

    Args:
        meal_id (int): Meal ID

    Returns:
        200: Meal details with all foods
        404: Meal not found
        403: Forbidden (meal belongs to another user)
    """
    # Optimize query: prefetch related data to avoid N+1 queries
    meal = get_object_or_404(
        Meal.objects.prefetch_related('meal_foods', 'meal_foods__food'),
        id=meal_id
    )

    # Verify the meal belongs to the current user
    if meal.user != request.user:
        return Response(
            {'error': 'You do not have permission to access this meal'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = MealSerializer(meal)
    return Response(serializer.data)

# MEAL MUTATION (UPDATE / DELETE)
@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_meal(request, meal_id):
    """
    Update meal details (meal_type, date, time, notes).
    Does not modify meal foods — use separate endpoints for that.

    Args:
        meal_id (int): Meal ID

    Returns:
        200: Meal updated
        400: Invalid data
        403: Forbidden
        404: Meal not found
    """
    meal = get_object_or_404(Meal, id=meal_id)

    if meal.user != request.user:
        return Response(
            {'error': 'You do not have permission to modify this meal'},
            status=status.HTTP_403_FORBIDDEN
        )

    # partial=True allows PATCH (updating only some fields)
    serializer = MealSerializer(meal, data=request.data, partial=True, context={'request': request})

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_meal(request, meal_id):
    """
    Delete a meal and all associated food entries.

    Args:
        meal_id (int): Meal ID

    Returns:
        204: Meal deleted
        403: Forbidden
        404: Meal not found
    """
    meal = get_object_or_404(Meal, id=meal_id)

    if meal.user != request.user:
        return Response(
            {'error': 'You do not have permission to delete this meal'},
            status=status.HTTP_403_FORBIDDEN
        )

    meal.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

# MEAL FOOD MANAGEMENT (ADD / REMOVE / MOVE)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_food_to_meal(request, meal_id):
    """
    Add a food item to an existing meal.

    Args:
        meal_id (int): Meal ID

    Body params:
        food_id (int): Food database ID
        serving_size (decimal): Number of servings (default: 1)
        serving_unit (str): Unit of measurement (default: 'serving')
        serving_grams (decimal): Grams per serving unit (default: 100)

    Returns:
        201: Food added to meal
        400: Invalid data
        403: Forbidden
        404: Meal or food not found
    """
    meal = get_object_or_404(Meal, id=meal_id)

    if meal.user != request.user:
        return Response(
            {'error': 'You do not have permission to modify this meal'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = AddFoodToMealSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    validated_data = serializer.validated_data
    food = get_object_or_404(Food, id=validated_data['food_id'])

    # MealFood.save() automatically calculates nutrition from serving info
    meal_food = MealFood.objects.create(
        meal=meal,
        food=food,
        serving_size=validated_data['serving_size'],
        serving_unit=validated_data['serving_unit'],
        serving_grams=validated_data['serving_grams'],
        source=validated_data.get('source', 'manual'),
    )

    response_serializer = MealFoodSerializer(meal_food)
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_food_from_meal(request, meal_id, meal_food_id):
    """
    Remove a specific food item from a meal.

    Args:
        meal_id (int): Meal ID
        meal_food_id (int): MealFood ID

    Returns:
        204: Food removed from meal
        403: Forbidden
        404: Meal or food not found
    """
    meal = get_object_or_404(Meal, id=meal_id)

    if meal.user != request.user:
        return Response(
            {'error': 'You do not have permission to modify this meal'},
            status=status.HTTP_403_FORBIDDEN
        )

    meal_food = get_object_or_404(MealFood, id=meal_food_id, meal=meal)
    meal_food.delete()

    # Recalculate meal totals after removing the food item
    meal.calculate_nutrition_totals()

    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def move_meal_food(request, meal_id, meal_food_id):
    """
    Move a food item from one meal type to another (e.g., from lunch to dinner).

    Args:
        meal_id (int): Current meal ID
        meal_food_id (int): MealFood ID to move

    Body params:
        new_meal_type (str): New meal type ('breakfast', 'lunch', 'dinner', 'snack')

    Returns:
        200: Food item moved successfully
        400: Invalid meal type
        403: Forbidden
        404: Meal or food not found
    """
    meal = get_object_or_404(Meal, id=meal_id)

    if meal.user != request.user:
        return Response(
            {'error': 'You do not have permission to modify this meal'},
            status=status.HTTP_403_FORBIDDEN
        )

    meal_food = get_object_or_404(MealFood, id=meal_food_id, meal=meal)
    new_meal_type = request.data.get('new_meal_type')

    # Validate meal type
    valid_meal_types = [choice[0] for choice in Meal.MEAL_TYPE_CHOICES]
    if new_meal_type not in valid_meal_types:
        return Response(
            {'error': f'Invalid meal type. Must be one of: {", ".join(valid_meal_types)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # If same meal type, no need to move
    if meal.meal_type == new_meal_type:
        return Response(
            {'message': 'Food item is already in this meal type'},
            status=status.HTTP_200_OK
        )

    # Find or create a meal for the new meal type on the same date
    new_meal, created = Meal.objects.get_or_create(
        user=request.user,
        meal_type=new_meal_type,
        date=meal.date,
        defaults={
            'time': meal.time,  # Copy time from original meal
        }
    )

    # Move the food item to the new meal
    meal_food.meal = new_meal
    meal_food.save()

    # Recalculate nutrition totals for both meals
    meal.calculate_nutrition_totals()
    new_meal.calculate_nutrition_totals()

    # If old meal is now empty, delete it to keep diary clean
    if meal.meal_foods.count() == 0:
        meal.delete()

    logger.info(
        f"Moved food item {meal_food.food.name} from {meal.meal_type} to {new_meal_type} "
        f"for user_id={request.user.id}"
    )

    return Response({
        'message': 'Food item moved successfully',
        'new_meal_id': new_meal.id,
        'new_meal_type': new_meal_type
    }, status=status.HTTP_200_OK)

