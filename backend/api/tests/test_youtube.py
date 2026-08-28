"""Tests de la synchronisation YouTube (resolution de chaine et garde-fous)."""

import os
import shutil
import tempfile
import zipfile
from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from api.management.commands.telecharger_videos_youtube import Command
from api.models import Pasteur, Predication, SouscriptionPasteur, TelechargementYoutube
from api.models.paiement import abonnement_pasteur_est_actif
from api.services.youtube_service import (
    motif_blocage_import,
    resoudre_channel_id_youtube,
)


def _faux_telecharger(predication, dossier_travail):
    """Remplace `Command._telecharger` dans les tests : cree un vrai petit
    fichier local sans appel reseau a YouTube, pour que le zip de travail
    puisse l'archiver normalement."""
    annee = str(predication.date_publication.year)
    dossier_annee = os.path.join(dossier_travail, annee)
    os.makedirs(dossier_annee, exist_ok=True)
    chemin = os.path.join(dossier_annee, f'{predication.youtube_id}.mp4')
    with open(chemin, 'wb') as f:
        f.write(b'FAUX-CONTENU')
    return chemin, False


class ServiceYouTubeFactice:
    """Client YouTube minimal : ne resout que le handle et l'utilisateur connus."""

    HANDLE_CONNU = '@MaChaine'
    UTILISATEUR_CONNU = 'vieuxnom'
    ID_PAR_HANDLE = 'UCaaaaaaaaaaaaaaaaaaaaaa'
    ID_PAR_UTILISATEUR = 'UCbbbbbbbbbbbbbbbbbbbbbb'

    def channels(self):
        return self

    def list(self, **parametres):
        self.parametres = parametres
        return self

    def execute(self):
        if self.parametres.get('forHandle') == self.HANDLE_CONNU:
            return {'items': [{'id': self.ID_PAR_HANDLE}]}
        if self.parametres.get('forUsername') == self.UTILISATEUR_CONNU:
            return {'items': [{'id': self.ID_PAR_UTILISATEUR}]}
        return {'items': []}


class ResolutionChaineYouTubeTests(APITestCase):
    def setUp(self):
        self.service = ServiceYouTubeFactice()

    def test_url_channel_retourne_identifiant(self):
        identifiant = resoudre_channel_id_youtube(
            self.service, 'https://www.youtube.com/channel/UCcccccccccccccccccccccc'
        )
        self.assertEqual(identifiant, 'UCcccccccccccccccccccccc')

    def test_identifiant_brut_accepte(self):
        identifiant = resoudre_channel_id_youtube(self.service, 'UCdddddddddddddddddddddd')
        self.assertEqual(identifiant, 'UCdddddddddddddddddddddd')

    def test_handle_resolu_via_api(self):
        identifiant = resoudre_channel_id_youtube(self.service, 'https://www.youtube.com/@MaChaine')
        self.assertEqual(identifiant, ServiceYouTubeFactice.ID_PAR_HANDLE)

    def test_url_user_resolue_via_api(self):
        identifiant = resoudre_channel_id_youtube(self.service, 'https://www.youtube.com/user/vieuxnom')
        self.assertEqual(identifiant, ServiceYouTubeFactice.ID_PAR_UTILISATEUR)

    def test_url_personnalisee_c_est_resolue(self):
        """Le format /c/NOM etait annonce dans l'aide mais echouait systematiquement."""
        identifiant = resoudre_channel_id_youtube(self.service, 'https://www.youtube.com/c/MaChaine')
        self.assertEqual(identifiant, ServiceYouTubeFactice.ID_PAR_HANDLE)

    def test_chaine_inconnue_retourne_none(self):
        self.assertIsNone(
            resoudre_channel_id_youtube(self.service, 'https://www.youtube.com/@inconnue')
        )

    def test_identifiant_non_capture_hors_contexte(self):
        """« UC… » au milieu d'un handle ne doit pas etre pris pour un identifiant."""
        identifiant = resoudre_channel_id_youtube(
            self.service, 'https://www.youtube.com/@UCpasunidentifiant12345xyz'
        )
        self.assertNotEqual(identifiant, 'UCpasunidentifiant12345')


