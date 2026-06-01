from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0023_delete_foodimageanalysis'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='usercheckin',
            unique_together={('user', 'date')},
        ),
    ]
