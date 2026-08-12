"""Vues d'authentification : connexion, inscription, vérification email,
mot de passe oublié, données personnelles (RGPD)."""
import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from api.models import Pasteur, ProfilUtilisateur
from api.serializers import (
    AbonnementSerializer,
    CommentaireSerializer,
    ConfirmationReinitialisationSerializer,
    DemandeReinitialisationSerializer,
    FavoriSerializer,
    HistoriqueLectureSerializer,
    InscriptionSerializer,
    PasteurSerializer,
    SignalementSerializer,
    VerificationEmailSerializer,
)
from api.services.email_service import (
    _email_est_verifie,
    envoyer_email_notification_admin_nouveau_pasteur,
    envoyer_email_verification,
    generateur_token_email,
)

logger = logging.getLogger(__name__)


class RafraichirTokenView(TokenRefreshView):
    """Rafraîchissement de jeton tolérant à la disparition du compte.

    SimpleJWT charge l'utilisateur référencé par le jeton sans intercepter son
    absence : un compte supprimé — ce qu'un administrateur peut faire depuis
    l'interface — provoquait une erreur 500 au lieu d'une déconnexion propre,
    et le client restait bloqué au lieu d'être renvoyé vers la connexion.
    """

    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except User.DoesNotExist:
            return Response(
                {'detail': "Ce compte n'existe plus. Veuillez vous reconnecter."},
                status=status.HTTP_401_UNAUTHORIZED,
            )


def _payload_pasteur(user, request=None):
    """Construit la representation publique du profil pasteur d'un utilisateur."""
    try:
        pasteur = user.profil_pasteur
    except Pasteur.DoesNotExist:
        return None

    avatar_url = pasteur.avatar.url if pasteur.avatar else None
    if avatar_url and request:
        avatar_url = request.build_absolute_uri(avatar_url)

    return {
        'id': pasteur.id,
        'nom_affichage': pasteur.nom_affichage,
        'avatar': avatar_url,
        'nom_eglise': pasteur.nom_eglise,
        'est_valide': pasteur.est_valide,
        'lien_youtube': pasteur.lien_youtube,
    }


class ConnexionTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        request = self.context.get('request')
        data['pasteur'] = _payload_pasteur(self.user, request=request)
        data['email_verifie'] = _email_est_verifie(self.user)
        data['est_admin'] = self.user.is_staff
        profil = getattr(self.user, 'profil', None)
        data['contact'] = profil.contact if (profil and not data['pasteur']) else None
        return data


class ConnexionTokenView(TokenObtainPairView):
    serializer_class = ConnexionTokenSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'connexion'


class InscriptionView(generics.CreateAPIView):
    """Cree un compte utilisateur (et optionnellement un profil pasteur),
    puis renvoie directement les tokens JWT pour une connexion immediate."""
    serializer_class = InscriptionSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'inscription'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # L'inscription est desormais immediate : plus de verification par
        # email, plus d'approbation prealable d'un administrateur. Aucun email
        # de verification n'est donc envoye, et le compte est utilisable tout
        # de suite.
        #
        # Les administrateurs restent informes de l'arrivee d'un pasteur, mais
        # a titre indicatif : ils n'ont plus rien a valider.
        est_pasteur = request.data.get('est_pasteur') in (True, 'true', 'True', 1, '1')
        if est_pasteur:
            try:
                envoyer_email_notification_admin_nouveau_pasteur(user.profil_pasteur)
            except Pasteur.DoesNotExist:
                pass

        refresh = RefreshToken.for_user(user)
        profil = getattr(user, 'profil', None)
        pasteur_payload = _payload_pasteur(user, request=request)

        return Response(
            {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'pasteur': pasteur_payload,
                'email_verifie': _email_est_verifie(user),
                'est_admin': user.is_staff,
                'contact': profil.contact if (profil and not pasteur_payload) else None,
            },
            status=status.HTTP_201_CREATED,
        )


