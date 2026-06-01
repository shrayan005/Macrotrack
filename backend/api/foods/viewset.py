# FILE: api/foods/viewset.py
# PURPOSE: DRF ViewSet for food operations — search, detail, custom
#          food creation, and recent foods.
# USED BY: api/viewsets.py (re-exporter), api/urls.py
# KEY CLASSES:
#   FoodViewSet — read-only food browsing + custom food creation actions
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# Import models and serializers from sub-packages
from api.foods.models import Food
from api.foods.serializers import FoodSerializer, CustomFoodSerializer

# FoodService handles all business logic (search, recent, custom foods)
from api.foods.service import FoodService

class FoodViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for food operations.

    Endpoints (registered via DRF router):
        GET /api/v2/foods/              - Search foods (query: q, category, page, page_size)
        GET /api/v2/foods/{id}/         - Get food details (query: include_servings)
        GET /api/v2/foods/custom/       - Get user's custom foods
        POST /api/v2/foods/custom/create/ - Create custom food
        GET /api/v2/foods/recent/       - Get recently logged foods
    """

    # Default serializer for read operations
    serializer_class = FoodSerializer

    # Only authenticated users can access food data
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Not used for list (which goes through FoodService), but required
        by DRF's ViewSet base class.
        """
        return Food.objects.none()

    def list(self, request):
        """
        Search for foods or browse popular foods.

        Query params:
            q: Search query (optional, min 3 characters)
            category: Filter by category (optional)
            page: Page number (default: 1)
            page_size: Results per page (default: 25, max: 5000)
        """
        query = request.GET.get('q', '').strip()
        category = request.GET.get('category', '').strip()

        # Parse and validate pagination params
        try:
            page = int(request.GET.get('page', 1))
        except ValueError:
            page = 1

        try:
            page_size = int(request.GET.get('page_size', 25))
        except ValueError:
            page_size = 25
        page_size = min(max(page_size, 1), 100)

        # Delegate search logic to FoodService
        food_service = FoodService(user=request.user)

        try:
            result = food_service.search_foods(
                query=query,
                page_size=page_size,
                category=category if category else None,
                page=page
            )
            return Response(result)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Search failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request, pk=None):
        """
        Get detailed food information.

        Query params:
            include_servings: Whether to include serving options (default: false)
        """
        include_servings = request.query_params.get('include_servings', 'false').lower() == 'true'
        food_service = FoodService(user=request.user)

        try:
            food_data = food_service.get_food_by_id(pk, include_servings=include_servings)
            return Response(food_data)
        except PermissionError:
            return Response(
                {'error': 'You do not have permission to access this food'},
                status=status.HTTP_403_FORBIDDEN
            )
        except ValueError:
            return Response(
                {'error': 'Food not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def custom(self, request):
        """Get all custom foods created by the current user."""
        food_service = FoodService(user=request.user)
        custom_foods = food_service.get_user_custom_foods()
        serializer = FoodSerializer(custom_foods, many=True)

        return Response({
            'count': custom_foods.count(),
            'results': serializer.data
        })

    @action(detail=False, methods=['post'], url_path='custom/create')
    def create_custom(self, request):
        """Create a custom food entry."""
        serializer = CustomFoodSerializer(data=request.data, context={'request': request})

        if serializer.is_valid():
            food = serializer.save()
            return Response(
                FoodSerializer(food).data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            {'error': 'Validation failed', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """
        Get the user's recently logged foods.

        Query params:
            limit: Maximum number of foods (default: 15, max: 50)
        """
        try:
            limit = int(request.GET.get('limit', 15))
        except ValueError:
            limit = 15

        food_service = FoodService(user=request.user)
        recent_foods = food_service.get_recent_foods(limit=limit)

        return Response({
            'count': len(recent_foods),
            'results': recent_foods
        })
