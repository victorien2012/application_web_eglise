from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_predication_date_publication'),
    ]

    operations = [
        migrations.AddField(
            model_name='predication',
            name='youtube_id',
            field=models.CharField(
                blank=True,
                db_column='youtube_id',
                db_index=True,
                help_text='Identifiant de la video YouTube (utilise pour la synchronisation et la deduplication).',
                max_length=20,
                null=True,
                unique=True,
            ),
        ),
    ]
