from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0004_franciser_colonnes_liaisons'),
    ]

    operations = [
        migrations.RenameModel('Pastor', 'Pasteur'),
        migrations.RenameModel('Sermon', 'Predication'),
        migrations.RenameModel('AnalyticLog', 'JournalAnalytique'),

        migrations.RenameField('Pasteur', 'user', 'utilisateur'),
        migrations.RenameField('Pasteur', 'display_name', 'nom_affichage'),
        migrations.RenameField('Pasteur', 'bio', 'biographie'),
        migrations.RenameField('Pasteur', 'church_name', 'nom_eglise'),
        migrations.RenameField('Pasteur', 'social_twitter', 'lien_twitter'),
        migrations.RenameField('Pasteur', 'social_facebook', 'lien_facebook'),
        migrations.RenameField('Pasteur', 'social_youtube', 'lien_youtube'),
        migrations.RenameField('Pasteur', 'created_at', 'cree_le'),

        migrations.RenameField('Predication', 'pastor', 'pasteur'),
        migrations.RenameField('Predication', 'title', 'titre'),
        migrations.RenameField('Predication', 'media_type', 'type_media'),
        migrations.RenameField('Predication', 'audio_file', 'fichier_audio'),
        migrations.RenameField('Predication', 'video_file', 'fichier_video'),
        migrations.RenameField('Predication', 'video_url', 'url_video'),
        migrations.RenameField('Predication', 'cover_image', 'image_couverture'),
        migrations.RenameField('Predication', 'duration', 'duree_secondes'),
        migrations.RenameField('Predication', 'views_count', 'nombre_vues'),
        migrations.RenameField('Predication', 'downloads_count', 'nombre_telechargements'),
        migrations.RenameField('Predication', 'is_published', 'est_publie'),
        migrations.RenameField('Predication', 'series', 'serie'),
        migrations.RenameField('Predication', 'created_at', 'cree_le'),

        migrations.RenameField('Categorie', 'created_at', 'cree_le'),
        migrations.RenameField('Etiquette', 'created_at', 'cree_le'),
        migrations.RenameField('Serie', 'created_at', 'cree_le'),
        migrations.RenameField('PieceJointe', 'sermon', 'predication'),
        migrations.RenameField('PieceJointe', 'created_at', 'cree_le'),
        migrations.RenameField('Commentaire', 'sermon', 'predication'),
        migrations.RenameField('Commentaire', 'created_at', 'cree_le'),
        migrations.RenameField('Commentaire', 'updated_at', 'modifie_le'),
        migrations.RenameField('Favori', 'sermon', 'predication'),
        migrations.RenameField('Favori', 'created_at', 'cree_le'),
        migrations.RenameField('Abonnement', 'created_at', 'cree_le'),
        migrations.RenameField('HistoriqueLecture', 'sermon', 'predication'),
        migrations.RenameField('HistoriqueLecture', 'updated_at', 'modifie_le'),
        migrations.RenameField('Signalement', 'sermon', 'predication'),
        migrations.RenameField('Signalement', 'created_at', 'cree_le'),
        migrations.RenameField('JournalAnalytique', 'sermon', 'predication'),
        migrations.RenameField('JournalAnalytique', 'action_type', 'type_action'),
        migrations.RenameField('JournalAnalytique', 'timestamp', 'cree_le'),
        migrations.RenameField('JournalAnalytique', 'ip_address', 'adresse_ip'),

        migrations.AlterField(
            model_name='pasteur',
            name='utilisateur',
            field=models.OneToOneField(
                db_column='utilisateur_id',
                on_delete=django.db.models.deletion.CASCADE,
                related_name='profil_pasteur',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='predication',
            name='pasteur',
            field=models.ForeignKey(
                db_column='pasteur_id',
                on_delete=django.db.models.deletion.CASCADE,
                related_name='predications',
                to='api.pasteur',
            ),
        ),
        migrations.AlterField(
            model_name='predication',
            name='categories',
            field=models.ManyToManyField(
                blank=True,
                related_name='predications',
                through='api.PredicationCategorie',
                through_fields=('predication', 'categorie'),
                to='api.categorie',
            ),
        ),
        migrations.AlterField(
            model_name='predication',
            name='etiquettes',
            field=models.ManyToManyField(
                blank=True,
                related_name='predications',
                through='api.PredicationEtiquette',
                through_fields=('predication', 'etiquette'),
                to='api.etiquette',
            ),
        ),
        migrations.AlterField(
            model_name='predication',
            name='serie',
            field=models.ForeignKey(
                blank=True,
                db_column='serie_id',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='predications',
                to='api.serie',
            ),
        ),
        migrations.AlterField(
            model_name='journalanalytique',
            name='predication',
            field=models.ForeignKey(
                db_column='predication_id',
                on_delete=django.db.models.deletion.CASCADE,
                related_name='journaux_analytiques',
                to='api.predication',
            ),
        ),
    ]
