# FILE: api/views.py
# PURPOSE: Thin re-exporter — imports every function-based view
#          from its canonical sub-package and re-exports it so
#          that existing code using `from api import views` and
#          then `views.X` continues to work without any changes.
# CANONICAL LOCATIONS:
#   quick_log_meal, get_user_meals,
#   get_meal_detail, update_meal,
#   delete_meal, add_food_to_meal,
#   remove_food_from_meal, move_meal_food,
#   get_progress_stats, get_reports      → api/analytics/views.py
#   get_coach_analysis, submit_check_in,
#   accept_calorie_adjustment,
#   update_coach_goal,
#   get_check_in_history                 → api/coach/views.py
#   daily_note_detail, water_logs,
#   water_log_detail                     → api/diary/views.py
# Meal views
from api.meals.views import (
    quick_log_meal,
    get_user_meals,
    get_meal_detail,
    update_meal,
    delete_meal,
    add_food_to_meal,
    remove_food_from_meal,
    move_meal_food,
)

# Analytics views
from api.analytics.views import (
    get_dashboard_summary,
    get_progress_stats,
    get_reports,
)

# Coach views
from api.coach.views import (
    get_coach_analysis,
    submit_check_in,
    accept_calorie_adjustment,
    update_coach_goal,
    get_check_in_history,
)

# Diary views
from api.diary.views import (
    daily_note_detail,
    water_logs,
    water_log_detail,
)

# Expose every view name so attribute access via `views.X` works
__all__ = [
    # Meals
    'quick_log_meal',
    'get_user_meals',
    'get_meal_detail',
    'update_meal',
    'delete_meal',
    'add_food_to_meal',
    'remove_food_from_meal',
    'move_meal_food',
    # Analytics
    'get_dashboard_summary',
    'get_progress_stats',
    'get_reports',
    # Coach
    'get_coach_analysis',
    'submit_check_in',
    'accept_calorie_adjustment',
    'update_coach_goal',
    'get_check_in_history',
    # Diary
    'daily_note_detail',
    'water_logs',
    'water_log_detail',
]
