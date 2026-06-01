# FILE: accounts/decorators.py
# PURPOSE: Custom permission decorators for accounts views.
"""
Rate limiting decorators for authentication endpoints
"""
from functools import wraps
from django.core.cache import cache
from rest_framework.response import Response
from rest_framework import status

def ratelimit(max_attempts=5, window_seconds=300):
    """
    Rate limiting decorator using Django's cache framework.

    Args:
        max_attempts: Maximum number of attempts allowed in the time window
        window_seconds: Time window in seconds (default: 5 minutes)

    Usage:
        @ratelimit(max_attempts=5, window_seconds=300)
        @api_view(['POST'])
        def login(request):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            # Get client IP address
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0]
            else:
                ip = request.META.get('REMOTE_ADDR')

            # Create cache key based on IP and endpoint
            cache_key = f"ratelimit:{func.__name__}:{ip}"

            # Get current attempt count
            attempts = cache.get(cache_key, 0)

            if attempts >= max_attempts:
                return Response(
                    {
                        "error": "Too many attempts. Please try again later.",
                        "retry_after": window_seconds
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            # Increment attempt count
            cache.set(cache_key, attempts + 1, window_seconds)

            # Call the original function
            return func(request, *args, **kwargs)

        return wrapper
    return decorator