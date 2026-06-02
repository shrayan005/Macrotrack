from django.core.management.base import BaseCommand
from api.foods.models import Food

# (name, calories, protein, carbs, fat, category)
FOODS = [
    # Protein
    ("Chicken Breast (cooked)",   165, 31.0,  0.0,  3.6,  "protein"),
    ("Salmon (cooked)",           208, 20.0,  0.0, 13.0,  "protein"),
    ("Tuna (canned in water)",    116, 26.0,  0.0,  0.5,  "protein"),
    ("Beef (lean, cooked)",       250, 26.0,  0.0, 15.0,  "protein"),
    ("Pork Loin (cooked)",        242, 27.0,  0.0, 14.0,  "protein"),
    ("Whole Egg",                 155, 13.0,  1.1, 11.0,  "protein"),
    ("Egg White",                  52, 11.0,  0.7,  0.2,  "protein"),
    ("Tofu (firm)",                76,  8.0,  1.9,  4.2,  "protein"),
    ("Shrimp (cooked)",            99, 24.0,  0.0,  0.3,  "protein"),
    ("Whey Protein Powder",       400, 80.0,  8.0,  5.0,  "protein"),
    ("Edamame",                   121, 11.0,  8.9,  5.2,  "protein"),
    ("Cottage Cheese",             98, 11.0,  3.4,  4.3,  "protein"),

    # Dairy
    ("Greek Yogurt (plain)",       59, 10.0,  3.6,  0.4,  "dairy"),
    ("Milk (whole)",               61,  3.2,  4.8,  3.3,  "dairy"),
    ("Milk (skimmed)",             34,  3.4,  5.0,  0.1,  "dairy"),
    ("Cheddar Cheese",            402, 25.0,  1.3, 33.0,  "dairy"),
    ("Butter",                    717,  0.9,  0.1, 81.0,  "dairy"),

    # Grains
    ("White Rice (cooked)",       130,  2.7, 28.0,  0.3,  "grains"),
    ("Brown Rice (cooked)",       112,  2.6, 24.0,  0.9,  "grains"),
    ("Oats",                      389, 17.0, 66.0,  7.0,  "grains"),
    ("Bread (white)",             265,  9.0, 51.0,  3.2,  "grains"),
    ("Bread (whole wheat)",       247, 13.0, 41.0,  4.2,  "grains"),
    ("Pasta (cooked)",            131,  5.0, 25.0,  1.1,  "grains"),
    ("Quinoa (cooked)",           120,  4.4, 22.0,  1.9,  "grains"),
    ("Corn (cooked)",              96,  3.4, 21.0,  1.5,  "grains"),

    # Vegetables
    ("Broccoli",                   35,  2.4,  7.0,  0.4,  "vegetables"),
    ("Spinach (raw)",              23,  2.9,  3.6,  0.4,  "vegetables"),
    ("Carrot (raw)",               41,  0.9, 10.0,  0.2,  "vegetables"),
    ("Tomato",                     18,  0.9,  3.9,  0.2,  "vegetables"),
    ("Cucumber",                   16,  0.7,  3.6,  0.1,  "vegetables"),
    ("Sweet Potato (cooked)",      86,  1.6, 20.0,  0.1,  "vegetables"),
    ("Potato (boiled)",            87,  1.9, 20.0,  0.1,  "vegetables"),
    ("Avocado",                   160,  2.0,  9.0, 15.0,  "vegetables"),

    # Fruits
    ("Banana",                     89,  1.1, 23.0,  0.3,  "fruits"),
    ("Apple",                      52,  0.3, 14.0,  0.2,  "fruits"),
    ("Orange",                     47,  0.9, 12.0,  0.1,  "fruits"),
    ("Strawberries",               32,  0.7,  7.7,  0.3,  "fruits"),
    ("Blueberries",                57,  0.7, 14.0,  0.3,  "fruits"),
    ("Watermelon",                 30,  0.6,  7.6,  0.2,  "fruits"),
    ("Mango",                      60,  0.8, 15.0,  0.4,  "fruits"),

    # Nuts
    ("Almonds",                   579, 21.0, 22.0, 50.0,  "nuts"),
    ("Peanut Butter",             588, 25.0, 20.0, 50.0,  "nuts"),
    ("Peanuts",                   567, 26.0, 16.0, 49.0,  "nuts"),
    ("Walnuts",                   654, 15.0, 14.0, 65.0,  "nuts"),

    # Other
    ("Lentils (cooked)",          116,  9.0, 20.0,  0.4,  "other"),
    ("Chickpeas (cooked)",        164,  8.9, 27.0,  2.6,  "other"),
    ("Canned Beans (kidney)",     127,  8.7, 22.0,  0.5,  "other"),
    ("Olive Oil",                 884,  0.0,  0.0,100.0,  "other"),
    ("Honey",                     304,  0.3, 82.0,  0.0,  "other"),
    ("Dark Chocolate (70%)",      604,  7.8, 46.0, 43.0,  "other"),
]


class Command(BaseCommand):
    help = 'Seed the database with common foods grouped by category (skips existing entries)'

    def handle(self, *args, **options):
        created = 0
        skipped = 0
        for name, cal, prot, carbs, fat, category in FOODS:
            obj, was_created = Food.objects.get_or_create(
                name=name,
                defaults={
                    'calories':            cal,
                    'protein':             prot,
                    'carbs':               carbs,
                    'fat':                 fat,
                    'category':            category,
                    'source':              'custom',
                    'is_verified':         True,
                    'serving_description': '100g',
                    'search_count':        10,  # so they appear in popular foods list
                }
            )
            if not was_created and not obj.category:
                obj.category = category
                obj.save(update_fields=['category'])
                created += 1
            elif was_created:
                created += 1
            else:
                skipped += 1

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {created} foods ({skipped} already existed).'
        ))
