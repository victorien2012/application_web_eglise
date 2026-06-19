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



class ExtractionNomPredicateurTests(APITestCase):
    def test_extraction_directe(self):
        from api.serializers import extraire_nom_predicateur

        cas_tests = [
            ("Pasteur Marcello Tunasi - La foi", "Marcello Tunasi"),
            ("Evangéliste Yvan Castanou : Bâtir sa vie", "Yvan Castanou"),
            ("Enseignement avec Pasteur Mohammed Sanogo", "Mohammed Sanogo"),
            ("Révérend Raoul Wafo | Combat spirituel", "Raoul Wafo"),
            ("Une vie d'impact par le Frère Victorien", "Victorien"),
            ("La foi chrétienne", None),
        ]

        for titre, attendu in cas_tests:
            self.assertEqual(extraire_nom_predicateur(titre), attendu)

    def test_serializer_auto_remplissage(self):
        utilisateur = User.objects.create_user(
            username="pasteur_extraction",
            email="extraction@example.com",
            password="mot-de-passe-test",
        )
        pasteur = Pasteur.objects.create(utilisateur=utilisateur, nom_affichage="Pasteur Test")
        self.client.force_authenticate(user=utilisateur)

        # 1. Sans nom_predicateur fourni : doit extraire depuis le titre
        response = self.client.post(
            "/api/predications/",
            {
                "titre": "La puissance de Dieu par Pasteur Marcello Tunasi",
                "description": "Description de test",
                "type_media": "AUDIO",
                "est_publie": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["nom_predicateur"], "Marcello Tunasi")

        # 2. Avec nom_predicateur fourni : doit garder la valeur fournie
        response = self.client.post(
            "/api/predications/",
            {
                "titre": "La puissance de Dieu par Pasteur Marcello Tunasi",
                "description": "Description de test",
                "type_media": "AUDIO",
                "nom_predicateur": "Autre Prédicateur",
                "est_publie": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["nom_predicateur"], "Autre Prédicateur")
