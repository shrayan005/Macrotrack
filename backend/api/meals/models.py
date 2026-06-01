# FILE: api/meals/models.py
# PURPOSE: Defines the Meal and MealFood models — the core diary
#          tables that record what a user ate, when, and how much.
# USED BY: api/models.py (re-exporter), api/viewsets.py, api/views.py,
#          api/meals/service.py, api/signals.py
# KEY CLASSES:
#   Meal     — one meal entry (breakfast/lunch/dinner/snack) for a user on a date
#   MealFood — junction table linking a Meal to a Food with serving info
from decimal import Decimal, ROUND_HALF_UP

from django.db import models, transaction
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from simple_history.models import HistoricalRecords

# Import Food from the foods sub-package to avoid duplicating the model definition.
# NOTE: We import the model class directly (not from api.models) to avoid a
# circular import, since api.models re-exports from here.
from api.foods.models import Food

class Meal(models.Model):
    """
    Meal model for storing user's food diary entries.

    Represents a single meal instance (breakfast, lunch, dinner, or snack)
    on a given date. Nutrition totals are denormalized here (calculated from
    the related MealFood rows) so dashboards can be rendered without an
    expensive per-meal aggregate query.
    """

    # The four meal types the UI supports
    MEAL_TYPE_CHOICES = [
        ('breakfast', 'Breakfast'),
        ('lunch', 'Lunch'),
        ('dinner', 'Dinner'),
        ('snack', 'Snack'),
    ]

    # CASCADE = if the user is deleted, all their meals are deleted too
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='meals',
        help_text="User who logged this meal"
    )

    # Which meal slot this belongs to
    meal_type = models.CharField(max_length=20, choices=MEAL_TYPE_CHOICES, default='breakfast')

    # The calendar date (not datetime) the meal was consumed
    date = models.DateField(help_text="Date when the meal was consumed")

    # Optional time for more precise logging
    time = models.TimeField(null=True, blank=True, help_text="Time when the meal was consumed")

    # ------------------------------------------------------------------
    # Denormalized nutrition totals — recalculated whenever MealFoods change
    # ------------------------------------------------------------------
    # These are computed from the MealFood rows via calculate_nutrition_totals()
    # and stored here for fast dashboard queries.
    total_calories = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_protein = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_carbs = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_fat = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    # Fiber can be null because many foods don't have fiber data
    total_fiber = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    # Optional free-text notes the user can add to a meal
    notes = models.TextField(null=True, blank=True)

    # Audit trail — every save is tracked
    history = HistoricalRecords()

    # ------------------------------------------------------------------
    # Timestamps
    # ------------------------------------------------------------------
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Tell Django this model belongs to the existing 'api' app and database
        app_label = 'api'

        # Default ordering: most recent date first, then by time, then by creation
        ordering = ['-date', '-time', '-created_at']

        indexes = [
            # Fast lookup of all meals for a user on a date (diary view)
            models.Index(fields=['user', 'date']),
            # Fast lookup of meals filtered by type
            models.Index(fields=['user', 'meal_type']),
            # Covering index for the default ordering query
            models.Index(fields=['user', '-date', '-time']),
            # Covering index for daily calorie-sum queries
            models.Index(fields=['user', 'date', 'total_calories']),
        ]

        # A user can only have one meal of each type per day.
        # The frontend enforces this too, but the DB constraint is the safety net.
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'date', 'meal_type'],
                name='unique_meal_per_day'
            )
        ]

    def __str__(self):
        # Example: "user@email.com - breakfast on 2024-01-15"
        return f"{self.user.email} - {self.meal_type} on {self.date}"

    def calculate_nutrition_totals(self):
        """
        Recalculate and save this meal's nutrition totals from its MealFood rows.

        This is called automatically by MealFood.save() and MealFood.delete()
        (via the signals in api/signals.py) so totals are always up-to-date.
        """
        if not self.pk or not type(self).objects.filter(pk=self.pk).exists():
            return

        # Get all food items belonging to this meal
        meal_foods = self.meal_foods.all()

        # Sum up each macro across all food items
        self.total_calories = sum(mf.calories for mf in meal_foods)
        self.total_protein = sum(mf.protein for mf in meal_foods)
        self.total_carbs = sum(mf.carbs for mf in meal_foods)
        self.total_fat = sum(mf.fat for mf in meal_foods)

        # Fiber is optional — only include foods that have fiber data
        fiber_values = [mf.fiber for mf in meal_foods if mf.fiber is not None]
        self.total_fiber = sum(fiber_values) if fiber_values else None

        # Only update the nutrition columns to avoid touching updated_at for unrelated changes
        self.save(update_fields=['total_calories', 'total_protein', 'total_carbs', 'total_fat', 'total_fiber'])

