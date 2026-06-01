# FILE: accounts/serializers.py
# PURPOSE: DRF serializers for registration, login, profile, and password reset.
# Serializers are like translators:
#   - They validate incoming JSON from the frontend
#   - They convert Python objects to JSON for the response
#   - They can also create/update database records

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from datetime import date

# get_user_model() returns our custom User class (accounts/models.py)
# Always use this instead of importing User directly — safer for custom user models
User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for reading and updating a user's profile.

    Used by:
    - GET  /api/auth/profile/        → return current user's data
    - PUT  /api/auth/profile/update/ → update profile fields
    - Any response that needs to include user info (login, signup, verify-email)
    """

    # read_only=True — this field is always set by Django, never by the user
    date_joined = serializers.DateTimeField(read_only=True)

    # SerializerMethodField calls get_weight() below instead of reading a DB column
    # We use this because weight is stored in WeightLog, not on the User model
    weight = serializers.SerializerMethodField()

    # is_onboarded is a Python @property on the User model, not a DB column
    is_onboarded = serializers.BooleanField(read_only=True)

    # profile_picture needs special handling to build an absolute URL
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        # Only these fields are included in the JSON response
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "bio",
            "profile_picture",
            "age",
            "gender",
            "height",
            "weight",
            "goal_weight",
            "activity_level",
            "goal",
            "rate",
            "calorie_target",
            "protein_target",
            "carbs_target",
            "fat_target",
            "fiber_target",
            "macro_preset",
            "checkin_day",
            "date_joined",
            "date_of_birth",
            "privacy_policy_accepted",
            "terms_accepted",
            "parental_consent_provided",
            "is_onboarded",
        ]
        # These fields can never be changed by the user via the API
        read_only_fields = ["id", "email", "date_joined", "privacy_policy_accepted_date", "terms_accepted_date"]

    def get_weight(self, obj):
        """
        Return the user's most recent weight from the WeightLog table.
        Falls back to the (deprecated) weight field on User if no logs exist.
        """
        return obj.get_current_weight()

    def get_profile_picture(self, obj):
        """
        Return a full absolute URL for the profile picture.
        e.g. "http://localhost:8000/media/profile_pictures/abc.jpg"
        Returns None if no picture has been uploaded.
        """
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None

    def update(self, instance, validated_data):
        # ── Added today: Goal Change Tracking ──
        # Automatically stamp the current date into `goal_set_date` whenever the user
        # updates their goal or goal_weight from the Profile Settings.
        # This allows the Coach progress bar to reset its "start weight" to today.
        goal_changed = False
        if 'goal' in validated_data and validated_data['goal'] != instance.goal:
            goal_changed = True
        if 'goal_weight' in validated_data and validated_data['goal_weight'] != instance.goal_weight:
            goal_changed = True

        instance = super().update(instance, validated_data)

        if goal_changed:
            instance.goal_set_date = date.today()
            instance.save(update_fields=['goal_set_date'])

        return instance

class SignupSerializer(serializers.ModelSerializer):
    """
    Serializer for new user registration.

    Used by: POST /api/auth/signup/

    Key behaviours:
    - password is write_only (never sent back in a response)
        - validate_email() rejects duplicate emails via case-insensitive lookup
    - create() calls Django's create_user() which hashes the password automatically
    """

    # write_only=True — password is accepted as input but never returned in responses
    # min_length=10 — enforced at the serializer level before create() runs
    password = serializers.CharField(write_only=True, min_length=10)

    # Remove the auto-added unique validator — create() handles username deduplication
    # by appending a counter (e.g. "john" → "john1") before saving to the DB.
    # Without this override, ModelSerializer injects a UniqueValidator that raises
    # "A user with that username already exists." before create() ever runs.
    username = serializers.CharField(required=False, validators=[])

    # These fields are optional — the frontend may or may not send them
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    privacy_policy_accepted = serializers.BooleanField(required=False, default=False)
    terms_accepted = serializers.BooleanField(required=False, default=False)
    parental_consent_provided = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = User
        # Only these fields are allowed during signup — prevents mass assignment attacks
        fields = [
            "email",
            "username",
            "password",
            "first_name",
            "last_name",
            "date_of_birth",
            "age",
            "gender",
            "height",
            "weight",
            "goal_weight",
            "activity_level",
            "goal",
            "rate",
            "calorie_target",
            "privacy_policy_accepted",
            "terms_accepted",
            "parental_consent_provided",
        ]

    def validate_email(self, value):
        """Reject signup if an account with this email already exists."""
        from .backends import get_user_by_email
        if get_user_by_email(value) is not None:
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_date_of_birth(self, value):
        """
        Reject users who are under the minimum age (default 13 — COPPA compliance).
        MINIMUM_USER_AGE can be overridden in settings.py.
        """
        if value:
            today = date.today()
            # Calculate age — subtract 1 if birthday hasn't happened yet this year
            age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))

            minimum_age = getattr(settings, 'MINIMUM_USER_AGE', 13)
            if age < minimum_age:
                raise serializers.ValidationError(
                    f"You must be at least {minimum_age} years old to use MacroTrack."
                )

        return value

    def validate(self, data):
        """
        Cross-field validation runs after all individual field validators pass.
        Legal consent is enforced by the frontend — we keep this flexible
        to support different signup flows (e.g. Google OAuth).
        """
        return data

    def create(self, validated_data):
        """
        Create and return a new User.

        IMPORTANT: We use create_user() instead of create() because
        create_user() calls set_password() which hashes the password using
        PBKDF2-SHA256 with a random salt before saving to the database.

        If we used create() directly, the plain-text password would be stored — a critical
        security vulnerability.
        """
        # Pop password out so it doesn't get passed as a plain field to create_user
        password = validated_data.pop("password")

        # Record exact timestamps when legal consent was given (GDPR requirement)
        if validated_data.get('privacy_policy_accepted'):
            validated_data['privacy_policy_accepted_date'] = timezone.now()

        if validated_data.get('terms_accepted'):
            validated_data['terms_accepted_date'] = timezone.now()

        # Auto-generate a unique username from the email prefix
        # e.g. "john@gmail.com" → "john", "john1" if "john" already exists
        # This prevents IntegrityError when two users share the same email prefix
        base_username = validated_data.get('username', validated_data.get('email', 'user').split('@')[0])
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
        validated_data['username'] = username

        # create_user() = create() + set_password() (hashes the password)
        user = User.objects.create_user(
            password=password,
            **validated_data,
        )
        return user

class LoginSerializer(serializers.Serializer):
    """
    Serializer for validating login credentials.

    Used by: POST /api/auth/login/

    Only validates the shape and basic constraints of the input.
    The actual authentication (checking the password) is done in the view
    using Django's authenticate() function.
    """

    email = serializers.EmailField()
    # write_only=True — password is never included in any response
    password = serializers.CharField(write_only=True, min_length=10)
