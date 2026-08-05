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


class AdministrationTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin", email="admin@example.com", password="MotDePasseSolide123", is_staff=True
        )
        self.utilisateur = User.objects.create_user(
            username="pasteur_a_valider", email="av@example.com", password="MotDePasseSolide123"
        )
        self.pasteur = Pasteur.objects.create(
            utilisateur=self.utilisateur, nom_affichage="Pasteur A Valider", est_valide=False
        )

    def test_pasteur_ne_peut_pas_s_auto_valider(self):
        self.client.force_authenticate(user=self.utilisateur)
        response = self.client.patch(
            f"/api/pasteurs/{self.pasteur.id}/",
            {"est_valide": True},
            format="json",
        )
        # La requete aboutit mais le champ est ignore (read-only).
        self.pasteur.refresh_from_db()
        self.assertFalse(self.pasteur.est_valide)

    def test_admin_peut_valider_un_pasteur(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f"/api/pasteurs/{self.pasteur.id}/valider/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["est_valide"])
        self.pasteur.refresh_from_db()
        self.assertTrue(self.pasteur.est_valide)

    def test_non_admin_ne_peut_pas_valider_un_pasteur(self):
        self.client.force_authenticate(user=self.utilisateur)
        response = self.client.post(f"/api/pasteurs/{self.pasteur.id}/valider/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_liste_les_pasteurs_a_valider(self):
        Pasteur.objects.create(
            utilisateur=User.objects.create_user(username="valide", password="MotDePasseSolide123"),
            nom_affichage="Deja valide",
            est_valide=True,
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/pasteurs/a_valider/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_admin_peut_changer_le_statut_d_un_signalement(self):
        predication = Predication.objects.create(
            pasteur=self.pasteur, titre="Sujet", type_media="AUDIO", est_publie=True
        )
        signalement = Signalement.objects.create(
            utilisateur=self.utilisateur, predication=predication, raison="ABUS", statut="NOUVEAU"
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/signalements/{signalement.id}/changer_statut/",
            {"statut": "TRAITE"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        signalement.refresh_from_db()
        self.assertEqual(signalement.statut, "TRAITE")

    def test_non_admin_ne_peut_pas_changer_le_statut_d_un_signalement(self):
        predication = Predication.objects.create(
            pasteur=self.pasteur, titre="Sujet", type_media="AUDIO", est_publie=True
        )
        signalement = Signalement.objects.create(
            utilisateur=self.utilisateur, predication=predication, raison="ABUS", statut="NOUVEAU"
        )
        self.client.force_authenticate(user=self.utilisateur)
        response = self.client.post(
            f"/api/signalements/{signalement.id}/changer_statut/",
            {"statut": "TRAITE"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)



class StatistiquesGlobalesTests(APITestCase):
    def test_admin_accede_aux_statistiques_globales(self):
        admin = User.objects.create_user(
            username="stat_admin", email="sa@example.com", password="MotDePasseSolide123", is_staff=True
        )
        utilisateur = User.objects.create_user(username="u1", password="MotDePasseSolide123")
        pasteur = Pasteur.objects.create(utilisateur=utilisateur, nom_affichage="P1", est_valide=True)
        Predication.objects.create(pasteur=pasteur, titre="P", type_media="AUDIO", est_publie=True, nombre_vues=7)

        self.client.force_authenticate(user=admin)
        response = self.client.get("/api/admin/statistiques/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_predications"], 1)
        self.assertEqual(response.data["total_vues"], 7)
        self.assertEqual(response.data["total_pasteurs_valides"], 1)
        self.assertIn("signalements_par_statut", response.data)
        self.assertIn("serie_analytique", response.data)

    def test_non_admin_refuse(self):
        utilisateur = User.objects.create_user(username="u2", password="MotDePasseSolide123")
        self.client.force_authenticate(user=utilisateur)
        response = self.client.get("/api/admin/statistiques/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class CreationPasteurParAdminTests(APITestCase):
    """Un compte cree par un admin doit etre immediatement operationnel.

    Sans souscription, le compte est valide mais bloque a la publication avec
    « Votre abonnement est expire » : c'est le bug qui avait rendu 3 pasteurs
    sur 4 incapables de publier.
    """

    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin_createur",
            email="admin-createur@example.com",
            password="MotDePasseSolide123",
            is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_pasteur_cree_par_admin_recoit_une_souscription_active(self):
        response = self.client.post(
            "/api/pasteurs/creer_compte_admin/",
            {
                "username": "pasteur_par_admin",
                "email": "pasteur-par-admin@example.com",
                "password": "MotDePasseSolide123",
                "nom_affichage": "Pasteur Cree Par Admin",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        pasteur = Pasteur.objects.get(utilisateur__username="pasteur_par_admin")
        self.assertTrue(pasteur.est_valide)
        souscription = getattr(pasteur, "souscription", None)
        self.assertIsNotNone(souscription, "Aucune souscription creee : le pasteur ne pourra pas publier.")
        self.assertTrue(souscription.est_active)
        self.assertTrue(souscription.est_essai)

    def test_pasteur_cree_par_admin_peut_publier_immediatement(self):
        self.client.post(
            "/api/pasteurs/creer_compte_admin/",
            {
                "username": "pasteur_publiant",
                "email": "pasteur-publiant@example.com",
                "password": "MotDePasseSolide123",
                "nom_affichage": "Pasteur Publiant",
            },
            format="json",
        )
        nouveau = User.objects.get(username="pasteur_publiant")
        self.client.force_authenticate(user=nouveau)

        response = self.client.post(
            "/api/predications/",
            {
                "titre": "Premiere predication",
                "type_media": "VIDEO",
                "est_publie": True,
                "url_video": "https://www.youtube.com/watch?v=ddddddddddd",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

