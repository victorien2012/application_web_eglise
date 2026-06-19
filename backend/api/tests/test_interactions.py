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


class ModerationCommentaireTests(APITestCase):
    def setUp(self):
        self.proprietaire = User.objects.create_user(
            username="pasteur_proprio", email="proprio@example.com", password="MotDePasseSolide123"
        )
        self.pasteur = Pasteur.objects.create(utilisateur=self.proprietaire, nom_affichage="Pasteur Proprio")
        self.autre_pasteur_user = User.objects.create_user(
            username="autre_pasteur", email="autre@example.com", password="MotDePasseSolide123"
        )
        Pasteur.objects.create(utilisateur=self.autre_pasteur_user, nom_affichage="Autre Pasteur")
        self.membre = User.objects.create_user(
            username="membre_comment", email="membre@example.com", password="MotDePasseSolide123"
        )
        self.predication = Predication.objects.create(
            pasteur=self.pasteur, titre="Sujet", type_media="AUDIO", est_publie=True
        )
        self.commentaire = Commentaire.objects.create(
            predication=self.predication, utilisateur=self.membre, contenu="Un commentaire."
        )

    def test_pasteur_voit_commentaires_masques_en_mode_moderation(self):
        self.commentaire.est_masque = True
        self.commentaire.save(update_fields=['est_masque'])
        self.client.force_authenticate(user=self.proprietaire)

        public = self.client.get(f"/api/commentaires/?predication={self.predication.id}")
        moderation = self.client.get(f"/api/commentaires/?predication={self.predication.id}&moderation=true")

        self.assertEqual(len(public.data["results"]), 0)
        self.assertEqual(len(moderation.data["results"]), 1)

    def test_pasteur_proprietaire_peut_masquer_un_commentaire(self):
        self.client.force_authenticate(user=self.proprietaire)
        response = self.client.post(f"/api/commentaires/{self.commentaire.id}/basculer_masquage/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["est_masque"])
        self.commentaire.refresh_from_db()
        self.assertTrue(self.commentaire.est_masque)

    def test_autre_pasteur_ne_peut_pas_moderer(self):
        self.client.force_authenticate(user=self.autre_pasteur_user)
        response = self.client.post(f"/api/commentaires/{self.commentaire.id}/basculer_masquage/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.commentaire.refresh_from_db()
        self.assertFalse(self.commentaire.est_masque)

    def test_auteur_peut_supprimer_son_commentaire(self):
        self.client.force_authenticate(user=self.membre)
        response = self.client.delete(f"/api/commentaires/{self.commentaire.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Commentaire.objects.filter(id=self.commentaire.id).exists())

    def test_tiers_ne_peut_pas_supprimer_un_commentaire(self):
        tiers = User.objects.create_user(
            username="tiers", email="tiers@example.com", password="MotDePasseSolide123"
        )
        self.client.force_authenticate(user=tiers)
        response = self.client.delete(f"/api/commentaires/{self.commentaire.id}/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Commentaire.objects.filter(id=self.commentaire.id).exists())

