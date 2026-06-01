# FILE: api/recipes/models.py
# PURPOSE: Defines the Recipe model — user-saved meal templates
#          with pre-calculated nutrition that can be logged in one tap.
# USED BY: api/models.py (re-exporter), api/recipes/viewset.py,
#          api/viewsets.py
# KEY CLASSES:
#   Recipe — a saved meal template with nutrition totals
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator

class Recipe(models.Model):
    """
    Recipe model for saving user-defined meals with pre-calculated nutrition.

    Unlike the Meal model (which is a diary entry tied to a date), a Recipe
    is a reusable template. The user sets the nutrition values manually when
    creating the recipe. When logging a recipe, a temporary Food object is
    created and attached to a Meal.

    See api/recipes/viewset.py → log_to_meal for the logging flow.
    """

    # The user who created this recipe
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recipes',
        help_text="User who created this recipe"
    )

    # Human-readable recipe name (e.g. "My Protein Shake")
    name = models.CharField(max_length=200, help_text="Recipe name")

    # Optional description or preparation instructions
    description = models.TextField(null=True, blank=True, help_text="Optional description or instructions")

    # ------------------------------------------------------------------
    # Nutrition values for one serving (not per 100g like Food)
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
    # Fiber is optional
    fiber = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0, message="Fiber cannot be negative")]
    )

    # Describes what one serving is (e.g. "1 bowl", "2 scoops", "1 serving")
    serving_description = models.CharField(
        max_length=200,
        default='1 serving',
        help_text="Description of what one serving is"
    )

    # ------------------------------------------------------------------
    # Timestamps
    # ------------------------------------------------------------------
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Tell Django this model belongs to the existing 'api' app
        app_label = 'api'

        # Newest recipes first
        ordering = ['-created_at']

        indexes = [
            # Fast lookup: all recipes for a user
            models.Index(fields=['user']),
            # Fast search: recipes by name for a user
            models.Index(fields=['user', 'name']),
        ]

    def __str__(self):
        # Example: "user@email.com - My Protein Shake"
        return f"{self.user.email} - {self.name}"
