# FILE: api/viewsets.py
# PURPOSE: Thin re-exporter — imports every DRF ViewSet from its
#          canonical sub-package and re-exports it so that
#          existing code using `from api.viewsets import X`
#          continues to work without any changes.
# CANONICAL LOCATIONS:
#   FoodViewSet              → api/foods/viewset.py
#   MealViewSet              → api/meals/viewset.py
#   MealFoodViewSet          → api/meals/viewset.py
#   WeightLogViewSet         → api/weight/viewset.py
#   ExerciseLogViewSet       → api/exercise/viewset.py
#   RecipeViewSet            → api/recipes/viewset.py
# Food ViewSet
from api.foods.viewset import FoodViewSet

# Meal ViewSets
from api.meals.viewset import MealViewSet, MealFoodViewSet

# Weight ViewSet
from api.weight.viewset import WeightLogViewSet

# Exercise ViewSet
from api.exercise.viewset import ExerciseLogViewSet

# Recipe ViewSet
from api.recipes.viewset import RecipeViewSet

# Expose every ViewSet name so `from api.viewsets import *` works
__all__ = [
    'FoodViewSet',
    'MealViewSet',
    'MealFoodViewSet',
    'WeightLogViewSet',
    'ExerciseLogViewSet',
    'RecipeViewSet',
]
