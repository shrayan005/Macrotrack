from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0010_add_email_hmac_is_onboarded'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='email_verified',
            field=models.BooleanField(
                default=True,
                help_text='True for verified email or Google OAuth users. New email signups start False.'
            ),
        ),
        migrations.AddField(
            model_name='historicaluser',
            name='email_verified',
            field=models.BooleanField(
                default=True,
                help_text='True for verified email or Google OAuth users. New email signups start False.'
            ),
        ),
        migrations.CreateModel(
            name='EmailVerificationOTP',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('otp_hash', models.CharField(max_length=64)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
                ('attempts', models.IntegerField(default=0)),
                ('is_used', models.BooleanField(default=False)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='email_verification_otp',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
