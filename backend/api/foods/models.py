# FILE: api/foods/models.py
# PURPOSE: Defines the Food model — the database table that stores
#          all food items (from USDA, FatSecret, and custom user entries).
# USED BY: api/meals/models.py, api/foods/service.py, api/ai/fatsecret_service.py,
#          api/models.py (re-exporter), api/admin.py
# KEY CLASSES:
#   Food — a single food item with per-100g nutrition macros
from decimal import Decimal, ROUND_HALF_UP

# Django's built-in ORM base class for all models
from django.db import models

# settings.AUTH_USER_MODEL lets us reference the User model without a hard import,
# which avoids circular import issues.
from django.conf import settings

# Validators ensure we never store negative nutrition values in the DB
from django.core.validators import MinValueValidator, MaxValueValidator

# simple_history tracks every change to a model row (audit log)
from simple_history.models import HistoricalRecords

class Food(models.Model):
    """
    Food model for storing food items from FatSecret API and custom user foods.

    All nutrition values are stored per 100 g so that portion calculations are
    always a simple multiplication:
        actual_nutrition = (food.calories * serving_grams) / 100

    The `source` field distinguishes between externally-fetched and user-created foods.
    The `search_count` field is used for cache popularity ordering.
    """

    # Allowed data source values for the `source` field
    SOURCE_CHOICES = [
        ('fatsecret', 'FatSecret Database'),
        ('custom', 'Custom User Entry'),
    ]

    # ------------------------------------------------------------------
    # Identity fields
    # ------------------------------------------------------------------

    # The human-readable name shown in search results and the diary
    name = models.CharField(max_length=500)

    # The ID from the external FatSecret API.
    # Null for custom user-created foods.
    fdc_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="External API ID (FatSecret food_id)"
    )

    # Which data source this food came from: 'fatsecret' or 'custom'
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default='fatsecret')

    # ------------------------------------------------------------------
    # Nutrition per 100 g (all values must be >= 0)
    # ------------------------------------------------------------------

    calories = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
        validators=[MinValueValidator(0, message="Calories cannot be negative")]
    )
    protein = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
        validators=[MinValueValidator(0, message="Protein cannot be negative")]
    )
    carbs = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
        validators=[MinValueValidator(0, message="Carbs cannot be negative")]
    )
    fat = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
        validators=[MinValueValidator(0, message="Fat cannot be negative")]
    )
    # Fiber is optional — many API entries don't include it
    fiber = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0, message="Fiber cannot be negative")]
    )

    # ------------------------------------------------------------------
    # Additional metadata
    # ------------------------------------------------------------------

    # Food category (e.g. 'protein', 'grains', 'vegetables', 'fruits')
    # Indexed for fast category-filtered searches
    category = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        db_index=True,
        help_text="Food category (protein, grains, vegetables, fruits, nuts, dairy)"
    )

    # e.g. "100g", "1 medium (120g)", "1 cup (240ml)"
    serving_description = models.CharField(max_length=200, default="100g")

    # ------------------------------------------------------------------
    # User tracking
    # ------------------------------------------------------------------

    # Only set for custom foods (source='custom').
    # SET_NULL means if the user is deleted, the food record survives.
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='custom_foods',
        help_text="Only set for custom foods"
    )

    # True for USDA/FatSecret foods or admin-approved custom foods.
    # Only verified foods appear in the public search.
    is_verified = models.BooleanField(
        default=False,
        help_text="True for USDA foods or admin-verified custom foods"
    )

    # ------------------------------------------------------------------
    # Timestamps & cache management
    # ------------------------------------------------------------------

    # auto_now_add=True means Django sets this once at row creation time
    created_at = models.DateTimeField(auto_now_add=True)
    # auto_now=True means Django updates this on every save()
    updated_at = models.DateTimeField(auto_now=True)

    # Tracks how many times this food was searched/logged — used for
    # ordering popular foods in search results and cache priority
    search_count = models.IntegerField(
        default=0,
        help_text="Track popularity for cache management"
    )

    # Soft-archival flag. Archived foods are hidden from search but kept for
    # historical meal references.
    is_archived = models.BooleanField(default=False)
    last_used_at = models.DateTimeField(null=True, blank=True)

    # Audit trail — every change is recorded with user + timestamp
    history = HistoricalRecords()

    class Meta:
        # Django registers this model under the 'api' app so that migrations
        # use the existing api_food table instead of creating a new one.
        app_label = 'api'

        # Default ordering: most popular (highest search_count) first, then newest
        ordering = ['-search_count', '-created_at']

        # Database indexes speed up common query patterns
        indexes = [
            models.Index(fields=['fdc_id']),
            models.Index(fields=['name']),
            # Standalone index for simple "show me verified foods" queries
            models.Index(fields=['is_verified']),
            # Composite index for "show me verified foods from FatSecret" type queries
            models.Index(fields=['source', 'is_verified']),
            # For category-browsing filtered by source
            models.Index(fields=['source', 'category']),
            # For category browsing ordered by popularity
            models.Index(fields=['category', '-search_count']),
            # For cache management queries
            models.Index(fields=['is_archived', 'search_count']),
            # For verified category name searches (3-column covering index)
            models.Index(fields=['is_verified', 'category', 'name']),
        ]

        # fdc_id must be unique per source (same ID can exist in USDA and FatSecret)
        unique_together = [['fdc_id', 'source']]

        # Database-level constraint: fdc_id must be non-empty if it is set
        constraints = [
            models.CheckConstraint(
                check=models.Q(fdc_id__isnull=True) | ~models.Q(fdc_id=''),
                name='food_fdc_id_not_empty'
            )
        ]

    def __str__(self):
        # Example: "Chicken Breast (fatsecret)"
        return f"{self.name} ({self.source})"

    def increment_search_count(self):
        """
        Increment the search/log count by 1 to track popular foods.
        Uses update_fields to avoid overwriting other fields on concurrent saves.
        """
        self.search_count += 1
        self.save(update_fields=['search_count'])