class BlocageImportYouTubeTests(APITestCase):
    """L'abonnement expire doit etre refuse AVANT la reponse 202.

    Le controle existe aussi dans la commande import_youtube_videos, mais il s'y
    execute dans un thread detache : son echec n'etait que journalise, apres que
    la vue ait deja annonce « Import demarre ».
    """

    def setUp(self):
        self.utilisateur = User.objects.create_user(
            username='pasteur_yt', email='yt@example.com', password='MotDePasseSolide123'
        )
        self.pasteur = Pasteur.objects.create(
            utilisateur=self.utilisateur, nom_affichage='Pasteur YouTube', est_valide=True
        )
        self.client.force_authenticate(user=self.utilisateur)

    def _souscription(self, jours):
        return SouscriptionPasteur.objects.create(
            pasteur=self.pasteur,
            date_fin=timezone.now() + timedelta(days=jours),
            est_essai=False,
        )

    def test_motif_blocage_si_abonnement_expire(self):
        self._souscription(jours=-5)
        self.pasteur.refresh_from_db()
        self.assertIsNotNone(motif_blocage_import(self.pasteur))

    def test_pas_de_blocage_si_abonnement_actif(self):
        self._souscription(jours=30)
        self.pasteur.refresh_from_db()
        self.assertIsNone(motif_blocage_import(self.pasteur))

    def test_blocage_sans_souscription(self):
        # Comportement corrige : l'absence de souscription est traitee comme
        # un abonnement inactif, pas comme un cas autorise. En usage normal
        # tout pasteur en obtient une des sa creation (creer_souscription_essai) ;
        # son absence ne peut venir que d'une donnee ancienne ou corrompue.
        self.assertIsNotNone(motif_blocage_import(self.pasteur))

    def test_synchronisation_refusee_si_abonnement_expire(self):
        self._souscription(jours=-5)
        reponse = self.client.post(
            '/api/pasteurs/synchroniser_youtube/',
            {'lien_youtube': 'https://www.youtube.com/@MaChaine'},
            format='json',
        )
        self.assertEqual(reponse.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertIn('abonnement', reponse.data['detail'].lower())

    @patch('api.views.pasteur_views.lancer_import_youtube_async')
    @patch('api.views.pasteur_views.resoudre_channel_id_youtube')
    @patch.dict('os.environ', {'GOOGLE_API_KEY': 'cle-de-test'})
    def test_synchronisation_acceptee_si_abonnement_actif(self, mock_resoudre, mock_import):
        mock_resoudre.return_value = 'UCaaaaaaaaaaaaaaaaaaaaaa'
        self._souscription(jours=30)

        reponse = self.client.post(
            '/api/pasteurs/synchroniser_youtube/',
            {'lien_youtube': 'https://www.youtube.com/@MaChaine'},
            format='json',
        )

        self.assertEqual(reponse.status_code, status.HTTP_202_ACCEPTED)
        mock_import.assert_called_once()
        self.pasteur.refresh_from_db()
        self.assertEqual(self.pasteur.lien_youtube, 'https://www.youtube.com/@MaChaine')

    def test_lien_vide_refuse(self):
        reponse = self.client.post(
            '/api/pasteurs/synchroniser_youtube/', {'lien_youtube': '   '}, format='json'
        )
        self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST)


class AbonnementPasteurEstActifTests(APITestCase):
    """abonnement_pasteur_est_actif centralise une regle auparavant reimplementee
    a quatre endroits (youtube_service, predication_views, documents.py,
    import_youtube_videos.py), avec une divergence reelle entre deux d'entre
    eux sur le traitement de l'absence de souscription.
    """

    def setUp(self):
        self.utilisateur = User.objects.create_user(
            username='pasteur_abo', email='abo@example.com', password='MotDePasseSolide123'
        )
        self.pasteur = Pasteur.objects.create(
            utilisateur=self.utilisateur, nom_affichage='Pasteur Abo', est_valide=True
        )

    def test_actif_si_souscription_valide(self):
        SouscriptionPasteur.objects.create(
            pasteur=self.pasteur, date_fin=timezone.now() + timedelta(days=30), est_essai=False
        )
        self.pasteur.refresh_from_db()
        self.assertTrue(abonnement_pasteur_est_actif(self.pasteur))

    def test_inactif_si_souscription_expiree(self):
        SouscriptionPasteur.objects.create(
            pasteur=self.pasteur, date_fin=timezone.now() - timedelta(days=1), est_essai=False
        )
        self.pasteur.refresh_from_db()
        self.assertFalse(abonnement_pasteur_est_actif(self.pasteur))

    def test_inactif_si_aucune_souscription(self):
        self.assertFalse(abonnement_pasteur_est_actif(self.pasteur))


