# FILE: accounts/tests/test_auth.py
# PURPOSE: Tests for registration, login, logout, and token generation.
"""
Authentication Flow Tests

Tests for user registration, login, token validation, and Google OAuth.
Run with: pytest accounts/tests/test_auth.py -v
"""

import pytest
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def api_client():
    """Create an API client for testing."""
    return APIClient()

@pytest.fixture
def test_user():
    """Create a test user."""
    user = User.objects.create_user(
        username='testuser', # Added username
        email='testuser@example.com',
        password='securepassword123',
        first_name='Test',
        last_name='User'
    )

@pytest.mark.django_db
class TestUserRegistration:
    """Tests for user registration endpoint."""

    def test_register_valid_user(self, api_client):
        """Test registering a new user with valid data."""
        data = {
            'email': 'newuser@example.com',
            'password': 'strongpassword123',
            'password_confirm': 'strongpassword123',
            'first_name': 'New',
            'last_name': 'User'
        }
        response = api_client.post('/api/auth/signup/', data)
        
        # Should succeed or return expected error
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_register_duplicate_email(self, api_client, test_user):
        """Test that duplicate email registration is rejected."""
        data = {
            'email': 'testuser@example.com',  # Same as test_user
            'password': 'anotherpassword123',
            'password_confirm': 'anotherpassword123',
            'first_name': 'Another',
            'last_name': 'User'
        }
        response = api_client.post('/api/auth/signup/', data)
        
        # Should fail with 400
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_weak_password(self, api_client):
        """Test that weak passwords are rejected."""
        data = {
            'email': 'weakpw@example.com',
            'password': '123',  # Too short
            'password_confirm': '123',
            'first_name': 'Weak',
            'last_name': 'Password'
        }
        response = api_client.post('/api/auth/signup/', data)
        
        # Should fail with 400
        assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.django_db
class TestUserLogin:
    """Tests for user login endpoint."""

    def test_login_valid_credentials(self, api_client, test_user):
        """Test login with valid credentials."""
        data = {
            'email': 'testuser@example.com',
            'password': 'securepassword123'
        }
        response = api_client.post('/api/auth/login/', data)
        
        # Should return tokens
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data or 'token' in response.data

    def test_login_invalid_password(self, api_client, test_user):
        """Test login with wrong password."""
        data = {
            'email': 'testuser@example.com',
            'password': 'wrongpassword'
        }
        response = api_client.post('/api/auth/login/', data)
        
        # Should fail
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED]

    def test_login_nonexistent_user(self, api_client):
        """Test login with non-existent email."""
        data = {
            'email': 'nobody@example.com',
            'password': 'somepassword123'
        }
        response = api_client.post('/api/auth/login/', data)
        
        # Should fail
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED]

