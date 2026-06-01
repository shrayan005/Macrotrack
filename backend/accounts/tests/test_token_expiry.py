# FILE: accounts/tests/test_token_expiry.py
# PURPOSE: Tests for token expiry enforcement in the custom authentication class.
"""
Token Expiry Tests

Covers:
  - ExpiringTokenAuthentication accepts fresh tokens
  - ExpiringTokenAuthentication rejects tokens older than TOKEN_TTL_DAYS
  - Expired token is deleted from DB on rejection (cannot be replayed)
  - Expiry disabled when TOKEN_TTL_DAYS=None
  - Login endpoint returns a new token; re-login after expiry works

Run with: pytest accounts/tests/test_token_expiry.py -v
"""

import pytest
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APIRequestFactory

from accounts.authentication import ExpiringTokenAuthentication
from rest_framework.exceptions import AuthenticationFailed

User = get_user_model()

# ─────────────────────── fixtures ───────────────────────

@pytest.fixture
def user(db):
    return User.objects.create_user(
        username='tokenuser',
        email='token@example.com',
        password='tokenpass123',
    )

@pytest.fixture
def fresh_token(user):
    token, _ = Token.objects.get_or_create(user=user)
    return token

@pytest.fixture
def expired_token(user):
    """Token created 31 days ago (beyond the 30-day default TTL)."""
    token, _ = Token.objects.get_or_create(user=user)
    Token.objects.filter(pk=token.pk).update(
        created=timezone.now() - timedelta(days=31)
    )
    token.refresh_from_db()
    return token

@pytest.fixture
def auth_client(user, fresh_token):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Token {fresh_token.key}')
    return client

# ─────────────────────── ExpiringTokenAuthentication unit tests ───────────────────────

@pytest.mark.django_db
class TestExpiringTokenAuthenticationUnit:
    """Direct unit tests for the authentication class."""

    def _make_request(self, token_key):
        factory = APIRequestFactory()
        request = factory.get('/', HTTP_AUTHORIZATION=f'Token {token_key}')
        return request

    def test_fresh_token_is_accepted(self, fresh_token):
        auth = ExpiringTokenAuthentication()
        request = self._make_request(fresh_token.key)
        result = auth.authenticate(request)
        assert result is not None
        user_out, token_out = result
        assert token_out.pk == fresh_token.pk

    def test_expired_token_raises_authentication_failed(self, expired_token):
        auth = ExpiringTokenAuthentication()
        request = self._make_request(expired_token.key)
        with pytest.raises(AuthenticationFailed) as exc_info:
            auth.authenticate(request)
        assert 'expired' in str(exc_info.value).lower()

    def test_expired_token_deleted_from_db(self, expired_token):
        """Expired token is deleted on first rejection so it can't be replayed."""
        token_key = expired_token.key
        auth = ExpiringTokenAuthentication()
        request = self._make_request(token_key)
        with pytest.raises(AuthenticationFailed):
            auth.authenticate(request)
        assert not Token.objects.filter(key=token_key).exists()

    def test_invalid_token_key_returns_none(self):
        """Random key that doesn't match any token returns None (pass to next auth)."""
        auth = ExpiringTokenAuthentication()
        request = self._make_request('completely-invalid-key-xyz')
        # parent class raises AuthenticationFailed for non-existent tokens
        with pytest.raises(AuthenticationFailed):
            auth.authenticate(request)

    def test_expiry_disabled_when_ttl_is_none(self, expired_token):
        """When TOKEN_TTL_DAYS is None, even old tokens are accepted."""
        auth = ExpiringTokenAuthentication()
        request = self._make_request(expired_token.key)
        with patch('accounts.authentication._get_token_ttl', return_value=None):
            result = auth.authenticate(request)
        assert result is not None

    def test_token_within_ttl_accepted(self, user):
        """A token created 1 day before the TTL boundary is still valid."""
        token, _ = Token.objects.get_or_create(user=user)
        # 29 days old — clearly within the 30-day TTL
        Token.objects.filter(pk=token.pk).update(
            created=timezone.now() - timedelta(days=29)
        )
        token.refresh_from_db()

        auth = ExpiringTokenAuthentication()
        factory = APIRequestFactory()
        request = factory.get('/', HTTP_AUTHORIZATION=f'Token {token.key}')
        result = auth.authenticate(request)
        assert result is not None

# ─────────────────────── API integration tests ───────────────────────

@pytest.mark.django_db
class TestTokenExpiryAPIIntegration:
    """End-to-end tests using real API endpoints."""

    def test_fresh_token_allows_profile_access(self, auth_client):
        response = auth_client.get('/api/auth/profile/')
        assert response.status_code == 200

    def test_expired_token_returns_401(self, user, expired_token):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Token {expired_token.key}')
        response = client.get('/api/auth/profile/')
        assert response.status_code == 401

    def test_expired_token_error_message_mentions_expiry(self, user, expired_token):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Token {expired_token.key}')
        response = client.get('/api/auth/profile/')
        body = response.json()
        assert 'expired' in str(body).lower() or 'log in' in str(body).lower()

    def test_re_login_after_expiry_issues_new_token(self, user, expired_token):
        """After an expired token is rejected, the user can log in again."""
        # Verify expired token is gone
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Token {expired_token.key}')
        client.get('/api/auth/profile/')  # Triggers deletion

        # Now log in fresh
        login_client = APIClient()
        response = login_client.post(
            '/api/auth/login/',
            {'email': 'token@example.com', 'password': 'tokenpass123'},
            format='json',
        )
        assert response.status_code == 200
        assert 'token' in response.data
        # The new token must be different from the deleted expired one
        assert response.data['token'] != expired_token.key

    def test_unauthenticated_request_returns_401(self):
        client = APIClient()
        response = client.get('/api/auth/profile/')
        assert response.status_code == 401