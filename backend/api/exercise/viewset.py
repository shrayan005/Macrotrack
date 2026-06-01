# FILE: api/exercise/viewset.py
# PURPOSE: DRF ViewSet for exercise log operations — list, create,
#          update, delete exercise logs, and get daily summary.
# USED BY: api/viewsets.py (re-exporter), api/urls.py
# KEY CLASSES:
#   ExerciseLogViewSet — CRUD + daily_summary action for exercise logs
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# Import model and serializer from sub-packages
from api.exercise.models import ExerciseLog
from api.exercise.serializers import ExerciseLogSerializer

class ExerciseLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for exercise log operations.

    Endpoints (registered via DRF router):
        GET    /api/v2/exercise-logs/              - List user's exercise logs
        POST   /api/v2/exercise-logs/              - Create exercise log
        GET    /api/v2/exercise-logs/{id}/         - Get exercise log details
        PUT    /api/v2/exercise-logs/{id}/         - Replace exercise log
        PATCH  /api/v2/exercise-logs/{id}/         - Partially update exercise log
        DELETE /api/v2/exercise-logs/{id}/         - Delete exercise log
        GET    /api/v2/exercise-logs/daily_summary/ - Get total calories burned for a date
    """

    # Default serializer for all actions
    serializer_class = ExerciseLogSerializer

    # Only authenticated users can access exercise logs
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Get exercise logs for the current user with optional date filtering.

        Supports filtering by exact date or a date range.
        """
        # Start with all exercise logs for the current user
        queryset = ExerciseLog.objects.filter(user=self.request.user)

        date_filter = self.request.query_params.get('date')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if date_filter:
            # Exact date filter
            queryset = queryset.filter(date=date_filter)
        else:
            if date_from:
                queryset = queryset.filter(date__gte=date_from)
            if date_to:
                queryset = queryset.filter(date__lte=date_to)

        # Most recent first
        return queryset.order_by('-date', '-created_at')

    def perform_create(self, serializer):
        """Create an exercise log and automatically link it to the requesting user."""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def daily_summary(self, request):
        """
        Get total calories burned and duration for a specific date.

        Query param:
            date (YYYY-MM-DD): Date to summarize (defaults to today)
        """
        from django.utils import timezone
        from django.db.models import Sum
        from decimal import Decimal

        # Default to today if no date param provided
        date_str = request.query_params.get('date', timezone.now().date().isoformat())

        # Fetch all exercise logs for the user on this date
        logs = ExerciseLog.objects.filter(user=request.user, date=date_str)

        # Sum up calories burned and duration (default to 0 if no logs)
        total_calories_burned = logs.aggregate(total=Sum('calories_burned'))['total'] or Decimal('0')
        total_duration = logs.aggregate(total=Sum('duration_minutes'))['total'] or 0

        return Response({
            'date': date_str,
            'total_calories_burned': float(total_calories_burned),
            'total_duration_minutes': total_duration,
            'exercise_count': logs.count(),
        })
