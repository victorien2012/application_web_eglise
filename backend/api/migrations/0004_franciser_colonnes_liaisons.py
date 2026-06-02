# Generated manually to keep many-to-many join tables in French.

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_alter_abonnement_created_at_alter_abonnement_pasteur_and_more'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql='ALTER TABLE predications_categories RENAME COLUMN sermon_id TO predication_id;',
                    reverse_sql='ALTER TABLE predications_categories RENAME COLUMN predication_id TO sermon_id;',
                ),
                migrations.RunSQL(
                    sql='ALTER TABLE predications_etiquettes RENAME COLUMN sermon_id TO predication_id;',
                    reverse_sql='ALTER TABLE predications_etiquettes RENAME COLUMN predication_id TO sermon_id;',
                ),
            ],
            state_operations=[
                migrations.CreateModel(
                    name='PredicationCategorie',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('categorie', models.ForeignKey(db_column='categorie_id', on_delete=django.db.models.deletion.CASCADE, to='api.categorie')),
                        ('predication', models.ForeignKey(db_column='predication_id', on_delete=django.db.models.deletion.CASCADE, to='api.sermon')),
                    ],
                    options={
                        'db_table': 'predications_categories',
                        'unique_together': {('predication', 'categorie')},
                    },
                ),
                migrations.CreateModel(
                    name='PredicationEtiquette',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('etiquette', models.ForeignKey(db_column='etiquette_id', on_delete=django.db.models.deletion.CASCADE, to='api.etiquette')),
                        ('predication', models.ForeignKey(db_column='predication_id', on_delete=django.db.models.deletion.CASCADE, to='api.sermon')),
                    ],
                    options={
                        'db_table': 'predications_etiquettes',
                        'unique_together': {('predication', 'etiquette')},
                    },
                ),
                migrations.AlterField(
                    model_name='sermon',
                    name='categories',
                    field=models.ManyToManyField(
                        blank=True,
                        related_name='sermons',
                        through='api.PredicationCategorie',
                        through_fields=('predication', 'categorie'),
                        to='api.categorie',
                    ),
                ),
                migrations.AlterField(
                    model_name='sermon',
                    name='etiquettes',
                    field=models.ManyToManyField(
                        blank=True,
                        related_name='sermons',
                        through='api.PredicationEtiquette',
                        through_fields=('predication', 'etiquette'),
                        to='api.etiquette',
                    ),
                ),
            ],
        ),
    ]
