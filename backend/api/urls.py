# FILE: api/urls.py
# PURPOSE: URL configuration for the MacroTrack API.
#          Registers DRF router ViewSets (v2 endpoints) and maps
#          legacy backward-compatible URL patterns to function-based
#          views. All URL strings are UNCHANGED from the original.
# IMPORTS:
#   views    → api/views.py (thin re-exporter → sub-package views)
#   viewsets → api/viewsets.py (thin re-exporter → sub-package viewsets)
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# api/views.py re-exports all function-based views from sub-packages
from api import views

# api/viewsets.py re-exports all DRF ViewSets from sub-packages
from api import viewsets

# Modern DRF router for CRUD operations using service layer
router = DefaultRouter()
router.register(r'v2/foods', viewsets.FoodViewSet, basename='food-v2')
router.register(r'v2/meals', viewsets.MealViewSet, basename='meal-v2')
router.register(r'v2/weight-logs', viewsets.WeightLogViewSet, basename='weight-log-v2')
router.register(r'v2/exercise-logs', viewsets.ExerciseLogViewSet, basename='exercise-log-v2')
router.register(r'v2/recipes', viewsets.RecipeViewSet, basename='recipe-v2')

# Nested router for meal foods
# Note: Using ViewSet instead of nested router for simpler URL structure

urlpatterns = [
    # ========== ViewSet Routes (Modern API) ==========
    path('', include(router.urls)),

    # Meal foods nested endpoints (ViewSet-based)
    path('v2/meals/<int:meal_id>/foods/', viewsets.MealFoodViewSet.as_view({
        'post': 'create'
    }), name='meal-food-create-v2'),
    path('v2/meals/<int:meal_id>/foods/<int:pk>/', viewsets.MealFoodViewSet.as_view({
        'delete': 'destroy'
    }), name='meal-food-delete-v2'),
    path('v2/meals/<int:meal_id>/foods/<int:pk>/move/', viewsets.MealFoodViewSet.as_view({
        'post': 'move'
    }), name='meal-food-move-v2'),

    # ========== Backward Compatible Endpoints (Legacy API) ==========
    # These maintain existing URLs for frontend compatibility

    # Food search endpoints (backward compatible)
    path('foods/search/', viewsets.FoodViewSet.as_view({'get': 'list'}), name='food-search'),
    path('foods/<int:pk>/', viewsets.FoodViewSet.as_view({'get': 'retrieve'}), name='food-detail'),
    path('foods/custom/', viewsets.FoodViewSet.as_view({'post': 'create_custom'}), name='create-custom-food'),
    path('foods/custom/my/', viewsets.FoodViewSet.as_view({'get': 'custom'}), name='my-custom-foods'),
    path('foods/recent/', viewsets.FoodViewSet.as_view({'get': 'recent'}), name='recent-foods'),

    # Meal endpoints (backward compatible)
    path('meals/', viewsets.MealViewSet.as_view({'get': 'list', 'post': 'create'}), name='get-user-meals'),
    path('meals/<int:pk>/', viewsets.MealViewSet.as_view({'get': 'retrieve'}), name='get-meal-detail'),
    path('meals/<int:pk>/update/', viewsets.MealViewSet.as_view({'put': 'update', 'patch': 'partial_update'}), name='update-meal'),
    path('meals/<int:pk>/delete/', viewsets.MealViewSet.as_view({'delete': 'destroy'}), name='delete-meal'),

    # Meal food management (backward compatible)
    path('meals/<int:meal_id>/add-food/', viewsets.MealFoodViewSet.as_view({'post': 'create'}), name='add-food-to-meal'),
    path('meals/<int:meal_id>/remove-food/<int:pk>/', viewsets.MealFoodViewSet.as_view({'delete': 'destroy'}), name='remove-food-from-meal'),
    path('meals/<int:meal_id>/move-food/<int:pk>/', viewsets.MealFoodViewSet.as_view({'post': 'move'}), name='move-meal-food'),

    # Complex meal operations (function-based views)
    path('meals/quick-log/', views.quick_log_meal, name='quick-log-meal'),

    # Weight logging endpoints (backward compatible)
    path('weight-logs/', viewsets.WeightLogViewSet.as_view({'get': 'list', 'post': 'create'}), name='weight-logs'),
    path('weight-logs/<int:pk>/', viewsets.WeightLogViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='weight-log-detail'),
    path('weight-logs/stats/', viewsets.WeightLogViewSet.as_view({'get': 'stats'}), name='weight-stats'),

    # Analytics endpoints (function-based views - complex logic)
    path('progress/stats/', views.get_progress_stats, name='progress-stats'),
    path('dashboard/summary/', views.get_dashboard_summary, name='dashboard-summary'),
    path('coach/analysis/', views.get_coach_analysis, name='coach-analysis'),

    # Coach feature endpoints (function-based views)
    path('coach/check-in/', views.submit_check_in, name='coach-check-in'),
    path('coach/check-ins/', views.get_check_in_history, name='coach-check-in-history'),
    path('coach/accept-adjustment/', views.accept_calorie_adjustment, name='coach-accept-adjustment'),
    path('coach/update-goal/', views.update_coach_goal, name='coach-update-goal'),

    # Daily Notes endpoints (function-based view - upsert pattern)
    path('daily-notes/', views.daily_note_detail, name='daily-notes'),

    # Reports endpoints (function-based view - delegates to ReportsService)
    path('reports/', views.get_reports, name='reports'),

    # Exercise Log endpoints (backward compatible)
    # NOTE: summary/ must come before <int:pk>/ to avoid pk-matching on 'summary'
    path('exercise-logs/summary/', viewsets.ExerciseLogViewSet.as_view({'get': 'daily_summary'}), name='exercise-log-summary'),
    path('exercise-logs/', viewsets.ExerciseLogViewSet.as_view({'get': 'list', 'post': 'create'}), name='exercise-logs'),
    path('exercise-logs/<int:pk>/', viewsets.ExerciseLogViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy',
    }), name='exercise-log-detail'),

    # Water tracking endpoints
    path('water-logs/', views.water_logs, name='water-logs'),
    path('water-logs/<int:log_id>/', views.water_log_detail, name='water-log-detail'),

    # Recipe endpoints (backward compatible)
    path('recipes/', viewsets.RecipeViewSet.as_view({'get': 'list', 'post': 'create'}), name='recipes'),
    path('recipes/<int:pk>/', viewsets.RecipeViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy',
    }), name='recipe-detail'),
    path('recipes/<int:pk>/log/', viewsets.RecipeViewSet.as_view({'post': 'log_to_meal'}), name='recipe-log'),
]
