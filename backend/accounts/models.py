# FILE: accounts/models.py
# PURPOSE: CustomUser model extending AbstractUser with nutrition profile fields.
from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from simple_history.models import HistoricalRecords

import secrets

def _calculate_age(date_of_birth):
    """Calculate age in years from a date_of_birth. Returns None if not provided."""
    if not date_of_birth:
        return None
    today = timezone.now().date()
    age = today.year - date_of_birth.year
    if (today.month, today.day) < (date_of_birth.month, date_of_birth.day):
        age -= 1
    return age

class ActiveUserManager(UserManager):
    """Default manager that automatically excludes soft-deleted users."""
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)

class User(AbstractUser):
    """
    Custom User model that extends Django's built-in AbstractUser.

    Adds:
    - Nutrition tracking fields (calorie/macro targets, physical stats)
    - Google OAuth support (google_id, auth_provider)
    - Legal consent tracking (GDPR/CCPA)
    - Email verification flag
    - Soft delete support
    - Audit trail via django-simple-history
    """

    # ── Email ─────────────────────────────────────────────────────────────────
    email = models.EmailField(unique=True)

    # ── Profile ───────────────────────────────────────────────────────────────
    display_name = models.CharField(max_length=100, null=True, blank=True)
    bio = models.TextField(max_length=500, null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)

    # ── Age Verification ──────────────────────────────────────────────────────
    date_of_birth = models.DateField(null=True, blank=True, help_text="Date of birth for age verification")

    # ── Physical Stats ────────────────────────────────────────────────────────
    age = models.IntegerField(null=True, blank=True, help_text="Deprecated: Calculate from date_of_birth instead")
    gender = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        choices=[
            ('male',   'Male'),
            ('female', 'Female'),
            ('other',  'Other'),
        ],
    )
    height = models.FloatField(null=True, blank=True, help_text="Height in cm")
    weight = models.FloatField(null=True, blank=True, help_text="Deprecated: Use WeightLog model for current weight")

    # ── Nutrition Goals ───────────────────────────────────────────────────────
    goal_weight = models.FloatField(null=True, blank=True)
    activity_level = models.CharField(max_length=20, null=True, blank=True)
    goal = models.CharField(max_length=20, null=True, blank=True)  # lose / maintain / gain
    rate = models.CharField(max_length=20, null=True, blank=True)  # slow / moderate / aggressive
    calorie_target = models.IntegerField(null=True, blank=True)
    # Date when the user last set/changed their goal — used to anchor the progress bar start weight
    goal_set_date = models.DateField(null=True, blank=True, help_text="Date the current goal was set; used to reset the progress bar")

    # ── Macro Targets ─────────────────────────────────────────────────────────
    protein_target = models.IntegerField(null=True, blank=True)
    carbs_target = models.IntegerField(null=True, blank=True)
    fat_target = models.IntegerField(null=True, blank=True)
    fiber_target = models.IntegerField(null=True, blank=True, help_text="Daily fiber target in grams (default 25g)")
    macro_preset = models.CharField(max_length=20, default='balanced', null=True, blank=True)
    
    # Coach Check-in preference
    checkin_day = models.CharField(
        max_length=15, 
        default='Sunday', 
        choices=[
            ('Monday', 'Monday'), ('Tuesday', 'Tuesday'), ('Wednesday', 'Wednesday'),
            ('Thursday', 'Thursday'), ('Friday', 'Friday'), ('Saturday', 'Saturday'),
            ('Sunday', 'Sunday')
        ]
    )

    # ── OAuth ─────────────────────────────────────────────────────────────────
    google_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    # 'email' = signed up with email/password, 'google' = signed up with Google OAuth
    auth_provider = models.CharField(max_length=20, default='email', null=True, blank=True)

    # ── Legal Consent (GDPR/CCPA) ─────────────────────────────────────────────
    privacy_policy_accepted = models.BooleanField(default=False)
    privacy_policy_accepted_date = models.DateTimeField(null=True, blank=True)
    terms_accepted = models.BooleanField(default=False)
    terms_accepted_date = models.DateTimeField(null=True, blank=True)
    parental_consent_provided = models.BooleanField(default=False, help_text="For users under 18")

    # ── Email Verification ────────────────────────────────────────────────────
    # Starts as False for email/password signups — set to True after OTP verification
    # Google OAuth users start as True (Google already verified the email)
    email_verified = models.BooleanField(
        default=True,
        help_text="True for verified email or Google OAuth users. New email signups start False."
    )

    # ── Soft Delete ───────────────────────────────────────────────────────────
    # Instead of deleting the row, we flag it as deleted
    # This preserves data integrity (foreign keys, audit logs, etc.)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    # Automatically track every change to this model (who changed what, when)
    history = HistoricalRecords()

    # Use email as the login field instead of Django's default username
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    # Active manager excludes soft-deleted users by default.
    # Use User.all_objects.all() when you explicitly need deleted users.
    objects = ActiveUserManager()
    all_objects = models.Manager()

    class Meta:
        indexes = [
            models.Index(fields=['is_deleted', 'email']),
            models.Index(fields=['date_of_birth']),
        ]

    def clean(self):
        """
        Model-level validation — runs when saving via forms or serializers.
        Validates age (must be 13+) and macro/calorie consistency.
        """
        super().clean()
        if self.date_of_birth:
            today = timezone.now().date()
            if self.date_of_birth > today:
                raise ValidationError("Date of birth cannot be in the future")

            age = _calculate_age(self.date_of_birth)

            # COPPA compliance — minimum age is 13
            if age < 13:
                raise ValidationError("Users must be at least 13 years old")

        # Sanity check: macros should add up roughly to the calorie target
        # (protein=4 kcal/g, carbs=4 kcal/g, fat=9 kcal/g)
        if all([self.calorie_target, self.protein_target, self.carbs_target, self.fat_target]):
            calculated_calories = (
                (self.protein_target * 4) +
                (self.carbs_target * 4) +
                (self.fat_target * 9)
            )
            tolerance = self.calorie_target * 0.1  # allow 10% variance
            if abs(calculated_calories - self.calorie_target) > tolerance:
                raise ValidationError(
                    f"Macro targets ({calculated_calories} kcal) don't align with "
                    f"calorie target ({self.calorie_target} kcal)"
                )

    @property
    def is_onboarded(self) -> bool:
        """
        True when the user has completed the onboarding wizard.
        Requires at minimum: height and goal.
        """
        return bool(self.height and self.goal)

    def __str__(self):
        return self.email

    def get_current_weight(self):
        """Return the most recent weight from WeightLog, or the legacy weight field."""
        latest_log = self.weight_logs.order_by('-date').first()
        return float(latest_log.weight) if latest_log else self.weight

    def get_age(self):
        """Calculate current age from date_of_birth. Falls back to stored age field."""
        return _calculate_age(self.date_of_birth) if self.date_of_birth else self.age

