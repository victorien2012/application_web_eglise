from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import (
    Abonnement,
    Categorie,
    Commentaire,
    Etiquette,
    Favori,
    HistoriqueLecture,
    Pasteur,
    PieceJointe,
    Predication,
    ProfilUtilisateur,
    Serie,
    Signalement,
)


class RgpdTests(APITestCase):
    def setUp(self):
        self.utilisateur = User.objects.create_user(
            username="rgpd_user", email="rgpd@example.com", password="MotDePasseSolide123"
        )

    def test_export_de_mes_donnees(self):
        self.client.force_authenticate(user=self.utilisateur)
        response = self.client.get(reverse("mes_donnees"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["compte"]["username"], "rgpd_user")
        self.assertIn("favoris", response.data)
        self.assertIn("historique_lecture", response.data)

    def test_suppression_de_compte(self):
        self.client.force_authenticate(user=self.utilisateur)
        response = self.client.delete(reverse("supprimer_compte"))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(username="rgpd_user").exists())

    def test_export_exige_authentification(self):
        response = self.client.get(reverse("mes_donnees"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