class AdminSynchronisationYoutubeTests(APITestCase):
    """admin_synchroniser_youtube partage desormais son implementation avec
    synchroniser_youtube (voir _effectuer_synchronisation_youtube) : ces tests
    verifient que la fusion n'a rien change a son comportement propre
    (resolution du pasteur via cree_par_admin, message de succes distinct).
    """

    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_yt', email='admin_yt@example.com', password='MotDePasseSolide123',
            is_staff=True,
        )
        self.utilisateur_cible = User.objects.create_user(
            username='pasteur_admin_cree', email='cree@example.com', password='MotDePasseSolide123'
        )
        self.pasteur = Pasteur.objects.create(
            utilisateur=self.utilisateur_cible, nom_affichage='Pasteur Cree Admin',
            est_valide=True, cree_par_admin=True,
        )
        SouscriptionPasteur.objects.create(
            pasteur=self.pasteur, date_fin=timezone.now() + timedelta(days=30), est_essai=False
        )
        self.client.force_authenticate(user=self.admin)

    def test_refuse_si_pasteur_non_cree_par_admin(self):
        autre_utilisateur = User.objects.create_user(
            username='pasteur_public', email='public@example.com', password='MotDePasseSolide123'
        )
        pasteur_public = Pasteur.objects.create(
            utilisateur=autre_utilisateur, nom_affichage='Pasteur Public', est_valide=True,
            cree_par_admin=False,
        )
        reponse = self.client.post(
            f'/api/pasteurs/{pasteur_public.id}/admin_synchroniser_youtube/',
            {'lien_youtube': 'https://www.youtube.com/@MaChaine'}, format='json',
        )
        self.assertEqual(reponse.status_code, status.HTTP_404_NOT_FOUND)

    def test_refuse_si_non_admin(self):
        self.client.force_authenticate(user=self.utilisateur_cible)
        reponse = self.client.post(
            f'/api/pasteurs/{self.pasteur.id}/admin_synchroniser_youtube/',
            {'lien_youtube': 'https://www.youtube.com/@MaChaine'}, format='json',
        )
        self.assertEqual(reponse.status_code, status.HTTP_403_FORBIDDEN)

    def test_refuse_si_abonnement_expire(self):
        self.pasteur.souscription.date_fin = timezone.now() - timedelta(days=1)
        self.pasteur.souscription.save()
        reponse = self.client.post(
            f'/api/pasteurs/{self.pasteur.id}/admin_synchroniser_youtube/',
            {'lien_youtube': 'https://www.youtube.com/@MaChaine'}, format='json',
        )
        self.assertEqual(reponse.status_code, status.HTTP_402_PAYMENT_REQUIRED)

    @patch('api.views.pasteur_views.lancer_import_youtube_async')
    @patch('api.views.pasteur_views.resoudre_channel_id_youtube')
    @patch.dict('os.environ', {'GOOGLE_API_KEY': 'cle-de-test'})
    def test_accepte_et_message_distinct_du_flux_pasteur(self, mock_resoudre, mock_import):
        mock_resoudre.return_value = 'UCaaaaaaaaaaaaaaaaaaaaaa'
        reponse = self.client.post(
            f'/api/pasteurs/{self.pasteur.id}/admin_synchroniser_youtube/',
            {'lien_youtube': 'https://www.youtube.com/@MaChaine'}, format='json',
        )
        self.assertEqual(reponse.status_code, status.HTTP_202_ACCEPTED)
        mock_import.assert_called_once()
        # Le libelle admin ("Les vidéos") reste distinct de celui du pasteur
        # ("Vos vidéos") malgre la logique partagee.
        self.assertIn('Les vidéos', reponse.data['detail'])
        self.pasteur.refresh_from_db()
        self.assertEqual(self.pasteur.lien_youtube, 'https://www.youtube.com/@MaChaine')


