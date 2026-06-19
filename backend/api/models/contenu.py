from django.db import models

from .utilisateurs import Pasteur


class Predication(models.Model):
    TYPE_MEDIA_CHOICES = [
        ('AUDIO', 'Audio'),
        ('VIDEO', 'Vidéo'),
        ('BOTH', 'Les deux'),
    ]

    pasteur = models.ForeignKey(Pasteur, on_delete=models.CASCADE, related_name='predications', db_column='pasteur_id')
    titre = models.CharField(max_length=255, db_column='titre')
    description = models.TextField(blank=True, null=True, db_column='description')
    type_media = models.CharField(max_length=10, choices=TYPE_MEDIA_CHOICES, default='AUDIO', db_column='type_media')
    fichier_audio = models.FileField(upload_to='audios/', blank=True, null=True, db_column='fichier_audio')
    fichier_video = models.FileField(upload_to='videos/', blank=True, null=True, db_column='fichier_video')
    url_video = models.URLField(blank=True, null=True, help_text="Lien externe (YouTube, Vimeo, etc.)", db_column='url_video')
    youtube_id = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        unique=True,
        db_index=True,
        db_column='youtube_id',
        help_text="Identifiant de la video YouTube (utilise pour la synchronisation et la deduplication).",
    )
    nom_predicateur = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_column='nom_predicateur',
        help_text="Nom du prédicateur ou de la chaîne YouTube source, rempli automatiquement lors de la synchronisation.",
    )
    image_couverture = models.ImageField(upload_to='covers/', blank=True, null=True, db_column='image_couverture')
    duree_secondes = models.IntegerField(default=0, help_text="Durée en secondes", db_column='duree_secondes')
    nombre_vues = models.IntegerField(default=0, db_column='nombre_vues')
    nombre_telechargements = models.IntegerField(default=0, db_column='nombre_telechargements')
    est_publie = models.BooleanField(default=True, db_column='est_publie')
    date_publication = models.DateTimeField(
        blank=True,
        null=True,
        db_column='date_publication',
        help_text="Si renseignee et future, la predication n'est publique qu'a partir de cette date.",
    )
    categories = models.ManyToManyField(
        'Categorie',
        related_name='predications',
        blank=True,
        through='PredicationCategorie',
        through_fields=('predication', 'categorie'),
    )
    etiquettes = models.ManyToManyField(
        'Etiquette',
        related_name='predications',
        blank=True,
        through='PredicationEtiquette',
        through_fields=('predication', 'etiquette'),
    )
    serie = models.ForeignKey('Serie', on_delete=models.SET_NULL, related_name='predications', blank=True, null=True, db_column='serie_id')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')


    class Meta:
        db_table = 'predications'

    def __str__(self):
        return self.titre


class Categorie(models.Model):
    nom = models.CharField(max_length=120, unique=True, db_column='nom')
    description = models.TextField(blank=True, null=True, db_column='description')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')

    class Meta:
        db_table = 'categories'
        ordering = ['nom']

    def __str__(self):
        return self.nom


class Etiquette(models.Model):
    nom = models.CharField(max_length=80, unique=True, db_column='nom')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')

    class Meta:
        db_table = 'etiquettes'
        ordering = ['nom']

    def __str__(self):
        return self.nom


class PredicationCategorie(models.Model):
    predication = models.ForeignKey(Predication, on_delete=models.CASCADE, db_column='predication_id')
    categorie = models.ForeignKey(Categorie, on_delete=models.CASCADE, db_column='categorie_id')

    class Meta:
        db_table = 'predications_categories'
        unique_together = ('predication', 'categorie')

    def __str__(self):
        return f"{self.predication.titre} - {self.categorie.nom}"


class PredicationEtiquette(models.Model):
    predication = models.ForeignKey(Predication, on_delete=models.CASCADE, db_column='predication_id')
    etiquette = models.ForeignKey(Etiquette, on_delete=models.CASCADE, db_column='etiquette_id')

    class Meta:
        db_table = 'predications_etiquettes'
        unique_together = ('predication', 'etiquette')

    def __str__(self):
        return f"{self.predication.titre} - {self.etiquette.nom}"


class Serie(models.Model):
    pasteur = models.ForeignKey(Pasteur, on_delete=models.CASCADE, related_name='series', db_column='pasteur_id')
    titre = models.CharField(max_length=255, db_column='titre')
    description = models.TextField(blank=True, null=True, db_column='description')
    image_couverture = models.ImageField(upload_to='series/', blank=True, null=True, db_column='image_couverture')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')

    class Meta:
        db_table = 'series'
        ordering = ['-cree_le']
        unique_together = ('pasteur', 'titre')

    def __str__(self):
        return self.titre


class PieceJointe(models.Model):
    predication = models.ForeignKey(Predication, on_delete=models.CASCADE, related_name='pieces_jointes', db_column='predication_id')
    nom = models.CharField(max_length=255, db_column='nom')
    fichier = models.FileField(upload_to='attachments/', db_column='fichier')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')

    class Meta:
        db_table = 'pieces_jointes'
        ordering = ['nom']
        verbose_name = 'Pièce Jointe'
        verbose_name_plural = 'Pièces Jointes'

    def __str__(self):
        return self.nom

class Document(models.Model):
    pasteur = models.ForeignKey(Pasteur, on_delete=models.CASCADE, related_name='documents', db_column='pasteur_id')
    titre = models.CharField(max_length=255, db_column='titre')
    description = models.TextField(blank=True, null=True, db_column='description')
    fichier = models.FileField(upload_to='documents/', db_column='fichier')
    image_couverture = models.ImageField(upload_to='documents_covers/', blank=True, null=True, db_column='image_couverture')
    nombre_telechargements = models.IntegerField(default=0, db_column='nombre_telechargements')
    est_publie = models.BooleanField(default=True, db_column='est_publie')
    categories = models.ManyToManyField(
        'Categorie',
        related_name='documents',
        blank=True,
        db_table='documents_categories'
    )
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')

    class Meta:
        db_table = 'documents'
        ordering = ['-cree_le']
        verbose_name = 'Document'
        verbose_name_plural = 'Documents'

    def __str__(self):
        return self.titre
