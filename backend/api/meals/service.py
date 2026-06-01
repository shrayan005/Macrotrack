# FILE: api/meals/service.py
# PURPOSE: Business logic layer for meal operations — creates, updates,
#          deletes, and queries meals. Keeps views thin by centralizing
#          all meal-related logic here.
# USED BY: api/viewsets.py (MealViewSet, MealFoodViewSet)
# KEY CLASSES:
#   MealService — all meal CRUD and food-management operations
"""
Meal service layer for MacroTrack.

Handles meal operations including adding/removing foods, moving foods between meals,
and managing meals. Separates business logic from views for better testability
and maintainability.
"""

from datetime import datetime

# transaction.atomic() wraps multiple DB writes in a single transaction,
# so either all succeed or none do (prevents partial saves).
from django.db import transaction

# get_object_or_404 fetches a model instance by its PK and automatically
# returns a 404 response if it doesn't exist.
from django.shortcuts import get_object_or_404

# Import models from their sub-packages (not api.models) to avoid circular imports
from api.meals.models import Meal, MealFood
from api.foods.models import Food

class MealService:
    """
    Service class for all meal-related business operations.

    This class receives a `user` at construction time and all methods
    automatically scope queries to that user, preventing cross-user data access.
    """

    def __init__(self, user):
        """
        Initialize the MealService for a specific user.

        Args:
            user: The authenticated User instance (required for all operations).

        Raises:
            ValueError: If user is None (prevents accidental unauthenticated access).
        """
        if not user:
            raise ValueError('User is required for MealService')
        self.user = user

    def get_user_meals(self, date_from=None, date_to=None, meal_type=None):
        """
        Get meals for the user with optimized database prefetching.

        Uses prefetch_related to load all meal_foods and their foods in
        just 2 extra queries (instead of N queries for N meals), preventing
        the N+1 query problem.

        Args:
            date_from (str or date, optional): Only return meals on or after this date.
            date_to (str or date, optional): Only return meals on or before this date.
            meal_type (str, optional): Filter by 'breakfast', 'lunch', 'dinner', or 'snack'.

        Returns:
            QuerySet: Filtered and prefetched meals, ordered newest-first.
        """
        # Start with all meals belonging to this user
        queryset = Meal.objects.filter(user=self.user)

        # Apply optional date range filters
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        # Apply optional meal type filter
        if meal_type:
            queryset = queryset.filter(meal_type=meal_type)

        # Prefetch related data to avoid N+1 queries.
        # This performs 2 extra queries total instead of 1 per meal.
        queryset = queryset.prefetch_related('meal_foods', 'meal_foods__food')

        # Return newest meals first
        return queryset.order_by('-date', '-time')

    def add_food_to_meal(self, meal_id, food_id, serving_data):
        """
        Add a food item to an existing meal with serving information.

        Args:
            meal_id (int): The ID of the meal to add food to.
            food_id (int): The ID of the food to add.
            serving_data (dict): Must contain:
                - serving_size (Decimal): How many servings (e.g. 1.5)
                - serving_unit (str): The unit label (e.g. "cup")
                - serving_grams (Decimal): Grams per serving unit

        Returns:
            MealFood: The newly created MealFood instance.

        Raises:
            Http404: If meal doesn't belong to this user, or food doesn't exist.
        """
        # Verify this meal belongs to the current user (security check)
        meal = get_object_or_404(Meal, id=meal_id, user=self.user)

        # Get the food record (available to all users)
        food = get_object_or_404(Food, id=food_id)

        # Create the MealFood entry inside a transaction.
        # MealFood.save() automatically calculates nutrition and updates meal totals.
        with transaction.atomic():
            meal_food = MealFood.objects.create(
                meal=meal,
                food=food,
                serving_size=serving_data['serving_size'],
                serving_unit=serving_data['serving_unit'],
                serving_grams=serving_data['serving_grams']
            )
            # Note: meal totals are updated by MealFood.save() → meal.calculate_nutrition_totals()

        return meal_food

    def remove_food_from_meal(self, meal_id, meal_food_id):
        """
        Remove a specific food item from a meal.

        Args:
            meal_id (int): The ID of the meal.
            meal_food_id (int): The ID of the MealFood row to remove.

        Raises:
            Http404: If meal doesn't belong to this user, or meal_food not found.
        """
        # Verify meal ownership
        meal = get_object_or_404(Meal, id=meal_id, user=self.user)

        # Verify the food item belongs to this meal
        meal_food = get_object_or_404(MealFood, id=meal_food_id, meal=meal)

        # Delete the food item; MealFood.delete() updates meal totals automatically
        with transaction.atomic():
            meal_food.delete()

    def move_meal_food(self, source_meal_id, target_meal_id, meal_food_id):
        """
        Move a food item from one meal to another.

        Args:
            source_meal_id (int): The meal the food is currently in.
            target_meal_id (int): The meal to move the food to.
            meal_food_id (int): The MealFood row to move.

        Returns:
            MealFood: The updated MealFood instance (now linked to target meal).

        Raises:
            Http404: If any of the IDs are invalid or don't belong to this user.
        """
        # Verify both meals belong to this user
        source_meal = get_object_or_404(Meal, id=source_meal_id, user=self.user)
        target_meal = get_object_or_404(Meal, id=target_meal_id, user=self.user)

        # Verify the food item belongs to the source meal
        meal_food = get_object_or_404(MealFood, id=meal_food_id, meal=source_meal)

        # Reassign to the target meal
        with transaction.atomic():
            meal_food.meal = target_meal
            meal_food.save()
            # Note: MealFood.save() recalculates the target meal's totals.
            # We also need to update the source meal's totals.
            source_meal.calculate_nutrition_totals()

        return meal_food

    def get_meal_by_id(self, meal_id):
        """
        Get a specific meal by ID with its foods prefetched.

        Args:
            meal_id (int): The meal ID.

        Returns:
            Meal: The meal instance with prefetched foods.

        Raises:
            Http404: If meal doesn't exist or doesn't belong to this user.
        """
        return get_object_or_404(
            # Prefetch related data to avoid N+1 queries in the serializer
            Meal.objects.prefetch_related('meal_foods', 'meal_foods__food'),
            id=meal_id,
            user=self.user
        )

    def get_or_create_meal(self, date, meal_type, time=None):
        """
        Get an existing meal or create a new one for the given date and type.

        Args:
            date (date): The meal date.
            meal_type (str): 'breakfast', 'lunch', 'dinner', or 'snack'.
            time (time, optional): The meal time. Defaults to the current time.

        Returns:
            tuple: (Meal instance, bool created) — same as Django's get_or_create().
        """
        if not time:
            # Default to current time when no time is specified
            time = datetime.now().time()

        meal, created = Meal.objects.get_or_create(
            user=self.user,
            date=date,
            meal_type=meal_type,
            defaults={'time': time}
        )

        return meal, created

    def delete_meal(self, meal_id):
        """
        Delete a meal and all its associated food items (cascade).

        Args:
            meal_id (int): The meal ID to delete.

        Raises:
            Http404: If meal doesn't belong to this user.
        """
        meal = get_object_or_404(Meal, id=meal_id, user=self.user)

        with transaction.atomic():
            meal.delete()
            # Cache invalidation is handled by the signal in api/signals.py

    def update_meal(self, meal_id, **kwargs):
        """
        Update meal metadata fields (meal_type, date, time).

        Args:
            meal_id (int): The meal ID to update.
            **kwargs: Fields to update. Only 'meal_type', 'time', 'date' are allowed.

        Returns:
            Meal: The updated meal instance.

        Raises:
            Http404: If meal doesn't belong to this user.
        """
        meal = get_object_or_404(Meal, id=meal_id, user=self.user)

        # Only allow updating safe fields (prevent spoofing user, id, etc.)
        allowed_fields = ['meal_type', 'time', 'date']
        for field in allowed_fields:
            if field in kwargs:
                setattr(meal, field, kwargs[field])

        with transaction.atomic():
            meal.save()

        return meal
