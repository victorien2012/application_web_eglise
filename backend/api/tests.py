from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Abonnement,
    Categorie,
    Commentaire,
    Etiquette,
    Favori,
    HistoriqueLecture,
    Pasteur,
    Predication,
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
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], predication_publiee.id)
        self.assertEqual(response.data[0]["titre"], "Predication publiee")

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


class ModeleMetierTests(APITestCase):
    def setUp(self):
        self.utilisateur = User.objects.create_user(
            username="utilisateur",
            email="utilisateur@example.com",
            password="mot-de-passe-test",
        )
        self.utilisateur_pasteur = User.objects.create_user(
            username="pasteur_metier",
            email="pasteur-metier@example.com",
            password="mot-de-passe-test",
        )
        self.pasteur = Pasteur.objects.create(
            utilisateur=self.utilisateur_pasteur,
            nom_affichage="Pasteur Metier",
            nom_eglise="Eglise Metier",
        )
        self.predication = Predication.objects.create(
            pasteur=self.pasteur,
            titre="Foi et esperance",
            type_media="AUDIO",
            est_publie=True,
        )

    def test_predication_expose_categories_etiquettes_et_serie(self):
        categorie = Categorie.objects.create(nom="Foi")
        etiquette = Etiquette.objects.create(nom="Esperance")
        serie = Serie.objects.create(pasteur=self.pasteur, titre="Serie test")
        self.predication.categories.add(categorie)
        self.predication.etiquettes.add(etiquette)
        self.predication.serie = serie
        self.predication.save()

        response = self.client.get(f"/api/predications/{self.predication.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["categories"][0]["nom"], "Foi")
        self.assertEqual(response.data["etiquettes"][0]["nom"], "Esperance")
        self.assertEqual(response.data["serie"]["titre"], "Serie test")

    def test_utilisateur_connecte_peut_commenter_favoriser_s_abonner_et_signaler(self):
        self.client.force_authenticate(user=self.utilisateur)

        commentaire_response = self.client.post(
            "/api/commentaires/",
            {"predication": self.predication.id, "contenu": "Message edifiant."},
            format="json",
        )
        favori_response = self.client.post(
            "/api/favoris/",
            {"predication": self.predication.id},
            format="json",
        )
        abonnement_response = self.client.post(
            "/api/abonnements/",
            {"pasteur": self.pasteur.id},
            format="json",
        )
        historique_response = self.client.post(
            "/api/historique-lecture/",
            {"predication": self.predication.id, "position_secondes": 42, "est_termine": False},
            format="json",
        )
        signalement_response = self.client.post(
            "/api/signalements/",
            {"predication": self.predication.id, "raison": "AUTRE", "details": "A verifier."},
            format="json",
        )

        self.assertEqual(commentaire_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(favori_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(abonnement_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(historique_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(signalement_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Commentaire.objects.count(), 1)
        self.assertEqual(Favori.objects.count(), 1)
        self.assertEqual(Abonnement.objects.count(), 1)
        self.assertEqual(HistoriqueLecture.objects.count(), 1)
        self.assertEqual(Signalement.objects.count(), 1)

    def test_pasteur_peut_creer_serie_et_lier_predication(self):
        self.client.force_authenticate(user=self.utilisateur_pasteur)
        categorie = Categorie.objects.create(nom="Enseignement")
        etiquette = Etiquette.objects.create(nom="Bible")

        serie_response = self.client.post(
            "/api/series/",
            {"titre": "Marcher avec Dieu", "description": "Serie de test"},
            format="json",
        )
        self.assertEqual(serie_response.status_code, status.HTTP_201_CREATED)

        predication_response = self.client.post(
            "/api/predications/",
            {
                "titre": "Episode 1",
                "type_media": "AUDIO",
                "serie": serie_response.data["id"],
                "categories_ids": [categorie.id],
                "etiquettes_ids": [etiquette.id],
                "est_publie": True,
            },
            format="json",
        )

        self.assertEqual(predication_response.status_code, status.HTTP_201_CREATED)
        predication = Predication.objects.get(id=predication_response.data["id"])
        self.assertEqual(predication.serie_id, serie_response.data["id"])
        self.assertEqual(list(predication.categories.values_list("nom", flat=True)), ["Enseignement"])
        self.assertEqual(list(predication.etiquettes.values_list("nom", flat=True)), ["Bible"])
