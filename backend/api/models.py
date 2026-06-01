# FILE: api/models.py
# PURPOSE: Thin re-exporter — imports every model from its
#          canonical sub-package and re-exports it so that
#          existing code using `from api.models import X`
#          continues to work without any changes.
# CANONICAL LOCATIONS:
#   Food                     → api/foods/models.py
#   Meal, MealFood           → api/meals/models.py
#   WeightLog                → api/weight/models.py
#   DailyNote, WaterLog      → api/diary/models.py
#   UserCheckIn              → api/coach/models.py
#   ExerciseLog              → api/exercise/models.py
#   Recipe                   → api/recipes/models.py
# Food models
from api.foods.models import Food

# Meal-related models
from api.meals.models import Meal, MealFood

# Weight tracking
from api.weight.models import WeightLog

# Daily diary (notes + water)
from api.diary.models import DailyNote, WaterLog

# AI coaching check-ins
from api.coach.models import UserCheckIn

# Exercise logging
from api.exercise.models import ExerciseLog

# Recipe management
from api.recipes.models import Recipe

# Expose every model name so `from api.models import *` works
__all__ = [
    'Food',
    'Meal',
    'MealFood',
    'WeightLog',
    'DailyNote',
    'WaterLog',
    'UserCheckIn',
    'ExerciseLog',
    'Recipe',
]
