# FILE: accounts/tests/test_password_reset.py
# PURPOSE: Tests for password reset token generation and consumption.
"""
Password Reset Flow Tests

Tests for the OTP-based password reset:
  - PasswordResetOTP model methods (create, verify, expiry, lock)
  - API endpoint: send OTP → verify OTP → confirm reset
  - Email send failure is logged but returns generic 200 (no info leak)
  - Google OAuth users cannot reset password via OTP flow

Run with: pytest accounts/tests/test_password_reset.py -v
"""

import pytest
from unittest.mock import patch
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.cache import cache
from accounts.models import PasswordResetOTP

User = get_user_model()

# ─────────────────────── fixtures ───────────────────────

@pytest.fixture
def user(db):
    return User.objects.create_user(
        username='resetuser',
        email='reset@example.com',
        password='oldpassword123'
    )

# ─────────────────────── OTP model unit tests ───────────────────────

@pytest.mark.django_db
class TestPasswordResetOTPModel:
    """Low-level unit tests for PasswordResetOTP model methods."""

    def test_create_for_user_generates_six_digit_otp(self, user):
        instance, plain_otp = PasswordResetOTP.create_for_user(user)
        assert len(plain_otp) == 6
        assert plain_otp.isdigit()

    def test_create_for_user_stores_otp(self, user):
        instance, plain_otp = PasswordResetOTP.create_for_user(user)
        assert instance.otp == plain_otp

    def test_create_invalidates_previous_otps(self, user):
        """Calling create_for_user twice leaves only one active OTP."""
        PasswordResetOTP.create_for_user(user)
        PasswordResetOTP.create_for_user(user)
        assert PasswordResetOTP.objects.filter(user=user, is_used=False).count() == 1

    def test_verify_valid_otp_returns_true(self, user):
        instance, plain_otp = PasswordResetOTP.create_for_user(user)
        assert instance.verify(plain_otp) is True

    def test_verify_marks_otp_as_used(self, user):
        instance, plain_otp = PasswordResetOTP.create_for_user(user)
        instance.verify(plain_otp)
        instance.refresh_from_db()
        assert instance.is_used is True

    def test_verify_issues_reset_token(self, user):
        instance, plain_otp = PasswordResetOTP.create_for_user(user)
        instance.verify(plain_otp)
        instance.refresh_from_db()
        assert instance.reset_token is not None
        assert len(instance.reset_token) > 0

    def test_verify_wrong_otp_returns_false(self, user):
        instance, plain_otp = PasswordResetOTP.create_for_user(user)
        assert instance.verify('000000') is False

    def test_verify_wrong_otp_increments_attempts(self, user):
        instance, _ = PasswordResetOTP.create_for_user(user)
        instance.verify('000000')
        instance.refresh_from_db()
        assert instance.attempts == 1

    def test_verify_used_otp_returns_false(self, user):
        instance, plain_otp = PasswordResetOTP.create_for_user(user)
        instance.verify(plain_otp)  # First verify — marks as used
        assert instance.verify(plain_otp) is False  # Second attempt — rejected

    def test_is_expired_false_for_fresh_otp(self, user):
        instance, _ = PasswordResetOTP.create_for_user(user)
        assert instance.is_expired() is False

    def test_is_expired_true_after_expiry(self, user):
        instance, _ = PasswordResetOTP.create_for_user(user)
        # Manually backdate expiry
        instance.expires_at = timezone.now() - timedelta(seconds=1)
        instance.save()
        assert instance.is_expired() is True

    def test_verify_expired_otp_returns_false(self, user):
        instance, plain_otp = PasswordResetOTP.create_for_user(user)
        instance.expires_at = timezone.now() - timedelta(seconds=1)
        instance.save()
        assert instance.verify(plain_otp) is False

    def test_is_locked_after_max_attempts(self, user):
        instance, _ = PasswordResetOTP.create_for_user(user)
        instance.attempts = PasswordResetOTP.MAX_ATTEMPTS
        instance.save()
        assert instance.is_locked() is True

    def test_verify_locked_otp_returns_false(self, user):
        instance, plain_otp = PasswordResetOTP.create_for_user(user)
        instance.attempts = PasswordResetOTP.MAX_ATTEMPTS
        instance.save()
        assert instance.verify(plain_otp) is False

    def test_max_attempts_is_five(self):
        assert PasswordResetOTP.MAX_ATTEMPTS == 5

    def test_otp_expiry_is_ten_minutes(self):
        assert PasswordResetOTP.OTP_EXPIRY_MINUTES == 10

    def test_reset_token_expiry_is_fifteen_minutes(self):
        assert PasswordResetOTP.RESET_TOKEN_EXPIRY_MINUTES == 15

