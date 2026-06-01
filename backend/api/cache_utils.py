# FILE: api/cache_utils.py
# PURPOSE: Caching helper functions for daily nutrition, current weight, and popular foods.
"""
Caching utilities for MacroTrack API.

Provides helper functions for caching common queries to improve performance.
Uses Django's cache framework (currently configured to use LocMemCache).
"""

from django.core.cache import cache
from django.db.models import Sum
from datetime import date
import hashlib
import json

def get_cache_key(prefix, *args, **kwargs):
    """
    Generate a cache key from prefix and arguments.

    Args:
        prefix: String prefix for the cache key
        *args: Positional arguments to include in key
        **kwargs: Keyword arguments to include in key

    Returns:
        String cache key
    """
    # Convert args and kwargs to a stable string representation
    key_data = f"{prefix}:{args}:{sorted(kwargs.items())}"

    # For very long keys, use a hash
    if len(key_data) > 200:
        key_hash = hashlib.md5(key_data.encode()).hexdigest()
        return f"{prefix}:{key_hash}"

    return key_data.replace(' ', '_')

def get_daily_nutrition(user, target_date, timeout=3600):
    """
    Get daily nutrition totals for a user on a specific date.
    Cached for 1 hour by default.

    Args:
        user: User instance
        target_date: Date object or date string (YYYY-MM-DD)
        timeout: Cache timeout in seconds (default: 3600 = 1 hour)

    Returns:
        Dict with total_calories, total_protein, total_carbs, total_fat
    """
    from api.models import Meal

    # Convert date string to date object if needed
    if isinstance(target_date, str):
        target_date = date.fromisoformat(target_date)

    cache_key = get_cache_key('daily_nutrition', user.id, target_date)
    result = cache.get(cache_key)

    if result is None:
        # Calculate nutrition totals from database
        totals = Meal.objects.filter(
            user=user,
            date=target_date
        ).aggregate(
            total_calories=Sum('total_calories'),
            total_protein=Sum('total_protein'),
            total_carbs=Sum('total_carbs'),
            total_fat=Sum('total_fat')
        )

        # Convert None to 0 for cleaner API responses
        result = {
            'total_calories': float(totals['total_calories'] or 0),
            'total_protein': float(totals['total_protein'] or 0),
            'total_carbs': float(totals['total_carbs'] or 0),
            'total_fat': float(totals['total_fat'] or 0),
        }

        cache.set(cache_key, result, timeout)

    return result

def get_current_weight(user, timeout=3600):
    """
    Get user's most recent weight from WeightLog.
    Cached for 1 hour by default.

    Args:
        user: User instance
        timeout: Cache timeout in seconds (default: 3600 = 1 hour)

    Returns:
        Float weight in kg, or None if no weight logs
    """
    from api.models import WeightLog

    cache_key = get_cache_key('current_weight', user.id)
    result = cache.get(cache_key)

    if result is None:
        latest_log = WeightLog.objects.filter(user=user).order_by('-date').first()
        result = float(latest_log.weight) if latest_log else None

        # Only cache if we have a result
        if result is not None:
            cache.set(cache_key, result, timeout)

    return result

def get_popular_foods(limit=50, category=None, timeout=86400):
    """
    Get most popular foods (highest search_count).
    Cached for 24 hours by default.

    Args:
        limit: Number of foods to return (default: 50)
        category: Optional category filter (e.g., 'protein', 'vegetables')
        timeout: Cache timeout in seconds (default: 86400 = 24 hours)

    Returns:
        QuerySet of Food objects
    """
    from api.models import Food

    cache_key = get_cache_key('popular_foods', limit=limit, category=category)
    result = cache.get(cache_key)

    if result is None:
        queryset = Food.objects.filter(is_archived=False, is_verified=True)

        if category:
            queryset = queryset.filter(category=category)

        # Get the food IDs (not the full queryset, to keep cache small)
        food_ids = list(queryset.order_by('-search_count')[:limit].values_list('id', flat=True))
        cache.set(cache_key, food_ids, timeout)
        result = food_ids

    # Return a fresh queryset using the cached IDs
    from api.models import Food
    return Food.objects.filter(id__in=result).order_by('-search_count')

def invalidate_daily_nutrition(user, target_date):
    """
    Invalidate daily nutrition cache for a specific user and date.
    Call this when meals are added/updated/deleted.

    Args:
        user: User instance or user ID
        target_date: Date object or date string (YYYY-MM-DD)
    """
    if isinstance(target_date, str):
        target_date = date.fromisoformat(target_date)

    user_id = getattr(user, 'id', user)
    cache_key = get_cache_key('daily_nutrition', user_id, target_date)
    cache.delete(cache_key)

def invalidate_current_weight(user):
    """
    Invalidate current weight cache for a specific user.
    Call this when weight logs are added/updated/deleted.

    Args:
        user: User instance or user ID
    """
    user_id = getattr(user, 'id', user)
    cache_key = get_cache_key('current_weight', user_id)
    cache.delete(cache_key)

def invalidate_popular_foods():
    """
    Invalidate all popular foods caches.
    Call this when food search counts are updated.

    Works with both LocMemCache and Redis backends.
    """
    from django.conf import settings

    # Check if using Redis backend
    backend = settings.CACHES['default']['BACKEND']

    if 'redis' in backend.lower():
        # Redis-specific pattern deletion using SCAN
        try:
            from django_redis import get_redis_connection
            redis_conn = get_redis_connection("default")
            key_prefix = settings.CACHES['default'].get('KEY_PREFIX', '')
            pattern = f"{key_prefix}:popular_foods:*" if key_prefix else "popular_foods:*"

            cursor = 0
            while True:
                cursor, keys = redis_conn.scan(cursor, match=pattern, count=100)
                if keys:
                    redis_conn.delete(*keys)
                if cursor == 0:
                    break
        except Exception as e:
            # Fallback: try cache.delete for known keys
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Redis pattern delete failed: {e}. Cache may not be fully cleared.")
    else:
        # LocMemCache supports delete_pattern directly
        try:
            cache.delete_pattern('popular_foods:*')
        except AttributeError:
            # Fallback for backends that don't support delete_pattern
            # In this case, the cache will naturally expire
            pass