class EmailVerificationOTP(models.Model):
    """
    Stores the OTP sent to a user's email after signup.

    Flow:
    1. User signs up → create_for_user() generates a random 6-digit OTP
    2. Plain OTP is emailed to the user and stored
    3. User submits the code → verify() compares it directly
    4. On success: user.email_verified = True, this record is deleted

    - OTP expires after 10 minutes (OTP_EXPIRY_MINUTES)
    - Locked after 5 failed attempts (MAX_ATTEMPTS) — prevents brute force
    - Deleted immediately after successful use — can't be reused
    - OneToOne with User — only one active OTP per user at a time
    """
    OTP_EXPIRY_MINUTES = 10  # OTP is invalid after this many minutes
    MAX_ATTEMPTS = 5          # lock out after this many wrong guesses

    # OneToOneField means each user can only have one active verification OTP
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='email_verification_otp')

    otp = models.CharField(max_length=6, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()  # set to created_at + 10 minutes

    # How many wrong codes the user has submitted
    attempts = models.IntegerField(default=0)

    # True after the OTP has been used — prevents reuse
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    @classmethod
    def create_for_user(cls, user):
        """
        Generate a new OTP for the user.

        Steps:
        1. Delete any existing OTP for this user (can only have one at a time)
        2. Generate a cryptographically random 6-digit number
        3. Store the OTP and return both the instance and the plain OTP

        Returns: (EmailVerificationOTP instance, plain_otp string)
        """
        # Remove any old OTP first — user can only have one active at a time
        cls.objects.filter(user=user).delete()

        # secrets.randbelow is cryptographically secure (unlike random.randint)
        # f"{n:06d}" zero-pads to always get 6 digits, e.g. "007341"
        plain_otp = f"{secrets.randbelow(1_000_000):06d}"

        instance = cls.objects.create(
            user=user,
            otp=plain_otp,
            expires_at=timezone.now() + timedelta(minutes=cls.OTP_EXPIRY_MINUTES),
        )
        return instance, plain_otp

    def is_expired(self):
        """True if the OTP's 10-minute window has passed."""
        return timezone.now() > self.expires_at

    def is_locked(self):
        """True if the user has made too many wrong guesses (brute-force protection)."""
        return self.attempts >= self.MAX_ATTEMPTS

    def verify(self, plain_otp: str) -> bool:
        """
        Check if the submitted OTP is correct.

        Returns True on success, False on any failure.
        On failure, increments the attempt counter (up to MAX_ATTEMPTS).
        On success, marks the OTP as used (prevents reuse).
        """
        # Reject if already used, expired, or too many wrong attempts
        if self.is_used or self.is_expired() or self.is_locked():
            return False

        if self.otp != plain_otp:
            # Wrong code — increment attempt counter
            self.attempts += 1
            self.save(update_fields=['attempts'])
            return False

        # Correct code — mark as used so it can't be submitted again
        self.is_used = True
        self.save(update_fields=['is_used'])
        return True

class PasswordResetOTP(models.Model):
    """
    Stores the OTP for password reset requests.

    Flow:
    1. User requests reset → create_for_user() generates OTP, emails it
    2. User submits OTP → verify() checks it directly
    3. On OTP success: a short-lived reset_token is generated and stored
    4. User submits reset_token + new password → reset is confirmed
    5. All auth tokens are invalidated (forces re-login on all devices)
    6. This record is deleted

    Two-token design:
    - OTP (6 digits): user types this from their email
    - reset_token (random URL-safe string): passed automatically by the frontend
      between Step 2 and Step 3 — user never sees it
    This prevents someone from skipping Step 2 and going straight to Step 3.

    - OTP expires in 10 minutes
    - reset_token expires in 15 minutes
    - Locked after 5 wrong OTP attempts
    - All records deleted after successful reset
    """
    OTP_EXPIRY_MINUTES = 10          # OTP must be used within 10 minutes
    RESET_TOKEN_EXPIRY_MINUTES = 15  # reset_token must be used within 15 minutes
    MAX_ATTEMPTS = 5                  # brute-force lockout after 5 wrong OTPs

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_otps')

    otp = models.CharField(max_length=6, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    # True after verify() succeeds — OTP can't be used again
    is_used = models.BooleanField(default=False)

    # How many wrong OTP guesses have been made
    attempts = models.IntegerField(default=0)

    # Generated after OTP is verified — authorises the final password change
    # User never sees this — it's passed in the API request automatically
    reset_token = models.CharField(max_length=64, null=True, blank=True)
    reset_token_expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    @classmethod
    def create_for_user(cls, user):
        """
        Invalidate any existing reset OTPs for this user and create a fresh one.
        Returns (instance, plain_otp). The plain OTP is emailed and stored.
        """
        # Delete unused OTPs — user can only have one active reset at a time
        cls.objects.filter(user=user, is_used=False).delete()

        plain_otp = f"{secrets.randbelow(1_000_000):06d}"
        instance = cls.objects.create(
            user=user,
            otp=plain_otp,
            expires_at=timezone.now() + timedelta(minutes=cls.OTP_EXPIRY_MINUTES),
        )
        return instance, plain_otp

    def is_expired(self):
        """True if the OTP's 10-minute window has passed."""
        return timezone.now() > self.expires_at

    def is_locked(self):
        """True if the user has made too many wrong OTP guesses."""
        return self.attempts >= self.MAX_ATTEMPTS

    def verify(self, plain_otp: str) -> bool:
        """
        Check the submitted OTP. On success:
        - Generates a secure reset_token (15-minute TTL)
        - Marks the OTP as used
        - Returns True

        The reset_token is what authorises the final password change in Step 3.
        """
        if self.is_used or self.is_expired() or self.is_locked():
            return False

        if self.otp != plain_otp:
            self.attempts += 1
            self.save(update_fields=['attempts'])
            return False

        # OTP is correct — issue a short-lived reset token for Step 3
        # token_urlsafe(32) gives a 43-character URL-safe random string
        self.reset_token = secrets.token_urlsafe(32)
        self.reset_token_expires_at = timezone.now() + timedelta(minutes=self.RESET_TOKEN_EXPIRY_MINUTES)
        self.is_used = True
        self.save(update_fields=['reset_token', 'reset_token_expires_at', 'is_used'])
        return True
