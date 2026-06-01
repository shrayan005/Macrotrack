from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_user_email_verified_emailverificationotp'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='fiber_target',
            field=models.IntegerField(
                blank=True,
                null=True,
                help_text='Daily fiber target in grams (default 25g)',
            ),
        ),
        migrations.AddField(
            model_name='historicaluser',
            name='fiber_target',
            field=models.IntegerField(
                blank=True,
                null=True,
                help_text='Daily fiber target in grams (default 25g)',
            ),
        ),
    ]
