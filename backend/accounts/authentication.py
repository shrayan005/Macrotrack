# FILE: accounts/authentication.py
# PURPOSE: Custom DRF token authentication — checks token expiry.
"""
Custom DRF token authentication with configurable TTL.

By default Django REST Framework tokens never expire.
This file overrides that behaviour so tokens are rejected
after a configurable number of days (default: 30).

How to configure in settings.py:
    TOKEN_TTL_DAYS = 30   # expire after 30 days (default)
    TOKEN_TTL_DAYS = None # disable expiry entirely

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'accounts.authentication.ExpiringTokenAuthentication',
    ],
}
"""
import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import AuthenticationFailed

logger = logging.getLogger(__name__)

# If TOKEN_TTL_DAYS is not set in settings.py, fall back to 30 days
_DEFAULT_TTL_DAYS = 30

def _get_token_ttl():
    """
    Read TOKEN_TTL_DAYS from settings and return a timedelta.
    Returns None if expiry is disabled (TOKEN_TTL_DAYS = None).
    """
    ttl_days = getattr(settings, 'TOKEN_TTL_DAYS', _DEFAULT_TTL_DAYS)
    if ttl_days is None:
        return None  # expiry is disabled — tokens live forever
    return timedelta(days=int(ttl_days))

class ExpiringTokenAuthentication(TokenAuthentication):
    """
    Extends DRF's built-in TokenAuthentication to add expiry checking.

    Every API request that includes an Authorization header goes through
    authenticate_credentials(). We check how old the token is and reject
    it if it's older than TOKEN_TTL_DAYS.

    When a token expires:
    - The token is deleted from the database (can't be replayed)
    - HTTP 401 is returned with a clear message
    - The user must log in again to get a fresh token
    """

    def authenticate_credentials(self, key):
        # Let the parent class do the normal lookup:
        # find the Token row in the DB and return (user, token)
        # Raises AuthenticationFailed automatically if the token doesn't exist
        user, token = super().authenticate_credentials(key)

        # Read the configured TTL (e.g. timedelta(days=30))
        ttl = _get_token_ttl()

        # If TTL is None, expiry is disabled — let the request through
        if ttl is None:
            return user, token

        # Calculate how old this token is
        # token.created is set once when the token is first issued (at login)
        token_age = timezone.now() - token.created

        if token_age > ttl:
            logger.info(
                "Expired token rejected for user %s (age=%s, ttl=%s)",
                user.id, token_age, ttl,
            )
            # Delete the expired token so it can't be used again
            token.delete()

            # Return HTTP 401 — frontend will redirect to login
            raise AuthenticationFailed(
                "Token has expired. Please log in again."
            )

        # Token is valid and not expired — allow the request
        return user, token