# ─────────────────────── API endpoint tests ───────────────────────

@pytest.mark.django_db
class TestPasswordResetAPI:
    """
    Tests for the password reset HTTP endpoints.
    The endpoints are: send OTP → verify OTP → confirm (set new password).
    """

    SEND_OTP_URL = '/api/auth/password-reset/request/'
    VERIFY_OTP_URL = '/api/auth/password-reset/verify-otp/'
    CONFIRM_URL = '/api/auth/password-reset/confirm/'

    def _client(self):
        from rest_framework.test import APIClient
        return APIClient()

    def test_send_otp_returns_200_for_valid_email(self, user):
        client = self._client()
        response = client.post(self.SEND_OTP_URL, {'email': 'reset@example.com'}, format='json')
        # Should succeed or indicate we should check email
        assert response.status_code in [200, 201, 202]

    def test_send_otp_for_unknown_email_does_not_reveal_existence(self, db):
        """
        Security: the API must NOT return a 404 for unknown emails
        (prevents user enumeration attacks).
        """
        client = self._client()
        response = client.post(self.SEND_OTP_URL, {'email': 'nobody@example.com'}, format='json')
        # Should return 200 (even if no email is sent) — not 404
        assert response.status_code != 404

    def test_verify_invalid_otp_returns_error(self, user):
        PasswordResetOTP.create_for_user(user)
        client = self._client()
        response = client.post(
            self.VERIFY_OTP_URL,
            {'email': 'reset@example.com', 'otp': '000000'},
            format='json'
        )
        assert response.status_code in [400, 401, 403]

    def test_verify_valid_otp_returns_reset_token(self, user):
        instance, plain_otp = PasswordResetOTP.create_for_user(user)
        client = self._client()
        response = client.post(
            self.VERIFY_OTP_URL,
            {'email': 'reset@example.com', 'otp': plain_otp},
            format='json'
        )
        assert response.status_code in [200, 201]
        assert 'reset_token' in response.data or 'token' in response.data

    def test_confirm_with_invalid_token_rejected(self, db):
        client = self._client()
        # The confirm endpoint expects 'password' (not 'new_password')
        response = client.post(
            self.CONFIRM_URL,
            {'reset_token': 'invalid-token-xyz', 'password': 'newstrongpassword123'},
            format='json'
        )
        assert response.status_code in [400, 401, 403, 404]

    def test_confirm_with_short_password_rejected(self, user):
        """Django's password validators reject passwords that are too short."""
        instance, plain_otp = PasswordResetOTP.create_for_user(user)
        instance.verify(plain_otp)
        instance.refresh_from_db()

        client = self._client()
        response = client.post(
            self.CONFIRM_URL,
            {'reset_token': instance.reset_token, 'password': 'short'},
            format='json'
        )
        assert response.status_code == 400

    def test_confirm_with_valid_token_resets_password(self, user):
        """Full happy-path: OTP verified → confirm → password updated."""
        instance, plain_otp = PasswordResetOTP.create_for_user(user)
        instance.verify(plain_otp)
        instance.refresh_from_db()

        client = self._client()
        new_password = 'newvalidpassword123'
        # The confirm endpoint uses 'password' field (not 'new_password')
        response = client.post(
            self.CONFIRM_URL,
            {'reset_token': instance.reset_token, 'password': new_password},
            format='json'
        )
        assert response.status_code in [200, 201]

        # Verify password actually changed in the database
        user.refresh_from_db()
        assert user.check_password(new_password)

# ─────────────────────── email delivery failure ───────────────────────

