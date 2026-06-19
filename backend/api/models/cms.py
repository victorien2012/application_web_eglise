from django.db import models


class Annonce(models.Model):
    titre = models.CharField(max_length=255, db_column='titre')
    message = models.TextField(db_column='message')
    est_actif = models.BooleanField(default=True, db_column='est_actif', help_text="Indique si l'annonce doit être affichée sur la page d'accueil.")
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')
    date_expiration = models.DateTimeField(blank=True, null=True, db_column='date_expiration', help_text="Si renseignée, l'annonce expirera automatiquement à cette date.")

    class Meta:
        db_table = 'annonces'
        ordering = ['-cree_le']
        verbose_name = 'Annonce'
        verbose_name_plural = 'Annonces'

    def __str__(self):
        return self.titre


class CarrouselMedia(models.Model):
    TYPE_MEDIA_CHOICES = [
        ('IMAGE', 'Image'),
        ('VIDEO', 'Vidéo'),
    ]

    titre = models.CharField(max_length=255, blank=True, null=True, db_column='titre')
    description = models.TextField(blank=True, null=True, db_column='description')
    fichier = models.FileField(upload_to='carrousel/', blank=True, null=True, db_column='fichier', help_text='Fichier image.')
    url_video = models.URLField(blank=True, null=True, db_column='url_video', help_text='Lien YouTube si le type est Vidéo.')
    type_media = models.CharField(max_length=10, choices=TYPE_MEDIA_CHOICES, default='IMAGE', db_column='type_media')
    est_actif = models.BooleanField(default=True, db_column='est_actif', help_text='Indique si le média doit être affiché dans le carrousel.')
    ordre = models.IntegerField(default=0, db_column='ordre', help_text='Ordre daffichage du média dans le carrousel.')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')

    class Meta:
        db_table = 'carrousel_media'
        ordering = ['ordre', '-cree_le']
        verbose_name = 'Média du Carrousel'
        verbose_name_plural = 'Médias du Carrousel'

    def __str__(self):
        return self.titre if self.titre else f"Média {self.id} ({self.type_media})"


class ConfigurationSite(models.Model):
    nom_site = models.CharField(max_length=255, default='Mon Eglise', db_column='nom_site')
    logo = models.ImageField(upload_to='site/', blank=True, null=True, db_column='logo', help_text='Logo global du site')
    mis_a_jour_le = models.DateTimeField(auto_now=True, db_column='mis_a_jour_le')

    class Meta:
        db_table = 'configuration_site'
        verbose_name = 'Configuration du Site'
        verbose_name_plural = 'Configuration du Site'

    def __str__(self):
        return self.nom_site

    def save(self, *args, **kwargs):
        # S'assurer qu'il n'y a qu'une seule instance
        if not self.pk and ConfigurationSite.objects.exists():
            return
        return super().save(*args, **kwargs)
