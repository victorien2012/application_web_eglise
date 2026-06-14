# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_predication_nom_predicateur'),
    ]

    operations = [
        migrations.AddField(
            model_name='profilutilisateur',
            name='contact',
            field=models.CharField(blank=True, db_column='contact', max_length=50, null=True),
        ),
    ]