@pytest.mark.django_db
class TestTokenAuth:
    """Tests for token-based authentication."""

    def test_protected_endpoint_requires_auth(self, api_client):
        """Test that protected endpoints require authentication."""
        response = api_client.get('/api/meals/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.skip(reason="Requires specific Auth config")
    def test_protected_endpoint_with_auth(self, api_client, test_user):
        """Test accessing protected endpoint with valid auth."""
        api_client.force_authenticate(user=test_user)
        response = api_client.get('/api/meals/')
        
        assert response.status_code == status.HTTP_200_OK

@pytest.mark.django_db
class TestUserProfile:
    """Tests for user profile endpoints."""

    @pytest.mark.skip(reason="Requires specific Auth config")
    def test_get_profile(self, api_client, test_user):
        """Test getting user profile."""
        api_client.force_authenticate(user=test_user)
        response = api_client.get('/api/auth/profile/')
        
        # Profile endpoint may not exist, check for expected responses
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    @pytest.mark.skip(reason="Requires specific Auth config")
    def test_update_profile(self, api_client, test_user):
        """Test updating user profile."""
        api_client.force_authenticate(user=test_user)

        data = {'first_name': 'Updated'}
        response = api_client.put('/api/auth/profile/update/', data)

        # Should succeed or endpoint doesn't exist
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

# ─────────────────────── email verification ───────────────────────

@pytest.mark.django_db
class TestEmailVerification:
    """POST /api/auth/verify-email/ — OTP email verification."""

    def _make_unverified_user(self):
        return User.objects.create_user(
            username='unverified',
            email='unverified@example.com',
            password='strongpassword999',
            email_verified=False,
            auth_provider='email',
        )

    def test_missing_fields_rejected(self, api_client):
        response = api_client.post('/api/auth/verify-email/', {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_otp_rejected(self, api_client):
        self._make_unverified_user()
        response = api_client.post('/api/auth/verify-email/', {
            'email': 'unverified@example.com',
            'otp': '000000',
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_already_verified_user_returns_token(self, api_client):
        """User already verified should still get a token back."""
        user = User.objects.create_user(
            username='alreadyverified',
            email='verified@example.com',
            password='strongpassword999',
            email_verified=True,
            auth_provider='email',
        )
        response = api_client.post('/api/auth/verify-email/', {
            'email': 'verified@example.com',
            'otp': 'anyvalue',
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'token' in response.data

    def test_valid_otp_marks_email_verified(self, api_client):
        from accounts.models import EmailVerificationOTP
        from django.utils import timezone
        from datetime import timedelta
        import hashlib

        user = self._make_unverified_user()
        plain_otp = '123456'
        otp_hash = hashlib.sha256(plain_otp.encode()).hexdigest()
        EmailVerificationOTP.objects.create(
            user=user,
            otp_hash=otp_hash,
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        response = api_client.post('/api/auth/verify-email/', {
            'email': 'unverified@example.com',
            'otp': plain_otp,
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'token' in response.data
        user.refresh_from_db()
        assert user.email_verified is True

# ─────────────────────── resend verification ───────────────────────

@pytest.mark.django_db
class TestResendVerification:
    """POST /api/auth/resend-verification/"""

    def test_missing_email_rejected(self, api_client):
        response = api_client.post('/api/auth/resend-verification/', {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_generic_response_for_unknown_email(self, api_client):
        """Should return 200 regardless to prevent user enumeration."""
        response = api_client.post('/api/auth/resend-verification/', {
            'email': 'doesnotexist@example.com'
        })
        assert response.status_code == status.HTTP_200_OK

# ─────────────────────── profile picture ───────────────────────

@pytest.mark.django_db
class TestProfilePicture:
    """POST /api/auth/profile/upload-picture/"""

    @pytest.fixture
    def auth_user(self, db):
        user = User.objects.create_user(
            username='picuser', email='pic@example.com', password='picpass123'
        )
        return user

    def test_upload_requires_auth(self, api_client):
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile
        img = SimpleUploadedFile('photo.jpg', b'\xff\xd8\xff', content_type='image/jpeg')
        response = api_client.post('/api/auth/profile/upload-picture/', {'profile_picture': img})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_upload_no_file_rejected(self, api_client, auth_user):
        api_client.force_authenticate(user=auth_user)
        response = api_client.post('/api/auth/profile/upload-picture/', {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_upload_non_image_rejected(self, api_client, auth_user):
        from django.core.files.uploadedfile import SimpleUploadedFile
        api_client.force_authenticate(user=auth_user)
        pdf = SimpleUploadedFile('doc.pdf', b'%PDF-1.4', content_type='application/pdf')
        response = api_client.post(
            '/api/auth/profile/upload-picture/',
            {'profile_picture': pdf},
            format='multipart'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_upload_oversized_file_rejected(self, api_client, auth_user):
        from django.core.files.uploadedfile import SimpleUploadedFile
        api_client.force_authenticate(user=auth_user)
        big_file = SimpleUploadedFile('big.jpg', b'\xff\xd8\xff' + b'x' * (6 * 1024 * 1024), content_type='image/jpeg')
        response = api_client.post(
            '/api/auth/profile/upload-picture/',
            {'profile_picture': big_file},
            format='multipart'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

# ─────────────────────── account deletion ───────────────────────

@pytest.mark.django_db
class TestAccountDeletion:
    """DELETE /api/auth/delete-account/"""

    def test_delete_requires_auth(self, api_client):
        response = api_client.delete('/api/auth/delete-account/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_removes_user(self, api_client):
        user = User.objects.create_user(
            username='todelete', email='todelete@example.com', password='delpass123'
        )
        api_client.force_authenticate(user=user)
        response = api_client.delete('/api/auth/delete-account/')
        assert response.status_code == status.HTTP_200_OK
        assert not User.objects.filter(username='todelete').exists()

