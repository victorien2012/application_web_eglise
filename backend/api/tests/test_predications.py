from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
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
    SouscriptionPasteur,
)


def creer_pasteur_publiant(utilisateur, nom_affichage, **extra):
    """Cree un pasteur reellement autorise a publier : valide et avec un abonnement actif.

    Publier exige `est_valide=True` (defaut du modele : False) et une souscription
    active ; sans cela l'API repond 400 avant meme d'atteindre le serializer.
    """
    pasteur = Pasteur.objects.create(
        utilisateur=utilisateur,
        nom_affichage=nom_affichage,
        est_valide=True,
        **extra,
    )
    SouscriptionPasteur.objects.create(
        pasteur=pasteur,
        date_fin=timezone.now() + timedelta(days=30),
    )
    return pasteur


class UploadPredicationTests(APITestCase):
    def setUp(self):
        self.utilisateur = User.objects.create_user(
            username="pasteur_upload",
            email="upload@example.com",
            password="MotDePasseSolide123",
        )
        self.pasteur = creer_pasteur_publiant(self.utilisateur, "Pasteur Upload")
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

    def test_date_predication_est_enregistree(self):
        """date_predication existait dans le formulaire frontend et etait
        envoyee a chaque enregistrement, mais absente du modele : silencieusement
        ignoree par le serializer. Verifie qu'elle est desormais persistee."""
        fichier = SimpleUploadedFile("predication.mp3", b"contenu-audio", content_type="audio/mpeg")
        response = self.client.post(
            "/api/predications/",
            {
                "titre": "Avec date de predication",
                "type_media": "AUDIO",
                "fichier_audio": fichier,
                "est_publie": True,
                "date_predication": "2024-06-15",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        predication = Predication.objects.get(id=response.data["id"])
        self.assertEqual(str(predication.date_predication), "2024-06-15")

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
            # Une predication doit avoir une source media pour pouvoir etre publiee.
            fichier_audio=SimpleUploadedFile("initial.mp3", b"audio", content_type="audio/mpeg"),
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

        # La liste des predications n'est pas paginee (pagination_class = None).
        response = self.client.get("/api/predications/")
        self.assertEqual(len(response.data), 0)

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

        # La liste des predications n'est pas paginee (pagination_class = None).
        response = self.client.get("/api/predications/")
        self.assertEqual(len(response.data), 1)

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


class ServiceVideosYoutubeFactice:
    """Client YouTube minimal : ne repond que pour l'ID de video connu."""

    ID_CONNU = 'abc12345678'

    def videos(self):
        return self

    def list(self, **parametres):
        self.parametres = parametres
        return self

    def execute(self):
        if self.parametres.get('id') == self.ID_CONNU:
            return {'items': [{'snippet': {
                'title': 'Message du Pasteur Jean - La foi qui déplace les montagnes',
                'description': "Une prédication puissante.\n\nPasteur Jean Dupont",
                'channelTitle': 'Chaîne Église Test',
                'publishedAt': '2024-06-15T18:30:00Z',
            }}]}
        return {'items': []}


class InfoYoutubeTests(APITestCase):
    """info_youtube : recupere titre/description/predicateur/date pour
    pre-remplir le formulaire d'ajout de video par lien, sans ressaisie
    manuelle."""

    def setUp(self):
        self.utilisateur = User.objects.create_user(
            username="pasteur_info_yt", email="info_yt@example.com", password="MotDePasseSolide123"
        )
        self.pasteur = creer_pasteur_publiant(self.utilisateur, "Pasteur Info YT")
        self.client.force_authenticate(user=self.utilisateur)

    def test_refuse_si_non_connecte(self):
        self.client.force_authenticate(user=None)
        reponse = self.client.get('/api/predications/info_youtube/?url=https://youtu.be/abc12345678')
        self.assertEqual(reponse.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refuse_si_lien_non_reconnu(self):
        reponse = self.client.get('/api/predications/info_youtube/?url=https://exemple.com/pas-youtube')
        self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST)

    def test_503_si_cle_api_absente(self):
        with patch.dict('os.environ', {}, clear=True):
            reponse = self.client.get('/api/predications/info_youtube/?url=https://youtu.be/abc12345678')
        self.assertEqual(reponse.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    @patch('googleapiclient.discovery.build')
    @patch.dict('os.environ', {'GOOGLE_API_KEY': 'cle-de-test'})
    def test_retourne_titre_description_et_predicateur_devine(self, mock_build):
        mock_build.return_value = ServiceVideosYoutubeFactice()
        reponse = self.client.get('/api/predications/info_youtube/?url=https://youtu.be/abc12345678')

        self.assertEqual(reponse.status_code, status.HTTP_200_OK)
        self.assertIn('La foi qui déplace les montagnes', reponse.data['titre'])
        self.assertIn('prédication puissante', reponse.data['description'])
        self.assertEqual(reponse.data['nom_predicateur'], 'Jean')
        self.assertEqual(reponse.data['date_predication'], '2024-06-15')

    @patch('googleapiclient.discovery.build')
    @patch.dict('os.environ', {'GOOGLE_API_KEY': 'cle-de-test'})
    def test_video_introuvable(self, mock_build):
        mock_build.return_value = ServiceVideosYoutubeFactice()
        reponse = self.client.get('/api/predications/info_youtube/?url=https://youtu.be/introuvable12')
        self.assertEqual(reponse.status_code, status.HTTP_404_NOT_FOUND)

