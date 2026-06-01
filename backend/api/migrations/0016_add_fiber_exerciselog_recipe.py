from django.db import migrations, models
import django.core.validators
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0015_add_mealfood_db_constraints'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # --- Fiber on MealFood ---
        migrations.AddField(
            model_name='mealfood',
            name='fiber',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
                validators=[django.core.validators.MinValueValidator(0)],
            ),
        ),

        # --- total_fiber on Meal ---
        migrations.AddField(
            model_name='meal',
            name='total_fiber',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
            ),
        ),

        # --- ExerciseLog model ---
        migrations.CreateModel(
            name='ExerciseLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('exercise_name', models.CharField(max_length=200)),
                ('duration_minutes', models.PositiveIntegerField(
                    validators=[django.core.validators.MinValueValidator(1)]
                )),
                ('calories_burned', models.DecimalField(
                    decimal_places=2,
                    max_digits=8,
                    validators=[django.core.validators.MinValueValidator(0)],
                )),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='exercise_logs',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-date', '-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='exerciselog',
            index=models.Index(fields=['user', 'date'], name='api_exerciselog_user_date_idx'),
        ),
        migrations.AddIndex(
            model_name='exerciselog',
            index=models.Index(fields=['user', '-date'], name='api_exerciselog_user_date_desc_idx'),
        ),

        # --- Recipe model ---
        migrations.CreateModel(
            name='Recipe',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True, null=True)),
                ('calories', models.DecimalField(
                    decimal_places=2,
                    default=0,
                    max_digits=8,
                    validators=[django.core.validators.MinValueValidator(0)],
                )),
                ('protein', models.DecimalField(
                    decimal_places=2,
                    default=0,
                    max_digits=8,
                    validators=[django.core.validators.MinValueValidator(0)],
                )),
                ('carbs', models.DecimalField(
                    decimal_places=2,
                    default=0,
                    max_digits=8,
                    validators=[django.core.validators.MinValueValidator(0)],
                )),
                ('fat', models.DecimalField(
                    decimal_places=2,
                    default=0,
                    max_digits=8,
                    validators=[django.core.validators.MinValueValidator(0)],
                )),
                ('fiber', models.DecimalField(
                    blank=True,
                    decimal_places=2,
                    max_digits=8,
                    null=True,
                    validators=[django.core.validators.MinValueValidator(0)],
                )),
                ('serving_description', models.CharField(default='1 serving', max_length=200)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='recipes',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='recipe',
            index=models.Index(fields=['user'], name='api_recipe_user_idx'),
        ),
        migrations.AddIndex(
            model_name='recipe',
            index=models.Index(fields=['user', 'name'], name='api_recipe_user_name_idx'),
        ),
    ]
