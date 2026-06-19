from django.contrib.auth.models import User
from django.db import models

from .utilisateurs import Pasteur
from .contenu import Predication


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
    commentaire = models.ForeignKey('Commentaire', on_delete=models.CASCADE, related_name='signalements', blank=True, null=True, db_column='commentaire_id')
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
