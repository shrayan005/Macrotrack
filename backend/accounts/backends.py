# FILE: accounts/backends.py
# PURPOSE: Custom authentication backend — allows login by email or username.
import logging
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

logger = logging.getLogger(__name__)

class EmailBackend(ModelBackend):
    """
    Custom auth backend that supports login by email or username.
    Tries username first (for Django admin), then falls back to email.
    """

    def authenticate(self, _request, username=None, password=None, **kwargs):
        UserModel = get_user_model()

        if username is None:
            username = kwargs.get(UserModel.USERNAME_FIELD)

        if username is None or password is None:
            return None

        # Try username lookup first (useful for Django admin)
        try:
            user = UserModel.objects.get(username=username)
            if user.check_password(password) and self.user_can_authenticate(user):
                return user
        except UserModel.DoesNotExist:
            pass

        # Try email lookup (case-insensitive)
        try:
            user = UserModel.objects.get(email__iexact=username.strip())
            if user.check_password(password) and self.user_can_authenticate(user):
                return user
        except UserModel.DoesNotExist:
            pass

        return None

def get_user_by_email(email):
    """Look up a user by email (case-insensitive)."""
    UserModel = get_user_model()
    try:
        return UserModel.objects.get(email__iexact=email.strip())
    except UserModel.DoesNotExist:
        return None
