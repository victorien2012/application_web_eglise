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

from .models import (
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


class RgpdTests(APITestCase):
    def setUp(self):
        self.utilisateur = User.objects.create_user(
            username="rgpd_user", email="rgpd@example.com", password="MotDePasseSolide123"
        )

    def test_export_de_mes_donnees(self):
        self.client.force_authenticate(user=self.utilisateur)
        response = self.client.get(reverse("mes_donnees"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["compte"]["username"], "rgpd_user")
        self.assertIn("favoris", response.data)
        self.assertIn("historique_lecture", response.data)

    def test_suppression_de_compte(self):
        self.client.force_authenticate(user=self.utilisateur)
        response = self.client.delete(reverse("supprimer_compte"))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(username="rgpd_user").exists())

    def test_export_exige_authentification(self):
        response = self.client.get(reverse("mes_donnees"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RateLimitingTests(APITestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_inscription_est_limitee_en_debit(self):
        # La limite de production est 20/min: au-dela, l'API repond 429.
        statuts = []
        for i in range(25):
            response = self.client.post(
                reverse("inscription"),
                {"username": f"rl_user_{i}", "email": f"rl{i}@example.com", "password": "MotDePasseSolide123"},
                format="json",
            )
            statuts.append(response.status_code)

        self.assertEqual(statuts[0], status.HTTP_201_CREATED)
        self.assertIn(status.HTTP_429_TOO_MANY_REQUESTS, statuts)


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
