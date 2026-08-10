"""Tests de la synchronisation YouTube (resolution de chaine et garde-fous)."""

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import Pasteur, SouscriptionPasteur
from api.models.paiement import abonnement_pasteur_est_actif
from api.services.youtube_service import (
    motif_blocage_import,
    resoudre_channel_id_youtube,
)


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
