# FILE: api/foods/service.py
# PURPOSE: Business logic layer for food operations — search,
#          custom food creation, and recent foods. Keeps views
#          thin by centralizing all food-related logic here.
# USED BY: api/foods/viewset.py, api/viewsets.py
# KEY CLASSES:
#   FoodService — all food search and management operations
"""
Food service layer for MacroTrack.

Handles food search, custom food creation, and recent foods logic.
Separates business logic from views for better testability and maintainability.
"""

from django.db.models import Max, Count

# Import from sub-packages to avoid circular imports
from api.foods.models import Food
from api.meals.models import MealFood

# Cache utilities help return popular foods quickly without hitting the API
from api.cache_utils import get_popular_foods

class FoodService:
    """
    Service class for food-related operations.

    This class receives a `user` at construction time so that all methods
    can scope queries and permission checks to that specific user.
    """

    def __init__(self, user=None):
        """
        Initialize the FoodService.

        Args:
            user: User instance (optional, required for user-specific operations
                  like custom foods and recent foods)
        """
        self.user = user

    def search_foods(self, query, page_size=25, category=None, page=1):
        """
        Search for foods in database or browse popular foods.

        Args:
            query: Search query string (optional, min 3 characters for API search)
            page_size: Number of results per page (default: 25, max: 5000)
            category: Filter by category (optional, e.g., 'protein', 'vegetables')
            page: Page number (default: 1)

        Returns:
            dict: {
                'count': Number of results in current page,
                'total': Total number of results,
                'page': Current page number,
                'page_size': Results per page,
                'total_pages': Total number of pages,
                'results': List of food dictionaries
            }

        Raises:
            ValueError: If query is too short or parameters are invalid
            Exception: If search fails
        """
        # Validate pagination parameters
        page = max(page, 1)
        page_size = min(max(page_size, 1), 5000)

        # Calculate offset for slicing the queryset
        offset = (page - 1) * page_size

        # If no query, return popular foods from cache
        if not query:
            # Use cached popular foods for better performance
            popular_foods_limit = 1000  # Get enough for pagination

            # Get popular foods from cache (or database if cache miss)
            popular_foods_qs = get_popular_foods(
                limit=popular_foods_limit,
                category=category if category and category.lower() != 'all' else None
            )

            # Order by name for consistent display
            all_foods = popular_foods_qs.order_by('name', '-search_count').distinct('name')
            total_count = all_foods.count()

            # Get paginated results
            cached_foods = all_foods[offset:offset + page_size]

            # Serialize foods — import here to avoid circular import at module level
            from api.serializers import FoodSerializer
            serializer = FoodSerializer(cached_foods, many=True)

            # Calculate total pages using ceiling division
            total_pages = (total_count + page_size - 1) // page_size

            return {
                'count': len(serializer.data),
                'total': total_count,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages,
                'results': serializer.data
            }

        # Validate query length before hitting the external API
        if len(query) < 3:
            raise ValueError('Search query must be at least 3 characters')

        # Search local database
        queryset = Food.objects.filter(name__icontains=query, is_verified=True)

        if category and category.lower() != 'all':
            queryset = queryset.filter(category__iexact=category)

        local_foods = queryset.order_by('name', '-search_count').distinct('name')[:page_size]

        from api.serializers import FoodSerializer
        serializer = FoodSerializer(local_foods, many=True)
        foods = serializer.data

        return {
            'count': len(foods),
            'total': len(foods),
            'page': page,
            'page_size': page_size,
            'total_pages': 1,
            'results': foods
        }

    def get_food_by_id(self, food_id, include_servings=False):
        """
        Get detailed information for a specific food.

        Args:
            food_id: Food database ID
            include_servings: Whether to fetch detailed serving options (default: False)

        Returns:
            dict: Food details with optional serving options

        Raises:
            PermissionError: If custom food belongs to another user
            ValueError: If food not found
        """
        # Security check: If this is a custom food, verify ownership
        try:
            food = Food.objects.get(id=food_id)
            if food.source == 'custom' and food.created_by and food.created_by != self.user:
                raise PermissionError('You do not have permission to access this food')
        except Food.DoesNotExist:
            raise ValueError('Food not found')

        from api.serializers import FoodSerializer
        serializer = FoodSerializer(food)
        return serializer.data

    def create_custom_food(self, validated_data):
        """
        Create a custom food entry for the current user.

        Args:
            validated_data: Dictionary with food data:
                - name (str): Food name (required)
                - calories (decimal): Calories per 100g (required)
                - protein (decimal): Protein in grams per 100g (required)
                - carbs (decimal): Carbs in grams per 100g (required)
                - fat (decimal): Fat in grams per 100g (required)
                - fiber (decimal): Fiber in grams per 100g (optional)
                - category (str): Food category (optional)
                - serving_description (str): Serving description (optional)

        Returns:
            Food: Created food instance

        Raises:
            ValueError: If user is not set or data is invalid
        """
        if not self.user:
            raise ValueError('User is required to create custom food')

        # Create the custom food record in the database
        food = Food.objects.create(
            name=validated_data['name'],
            calories=validated_data['calories'],
            protein=validated_data['protein'],
            carbs=validated_data['carbs'],
            fat=validated_data['fat'],
            fiber=validated_data.get('fiber', 0),
            category=validated_data.get('category', 'other'),
            serving_description=validated_data.get('serving_description', '100g'),
            source='custom',
            created_by=self.user,
            is_verified=True  # User's own custom foods are auto-verified for them
        )

        return food

    def get_user_custom_foods(self):
        """
        Get all custom foods created by the current user.

        Returns:
            QuerySet: User's custom foods ordered by creation date (newest first)

        Raises:
            ValueError: If user is not set
        """
        if not self.user:
            raise ValueError('User is required to get custom foods')

        return Food.objects.filter(
            created_by=self.user,
            source='custom'
        ).order_by('-created_at')

    def get_recent_foods(self, limit=15):
        """
        Get the user's recently logged foods.

        Each food appears only once, with the most recent serving size used.

        Args:
            limit: Maximum number of foods to return (default: 15, max: 50)

        Returns:
            list: Recently logged foods with serving info

        Raises:
            ValueError: If user is not set
        """
        if not self.user:
            raise ValueError('User is required to get recent foods')

        # Cap the limit to avoid overly large responses
        limit = min(limit, 50)

        # Get the most recent MealFood entry for each unique food
        # Values + annotate collapses multiple MealFood rows into one per food_id
        recent_food_ids = (
            MealFood.objects
            .filter(meal__user=self.user)
            .values('food_id')
            .annotate(
                last_logged=Max('created_at'),
                times_logged=Count('id')
            )
            .order_by('-last_logged')[:limit]
        )

        # Build the response with food details and last serving info
        results = []
        for entry in recent_food_ids:
            food_id = entry['food_id']

            # Get the most recent MealFood entry for this specific food
            latest_meal_food = (
                MealFood.objects
                .filter(meal__user=self.user, food_id=food_id)
                .select_related('food')
                .order_by('-created_at')
                .first()
            )

            if latest_meal_food and latest_meal_food.food:
                food = latest_meal_food.food
                results.append({
                    'id': food_id,
                    'food': {
                        'id': food.id,
                        'name': food.name,
                        'calories': str(food.calories),
                        'protein': str(food.protein),
                        'carbs': str(food.carbs),
                        'fat': str(food.fat),
                        'fiber': str(food.fiber) if food.fiber else '0',
                        'category': food.category or 'other',
                        'source': food.source,
                    },
                    'last_serving': {
                        'serving_size': str(latest_meal_food.serving_size),
                        'serving_unit': latest_meal_food.serving_unit,
                        'serving_grams': str(latest_meal_food.serving_grams),
                    },
                    'last_logged': entry['last_logged'].isoformat(),
                    'times_logged': entry['times_logged']
                })

        return results
