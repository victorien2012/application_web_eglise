from django.contrib.auth.models import User
from django.db import models


class Notification(models.Model):
    utilisateur = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', db_column='utilisateur_id')
    message = models.TextField(db_column='message')
    lu = models.BooleanField(default=False, db_column='lu')
    type_notification = models.CharField(max_length=50, default='ABONNEMENT', db_column='type_notification')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')

    class Meta:
        db_table = 'api_notification'
        ordering = ['-cree_le']

    def __str__(self):
        return f"Notif ({self.utilisateur.username}) - {self.message[:20]}"
