# FILE: accounts/views.py
# PURPOSE: Function-based views for accounts: register, login, profile, goal update, etc.
# Each function in this file handles one API endpoint.
# @api_view        — tells DRF which HTTP methods are allowed (GET, POST, etc.)
# @permission_classes([AllowAny])    — no login required (public endpoint)
# @permission_classes([IsAuthenticated]) — requires a valid token in the request header
# @ratelimit       — limits how many times an IP can call the endpoint (anti-abuse)

import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db.models import Count
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

from .serializers import SignupSerializer, LoginSerializer, UserSerializer
from .decorators import ratelimit
from .password_reset import generate_reset_token, verify_reset_token, send_password_reset_email, send_otp_email, send_verification_email
from .backends import get_user_by_email
from .models import PasswordResetOTP, EmailVerificationOTP

User = get_user_model()

@api_view(["POST"])
@permission_classes([AllowAny])   # anyone can sign up — no token needed
@ratelimit(max_attempts=5, window_seconds=300)  # max 5 signups per IP per 5 minutes
def signup(request):
    """
    POST /api/auth/signup/

    Creates a new user account from the signup form data.

    Two paths depending on auth_provider:
    - email/password: account is created but NOT activated yet.
      A 6-digit OTP is emailed. Frontend redirects to /verify-email.
      Returns: { needs_verification: True, email }

    - Google OAuth: account is already verified (Google did it).
      Returns a token immediately so the user is logged in right away.
      Returns: { token, user }
    """
    # Pass the request body through SignupSerializer for validation
    # This checks required fields, email uniqueness, age, password length, etc.
    serializer = SignupSerializer(data=request.data)

    if serializer.is_valid():
        try:
            # serializer.save() calls SignupSerializer.create()
            # which calls User.objects.create_user() — hashing the password
            user = serializer.save()
        except Exception:
            logger.exception("Unexpected error creating user during signup")
            return Response(
                {"error": "Account creation failed. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # ── Email/password signup path ────────────────────────────────────────
        if user.auth_provider == 'email':
            # Set email_verified to False — user must verify via OTP
            user.email_verified = False
            user.save(update_fields=['email_verified'])

            # Generate a random 6-digit OTP, hash it, store the hash
            # plain_otp is the actual code to email — it's not stored anywhere
            _otp_instance, plain_otp = EmailVerificationOTP.create_for_user(user)

            # Send the OTP to the user's email
            # In development (no EMAIL_* settings), this prints to the terminal
            email_sent = send_verification_email(user, plain_otp)
            if not email_sent:
                logger.warning("Could not send verification email to user %s — check EMAIL_* settings.", user.id)

            # Tell the frontend to redirect to /verify-email
            # No token is returned yet — user must verify first
            return Response(
                {
                    "needs_verification": True,
                    "email": user.email,
                    "message": "Account created. Please check your email for a verification code.",
                },
                status=status.HTTP_201_CREATED,
            )

        # ── Google OAuth path ─────────────────────────────────────────────────
        # Google already verified the email — skip OTP, issue token immediately
        # get_or_create avoids duplicate tokens if the user already has one
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "user": UserSerializer(user, context={'request': request}).data,
                "message": "User created successfully",
            },
            status=status.HTTP_201_CREATED,
        )

    # Validation failed — return field-level errors to the frontend
    # e.g. { "email": ["An account with this email already exists."] }
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@permission_classes([AllowAny])   # anyone can attempt login — no token needed
@ratelimit(max_attempts=10, window_seconds=300)  # max 10 login attempts per IP per 5 minutes
def login(request):
    """
    POST /api/auth/login/

    Authenticates an existing user with email + password.

    Steps:
    1. Validate the request body shape (LoginSerializer)
    2. Call Django's authenticate() — finds the user by email, checks password hash
    3. Check account is active and email is verified
    4. Return (or create) an auth token

    Returns: { token, user } on success
    Returns: { error } on failure
    Returns: { needs_verification, email } if email not yet verified (HTTP 403)
    """
    serializer = LoginSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data["email"]
    password = serializer.validated_data["password"]

    # authenticate() goes through AUTHENTICATION_BACKENDS in settings.py
    # Our custom backend looks up the user by email, then uses Django's
    # check_password() to compare against the PBKDF2-SHA256 hash stored in the DB
    user = authenticate(request, email=email, password=password)

    # None means either the email doesn't exist or the password was wrong
    # We give the same generic error for both — don't reveal which one failed
    if user is None:
        return Response(
            {"error": "Invalid credentials"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Account could be disabled by an admin
    if not user.is_active:
        return Response(
            {"error": "Account is disabled"},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Block login if the user signed up with email/password but never verified their email
    # Frontend will redirect them to /verify-email when it sees needs_verification: True
    if not user.email_verified:
        return Response(
            {
                "error": "Email not verified",
                "needs_verification": True,
                "email": user.email,
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # get_or_create: reuse existing token if valid, create one if none exists
    # The token is a random 40-character hex string stored in the authtoken_token table
    token, _ = Token.objects.get_or_create(user=user)

    return Response(
        {
            "token": token.key,
            "user": UserSerializer(user, context={'request': request}).data,
            "message": "Login successful",
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])  # must be logged in to log out
def logout(request):
    """
    POST /api/auth/logout/

    Deletes the user's auth token from the database.
    After this, any request using the old token will get HTTP 401.
    This effectively invalidates the session on all devices using that token.
    """
    try:
        # auth_token is the reverse relation from Token → User
        request.user.auth_token.delete()
        return Response({"message": "Logout successful"}, status=status.HTTP_200_OK)
    except Exception:
        logger.exception("Error deleting auth token for user %s during logout", request.user.id)
        return Response(
            {"error": "Logout failed. Please try again."},
            status=status.HTTP_400_BAD_REQUEST,
        )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    GET /api/auth/profile/
    Return the current user's profile.
    """
    serializer = UserSerializer(request.user, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """
    PUT /api/auth/profile/update/
    Partially update current user's profile.
    """
    logger.info(f"Profile update request from user {request.user.id}")
    logger.debug(f"Profile update fields: {list(request.data.keys())}")

    serializer = UserSerializer(request.user, data=request.data, partial=True)

    if serializer.is_valid():
        serializer.save()
        logger.info(f"Profile updated successfully for user {request.user.email}")
        return Response(serializer.data, status=status.HTTP_200_OK)

    logger.error(f"Profile update validation errors: {serializer.errors}")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def account_stats(request):
    """
    GET /api/auth/stats/

    Returns account-level statistics for the logged-in user.
    Called by the Dashboard (via profileService.getAccountStats) to get
    the authoritative meal-logging streak so the frontend doesn't have
    to compute it locally.

    Returns:
        200: {
            total_meals_logged (int)  — lifetime meal count,
            streak_days        (int)  — current consecutive-day streak,
            member_since       (str)  — e.g. "March 01, 2025"
        }

    HOW THE STREAK WORKS:
        1. Fetch all dates (newest first) on which the user logged at least one meal.
        2. If the most recent log is NOT today or yesterday → streak = 0
           (there was a gap so the streak has already broken)
        3. Otherwise start at 1 and walk backwards day by day.
           If each next date is exactly one day before the previous → keep counting.
           As soon as a gap appears → stop.
        Example: dates = [Apr 1, Mar 31, Mar 30, Mar 28]
                 streak = 3  (stops at Mar 28 because Mar 29 is missing)
    """
    from api.models import Meal  # Import here to avoid circular imports

    user = request.user
    # Get all meals for this user, newest first
    meals = Meal.objects.filter(user=user).order_by('-date')

    # Total lifetime meal count (shown on profile page)
    total_meals = meals.count()

    # ── STREAK CALCULATION ────────────────────────────────────────────────
    streak_days = 0
    if meals.exists():
        # Collapse multiple meals on the same day into one unique date
        # Result: ['2026-04-01', '2026-03-31', '2026-03-30', ...] (newest first)
        unique_dates = list(meals.values_list('date', flat=True).distinct().order_by('-date'))

        if unique_dates:
            current_date = unique_dates[0]  # Most recent date with a meal
            today = datetime.now().date()

            # A streak is only "alive" if the user logged something today or yesterday.
            # If the last log was 2+ days ago, the streak has already broken → stays 0.
            if current_date >= today - timedelta(days=1):
                streak_days = 1  # Start counting — we know at least one recent day exists

                # Walk backwards through the sorted unique dates
                for i in range(1, len(unique_dates)):
                    # What date do we expect next to keep the streak unbroken?
                    expected_date = current_date - timedelta(days=i)
                    if unique_dates[i] == expected_date:
                        streak_days += 1  # Consecutive — count it
                    else:
                        break             # Gap found — streak is over

    # Format the registration date as a readable string (e.g. "March 01, 2025")
    member_since = user.date_joined.strftime('%B %d, %Y') if user.date_joined else None

    return Response({
        'total_meals_logged': total_meals,
        'streak_days': streak_days,
        'member_since': member_since,
    }, status=status.HTTP_200_OK)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_account(request):
    """
    DELETE /api/auth/delete-account/
    Permanently delete the current user's account and all associated data.
    """
    user = request.user

    try:
        # Delete the user's token first
        user.auth_token.delete()
    except Exception:
        pass

    # Delete the user (cascades to meals, custom foods, etc.)
    user.delete()

    return Response({
        'message': 'Account deleted successfully'
    }, status=status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([AllowAny])
def google_auth(request):
    """
    POST /api/auth/google/
    Authenticate user with Google OAuth token.
    Creates new user if doesn't exist, logs in existing user.
    """
    from .google_auth import verify_google_token, get_or_create_google_user

    id_token = request.data.get('id_token')

    if not id_token:
        return Response(
            {'error': 'ID token is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Verify token with Google
        google_user_info = verify_google_token(id_token)

        # Get or create user
        user = get_or_create_google_user(google_user_info)

        # Create or get auth token
        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user': UserSerializer(user, context={'request': request}).data,
            'message': 'Google authentication successful',
        }, status=status.HTTP_200_OK)

    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception:
        logger.exception("Unexpected error during Google authentication")
        return Response(
            {'error': 'Authentication failed'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(["POST"])
@permission_classes([AllowAny])
@ratelimit(max_attempts=5, window_seconds=300)  # max 5 requests per IP per 5 minutes
def password_reset_request(request):
    """
    POST /api/auth/password-reset/request/

    Step 1 of password reset: user submits their email.
    Backend generates a 6-digit OTP and emails it.

    SECURITY — always returns the same generic message whether or not
    the email exists. This prevents "account enumeration" attacks where
    an attacker can discover which emails are registered by trying them.

    Google OAuth users are silently skipped — they have no local password.
    """
    email = request.data.get('email', '').strip()

    if not email:
        return Response(
            {'error': 'Email is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Build the response now — we always return this regardless of outcome
    generic_response = Response(
        {'message': 'If an account with that email exists, a verification code has been sent.'},
        status=status.HTTP_200_OK,
    )

    # Look up the user by case-insensitive email match
    user = get_user_by_email(email)
    if user is not None:
        # Skip Google OAuth users — they don't have a password to reset
        if user.auth_provider != 'google':
            # Generate OTP, hash and store it, email the plain version
            _otp_instance, plain_otp = PasswordResetOTP.create_for_user(user)
            email_sent = send_otp_email(user, plain_otp)
            if not email_sent:
                logger.error(
                    "OTP email delivery failed for user %s — check EMAIL_* settings.",
                    user.id,
                )

    # Always return the same response — never reveal if email exists
    return generic_response

@api_view(["POST"])
@permission_classes([AllowAny])
@ratelimit(max_attempts=10, window_seconds=300)  # 10 attempts per 5 minutes
def password_reset_verify_otp(request):
    """
    POST /api/auth/password-reset/verify-otp/

    Step 2 of password reset: user submits the 6-digit OTP from their email.

    On success:
    - OTP is marked as used (can't be submitted again)
    - A short-lived reset_token is generated (15-minute TTL)
    - reset_token is returned to the frontend for use in Step 3

    The reset_token acts as proof that the user passed Step 2.
    Without it, Step 3 (confirm) cannot be called.
    """
    email = request.data.get('email', '').strip()
    otp = request.data.get('otp', '').strip()

    if not email or not otp:
        return Response(
            {'error': 'Email and OTP are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = get_user_by_email(email)
    if user is None:
        # Return the same error as a wrong OTP — don't reveal the email doesn't exist
        return Response(
            {'error': 'Invalid or expired code'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get the most recent unused OTP for this user
    otp_record = (
        PasswordResetOTP.objects
        .filter(user=user, is_used=False)
        .order_by('-created_at')
        .first()
    )

    # verify() hashes the submitted OTP and compares to otp_hash in the DB
    # Also checks expiry (10 min) and attempt count (max 5)
    if otp_record is None or not otp_record.verify(otp):
        return Response(
            {'error': 'Invalid or expired code'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Return the reset_token — frontend passes this to Step 3
    return Response(
        {'reset_token': otp_record.reset_token},
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([AllowAny])
@ratelimit(max_attempts=5, window_seconds=300)  # 5 attempts per 5 minutes
def password_reset_confirm(request):
    """
    POST /api/auth/password-reset/confirm/

    Step 3 of password reset: user submits reset_token + new password.

    Steps:
    1. Look up the OTP record by reset_token (proves Step 2 was completed)
    2. Check reset_token hasn't expired (15-minute TTL)
    3. Run Django's password validators (length, not common, not all digits)
    4. Hash and save the new password (PBKDF2-SHA256)
    5. Delete ALL existing auth tokens — forces re-login on every device
    6. Delete the OTP record — reset_token can never be reused
    """
    reset_token = request.data.get('reset_token', '').strip()
    new_password = request.data.get('password', '')

    if not reset_token or not new_password:
        return Response(
            {'error': 'reset_token and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Look up the OTP record that was verified in Step 2
    # is_used=True means verify() was called successfully
    try:
        otp_record = PasswordResetOTP.objects.select_related('user').get(
            reset_token=reset_token,
            is_used=True,
        )
    except PasswordResetOTP.DoesNotExist:
        return Response(
            {'error': 'Invalid or expired reset token'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check the reset_token itself hasn't expired (15-minute window)
    if otp_record.reset_token_expires_at and timezone.now() > otp_record.reset_token_expires_at:
        return Response(
            {'error': 'Reset session has expired. Please request a new code.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = otp_record.user

    # Run Django's built-in password validators
    # (min length 10, not in common passwords list, not entirely numeric)
    try:
        validate_password(new_password, user=user)
    except ValidationError as e:
        return Response(
            {'error': e.messages},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Hash and save the new password using PBKDF2-SHA256
    user.set_password(new_password)
    user.save()

    # Delete ALL tokens for this user — security measure
    # Forces re-login on every device (phone, laptop, etc.)
    Token.objects.filter(user=user).delete()

    # Delete the OTP record — reset_token is now consumed and can never be reused
    PasswordResetOTP.objects.filter(user=user).delete()

    return Response(
        {'message': 'Password reset successfully. Please log in with your new password.'},
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([AllowAny])
@ratelimit(max_attempts=10, window_seconds=300)
def verify_email(request):
    """
    POST /api/auth/verify-email/

    Final step of email signup: user submits the 6-digit OTP from their email.

    On success:
    - email_verified is set to True on the User
    - The OTP record is deleted (can't be reused)
    - A fresh auth token is created
    - Token + user are returned so the frontend can log the user in immediately
    """
    email = request.data.get('email', '').strip()
    otp = request.data.get('otp', '').strip()

    if not email or not otp:
        return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)

    user = get_user_by_email(email)
    if user is None or user.auth_provider != 'email':
        return Response({'error': 'Invalid or expired code'}, status=status.HTTP_400_BAD_REQUEST)

    if user.email_verified:
        # Already verified — just return a token
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSerializer(user, context={'request': request}).data}, status=status.HTTP_200_OK)

    try:
        otp_record = EmailVerificationOTP.objects.get(user=user)
    except EmailVerificationOTP.DoesNotExist:
        return Response({'error': 'Invalid or expired code'}, status=status.HTTP_400_BAD_REQUEST)

    if not otp_record.verify(otp):
        return Response({'error': 'Invalid or expired code'}, status=status.HTTP_400_BAD_REQUEST)

    # Mark email as verified and clean up OTP
    user.email_verified = True
    user.save(update_fields=['email_verified'])
    otp_record.delete()

    token, _ = Token.objects.get_or_create(user=user)
    logger.info("Email verified for user %s", user.id)

    return Response(
        {'token': token.key, 'user': UserSerializer(user, context={'request': request}).data, 'message': 'Email verified. Welcome to MacroTrack!'},
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([AllowAny])
@ratelimit(max_attempts=5, window_seconds=300)
def resend_verification(request):
    """
    POST /api/auth/resend-verification/
    Resend the email verification OTP.
    """
    email = request.data.get('email', '').strip()

    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Generic response to avoid leaking whether an account exists
    generic_response = Response(
        {'message': 'If an unverified account exists with that email, a new code has been sent.'},
        status=status.HTTP_200_OK,
    )

    user = get_user_by_email(email)
    if user is not None and not user.email_verified and user.auth_provider == 'email':
        _otp_instance, plain_otp = EmailVerificationOTP.create_for_user(user)
        email_sent = send_verification_email(user, plain_otp)
        if not email_sent:
            logger.error("Verification email resend failed for user %s", user.id)

    return generic_response

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_picture(request):
    """
    POST /api/auth/profile/upload-picture/
    Upload or replace the user's profile picture.
    """
    if 'profile_picture' not in request.FILES:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

    file = request.FILES['profile_picture']

    if file.size > 5 * 1024 * 1024:  # 5 MB limit
        return Response({'error': 'File too large. Maximum size is 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)

    allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if file.content_type.lower() not in allowed_types:
        return Response({'error': 'Invalid file type. Use JPEG, PNG, WebP, or GIF.'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate image magic bytes to prevent content-type spoofing
    MAGIC_BYTES = {
        b'\xff\xd8\xff': 'image/jpeg',
        b'\x89PNG': 'image/png',
        b'RIFF': 'image/webp',
    }
    header = file.read(12)
    file.seek(0)
    magic_match = any(header.startswith(magic) for magic in MAGIC_BYTES)
    if not magic_match and b'ftyp' in header:
        magic_match = True
    if not magic_match:
        return Response({'error': 'File content does not match a supported image format.'}, status=status.HTTP_400_BAD_REQUEST)

    # Delete old picture to avoid orphaned files
    if request.user.profile_picture:
        request.user.profile_picture.delete(save=False)

    request.user.profile_picture = file
    request.user.save(update_fields=['profile_picture'])

    url = request.build_absolute_uri(request.user.profile_picture.url)
    return Response({'profile_picture': url}, status=status.HTTP_200_OK)