class DemandeReinitialisationMotDePasseView(APIView):
    """Recoit un email et, si un compte existe, envoie un lien de reinitialisation.
    Repond toujours 200 pour ne pas reveler quels emails sont enregistres."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'mot_de_passe'

    def post(self, request):
        serializer = DemandeReinitialisationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        message_generique = {
            "detail": "Si un compte existe pour cette adresse, un email de reinitialisation a ete envoye."
        }

        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            return Response(message_generique, status=status.HTTP_200_OK)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        lien = f"{settings.FRONTEND_URL}/reinitialiser-mot-de-passe?uid={uid}&token={token}"

        send_mail(
            subject="Reinitialisation de votre mot de passe",
            message=(
                f"Bonjour {user.username},\n\n"
                "Vous avez demande la reinitialisation de votre mot de passe.\n"
                f"Cliquez sur le lien suivant pour en choisir un nouveau:\n\n{lien}\n\n"
                "Si vous n'etes pas a l'origine de cette demande, ignorez cet email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
        return Response(message_generique, status=status.HTTP_200_OK)


class ConfirmationReinitialisationMotDePasseView(APIView):
    """Verifie le couple uid/token et enregistre le nouveau mot de passe."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ConfirmationReinitialisationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data

        erreur_lien = Response(
            {"detail": "Le lien de reinitialisation est invalide ou a expire."},
            status=status.HTTP_400_BAD_REQUEST,
        )

        try:
            user_pk = force_str(urlsafe_base64_decode(donnees['uid']))
            user = User.objects.get(pk=user_pk)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return erreur_lien

        if not default_token_generator.check_token(user, donnees['token']):
            return erreur_lien

        user.set_password(donnees['nouveau_mot_de_passe'])
        user.save(update_fields=['password'])
        return Response(
            {"detail": "Votre mot de passe a ete reinitialise avec succes."},
            status=status.HTTP_200_OK,
        )


class VerificationEmailView(APIView):
    """Verifie le couple uid/token issu de l'email d'inscription et
    marque l'adresse email de l'utilisateur comme verifiee."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerificationEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data

        erreur_lien = Response(
            {"detail": "Le lien de verification est invalide ou a expire."},
            status=status.HTTP_400_BAD_REQUEST,
        )

        try:
            user_pk = force_str(urlsafe_base64_decode(donnees['uid']))
            user = User.objects.get(pk=user_pk)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return erreur_lien

        if not generateur_token_email.check_token(user, donnees['token']):
            return erreur_lien

        profil, _ = ProfilUtilisateur.objects.get_or_create(utilisateur=user)
        if not profil.email_verifie:
            profil.email_verifie = True
            profil.save(update_fields=['email_verifie'])

        return Response(
            {"detail": "Votre adresse email a ete verifiee.", "email_verifie": True},
            status=status.HTTP_200_OK,
        )


class RenvoyerVerificationEmailView(APIView):
    """Renvoie l'email de verification a l'utilisateur connecte."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if _email_est_verifie(request.user):
            return Response(
                {"detail": "Votre adresse email est deja verifiee."},
                status=status.HTTP_200_OK,
            )
        ProfilUtilisateur.objects.get_or_create(utilisateur=request.user)
        envoyer_email_verification(request.user)
        return Response(
            {"detail": "Un nouvel email de verification a ete envoye."},
            status=status.HTTP_200_OK,
        )


class MesDonneesView(APIView):
    """RGPD - droit d'acces: exporte l'ensemble des donnees de l'utilisateur connecte."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        contexte = {'request': request}
        try:
            profil_pasteur = PasteurSerializer(user.profil_pasteur, context=contexte).data
        except Pasteur.DoesNotExist:
            profil_pasteur = None

        donnees = {
            'compte': {
                'username': user.username,
                'email': user.email,
                'date_inscription': user.date_joined,
                'email_verifie': _email_est_verifie(user),
                'contact': getattr(user.profil, 'contact', None) if hasattr(user, 'profil') else None,
            },
            'profil_pasteur': profil_pasteur,
            'commentaires': CommentaireSerializer(
                user.commentaires.all(), many=True, context=contexte
            ).data,
            'favoris': FavoriSerializer(user.favoris.all(), many=True, context=contexte).data,
            'abonnements': AbonnementSerializer(user.abonnements.all(), many=True, context=contexte).data,
            'historique_lecture': HistoriqueLectureSerializer(
                user.historique_lecture.all(), many=True, context=contexte
            ).data,
            'signalements': SignalementSerializer(
                user.signalements.all(), many=True, context=contexte
            ).data,
        }
        return Response(donnees)


class SupprimerCompteView(APIView):
    """RGPD - droit a l'effacement: supprime le compte de l'utilisateur connecte
    et, par cascade, l'ensemble de ses donnees liees."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
