from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
from .models import MealFood, Meal, WeightLog
from .cache_utils import invalidate_daily_nutrition, invalidate_current_weight

@receiver([post_save, post_delete], sender=MealFood)
def update_meal_totals(sender, instance, **kwargs):
    """
    Update meal nutrition totals whenever a food item is added/changed/removed.
    Uses on_commit to ensure database consistency.
    """
    if instance.meal_id:
        # Pre-fetch properties before on_commit to avoid queries on deleted objects
        try:
            meal_user_id = instance.meal.user_id
            meal_date = instance.meal.date
            transaction.on_commit(
                lambda: invalidate_daily_nutrition(meal_user_id, meal_date)
            )
        except Exception:
            pass

@receiver([post_save, post_delete], sender=Meal)
def invalidate_meal_cache(sender, instance, **kwargs):
    """
    Invalidate daily nutrition cache when a meal is added/updated/deleted.
    """
    user_id = instance.user_id
    date_val = instance.date
    transaction.on_commit(
        lambda: invalidate_daily_nutrition(user_id, date_val)
    )

@receiver([post_save, post_delete], sender=WeightLog)
def invalidate_weight_cache(sender, instance, **kwargs):
    """
    Invalidate current weight cache when a weight log is added/updated/deleted.
    """
    user_id = instance.user_id
    transaction.on_commit(
        lambda: invalidate_current_weight(user_id)
    )
