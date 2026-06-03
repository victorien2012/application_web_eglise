from django.contrib.auth.models import User
from django.db import models


class ProfilUtilisateur(models.Model):
    utilisateur = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profil',
        db_column='utilisateur_id',
    )
    email_verifie = models.BooleanField(default=False, db_column='email_verifie')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')

    class Meta:
        db_table = 'profils_utilisateurs'

    def __str__(self):
        return f"Profil de {self.utilisateur.username}"


class Pasteur(models.Model):
    utilisateur = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profil_pasteur',
        db_column='utilisateur_id',
    )
    nom_affichage = models.CharField(max_length=255, db_column='nom_affichage')
    biographie = models.TextField(blank=True, null=True, db_column='biographie')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, db_column='avatar')
    nom_eglise = models.CharField(max_length=255, blank=True, null=True, db_column='nom_eglise')
    lien_twitter = models.CharField(max_length=255, blank=True, null=True, db_column='lien_twitter')
    lien_facebook = models.CharField(max_length=255, blank=True, null=True, db_column='lien_facebook')
    lien_youtube = models.CharField(max_length=255, blank=True, null=True, db_column='lien_youtube')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')
    est_valide = models.BooleanField(
        default=False,
        db_column='est_valide',
        help_text="Indique si le compte du pasteur a été validé par un administrateur."
    )

    class Meta:
        db_table = 'pasteurs'

    def __str__(self):
        return self.nom_affichage


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

    def __str__(self):
        return self.nom


class Commentaire(models.Model):
    predication = models.ForeignKey(Predication, on_delete=models.CASCADE, related_name='commentaires', db_column='predication_id')
    utilisateur = models.ForeignKey(User, on_delete=models.CASCADE, related_name='commentaires', db_column='utilisateur_id')
    contenu = models.TextField(db_column='contenu')
    est_masque = models.BooleanField(default=False, db_column='est_masque')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')
    modifie_le = models.DateTimeField(auto_now=True, db_column='modifie_le')

    class Meta:
        db_table = 'commentaires'
        ordering = ['-cree_le']

    def __str__(self):
        return f"Commentaire de {self.utilisateur.username} sur {self.predication.titre}"


class Favori(models.Model):
    utilisateur = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favoris', db_column='utilisateur_id')
    predication = models.ForeignKey(Predication, on_delete=models.CASCADE, related_name='favoris', db_column='predication_id')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')

    class Meta:
        db_table = 'favoris'
        ordering = ['-cree_le']
        unique_together = ('utilisateur', 'predication')

    def __str__(self):
        return f"{self.utilisateur.username} - {self.predication.titre}"


class Abonnement(models.Model):
    utilisateur = models.ForeignKey(User, on_delete=models.CASCADE, related_name='abonnements', db_column='utilisateur_id')
    pasteur = models.ForeignKey(Pasteur, on_delete=models.CASCADE, related_name='abonnements', db_column='pasteur_id')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')

    class Meta:
        db_table = 'abonnements'
        ordering = ['-cree_le']
        unique_together = ('utilisateur', 'pasteur')

    def __str__(self):
        return f"{self.utilisateur.username} suit {self.pasteur.nom_affichage}"


class HistoriqueLecture(models.Model):
    utilisateur = models.ForeignKey(User, on_delete=models.CASCADE, related_name='historique_lecture', db_column='utilisateur_id')
    predication = models.ForeignKey(Predication, on_delete=models.CASCADE, related_name='historiques_lecture', db_column='predication_id')
    position_secondes = models.PositiveIntegerField(default=0, db_column='position_secondes')
    est_termine = models.BooleanField(default=False, db_column='est_termine')
    modifie_le = models.DateTimeField(auto_now=True, db_column='modifie_le')

    class Meta:
        db_table = 'historiques_lecture'
        ordering = ['-modifie_le']
        unique_together = ('utilisateur', 'predication')

    def __str__(self):
        return f"{self.utilisateur.username} - {self.predication.titre} ({self.position_secondes}s)"


class Signalement(models.Model):
    RAISON_CHOICES = [
        ('ABUS', 'Abus'),
        ('DROITS', "Droits d'auteur"),
        ('HAINE', 'Discours haineux'),
        ('AUTRE', 'Autre'),
    ]
    STATUT_CHOICES = [
        ('NOUVEAU', 'Nouveau'),
        ('EN_COURS', 'En cours'),
        ('TRAITE', 'Traite'),
        ('REJETE', 'Rejete'),
    ]

    utilisateur = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='signalements', blank=True, null=True, db_column='utilisateur_id')
    predication = models.ForeignKey(Predication, on_delete=models.CASCADE, related_name='signalements', db_column='predication_id')
    commentaire = models.ForeignKey(Commentaire, on_delete=models.CASCADE, related_name='signalements', blank=True, null=True, db_column='commentaire_id')
    raison = models.CharField(max_length=20, choices=RAISON_CHOICES, default='AUTRE', db_column='raison')
    details = models.TextField(blank=True, null=True, db_column='details')
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='NOUVEAU', db_column='statut')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')

    class Meta:
        db_table = 'signalements'
        ordering = ['-cree_le']

    def __str__(self):
        return f"{self.raison} - {self.predication.titre}"


class JournalAnalytique(models.Model):
    TYPE_ACTION_CHOICES = [
        ('PLAY_AUDIO', 'Lecture Audio'),
        ('WATCH_VIDEO', 'Lecture Vidéo'),
        ('DOWNLOAD', 'Téléchargement'),
    ]

    predication = models.ForeignKey(Predication, on_delete=models.CASCADE, related_name='journaux_analytiques', db_column='predication_id')
    type_action = models.CharField(max_length=20, choices=TYPE_ACTION_CHOICES, db_column='type_action')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')
    adresse_ip = models.GenericIPAddressField(blank=True, null=True, db_column='adresse_ip')

    class Meta:
        db_table = 'journaux_analytiques'

    def __str__(self):
        return f"{self.type_action} - {self.predication.titre} ({self.cree_le})"
