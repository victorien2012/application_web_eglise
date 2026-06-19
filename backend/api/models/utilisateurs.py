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
    contact = models.CharField(max_length=50, blank=True, null=True, db_column='contact')
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
    contact = models.CharField(max_length=50, blank=True, null=True, db_column='contact')
    nom_eglise = models.CharField(max_length=255, blank=True, null=True, db_column='nom_eglise')
    logo_eglise = models.ImageField(upload_to='logos/', blank=True, null=True, db_column='logo_eglise')
    lien_twitter = models.CharField(max_length=255, blank=True, null=True, db_column='lien_twitter')
    lien_facebook = models.CharField(max_length=255, blank=True, null=True, db_column='lien_facebook')
    lien_youtube = models.CharField(max_length=255, blank=True, null=True, db_column='lien_youtube')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')
    est_valide = models.BooleanField(
        default=False,
        db_column='est_valide',
        help_text="Indique si le compte du pasteur a été validé par un administrateur."
    )
    est_rejete = models.BooleanField(
        default=False,
        db_column='est_rejete',
        help_text="Indique si la demande du pasteur a été explicitement rejetée."
    )
    cree_par_admin = models.BooleanField(
        default=False,
        db_column='cree_par_admin',
        help_text="Indique si le compte a été créé par un administrateur."
    )

    class Meta:
        db_table = 'pasteurs'

    def __str__(self):
        return self.nom_affichage


class DemandePasteur(Pasteur):
    class Meta:
        proxy = True
        verbose_name = "Demande de pasteur"
        verbose_name_plural = "Demandes de pasteurs"
