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


class UploadPredicationTests(APITestCase):
    def setUp(self):
        self.utilisateur = User.objects.create_user(
            username="pasteur_upload",
            email="upload@example.com",
            password="MotDePasseSolide123",
        )
        self.pasteur = Pasteur.objects.create(
            utilisateur=self.utilisateur,
            nom_affichage="Pasteur Upload",
        )
        self.client.force_authenticate(user=self.utilisateur)

    def test_upload_audio_valide_est_accepte(self):
        fichier = SimpleUploadedFile("predication.mp3", b"contenu-audio", content_type="audio/mpeg")
        response = self.client.post(
            "/api/predications/",
            {
                "titre": "Avec audio",
                "type_media": "AUDIO",
                "fichier_audio": fichier,
                "est_publie": True,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        predication = Predication.objects.get(id=response.data["id"])
        self.assertTrue(predication.fichier_audio)

    def test_upload_audio_mauvais_format_est_rejete(self):
        fichier = SimpleUploadedFile("predication.exe", b"binaire", content_type="application/octet-stream")
        response = self.client.post(
            "/api/predications/",
            {"titre": "Mauvais format", "type_media": "AUDIO", "fichier_audio": fichier},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("fichier_audio", response.data)

    def test_upload_image_trop_volumineuse_est_rejetee(self):
        gros_contenu = b"x" * (6 * 1024 * 1024)  # 6 Mo, au dela de la limite de 5 Mo
        fichier = SimpleUploadedFile("cover.png", gros_contenu, content_type="image/png")
        response = self.client.post(
            "/api/predications/",
            {"titre": "Image lourde", "type_media": "AUDIO", "image_couverture": fichier},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("image_couverture", response.data)

    def test_modification_predication_par_proprietaire(self):
        predication = Predication.objects.create(
            pasteur=self.pasteur,
            titre="Titre initial",
            type_media="AUDIO",
            est_publie=False,
        )

        response = self.client.patch(
            f"/api/predications/{predication.id}/",
            {"titre": "Titre modifie", "est_publie": True},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        predication.refresh_from_db()
        self.assertEqual(predication.titre, "Titre modifie")
        self.assertTrue(predication.est_publie)



class PublicationPlanifieeTests(APITestCase):
    def setUp(self):
        self.utilisateur = User.objects.create_user(
            username="pasteur_plan", email="plan@example.com", password="MotDePasseSolide123"
        )
        self.pasteur = Pasteur.objects.create(utilisateur=self.utilisateur, nom_affichage="Pasteur Plan")

    def test_predication_planifiee_dans_le_futur_est_masquee_au_public(self):
        from django.utils import timezone
        from datetime import timedelta

        Predication.objects.create(
            pasteur=self.pasteur,
            titre="A venir",
            type_media="AUDIO",
            est_publie=True,
            date_publication=timezone.now() + timedelta(days=2),
        )

        response = self.client.get("/api/predications/")
        self.assertEqual(len(response.data["results"]), 0)

    def test_predication_planifiee_passee_est_visible_au_public(self):
        from django.utils import timezone
        from datetime import timedelta

        Predication.objects.create(
            pasteur=self.pasteur,
            titre="Deja sortie",
            type_media="AUDIO",
            est_publie=True,
            date_publication=timezone.now() - timedelta(hours=1),
        )

        response = self.client.get("/api/predications/")
        self.assertEqual(len(response.data["results"]), 1)

    def test_pasteur_voit_sa_predication_planifiee(self):
        from django.utils import timezone
        from datetime import timedelta

        planifiee = Predication.objects.create(
            pasteur=self.pasteur,
            titre="Planifiee privee",
            type_media="AUDIO",
            est_publie=True,
            date_publication=timezone.now() + timedelta(days=1),
        )
        self.client.force_authenticate(user=self.utilisateur)

        detail = self.client.get(f"/api/predications/{planifiee.id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertTrue(detail.data["est_planifiee"])



class PieceJointeTests(APITestCase):
    def setUp(self):
        self.proprietaire = User.objects.create_user(
            username="pj_proprio", email="pj@example.com", password="MotDePasseSolide123"
        )
        self.pasteur = Pasteur.objects.create(utilisateur=self.proprietaire, nom_affichage="PJ Pasteur")
        self.predication = Predication.objects.create(
            pasteur=self.pasteur, titre="Avec PJ", type_media="AUDIO", est_publie=True
        )

    def test_pasteur_peut_ajouter_une_piece_jointe_valide(self):
        self.client.force_authenticate(user=self.proprietaire)
        fichier = SimpleUploadedFile("notes.pdf", b"%PDF-1.4 contenu", content_type="application/pdf")
        response = self.client.post(
            "/api/pieces-jointes/",
            {"predication": self.predication.id, "nom": "Notes", "fichier": fichier},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PieceJointe.objects.filter(predication=self.predication).count(), 1)

    def test_piece_jointe_mauvais_format_est_rejetee(self):
        self.client.force_authenticate(user=self.proprietaire)
        fichier = SimpleUploadedFile("malware.exe", b"MZ", content_type="application/octet-stream")
        response = self.client.post(
            "/api/pieces-jointes/",
            {"predication": self.predication.id, "nom": "X", "fichier": fichier},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("fichier", response.data)

    def test_tiers_ne_peut_pas_supprimer_une_piece_jointe(self):
        piece = PieceJointe.objects.create(
            predication=self.predication,
            nom="Doc",
            fichier=SimpleUploadedFile("doc.pdf", b"%PDF", content_type="application/pdf"),
        )
        tiers = User.objects.create_user(
            username="pj_tiers", email="pjt@example.com", password="MotDePasseSolide123"
        )
        self.client.force_authenticate(user=tiers)

        response = self.client.delete(f"/api/pieces-jointes/{piece.id}/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(PieceJointe.objects.filter(id=piece.id).exists())

