# FILE: api/serializers.py
# PURPOSE: Thin re-exporter — imports every serializer from its
#          canonical sub-package and re-exports it so that
#          existing code using `from api.serializers import X`
#          continues to work without any changes.
# CANONICAL LOCATIONS:
#   FoodSerializer, CustomFoodSerializer,
#   FoodSearchResponseSerializer → api/foods/serializers.py
#   MealFoodSerializer, MealSerializer,
#   AddFoodToMealSerializer,
#   QuickLogMealSerializer       → api/meals/serializers.py
#   WeightLogSerializer          → api/weight/serializers.py
#   DailyNoteSerializer          → api/diary/serializers.py
#   ExerciseLogSerializer        → api/exercise/serializers.py
#   RecipeSerializer             → api/recipes/serializers.py
#   UserCheckInSerializer        → api/coach/serializers.py
# Food serializers
from api.foods.serializers import (
    FoodSerializer,
    CustomFoodSerializer,
    FoodSearchResponseSerializer,
)

# Meal serializers
from api.meals.serializers import (
    MealFoodSerializer,
    MealSerializer,
    AddFoodToMealSerializer,
    QuickLogMealSerializer,
)

# Weight serializer
from api.weight.serializers import WeightLogSerializer

# Diary serializers
from api.diary.serializers import DailyNoteSerializer

# Exercise serializer
from api.exercise.serializers import ExerciseLogSerializer

# Recipe serializer
from api.recipes.serializers import RecipeSerializer

# Coach check-in serializer
from api.coach.serializers import UserCheckInSerializer

# Expose every serializer name so `from api.serializers import *` works
__all__ = [
    'FoodSerializer',
    'CustomFoodSerializer',
    'FoodSearchResponseSerializer',
    'MealFoodSerializer',
    'MealSerializer',
    'AddFoodToMealSerializer',
    'QuickLogMealSerializer',
    'WeightLogSerializer',
    'DailyNoteSerializer',
    'ExerciseLogSerializer',
    'RecipeSerializer',
    'UserCheckInSerializer',
]
