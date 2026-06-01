# FILE: api/weight/viewset.py
# PURPOSE: DRF ViewSet for weight log operations — CRUD + stats action.
# USED BY: api/viewsets.py (re-exporter), api/urls.py
# KEY CLASSES:
#   WeightLogViewSet — CRUD for weight logs + stats summary action
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import IntegrityError

# Import model and serializer from sub-packages
from api.weight.models import WeightLog
from api.weight.serializers import WeightLogSerializer

# AnalyticsService provides weight statistics
from api.analytics.service import AnalyticsService

class WeightLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for weight log operations.

    Endpoints (registered via DRF router):
        GET    /api/v2/weight-logs/          - List user's weight logs (filter: date, date_from/to)
        POST   /api/v2/weight-logs/          - Create weight log
        GET    /api/v2/weight-logs/{id}/     - Get weight log details
        PUT    /api/v2/weight-logs/{id}/     - Replace weight log
        PATCH  /api/v2/weight-logs/{id}/     - Partially update weight log
        DELETE /api/v2/weight-logs/{id}/     - Delete weight log
        GET    /api/v2/weight-logs/stats/    - Get weight statistics
    """

    # Default serializer for all actions
    serializer_class = WeightLogSerializer

    # Only authenticated users can access weight logs
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Get weight logs for the current user with optional date filtering.

        Supports filtering by exact date or date range.
        Accepts both v2 (date_from/date_to) and legacy (start_date/end_date) param names.
        """
        # Start with all weight logs for the current user
        queryset = WeightLog.objects.filter(user=self.request.user)

        # Accept both param styles for consistency with meal endpoints
        exact_date = self.request.query_params.get('date')
        date_from = self.request.query_params.get('date_from') or self.request.query_params.get('start_date')
        date_to = self.request.query_params.get('date_to') or self.request.query_params.get('end_date')

        if exact_date:
            # Filter to a single date
            queryset = queryset.filter(date=exact_date)
        else:
            if date_from:
                queryset = queryset.filter(date__gte=date_from)
            if date_to:
                queryset = queryset.filter(date__lte=date_to)

        # Most recent weight logs first
        return queryset.order_by('-date')

    def perform_create(self, serializer):
        """Create a weight log and automatically link it to the requesting user."""
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """
        Create a weight log.

        Returns 400 if a log already exists for that date
        (the user should use PUT/PATCH to update it).
        """
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            return Response(
                {'error': 'Weight already exists for today.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get weight statistics and trends.

        Returns current weight, starting weight, goal weight, total change,
        weekly rate, and trend direction.
        """
        # Delegate to AnalyticsService which handles all the calculation logic
        analytics_service = AnalyticsService(user=request.user)
        weight_stats = analytics_service.get_weight_stats()
        return Response(weight_stats)
