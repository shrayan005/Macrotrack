from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0022_backfill_mealfood_source'),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='foodimageanalysis',
            name='api_foodima_image_e_9a5f69_idx',
        ),
        migrations.RemoveIndex(
            model_name='foodimageanalysis',
            name='api_foodima_user_ve_51ec80_idx',
        ),
        migrations.RemoveIndex(
            model_name='foodimageanalysis',
            name='api_foodima_user_id_ef9193_idx',
        ),
        migrations.DeleteModel(
            name='FoodImageAnalysis',
        ),
    ]