@pytest.mark.django_db
class TestOtpEmailDeliveryFailure:
    """
    When the email backend fails (e.g. SMTP down), the API must:
      - still return HTTP 200 (generic response — no info leak)
      - log an error server-side
    """

    SEND_OTP_URL = '/api/auth/password-reset/request/'

    @pytest.fixture(autouse=True)
    def clear_rate_limit_cache(self):
        """Clear the rate-limit cache key before each test to avoid 429s from prior tests."""
        cache.delete('ratelimit:password_reset_request:127.0.0.1')
        yield
        cache.delete('ratelimit:password_reset_request:127.0.0.1')

    def _client(self):
        from rest_framework.test import APIClient
        return APIClient()

    def test_email_failure_still_returns_200(self, user):
        """Even if send_otp_email returns False, response is generic 200."""
        client = self._client()
        with patch('accounts.views.send_otp_email', return_value=False):
            response = client.post(
                self.SEND_OTP_URL,
                {'email': 'reset@example.com'},
                format='json',
            )
        assert response.status_code == 200

    def test_email_failure_does_not_expose_error_details(self, user):
        """Response body must be the same generic message regardless of email failure."""
        client = self._client()
        with patch('accounts.views.send_otp_email', return_value=False):
            response = client.post(
                self.SEND_OTP_URL,
                {'email': 'reset@example.com'},
                format='json',
            )
        body = response.json()
        # Must not contain any server-side error information
        assert 'error' not in body
        assert 'exception' not in str(body).lower()

    def test_email_failure_still_creates_otp_record(self, user):
        """OTP is created before email is sent; failure doesn't roll back the OTP."""
        client = self._client()
        with patch('accounts.views.send_otp_email', return_value=False):
            client.post(
                self.SEND_OTP_URL,
                {'email': 'reset@example.com'},
                format='json',
            )
        assert PasswordResetOTP.objects.filter(user=user, is_used=False).exists()

    def test_email_failure_is_logged(self, user):
        """Server must log an error when email delivery fails."""
        client = self._client()
        with patch('accounts.views.send_otp_email', return_value=False), \
             patch('accounts.views.logger') as mock_logger:
            client.post(
                self.SEND_OTP_URL,
                {'email': 'reset@example.com'},
                format='json',
            )
        mock_logger.error.assert_called_once()

# ─────────────────────── Google OAuth users cannot reset password ───────────────────────

@pytest.mark.django_db
class TestGoogleOAuthPasswordReset:
    """
    Google OAuth users have no local password.
    The password reset flow must silently skip them (no OTP created, no email),
    but still return the generic 200 response to avoid leaking account info.
    """

    SEND_OTP_URL = '/api/auth/password-reset/request/'

    @pytest.fixture(autouse=True)
    def clear_rate_limit_cache(self):
        """Clear the rate-limit cache key before each test to avoid 429s from prior tests."""
        cache.delete('ratelimit:password_reset_request:127.0.0.1')
        yield
        cache.delete('ratelimit:password_reset_request:127.0.0.1')

    @pytest.fixture
    def google_user(self, db):
        user = User.objects.create_user(
            username='googleuser',
            email='google@example.com',
            password='unusable',
        )
        user.auth_provider = 'google'
        user.save()
        return user

    def _client(self):
        from rest_framework.test import APIClient
        return APIClient()

    def test_google_user_request_returns_200(self, google_user):
        client = self._client()
        response = client.post(
            self.SEND_OTP_URL,
            {'email': 'google@example.com'},
            format='json',
        )
        assert response.status_code == 200

    def test_no_otp_created_for_google_user(self, google_user):
        client = self._client()
        client.post(
            self.SEND_OTP_URL,
            {'email': 'google@example.com'},
            format='json',
        )
        assert PasswordResetOTP.objects.filter(user=google_user).count() == 0

    def test_no_email_sent_for_google_user(self, google_user):
        client = self._client()
        with patch('accounts.views.send_otp_email') as mock_send:
            client.post(
                self.SEND_OTP_URL,
                {'email': 'google@example.com'},
                format='json',
            )
        mock_send.assert_not_called()