from django.db import models
from django.utils import timezone
import datetime
from .utilisateurs import Pasteur

class PlanTarifaire(models.Model):
    nom = models.CharField(max_length=100, db_column='nom')
    description = models.TextField(blank=True, null=True, db_column='description')
    prix = models.DecimalField(max_digits=10, decimal_places=0, help_text="Prix en FCFA", db_column='prix')
    duree_jours = models.IntegerField(default=30, help_text="Durée de validité en jours", db_column='duree_jours')
    est_actif = models.BooleanField(default=True, db_column='est_actif')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')

    class Meta:
        db_table = 'plans_tarifaires'
        ordering = ['prix']
        verbose_name = 'Plan Tarifaire'
        verbose_name_plural = 'Plans Tarifaires'

    def __str__(self):
        return f"{self.nom} - {self.prix} FCFA"

class SouscriptionPasteur(models.Model):
    pasteur = models.OneToOneField(Pasteur, on_delete=models.CASCADE, related_name='souscription', db_column='pasteur_id')
    plan = models.ForeignKey(PlanTarifaire, on_delete=models.SET_NULL, null=True, blank=True, db_column='plan_id')
    date_debut = models.DateTimeField(default=timezone.now, db_column='date_debut')
    date_fin = models.DateTimeField(db_column='date_fin')
    est_essai = models.BooleanField(default=False, db_column='est_essai', help_text="Indique si c'est la période d'essai gratuite")
    
    class Meta:
        db_table = 'souscriptions_pasteurs'
        verbose_name = 'Souscription Pasteur'
        verbose_name_plural = 'Souscriptions Pasteurs'

    def __str__(self):
        return f"Souscription de {self.pasteur.nom_affichage}"

    @property
    def est_active(self):
        return self.date_fin >= timezone.now()

    @property
    def jours_restants(self):
        delta = self.date_fin - timezone.now()
        return max(0, delta.days)

DUREE_ESSAI_JOURS = 365


def creer_souscription_essai(pasteur, duree_jours=DUREE_ESSAI_JOURS):
    """Ouvre une période d'essai gratuite pour un pasteur qui n'en a pas encore.

    Publier exige une souscription active : tout chemin de création de pasteur doit
    donc passer par ici, sous peine de créer un compte validé mais incapable de
    publier quoi que ce soit. Idempotent — un pasteur déjà abonné n'est pas touché.
    """
    souscription_existante = getattr(pasteur, 'souscription', None)
    if souscription_existante is not None:
        return souscription_existante
    return SouscriptionPasteur.objects.create(
        pasteur=pasteur,
        date_fin=timezone.now() + datetime.timedelta(days=duree_jours),
        est_essai=True,
    )


class Transaction(models.Model):
    STATUT_CHOICES = [
        ('PENDING', 'En attente'),
        ('SUCCESS', 'Succès'),
        ('FAILED', 'Échoué'),
    ]
    METHODE_CHOICES = [
        ('WAVE', 'Wave'),
        ('ORANGE_MONEY', 'Orange Money'),
        ('MTN_MONEY', 'MTN Mobile Money'),
        ('MOOV_MONEY', 'Moov Money'),
    ]

    pasteur = models.ForeignKey(Pasteur, on_delete=models.CASCADE, related_name='transactions', db_column='pasteur_id')
    plan = models.ForeignKey(PlanTarifaire, on_delete=models.SET_NULL, null=True, db_column='plan_id')
    montant = models.DecimalField(max_digits=10, decimal_places=0, db_column='montant')
    reference = models.CharField(max_length=100, unique=True, db_column='reference')
    methode = models.CharField(max_length=20, choices=METHODE_CHOICES, db_column='methode')
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='PENDING', db_column='statut')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')
    maj_le = models.DateTimeField(auto_now=True, db_column='maj_le')

    class Meta:
        db_table = 'transactions_paiement'
        ordering = ['-cree_le']
        verbose_name = 'Transaction'
        verbose_name_plural = 'Transactions'

    def __str__(self):
        return f"{self.reference} - {self.montant} FCFA ({self.statut})"