class MealFood(models.Model):
    """
    Junction model linking Meals and Foods with serving information.

    Represents a specific food item within a meal together with the
    serving size used. Nutrition values are pre-calculated on save()
    using Decimal arithmetic to avoid floating-point rounding drift.
    """

    # Which meal this food belongs to (CASCADE = delete this row if the meal is deleted)
    meal = models.ForeignKey(
        Meal,
        on_delete=models.CASCADE,
        related_name='meal_foods',
        help_text="The meal this food belongs to"
    )

    # Which food item was eaten (CASCADE = delete this row if the food is deleted)
    food = models.ForeignKey(
        Food,
        on_delete=models.CASCADE,
        related_name='meal_foods',
        help_text="The food item"
    )

    # ------------------------------------------------------------------
    # Serving information
    # ------------------------------------------------------------------

    # How many servings the user ate (e.g. 1.5 means 1.5 × serving_grams grams)
    serving_size = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=1,
        validators=[MinValueValidator(0.01, message="Serving size must be greater than 0")],
        help_text="Number of servings (e.g., 1.5)"
    )

    # The label shown in the UI (e.g. "serving", "grams", "cup")
    serving_unit = models.CharField(
        max_length=50,
        default='serving',
        help_text="Unit of measurement (serving, grams, oz, cup, etc.)"
    )

    # Grams per one serving_unit — used for nutrition calculation
    serving_grams = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=100,
        validators=[MinValueValidator(0.01, message="Serving grams must be greater than 0")],
        help_text="Grams per serving unit"
    )

    # ------------------------------------------------------------------
    # Pre-calculated nutrition for this specific entry
    # Formula: (serving_size × serving_grams / 100) × food.nutrient_per_100g
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
    # Null when the food has no fiber data
    fiber = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0, message="Fiber cannot be negative")]
    )

    # How the food was logged — 'manual' for search/typing, 'ai' for image analysis
    SOURCE_MANUAL = 'manual'
    SOURCE_AI = 'ai'
    SOURCE_CHOICES = [
        (SOURCE_MANUAL, 'Manual'),
        (SOURCE_AI, 'AI'),
    ]
    source = models.CharField(
        max_length=10,
        choices=SOURCE_CHOICES,
        default=SOURCE_MANUAL,
        help_text="How this food was added: manually via search or via AI image analysis"
    )

    # Timestamp only — no updated_at because re-logging creates a new row
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'api'

        # Default ordering: oldest first (preserves log order within a meal)
        ordering = ['created_at']

        indexes = [
            models.Index(fields=['meal']),          # Fast lookup: all foods in a meal
            models.Index(fields=['food']),           # Fast lookup: all meals containing a food
            models.Index(fields=['meal', 'created_at']),  # Optimized ordering query
        ]

        # DB-level constraints (double-check model-level validators at the DB layer)
        constraints = [
            models.CheckConstraint(
                check=models.Q(serving_grams__gt=0),
                name='mealfood_serving_grams_positive',
            ),
            models.CheckConstraint(
                check=models.Q(serving_size__gt=0),
                name='mealfood_serving_size_positive',
            ),
        ]

    def __str__(self):
        # Example: "Chicken Breast - 1.5 serving"
        return f"{self.food.name} - {self.serving_size} {self.serving_unit}"

    def save(self, *args, **kwargs):
        """
        Auto-calculate nutrition before saving.

        The formula for any nutrient:
            actual = food_per_100g × (serving_size × serving_grams) / 100

        We use Python's Decimal type throughout to avoid the floating-point
        rounding errors that can accumulate across hundreds of diary entries.
        The whole operation is wrapped in a database transaction so the meal
        totals are never left stale if the save fails midway.
        """
        hundred = Decimal('100')

        # Convert everything to Decimal for safe arithmetic
        serving_size = Decimal(str(self.serving_size))
        serving_grams = Decimal(str(self.serving_grams))

        # multiplier = total grams eaten / 100
        # e.g. 1.5 servings × 80g/serving = 120g → multiplier = 1.20
        multiplier = (serving_size * serving_grams) / hundred

        # Calculate each macro and round to 2 decimal places
        self.calories = (Decimal(str(self.food.calories)) * multiplier).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        self.protein = (Decimal(str(self.food.protein)) * multiplier).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        self.carbs = (Decimal(str(self.food.carbs)) * multiplier).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        self.fat = (Decimal(str(self.food.fat)) * multiplier).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        # Only calculate fiber if the food has fiber data
        if self.food.fiber is not None:
            self.fiber = (Decimal(str(self.food.fiber)) * multiplier).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        else:
            self.fiber = None

        # Wrap in a transaction: both the MealFood save AND the meal total update
        # must succeed together, or neither is committed to the database.
        with transaction.atomic():
            super().save(*args, **kwargs)
            # Update the parent meal's denormalized nutrition totals
            if self.meal:
                self.meal.calculate_nutrition_totals()

    def delete(self, *args, **kwargs):
        """
        Update meal totals after this food item is deleted.

        Wrapped in a transaction so the meal totals are never stale.
        We store a reference to `self.meal` before deletion because after
        super().delete() the instance no longer has a valid meal FK.
        """
        # Save meal reference before deletion (after delete, self.meal becomes None)
        meal = self.meal
        with transaction.atomic():
            super().delete(*args, **kwargs)
            # Recalculate meal totals now that this item is gone
            if meal:
                meal.calculate_nutrition_totals()
