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


class InscriptionTests(APITestCase):
    def test_inscription_utilisateur_simple_retourne_les_tokens(self):
        response = self.client.post(
            reverse("inscription"),
            {
                "username": "nouveau_membre",
                "email": "membre@example.com",
                "password": "MotDePasseSolide123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIsNone(response.data["pasteur"])
        self.assertTrue(User.objects.filter(username="nouveau_membre").exists())
        self.assertFalse(Pasteur.objects.filter(utilisateur__username="nouveau_membre").exists())

    def test_inscription_pasteur_cree_le_profil_associe(self):
        response = self.client.post(
            reverse("inscription"),
            {
                "username": "nouveau_pasteur",
                "email": "pasteur-inscrit@example.com",
                "password": "MotDePasseSolide123",
                "est_pasteur": True,
                "nom_affichage": "Pasteur Inscrit",
                "nom_eglise": "Eglise Nouvelle",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(response.data["pasteur"])
        self.assertEqual(response.data["pasteur"]["nom_affichage"], "Pasteur Inscrit")
        pasteur = Pasteur.objects.get(utilisateur__username="nouveau_pasteur")
        self.assertEqual(pasteur.nom_eglise, "Eglise Nouvelle")

    def test_inscription_pasteur_sans_nom_affichage_est_rejetee(self):
        response = self.client.post(
            reverse("inscription"),
            {
                "username": "pasteur_incomplet",
                "email": "incomplet@example.com",
                "password": "MotDePasseSolide123",
                "est_pasteur": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("nom_affichage", response.data)
        self.assertFalse(User.objects.filter(username="pasteur_incomplet").exists())

    def test_inscription_username_existant_est_rejetee(self):
        User.objects.create_user(
            username="deja_pris",
            email="autre@example.com",
            password="MotDePasseSolide123",
        )

        response = self.client.post(
            reverse("inscription"),
            {
                "username": "deja_pris",
                "email": "nouveau@example.com",
                "password": "MotDePasseSolide123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_inscription_mot_de_passe_trop_faible_est_rejetee(self):
        response = self.client.post(
            reverse("inscription"),
            {
                "username": "membre_faible",
                "email": "faible@example.com",
                "password": "123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)
        self.assertFalse(User.objects.filter(username="membre_faible").exists())



class ReinitialisationMotDePasseTests(APITestCase):
    def setUp(self):
        self.utilisateur = User.objects.create_user(
            username="membre_reset",
            email="reset@example.com",
            password="AncienMotDePasse123",
        )

    def test_demande_pour_email_existant_envoie_un_email(self):
        response = self.client.post(
            reverse("mot_de_passe_oublie"),
            {"email": "reset@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("reinitialiser-mot-de-passe", mail.outbox[0].body)

    def test_demande_pour_email_inconnu_repond_200_sans_email(self):
        response = self.client.post(
            reverse("mot_de_passe_oublie"),
            {"email": "inconnu@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_confirmation_avec_token_valide_change_le_mot_de_passe(self):
        uid = urlsafe_base64_encode(force_bytes(self.utilisateur.pk))
        token = default_token_generator.make_token(self.utilisateur)

        response = self.client.post(
            reverse("reinitialiser_mot_de_passe"),
            {"uid": uid, "token": token, "nouveau_mot_de_passe": "NouveauMotDePasse456"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.utilisateur.refresh_from_db()
        self.assertTrue(self.utilisateur.check_password("NouveauMotDePasse456"))

    def test_confirmation_avec_token_invalide_est_rejetee(self):
        uid = urlsafe_base64_encode(force_bytes(self.utilisateur.pk))

        response = self.client.post(
            reverse("reinitialiser_mot_de_passe"),
            {"uid": uid, "token": "token-bidon", "nouveau_mot_de_passe": "NouveauMotDePasse456"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.utilisateur.refresh_from_db()
        self.assertTrue(self.utilisateur.check_password("AncienMotDePasse123"))

    def test_confirmation_avec_mot_de_passe_faible_est_rejetee(self):
        uid = urlsafe_base64_encode(force_bytes(self.utilisateur.pk))
        token = default_token_generator.make_token(self.utilisateur)

        response = self.client.post(
            reverse("reinitialiser_mot_de_passe"),
            {"uid": uid, "token": token, "nouveau_mot_de_passe": "123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("nouveau_mot_de_passe", response.data)



class VerificationEmailTests(APITestCase):
    def test_inscription_cree_un_profil_non_verifie_et_envoie_un_email(self):
        response = self.client.post(
            reverse("inscription"),
            {
                "username": "membre_verif",
                "email": "verif@example.com",
                "password": "MotDePasseSolide123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data["email_verifie"])
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("verifier-email", mail.outbox[0].body)
        user = User.objects.get(username="membre_verif")
        self.assertFalse(user.profil.email_verifie)

    def test_verification_avec_token_valide_marque_email_verifie(self):
        from .views import generateur_token_email

        user = User.objects.create_user(
            username="a_verifier",
            email="a-verifier@example.com",
            password="MotDePasseSolide123",
        )
        ProfilUtilisateur.objects.create(utilisateur=user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = generateur_token_email.make_token(user)

        response = self.client.post(
            reverse("verifier_email"),
            {"uid": uid, "token": token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["email_verifie"])
        user.profil.refresh_from_db()
        self.assertTrue(user.profil.email_verifie)

    def test_verification_avec_token_invalide_est_rejetee(self):
        user = User.objects.create_user(
            username="token_faux",
            email="token-faux@example.com",
            password="MotDePasseSolide123",
        )
        ProfilUtilisateur.objects.create(utilisateur=user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        response = self.client.post(
            reverse("verifier_email"),
            {"uid": uid, "token": "mauvais-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        user.profil.refresh_from_db()
        self.assertFalse(user.profil.email_verifie)

    def test_token_mot_de_passe_ne_verifie_pas_l_email(self):
        """Un token de reinitialisation ne doit pas valider l'email (salts distincts)."""
        user = User.objects.create_user(
            username="croise",
            email="croise@example.com",
            password="MotDePasseSolide123",
        )
        ProfilUtilisateur.objects.create(utilisateur=user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token_reset = default_token_generator.make_token(user)

        response = self.client.post(
            reverse("verifier_email"),
            {"uid": uid, "token": token_reset},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

