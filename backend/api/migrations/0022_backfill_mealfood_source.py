from django.db import migrations


def backfill_ai_source(apps, schema_editor):
    """
    Mark existing MealFood rows as AI-added if they match the fingerprint
    that ImageMealUpload.js has always used:
        serving_unit = 'g'  AND  serving_grams = 1
    All other rows stay as 'manual'.
    """
    MealFood = apps.get_model('api', 'MealFood')
    updated = MealFood.objects.filter(
        serving_unit='g',
        serving_grams=1,
    ).update(source='ai')
    print(f"\n  Backfilled {updated} MealFood rows to source=ai")


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0021_add_source_to_mealfood'),
    ]

    operations = [
        migrations.RunPython(backfill_ai_source, migrations.RunPython.noop),
    ]