class AdminTelechargementVideosYoutubeTests(APITestCase):
    """admin_telecharger_videos_youtube : telecharge les fichiers video des
    predications deja synchronisees (avec youtube_id) pour un pasteur —
    cree par l'admin ou inscrit lui-meme : a la difference de
    admin_synchroniser_youtube, le telechargement est une action de
    sauvegarde cote plateforme, pas une publication de contenu, donc pas
    restreinte a cree_par_admin. Le telechargement lui-meme (yt-dlp) tourne
    dans un thread detache : on le remplace ici par un mock pour ne pas
    dependre du reseau."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_dl', email='admin_dl@example.com', password='MotDePasseSolide123',
            is_staff=True,
        )
        self.utilisateur_cible = User.objects.create_user(
            username='pasteur_dl', email='pasteur_dl@example.com', password='MotDePasseSolide123'
        )
        self.pasteur = Pasteur.objects.create(
            utilisateur=self.utilisateur_cible, nom_affichage='Pasteur DL',
            est_valide=True, cree_par_admin=True,
        )
        self.client.force_authenticate(user=self.admin)

    @patch('api.views.pasteur_views.lancer_telechargement_videos_async')
    def test_accepte_pour_un_pasteur_non_cree_par_admin(self, mock_telecharger):
        autre_utilisateur = User.objects.create_user(
            username='pasteur_public_dl', email='public_dl@example.com', password='MotDePasseSolide123'
        )
        pasteur_public = Pasteur.objects.create(
            utilisateur=autre_utilisateur, nom_affichage='Pasteur Public DL', est_valide=True,
            cree_par_admin=False,
        )
        Predication.objects.create(
            pasteur=pasteur_public, titre='Vidéo test', type_media='VIDEO',
            url_video='https://www.youtube.com/watch?v=abc123', youtube_id='abc123',
        )
        reponse = self.client.post(
            f'/api/pasteurs/{pasteur_public.id}/admin_telecharger_videos_youtube/'
        )
        self.assertEqual(reponse.status_code, status.HTTP_202_ACCEPTED)
        mock_telecharger.assert_called_once()

    def test_404_si_pasteur_inexistant(self):
        reponse = self.client.post('/api/pasteurs/999999/admin_telecharger_videos_youtube/')
        self.assertEqual(reponse.status_code, status.HTTP_404_NOT_FOUND)

    def test_refuse_si_non_admin(self):
        self.client.force_authenticate(user=self.utilisateur_cible)
        reponse = self.client.post(
            f'/api/pasteurs/{self.pasteur.id}/admin_telecharger_videos_youtube/'
        )
        self.assertEqual(reponse.status_code, status.HTTP_403_FORBIDDEN)

    def test_refuse_si_aucune_video_synchronisee(self):
        reponse = self.client.post(
            f'/api/pasteurs/{self.pasteur.id}/admin_telecharger_videos_youtube/'
        )
        self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('api.views.pasteur_views.lancer_telechargement_videos_async')
    def test_accepte_et_cree_un_job_si_videos_synchronisees(self, mock_telecharger):
        Predication.objects.create(
            pasteur=self.pasteur, titre='Vidéo test', type_media='VIDEO',
            url_video='https://www.youtube.com/watch?v=abc123', youtube_id='abc123',
        )
        reponse = self.client.post(
            f'/api/pasteurs/{self.pasteur.id}/admin_telecharger_videos_youtube/'
        )
        self.assertEqual(reponse.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(reponse.data['statut'], 'EN_COURS')
        mock_telecharger.assert_called_once()
        self.assertTrue(TelechargementYoutube.objects.filter(pasteur=self.pasteur).exists())

    @patch('api.views.pasteur_views.lancer_telechargement_videos_async')
    def test_refuse_second_lancement_si_job_actif_tres_recent(self, mock_telecharger):
        """Deux processus yt-dlp concurrents ecriraient dans le meme dossier
        de travail : un job EN_COURS de quelques secondes est traite comme
        reellement actif, pas comme bloque."""
        Predication.objects.create(
            pasteur=self.pasteur, titre='Vidéo test', type_media='VIDEO',
            url_video='https://www.youtube.com/watch?v=abc123', youtube_id='abc123',
        )
        TelechargementYoutube.objects.create(pasteur=self.pasteur, statut='EN_COURS')

        reponse = self.client.post(
            f'/api/pasteurs/{self.pasteur.id}/admin_telecharger_videos_youtube/'
        )
        self.assertEqual(reponse.status_code, status.HTTP_409_CONFLICT)
        mock_telecharger.assert_not_called()

    @patch('api.views.pasteur_views.lancer_telechargement_videos_async')
    def test_autorise_relance_si_job_actif_ancien(self, mock_telecharger):
        """Un job EN_COURS date (thread probablement mort suite a une
        interruption) ne doit pas bloquer indefiniment une relance."""
        Predication.objects.create(
            pasteur=self.pasteur, titre='Vidéo test', type_media='VIDEO',
            url_video='https://www.youtube.com/watch?v=abc123', youtube_id='abc123',
        )
        job_bloque = TelechargementYoutube.objects.create(pasteur=self.pasteur, statut='EN_COURS')
        TelechargementYoutube.objects.filter(pk=job_bloque.pk).update(
            cree_le=timezone.now() - timedelta(minutes=5)
        )

        reponse = self.client.post(
            f'/api/pasteurs/{self.pasteur.id}/admin_telecharger_videos_youtube/'
        )
        self.assertEqual(reponse.status_code, status.HTTP_202_ACCEPTED)
        mock_telecharger.assert_called_once()

    def test_statut_404_si_aucun_job(self):
        reponse = self.client.get(
            f'/api/pasteurs/{self.pasteur.id}/admin_statut_telechargement_youtube/'
        )
        self.assertEqual(reponse.status_code, status.HTTP_404_NOT_FOUND)

    def test_statut_retourne_le_dernier_job(self):
        TelechargementYoutube.objects.create(pasteur=self.pasteur, statut='TERMINE', total_videos=3, videos_traitees=3)
        job_recent = TelechargementYoutube.objects.create(pasteur=self.pasteur, statut='EN_COURS', total_videos=5, videos_traitees=2)
        reponse = self.client.get(
            f'/api/pasteurs/{self.pasteur.id}/admin_statut_telechargement_youtube/'
        )
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)
        self.assertEqual(reponse.data['id'], job_recent.id)
        self.assertEqual(reponse.data['statut'], 'EN_COURS')


class TelechargementVideosZipPartielTests(TestCase):
    """Le zip publie sur le job doit refleter les videos deja telechargees
    au fil de l'eau, pas seulement une fois le job entierement termine —
    sinon une interruption en cours de route laisse le job sans aucun zip
    telechargeable malgre des videos deja recuperees."""

    def setUp(self):
        utilisateur = User.objects.create_user(username='pasteur_zip', password='motdepasse123')
        self.pasteur = Pasteur.objects.create(
            utilisateur=utilisateur, nom_affichage='Pasteur Zip Partiel', est_valide=True,
        )
        for i in range(5):
            Predication.objects.create(
                pasteur=self.pasteur, titre=f'Vidéo {i}', type_media='VIDEO',
                url_video=f'https://www.youtube.com/watch?v=vid{i}', youtube_id=f'vid{i}',
                date_publication=date(2024, 1, 1),
            )
        self.job = TelechargementYoutube.objects.create(pasteur=self.pasteur)

    def tearDown(self):
        dossier = os.path.join(tempfile.gettempdir(), 'telechargements_youtube', str(self.pasteur.pk))
        shutil.rmtree(dossier, ignore_errors=True)
        for job in TelechargementYoutube.objects.filter(pasteur=self.pasteur):
            if job.fichier_zip:
                job.fichier_zip.delete(save=False)

    @patch.object(Command, '_publier_zip_partiel')
    @patch.object(Command, '_telecharger', side_effect=_faux_telecharger)
    def test_publie_le_zip_par_lots_de_trois(self, mock_telecharger, mock_publier):
        Command().handle(pasteur=self.pasteur.pk, job_id=self.job.id)
        # 5 videos, lots de 3 : une publication apres la 3e, une apres la 5e (derniere, meme incomplete)
        self.assertEqual(mock_publier.call_count, 2)

    @patch.object(Command, '_telecharger', side_effect=_faux_telecharger)
    def test_zip_final_contient_toutes_les_videos_traitees(self, mock_telecharger):
        Command().handle(pasteur=self.pasteur.pk, job_id=self.job.id)
        self.job.refresh_from_db()
        self.assertEqual(self.job.statut, 'TERMINE')
        self.assertTrue(self.job.fichier_zip)
        with zipfile.ZipFile(self.job.fichier_zip.path) as archive:
            noms = sorted(archive.namelist())
        self.assertEqual(noms, sorted(f'2024/vid{i}.mp4' for i in range(5)))
        # succes complet : le dossier de travail (et son zip intermediaire) est nettoye
        dossier = os.path.join(tempfile.gettempdir(), 'telechargements_youtube', str(self.pasteur.pk))
        self.assertFalse(os.path.exists(dossier))

    @patch.object(Command, '_telecharger', side_effect=_faux_telecharger)
    def test_reprise_ne_reintegre_pas_deux_fois_une_video_deja_zippee(self, mock_telecharger):
        """Simule une interruption apres publication partielle : au
        redemarrage, les videos deja presentes dans le zip de travail ne
        doivent pas y etre dupliquees."""
        Command().handle(pasteur=self.pasteur.pk, job_id=self.job.id)
        self.job.refresh_from_db()

        # Deuxieme lancement (ex. relance manuelle) sur un job qui a deja tout.
        autre_job = TelechargementYoutube.objects.create(pasteur=self.pasteur)
        Command().handle(pasteur=self.pasteur.pk, job_id=autre_job.id)
        autre_job.refresh_from_db()

        with zipfile.ZipFile(autre_job.fichier_zip.path) as archive:
            noms = archive.namelist()
        self.assertEqual(len(noms), len(set(noms)))
        self.assertEqual(sorted(noms), sorted(f'2024/vid{i}.mp4' for i in range(5)))
