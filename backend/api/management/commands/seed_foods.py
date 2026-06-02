from django.core.management.base import BaseCommand
from api.foods.models import Food


FOODS = [
    ("Chicken Breast (cooked)", 165, 31.0, 0.0, 3.6),
    ("White Rice (cooked)", 130, 2.7, 28.0, 0.3),
    ("Brown Rice (cooked)", 112, 2.6, 24.0, 0.9),
    ("Whole Egg", 155, 13.0, 1.1, 11.0),
    ("Egg White", 52, 11.0, 0.7, 0.2),
    ("Oats", 389, 17.0, 66.0, 7.0),
    ("Banana", 89, 1.1, 23.0, 0.3),
    ("Apple", 52, 0.3, 14.0, 0.2),
    ("Broccoli", 35, 2.4, 7.0, 0.4),
    ("Salmon (cooked)", 208, 20.0, 0.0, 13.0),
    ("Tuna (canned in water)", 116, 26.0, 0.0, 0.5),
    ("Greek Yogurt (plain)", 59, 10.0, 3.6, 0.4),
    ("Milk (whole)", 61, 3.2, 4.8, 3.3),
    ("Cheddar Cheese", 402, 25.0, 1.3, 33.0),
    ("Bread (white)", 265, 9.0, 51.0, 3.2),
    ("Bread (whole wheat)", 247, 13.0, 41.0, 4.2),
    ("Pasta (cooked)", 131, 5.0, 25.0, 1.1),
    ("Potato (boiled)", 87, 1.9, 20.0, 0.1),
    ("Sweet Potato (cooked)", 86, 1.6, 20.0, 0.1),
    ("Lentils (cooked)", 116, 9.0, 20.0, 0.4),
    ("Chickpeas (cooked)", 164, 8.9, 27.0, 2.6),
    ("Almonds", 579, 21.0, 22.0, 50.0),
    ("Peanut Butter", 588, 25.0, 20.0, 50.0),
    ("Olive Oil", 884, 0.0, 0.0, 100.0),
    ("Butter", 717, 0.9, 0.1, 81.0),
    ("Orange", 47, 0.9, 12.0, 0.1),
    ("Strawberries", 32, 0.7, 7.7, 0.3),
    ("Spinach (raw)", 23, 2.9, 3.6, 0.4),
    ("Carrot (raw)", 41, 0.9, 10.0, 0.2),
    ("Tomato", 18, 0.9, 3.9, 0.2),
    ("Cucumber", 16, 0.7, 3.6, 0.1),
    ("Beef (lean, cooked)", 250, 26.0, 0.0, 15.0),
    ("Pork Loin (cooked)", 242, 27.0, 0.0, 14.0),
    ("Tofu (firm)", 76, 8.0, 1.9, 4.2),
    ("Whey Protein Powder", 400, 80.0, 8.0, 5.0),
    ("Cottage Cheese", 98, 11.0, 3.4, 4.3),
    ("Avocado", 160, 2.0, 9.0, 15.0),
    ("Quinoa (cooked)", 120, 4.4, 22.0, 1.9),
    ("Blueberries", 57, 0.7, 14.0, 0.3),
    ("Watermelon", 30, 0.6, 7.6, 0.2),
    ("Mango", 60, 0.8, 15.0, 0.4),
    ("Milk (skimmed)", 34, 3.4, 5.0, 0.1),
    ("Canned Beans (kidney)", 127, 8.7, 22.0, 0.5),
    ("Peanuts", 567, 26.0, 16.0, 49.0),
    ("Walnuts", 654, 15.0, 14.0, 65.0),
    ("Dark Chocolate (70%)", 604, 7.8, 46.0, 43.0),
    ("Honey", 304, 0.3, 82.0, 0.0),
    ("Corn (cooked)", 96, 3.4, 21.0, 1.5),
    ("Edamame", 121, 11.0, 8.9, 5.2),
    ("Shrimp (cooked)", 99, 24.0, 0.0, 0.3),
]


class Command(BaseCommand):
    help = 'Seed the database with common foods (skips existing entries)'

    def handle(self, *args, **options):
        created = 0
        skipped = 0
        for name, cal, prot, carbs, fat in FOODS:
            _, was_created = Food.objects.get_or_create(
                name=name,
                defaults={
                    'calories':            cal,
                    'protein':             prot,
                    'carbs':               carbs,
                    'fat':                 fat,
                    'source':              'custom',
                    'is_verified':         True,
                    'serving_description': '100g',
                }
            )
            if was_created:
                created += 1
            else:
                skipped += 1

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {created} new foods ({skipped} already existed).'
        ))
