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


class ApiSanteTests(APITestCase):
    def test_endpoint_public_predications_retourne_uniquement_les_predications_publiees(self):
        utilisateur = User.objects.create_user(
            username="pasteur_test",
            email="pasteur@example.com",
            password="mot-de-passe-test",
        )
        pasteur = Pasteur.objects.create(utilisateur=utilisateur, nom_affichage="Pasteur Test")
        predication_publiee = Predication.objects.create(
            pasteur=pasteur,
            titre="Predication publiee",
            type_media="AUDIO",
            est_publie=True,
        )
        Predication.objects.create(
            pasteur=pasteur,
            titre="Predication brouillon",
            type_media="AUDIO",
            est_publie=False,
        )

        response = self.client.get("/api/predications/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resultats = response.data["results"]
        self.assertEqual(len(resultats), 1)
        self.assertEqual(resultats[0]["id"], predication_publiee.id)
        self.assertEqual(resultats[0]["titre"], "Predication publiee")

    def test_connexion_jwt_retourne_les_tokens_et_le_profil_pasteur(self):
        utilisateur = User.objects.create_user(
            username="pasteur_login",
            email="login@example.com",
            password="mot-de-passe-test",
        )
        pasteur = Pasteur.objects.create(
            utilisateur=utilisateur,
            nom_affichage="Pasteur Login",
            nom_eglise="Eglise Test",
        )

        response = self.client.post(
            reverse("token_obtain_pair"),
            {"username": "pasteur_login", "password": "mot-de-passe-test"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["pasteur"]["id"], pasteur.id)
        self.assertEqual(response.data["pasteur"]["nom_affichage"], "Pasteur Login")

    def test_utilisateur_anonyme_ne_peut_pas_creer_de_predication(self):
        response = self.client.post(
            "/api/predications/",
            {"titre": "Creation interdite", "type_media": "AUDIO"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_pasteur_connecte_peut_creer_sa_predication(self):
        utilisateur = User.objects.create_user(
            username="pasteur_create",
            email="create@example.com",
            password="mot-de-passe-test",
        )
        pasteur = Pasteur.objects.create(utilisateur=utilisateur, nom_affichage="Pasteur Create")
        self.client.force_authenticate(user=utilisateur)

        response = self.client.post(
            "/api/predications/",
            {
                "titre": "Nouvelle predication",
                "description": "Description de test",
                "type_media": "AUDIO",
                "duree_secondes": 120,
                "est_publie": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        predication = Predication.objects.get(id=response.data["id"])
        self.assertEqual(predication.pasteur, pasteur)
        self.assertEqual(predication.titre, "Nouvelle predication")

    def test_utilisateur_connecte_sans_profil_pasteur_ne_peut_pas_creer_de_predication(self):
        utilisateur = User.objects.create_user(
            username="utilisateur_simple",
            email="simple@example.com",
            password="mot-de-passe-test",
        )
        self.client.force_authenticate(user=utilisateur)

        response = self.client.post(
            "/api/predications/",
            {"titre": "Creation sans profil pasteur", "type_media": "AUDIO"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

