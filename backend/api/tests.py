from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Food, Meal, MealFood

User = get_user_model()

class CalculationTests(TestCase):
    def setUp(self):
        # Create a user
        self.user = User.objects.create_user(
            username='testuser', 
            email='test@example.com',
            password='testpassword'
        )
        
        # Create a test food (100g = 100 cal, 10p, 10c, 10f)
        self.food_balanced = Food.objects.create(
            name="Balanced Food",
            calories=100,
            protein=10,
            carbs=10,
            fat=10,
            serving_description="100g"
        )
        
        # Create another food (100g = 200 cal, 20p, 5c, 0f)
        self.food_protein = Food.objects.create(
            name="Protein Bar",
            calories=200,
            protein=20,
            carbs=5,
            fat=0,
            serving_description="1 bar"
        )

    def test_mealfood_calculation_default_serving(self):
        """Test calculation with default 1 serving of 100g"""
        meal = Meal.objects.create(user=self.user, date=timezone.now().date(), meal_type='breakfast')
        
        mealfood = MealFood.objects.create(
            meal=meal,
            food=self.food_balanced,
            serving_size=1,
            serving_unit='serving',
            serving_grams=100
        )
        
        # 100g of food_balanced should be 100 cal
        self.assertEqual(mealfood.calories, 100)
        self.assertEqual(mealfood.protein, 10)
        self.assertEqual(mealfood.carbs, 10)
        self.assertEqual(mealfood.fat, 10)

    def test_mealfood_calculation_half_serving(self):
        """Test calculation with 0.5 serving of 100g (50g total)"""
        meal = Meal.objects.create(user=self.user, date=timezone.now().date(), meal_type='lunch')
        
        mealfood = MealFood.objects.create(
            meal=meal,
            food=self.food_balanced,
            serving_size=0.5,
            serving_unit='serving',
            serving_grams=100
        )
        
        # 50g total -> Should be 50 cal
        self.assertEqual(mealfood.calories, 50)
        self.assertEqual(mealfood.protein, 5)

    def test_mealfood_calculation_custom_grams(self):
        """Test calculation with 1 serving of 200g"""
        meal = Meal.objects.create(user=self.user, date=timezone.now().date(), meal_type='dinner')
        
        mealfood = MealFood.objects.create(
            meal=meal,
            food=self.food_balanced,
            serving_size=1,
            serving_unit='bowl',
            serving_grams=200 # 200g total
        )
        
        # 200g total -> Should be 200 cal
        self.assertEqual(mealfood.calories, 200)
        self.assertEqual(mealfood.protein, 20)

    def test_meal_total_aggregation(self):
        """Test that Meal aggregates multiple MealFoods correctly"""
        meal = Meal.objects.create(user=self.user, date=timezone.now().date(), meal_type='snack')
        
        # Add Item 1: 100g Balanced (100 cal)
        MealFood.objects.create(
            meal=meal,
            food=self.food_balanced,
            serving_size=1,
            serving_grams=100
        )
        
        # Add Item 2: 50g Protein Bar (100 cal)
        # Protein bar is 200cal/100g. So 50g = 100cal
        MealFood.objects.create(
            meal=meal,
            food=self.food_protein,
            serving_size=0.5,
            serving_grams=100 
        )
        
        # Refresh meal from db to get calculated fields
        meal.refresh_from_db()
        
        # Total: 100 + 100 = 200 cal
        self.assertEqual(meal.total_calories, 200)
        
        # Protein: 10 (balanced) + 10 (half protein bar) = 20
        self.assertEqual(meal.total_protein, 20)
        
    def test_update_mealfood_updates_meal(self):
        """Test that modifying a MealFood updates the parent Meal"""
        meal = Meal.objects.create(user=self.user, date=timezone.now().date(), meal_type='snack')
        
        mf = MealFood.objects.create(
            meal=meal,
            food=self.food_balanced,
            serving_size=1,
            serving_grams=100
        )
        
        # Initial check
        meal.refresh_from_db()
        self.assertEqual(meal.total_calories, 100)
        
        # Update serving size to double
        mf.serving_size = 2
        mf.save()
        
        # Check if meal updated
        meal.refresh_from_db()
        self.assertEqual(meal.total_calories, 200)

    def test_delete_mealfood_updates_meal(self):
        """Test that deleting a MealFood updates the parent Meal"""
        # Note: Standard Django signals/delete might NOT trigger save() on parent unless explicitly handled.
        # The model code for MealFood.delete() isn't custom, so we need to check if the view handles it 
        # OR if there is a signal.
        # Based on reading the view code earlier (remove_food_from_meal), checking models.py:
        # models.py does NOT have a delete() override or signal.
        # views.py explicitly calls meal.calculate_nutrition_totals().
        # So we should test the MODEL method calculate_nutrition_totals directly here.
        
        meal = Meal.objects.create(user=self.user, date=timezone.now().date(), meal_type='snack')
        mf = MealFood.objects.create(
            meal=meal,
            food=self.food_balanced,
            serving_size=1,
            serving_grams=100
        )
        
        meal.refresh_from_db()
        self.assertEqual(meal.total_calories, 100)
        
        mf.delete()
        
        # Manually trigger calculation as the view would
        meal.calculate_nutrition_totals()
        
        self.assertEqual(meal.total_calories, 0)
