# FILE: accounts/tests/test_auth_backend.py
# PURPOSE: Tests for the custom email/username authentication backend.
"""
Auth Backend Tests

Covers:
  - get_user_by_email() lookup (case-insensitive)
  - EmailBackend.authenticate() via email and username
  - is_onboarded property
  - UserSerializer exposes is_onboarded

Run with: pytest accounts/tests/test_auth_backend.py -v
"""

import pytest
from django.contrib.auth import authenticate, get_user_model

from accounts.backends import get_user_by_email

User = get_user_model()

# ─────────────────────── fixtures ───────────────────────

@pytest.fixture
def plain_user(db):
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='securepass123',
    )

@pytest.fixture
def onboarded_user(db):
    return User.objects.create_user(
        username='onboarded',
        email='onboarded@example.com',
        password='securepass123',
        height=175.0,
        goal='lose',
    )

@pytest.fixture
def incomplete_user(db):
    return User.objects.create_user(
        username='incomplete',
        email='incomplete@example.com',
        password='securepass123',
    )

# ─────────────────────── get_user_by_email ───────────────────────

@pytest.mark.django_db
class TestGetUserByEmail:

    def test_finds_user_by_email(self, plain_user):
        found = get_user_by_email('test@example.com')
        assert found is not None
        assert found.pk == plain_user.pk

    def test_case_insensitive_lookup(self, plain_user):
        found = get_user_by_email('TEST@EXAMPLE.COM')
        assert found is not None
        assert found.pk == plain_user.pk

    def test_strips_whitespace(self, plain_user):
        found = get_user_by_email('  test@example.com  ')
        assert found is not None
        assert found.pk == plain_user.pk

    def test_returns_none_for_unknown_email(self):
        assert get_user_by_email('nobody@example.com') is None

# ─────────────────────── EmailBackend.authenticate ───────────────────────

@pytest.mark.django_db
class TestEmailBackend:

    def test_authenticate_by_email_correct_password(self, plain_user, rf):
        request = rf.get('/')
        user = authenticate(request, username='test@example.com', password='securepass123')
        assert user is not None
        assert user.pk == plain_user.pk

    def test_authenticate_by_username_correct_password(self, plain_user, rf):
        request = rf.get('/')
        user = authenticate(request, username='testuser', password='securepass123')
        assert user is not None
        assert user.pk == plain_user.pk

    def test_authenticate_wrong_password_returns_none(self, plain_user, rf):
        # plain_user fixture needed to create the user in DB
        request = rf.get('/')
        user = authenticate(request, username='test@example.com', password='wrongpassword')
        assert user is None

    def test_authenticate_unknown_email_returns_none(self, rf):
        request = rf.get('/')
        user = authenticate(request, username='ghost@example.com', password='anypassword')
        assert user is None

    def test_authenticate_inactive_user_returns_none(self, plain_user, rf):
        plain_user.is_active = False
        plain_user.save()
        request = rf.get('/')
        user = authenticate(request, username='test@example.com', password='securepass123')
        assert user is None

# ─────────────────────── is_onboarded property ───────────────────────

@pytest.mark.django_db
class TestIsOnboarded:

    def test_onboarded_user_returns_true(self, onboarded_user):
        assert onboarded_user.is_onboarded is True

    def test_incomplete_user_returns_false(self, incomplete_user):
        assert incomplete_user.is_onboarded is False

    def test_only_height_set_returns_false(self):
        user = User.objects.create_user(
            username='halfuser', email='half@example.com',
            password='pass12345', height=170.0,
        )
        assert user.is_onboarded is False

    def test_only_goal_set_returns_false(self):
        user = User.objects.create_user(
            username='goalonly', email='goal@example.com',
            password='pass12345', goal='maintain',
        )
        assert user.is_onboarded is False

    def test_becomes_true_after_update(self, incomplete_user):
        incomplete_user.height = 170.0
        incomplete_user.goal = 'gain'
        incomplete_user.save()
        assert incomplete_user.is_onboarded is True

# ─────────────────────── UserSerializer: is_onboarded ───────────────────────

@pytest.mark.django_db
class TestUserSerializerIsOnboarded:

    def test_serializer_includes_is_onboarded_true(self, onboarded_user):
        from accounts.serializers import UserSerializer
        data = UserSerializer(onboarded_user).data
        assert 'is_onboarded' in data
        assert data['is_onboarded'] is True

    def test_serializer_includes_is_onboarded_false(self, incomplete_user):
        from accounts.serializers import UserSerializer
        data = UserSerializer(incomplete_user).data
        assert 'is_onboarded' in data
        assert data['is_onboarded'] is False

    def test_is_onboarded_is_read_only(self, incomplete_user):
        from accounts.serializers import UserSerializer
        serializer = UserSerializer(
            incomplete_user,
            data={'is_onboarded': True},
            partial=True,
        )
        serializer.is_valid()
        assert 'is_onboarded' not in serializer.validated_data
