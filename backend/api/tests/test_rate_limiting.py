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


class RateLimitingTests(APITestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_inscription_est_limitee_en_debit(self):
        # La limite de production est 20/min: au-dela, l'API repond 429.
        statuts = []
        for i in range(25):
            response = self.client.post(
                reverse("inscription"),
                {"username": f"rl_user_{i}", "email": f"rl{i}@example.com", "password": "MotDePasseSolide123"},
                format="json",
            )
            statuts.append(response.status_code)

        self.assertEqual(statuts[0], status.HTTP_201_CREATED)
        self.assertIn(status.HTTP_429_TOO_MANY_REQUESTS, statuts)

