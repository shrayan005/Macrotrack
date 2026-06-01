# FILE: accounts/google_auth.py
# PURPOSE: Google OAuth2 sign-in helper — verifies ID token and returns/creates user.
from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

# Imported here to avoid circular imports at module load time; this module is
# itself imported inside view functions, so the circular-import risk is low,
# but keeping it at the top makes static analysers happy.
from .backends import get_user_by_email  # noqa: E402

def verify_google_token(token):
    """
    Verify Google ID token and return user info.
    
    Args:
        token (str): Google ID token from frontend
        
    Returns:
        dict: User info containing email, name, google_id, etc.
        
    Raises:
        ValueError: If token is invalid
    """
    try:
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            settings.GOOGLE_CLIENT_ID
        )
        
        # Token is valid, extract user information
        return {
            'email': idinfo.get('email'),
            'google_id': idinfo.get('sub'),
            'name': idinfo.get('name'),
            'given_name': idinfo.get('given_name'),
            'family_name': idinfo.get('family_name'),
            'picture': idinfo.get('picture'),
            'email_verified': idinfo.get('email_verified', False),
        }
    except ValueError as e:
        logger.error(f"Invalid Google token: {str(e)}")
        raise ValueError("Invalid Google token")

def get_or_create_google_user(google_user_info):
    """
    Get or create user from Google OAuth info.

    Args:
        google_user_info (dict): User info from verify_google_token

    Returns:
        User: Django user instance
    """
    email = google_user_info.get('email')
    google_id = google_user_info.get('google_id')

    if not email:
        raise ValueError("Email not provided by Google")

    user = get_user_by_email(email)
    if user is not None:
        # Update google_id if user exists but doesn't have it yet
        if not user.google_id:
            user.google_id = google_id
            user.auth_provider = 'google'
            user.save()
        return user

    # Create new user
    username = email.split('@')[0]
    base_username = username
    counter = 1

    # Ensure unique username
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1

    user = User.objects.create(
        email=email,
        username=username,
        google_id=google_id,
        auth_provider='google',
        display_name=google_user_info.get('name', ''),
        is_active=True,
        email_verified=True,
    )

    # No password needed for OAuth users
    user.set_unusable_password()
    user.save()

    return user