import os
import re
import threading
from datetime import timedelta

from django.conf import settings
from django.core.management import call_command
from django.contrib.auth.models import User
from django.contrib.auth.tokens import PasswordResetTokenGenerator, default_token_generator
from django.core.mail import send_mail
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.text import slugify
from rest_framework import filters, generics, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    Abonnement,
    Categorie,
    Commentaire,
    Etiquette,
    Favori,
    HistoriqueLecture,
    JournalAnalytique,
    Pasteur,
    PieceJointe,
    Predication,
    ProfilUtilisateur,
    Serie,
    Signalement,
)
from .serializers import (
    AbonnementSerializer,
    CategorieSerializer,
    CommentaireSerializer,
    ConfirmationReinitialisationSerializer,
    DemandeReinitialisationSerializer,
    EtiquetteSerializer,
    FavoriSerializer,
    HistoriqueLectureSerializer,
    InscriptionSerializer,
    JournalAnalytiqueSerializer,
    PasteurSerializer,
    PieceJointeSerializer,
    PredicationEcritureSerializer,
    PredicationSerializer,
    SerieEcritureSerializer,
    SerieSerializer,
    SignalementSerializer,
    VerificationEmailSerializer,
)


import logging

logger = logging.getLogger(__name__)


def resoudre_channel_id_youtube(service, lien):
    """Deduit l'identifiant de chaine YouTube (UC...) depuis un lien fourni par le pasteur.

    Gere : /channel/UC..., un identifiant UC... brut, un @handle, ou /user/NOM.
    """
    correspondance = re.search(r'(UC[\w-]{22})', lien)
    if correspondance:
        return correspondance.group(1)

    correspondance = re.search(r'@([\w.\-]+)', lien)
    if correspondance:
        reponse = service.channels().list(part='id', forHandle='@' + correspondance.group(1)).execute()
        elements = reponse.get('items')
        if elements:
            return elements[0]['id']

    correspondance = re.search(r'/user/([\w\-]+)', lien)
    if correspondance:
        reponse = service.channels().list(part='id', forUsername=correspondance.group(1)).execute()
        elements = reponse.get('items')
        if elements:
            return elements[0]['id']

    return None


def lancer_import_youtube_async(channel_id, pasteur_id):
    """Lance l'import de la chaine dans un thread afin de ne pas bloquer la requete HTTP."""
    def _tache():
        from django.db import connection
        try:
            call_command('import_youtube_videos', channel_id, pasteur=pasteur_id)
        except Exception:  # noqa: BLE001 — on journalise sans propager (thread detache)
            logger.exception(
                "Echec de l'import YouTube asynchrone (chaine %s, pasteur %s)",
                channel_id, pasteur_id,
            )
        finally:
            # Liberer la connexion DB ouverte par ce thread.
            connection.close()

    threading.Thread(target=_tache, daemon=True).start()


class GenerateurTokenEmail(PasswordResetTokenGenerator):
    """Generateur de token dedie a la verification d'email, distinct de
    celui du mot de passe oublie pour eviter qu'un token serve aux deux usages."""
    key_salt = "api.verification.email"


generateur_token_email = GenerateurTokenEmail()


def _payload_pasteur(user):
    """Construit la representation publique du profil pasteur d'un utilisateur."""
    try:
        pasteur = user.profil_pasteur
    except Pasteur.DoesNotExist:
        return None
    return {
        'id': pasteur.id,
        'nom_affichage': pasteur.nom_affichage,
        'avatar': pasteur.avatar.url if pasteur.avatar else None,
        'nom_eglise': pasteur.nom_eglise,
    }


def _email_est_verifie(user):
    profil = getattr(user, 'profil', None)
    return bool(profil and profil.email_verifie)


def envoyer_email_verification(user):
    """Envoie a l'utilisateur un lien de verification de son adresse email."""
    if not user.email:
        return
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = generateur_token_email.make_token(user)
    lien = f"{settings.FRONTEND_URL}/verifier-email?uid={uid}&token={token}"
    
    sujet = "Activez votre compte - Plateforme Église"
    
    # Version texte brut fallback
    message_texte = (
        f"Bonjour {user.username},\n\n"
        "Bienvenue sur la Plateforme Église ! Nous sommes ravis de vous compter parmi nous.\n\n"
        "Pour finaliser la création de votre compte et commencer à explorer les prédications, "
        "suivre vos pasteurs favoris et enregistrer vos favoris, veuillez confirmer votre adresse "
        f"email en cliquant sur le lien ci-dessous :\n\n"
        f"{lien}\n\n"
        "Ce lien de vérification expirera bientôt. Si vous n'êtes pas à l'origine de cette "
        "inscription, vous pouvez ignorer cet e-mail en toute sécurité.\n\n"
        "Que la paix soit avec vous,\n"
        "L'équipe Plateforme Église"
    )
    
    # Version HTML premium
    annee = timezone.now().year
    message_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activez votre compte</title>
  <style>
    body {{
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f6f8fb;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .email-container {{
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e1e8ed;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }}
    .email-header {{
      background: linear-gradient(135deg, #7c5cff, #a786ff);
      padding: 30px;
      text-align: center;
      color: #ffffff;
    }}
    .email-header h1 {{
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }}
    .email-header p {{
      margin: 5px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }}
    .email-body {{
      padding: 40px 30px;
      color: #2c3e50;
      line-height: 1.6;
    }}
    .email-body h2 {{
      margin-top: 0;
      font-size: 20px;
      color: #1a252f;
    }}
    .email-body p {{
      font-size: 16px;
      margin: 0 0 20px 0;
    }}
    .btn-container {{
      text-align: center;
      margin: 35px 0;
    }}
    .btn-primary {{
      display: inline-block;
      background-color: #7c5cff;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 10px rgba(124, 92, 255, 0.25);
    }}
    .email-footer {{
      background-color: #fafbfc;
      padding: 20px 30px;
      text-align: center;
      font-size: 13px;
      color: #7f8c8d;
      border-top: 1px solid #f1f2f6;
    }}
    .email-footer a {{
      color: #7c5cff;
      text-decoration: none;
    }}
    .link-fallback {{
      font-size: 13px;
      word-break: break-all;
      background: #f8f9fa;
      padding: 10px;
      border-radius: 6px;
      border: 1px dashed #ced4da;
      margin-top: 20px;
    }}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>Plateforme Église</h1>
      <p>Votre espace d'édification spirituelle</p>
    </div>
    <div class="email-body">
      <h2>Bienvenue, {user.username} !</h2>
      <p>Merci de vous être inscrit sur notre plateforme. Nous sommes heureux de vous compter parmi nous.</p>
      <p>Pour finaliser la création de votre compte et commencer à explorer les prédications, suivre vos pasteurs favoris et enregistrer vos coups de cœur, veuillez activer votre compte en cliquant sur le bouton ci-dessous :</p>
      <div class="btn-container">
        <a href="{lien}" class="btn-primary" target="_blank">Activer mon compte</a>
      </div>
      <p>Si le bouton ci-dessus ne fonctionne pas, copiez et collez le lien suivant dans votre navigateur :</p>
      <div class="link-fallback">
        <a href="{lien}" style="color: #7c5cff;">{lien}</a>
      </div>
    </div>
    <div class="email-footer">
      <p>Ce lien de vérification expirera bientôt. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
      <p>&copy; {annee} Plateforme Église. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
"""

    send_mail(
        subject=sujet,
        message=message_texte,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=message_html,
        fail_silently=True,
    )


class ConnexionTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['pasteur'] = _payload_pasteur(self.user)
        data['email_verifie'] = _email_est_verifie(self.user)
        data['est_admin'] = self.user.is_staff
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

        envoyer_email_verification(user)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'pasteur': _payload_pasteur(user),
                'email_verifie': _email_est_verifie(user),
                'est_admin': user.is_staff,
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


class StatistiquesGlobalesView(APIView):
    """Tableau de bord analytique global, reserve a l'administration."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        predications = Predication.objects.all()
        total_vues = predications.aggregate(Sum('nombre_vues'))['nombre_vues__sum'] or 0
        total_telechargements = (
            predications.aggregate(Sum('nombre_telechargements'))['nombre_telechargements__sum'] or 0
        )

        signalements_par_statut = {
            statut: Signalement.objects.filter(statut=statut).count()
            for statut, _ in Signalement.STATUT_CHOICES
        }

        meilleures = predications.select_related('pasteur').order_by('-nombre_vues')[:5]
        meilleures_data = PredicationSerializer(
            meilleures, many=True, context={'request': request}
        ).data

        trente_jours = timezone.now() - timedelta(days=30)
        journaux = JournalAnalytique.objects.filter(
            cree_le__gte=trente_jours
        ).annotate(date=TruncDate('cree_le')).values('date', 'type_action').annotate(
            count=Count('id')
        ).order_by('date')

        stats_par_jour = {}
        for jour in range(30):
            date_jour = (timezone.now() - timedelta(days=jour)).date()
            stats_par_jour[date_jour.isoformat()] = {
                'date': date_jour.strftime('%d/%m'),
                'lectures': 0,
                'telechargements': 0,
            }
        for journal in journaux:
            cle = journal['date'].isoformat()
            if cle in stats_par_jour:
                if journal['type_action'] in ['PLAY_AUDIO', 'WATCH_VIDEO']:
                    stats_par_jour[cle]['lectures'] += journal['count']
                elif journal['type_action'] == 'DOWNLOAD':
                    stats_par_jour[cle]['telechargements'] += journal['count']
        serie_analytique = sorted(
            stats_par_jour.values(),
            key=lambda item: timezone.datetime.strptime(item['date'], '%d/%m'),
        )

        return Response({
            'total_utilisateurs': User.objects.count(),
            'total_pasteurs': Pasteur.objects.count(),
            'total_pasteurs_valides': Pasteur.objects.filter(est_valide=True).count(),
            'total_predications': predications.count(),
            'total_predications_publiees': predications.filter(est_publie=True).count(),
            'total_vues': total_vues,
            'total_telechargements': total_telechargements,
            'total_commentaires': Commentaire.objects.count(),
            'total_favoris': Favori.objects.count(),
            'total_abonnements': Abonnement.objects.count(),
            'signalements_par_statut': signalements_par_statut,
            'meilleures_predications': meilleures_data,
            'serie_analytique': serie_analytique,
        })


class PasteurViewSet(viewsets.ModelViewSet):
    queryset = Pasteur.objects.all().order_by('-cree_le')
    serializer_class = PasteurSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nom_affichage', 'nom_eglise']

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy', 'synchroniser_youtube']:
            return [permissions.IsAuthenticated()]
        if self.action in ['valider', 'a_valider']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.query_params.get('non_valides') == 'true':
            queryset = queryset.filter(est_valide=False)
        return queryset

    def update(self, request, *args, **kwargs):
        pasteur = self.get_object()
        if pasteur.utilisateur != request.user:
            return Response(
                {"detail": "Vous n'avez pas la permission de modifier ce profil."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def a_valider(self, request):
        """Liste des pasteurs en attente de validation (reserve a l'administration)."""
        pasteurs = Pasteur.objects.filter(est_valide=False).order_by('-cree_le')
        page = self.paginate_queryset(pasteurs)
        serializer = self.get_serializer(page if page is not None else pasteurs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        """Valide ou invalide un pasteur (reserve a l'administration)."""
        pasteur = self.get_object()
        pasteur.est_valide = request.data.get('est_valide', True) in (True, 'true', 'True', 1, '1')
        pasteur.save(update_fields=['est_valide'])
        return Response({"id": pasteur.id, "est_valide": pasteur.est_valide})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def mon_profil(self, request):
        try:
            pasteur = request.user.profil_pasteur
            serializer = self.get_serializer(pasteur)
            return Response(serializer.data)
        except Pasteur.DoesNotExist:
            return Response(
                {"detail": "Profil pasteur non trouvé pour cet utilisateur."},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def synchroniser_youtube(self, request):
        """Enregistre le lien de chaine YouTube du pasteur et lance l'import en arriere-plan.

        Le 1er import est declenche immediatement (thread serveur) ; les suivants sont
        geres par la tache planifiee (cron). Voir la commande import_youtube_videos.
        """
        try:
            pasteur = request.user.profil_pasteur
        except Pasteur.DoesNotExist:
            return Response(
                {"detail": "Profil pasteur non trouvé."},
                status=status.HTTP_404_NOT_FOUND,
            )

        lien = (request.data.get('lien_youtube') or '').strip()
        if not lien:
            return Response(
                {"lien_youtube": "Le lien de la chaîne YouTube est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = os.environ.get('GOOGLE_API_KEY')
        if not api_key:
            return Response(
                {"detail": "L'import YouTube n'est pas configuré sur le serveur (clé API absente)."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Construire le client YouTube et resoudre l'identifiant de chaine.
        try:
            from googleapiclient.discovery import build
            service = build('youtube', 'v3', developerKey=api_key, cache_discovery=False)
            channel_id = resoudre_channel_id_youtube(service, lien)
        except Exception as erreur:  # noqa: BLE001
            logger.exception("Echec resolution chaine YouTube : %s", erreur)
            return Response(
                {"detail": "Impossible de joindre YouTube pour le moment. Réessayez plus tard."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if not channel_id:
            return Response(
                {"lien_youtube": "Chaîne introuvable. Vérifiez le lien "
                                 "(ex : https://www.youtube.com/@votrechaine)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Enregistrer le lien sur le profil puis lancer l'import sans bloquer la reponse.
        pasteur.lien_youtube = lien
        pasteur.save(update_fields=['lien_youtube'])
        lancer_import_youtube_async(channel_id, pasteur.id)

        return Response(
            {
                "detail": "Import démarré. Vos vidéos apparaîtront dans la bibliothèque "
                          "dans quelques instants — rafraîchissez la page.",
                "channel_id": channel_id,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def statistiques_tableau_de_bord(self, request):
        try:
            pasteur = request.user.profil_pasteur
        except Pasteur.DoesNotExist:
            return Response(
                {"detail": "Profil pasteur non trouvé."},
                status=status.HTTP_404_NOT_FOUND,
            )

        predications = Predication.objects.filter(pasteur=pasteur)
        total_predications = predications.count()
        total_vues = predications.aggregate(Sum('nombre_vues'))['nombre_vues__sum'] or 0
        total_telechargements = predications.aggregate(Sum('nombre_telechargements'))['nombre_telechargements__sum'] or 0

        meilleures_predications = predications.order_by('-nombre_vues')[:5]
        meilleures_predications_data = PredicationSerializer(
            meilleures_predications,
            many=True,
            context={'request': request},
        ).data

        trente_jours = timezone.now() - timedelta(days=30)
        journaux = JournalAnalytique.objects.filter(
            predication__pasteur=pasteur,
            cree_le__gte=trente_jours,
        ).annotate(
            date=TruncDate('cree_le')
        ).values('date', 'type_action').annotate(
            count=Count('id')
        ).order_by('date')

        stats_par_jour = {}
        for jour in range(30):
            date_jour = (timezone.now() - timedelta(days=jour)).date()
            stats_par_jour[date_jour.isoformat()] = {
                'date': date_jour.strftime('%d/%m'),
                'lectures': 0,
                'telechargements': 0,
            }

        for journal in journaux:
            date_str = journal['date'].isoformat()
            if date_str in stats_par_jour:
                if journal['type_action'] in ['PLAY_AUDIO', 'WATCH_VIDEO']:
                    stats_par_jour[date_str]['lectures'] += journal['count']
                elif journal['type_action'] == 'DOWNLOAD':
                    stats_par_jour[date_str]['telechargements'] += journal['count']

        serie_analytique = sorted(
            stats_par_jour.values(),
            key=lambda x: timezone.datetime.strptime(x['date'], '%d/%m'),
        )

        return Response({
            'total_predications': total_predications,
            'total_vues': total_vues,
            'total_telechargements': total_telechargements,
            'meilleures_predications': meilleures_predications_data,
            'serie_analytique': serie_analytique,
        })


class PredicationViewSet(viewsets.ModelViewSet):
    queryset = Predication.objects.filter(est_publie=True).order_by('-cree_le')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['titre', 'description', 'pasteur__nom_affichage']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PredicationEcritureSerializer
        return PredicationSerializer

    def get_queryset(self):
        queryset = Predication.objects.select_related('pasteur', 'serie').all().order_by('-cree_le')
        user = self.request.user
        espace_pasteur = self.request.query_params.get('espace_pasteur', 'false') == 'true'

        pasteur_courant = None
        if user.is_authenticated:
            pasteur_courant = getattr(user, 'profil_pasteur', None)

        if espace_pasteur and user.is_authenticated:
            if pasteur_courant is None:
                return queryset.none()
            return queryset.filter(pasteur=pasteur_courant)

        # Une predication est publique si elle est publiee ET (sans date de
        # publication planifiee OU dont la date est deja passee).
        visible_public = Q(est_publie=True) & (
            Q(date_publication__isnull=True) | Q(date_publication__lte=timezone.now())
        )
        # Un pasteur voit en plus toutes ses propres predications (brouillons et planifiees).
        if pasteur_courant is not None:
            queryset = queryset.filter(visible_public | Q(pasteur=pasteur_courant))
        else:
            queryset = queryset.filter(visible_public)

        pasteur_id = self.request.query_params.get('pasteur')
        if pasteur_id:
            queryset = queryset.filter(pasteur_id=pasteur_id)

        type_media = self.request.query_params.get('type_media')
        if type_media:
            queryset = queryset.filter(type_media=type_media)

        return queryset

    def perform_create(self, serializer):
        try:
            pasteur = self.request.user.profil_pasteur
            serializer.save(pasteur=pasteur)
        except Pasteur.DoesNotExist:
            raise serializers.ValidationError(
                {"detail": "Seuls les pasteurs authentifiés peuvent créer des prédications."}
            )

    def perform_update(self, serializer):
        predication = self.get_object()
        if predication.pasteur.utilisateur != self.request.user:
            raise serializers.ValidationError(
                {"detail": "Vous n'êtes pas autorisé à modifier cette prédication."}
            )
        serializer.save()

    def perform_destroy(self, instance):
        if instance.pasteur.utilisateur != self.request.user:
            raise serializers.ValidationError(
                {"detail": "Vous n'êtes pas autorisé à supprimer cette prédication."}
            )
        instance.delete()

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def journaliser_lecture(self, request, pk=None):
        predication = self.get_object()
        predication.nombre_vues += 1
        predication.save(update_fields=['nombre_vues'])

        type_action = 'WATCH_VIDEO' if predication.type_media == 'VIDEO' else 'PLAY_AUDIO'
        adresse_ip = self._get_adresse_ip(request)

        JournalAnalytique.objects.create(
            predication=predication,
            type_action=type_action,
            adresse_ip=adresse_ip,
        )
        return Response({"statut": "lecture journalisée", "nombre_vues": predication.nombre_vues})

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def journaliser_telechargement(self, request, pk=None):
        predication = self.get_object()
        predication.nombre_telechargements += 1
        predication.save(update_fields=['nombre_telechargements'])

        JournalAnalytique.objects.create(
            predication=predication,
            type_action='DOWNLOAD',
            adresse_ip=self._get_adresse_ip(request),
        )
        return Response({
            "statut": "téléchargement journalisé",
            "nombre_telechargements": predication.nombre_telechargements,
        })

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def telecharger(self, request, pk=None):
        """Sert le fichier media en piece jointe — reserve aux utilisateurs connectes.

        Parametre `media` : 'audio' (defaut) ou 'video'. Incremente le compteur
        et journalise le telechargement. (On evite le nom `format`, reserve par DRF
        pour la negociation de contenu.)
        """
        predication = self.get_object()
        media_demande = request.query_params.get('media', 'audio')

        if media_demande == 'video':
            fichier = predication.fichier_video
        else:
            fichier = predication.fichier_audio

        if not fichier:
            raise Http404("Aucun fichier disponible pour ce format.")

        predication.nombre_telechargements += 1
        predication.save(update_fields=['nombre_telechargements'])
        JournalAnalytique.objects.create(
            predication=predication,
            type_action='DOWNLOAD',
            adresse_ip=self._get_adresse_ip(request),
        )

        extension = os.path.splitext(fichier.name)[1]
        nom_base = slugify(predication.titre) or f"predication-{predication.pk}"
        nom_fichier = f"{nom_base}{extension}"

        return FileResponse(fichier.open('rb'), as_attachment=True, filename=nom_fichier)

    def _get_adresse_ip(self, request):
        forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if forwarded_for:
            return forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')


class CategorieViewSet(viewsets.ModelViewSet):
    queryset = Categorie.objects.all().order_by('nom')
    serializer_class = CategorieSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nom', 'description']


class EtiquetteViewSet(viewsets.ModelViewSet):
    queryset = Etiquette.objects.all().order_by('nom')
    serializer_class = EtiquetteSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nom']


class SerieViewSet(viewsets.ModelViewSet):
    queryset = Serie.objects.select_related('pasteur').all().order_by('-cree_le')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['titre', 'description', 'pasteur__nom_affichage']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SerieEcritureSerializer
        return SerieSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        pasteur_id = self.request.query_params.get('pasteur')
        if pasteur_id:
            queryset = queryset.filter(pasteur_id=pasteur_id)
        return queryset

    def perform_create(self, serializer):
        try:
            serializer.save(pasteur=self.request.user.profil_pasteur)
        except Pasteur.DoesNotExist:
            raise serializers.ValidationError(
                {"detail": "Seuls les pasteurs authentifiés peuvent créer des séries."}
            )


class PieceJointeViewSet(viewsets.ModelViewSet):
    queryset = PieceJointe.objects.select_related('predication', 'predication__pasteur').all().order_by('nom')
    serializer_class = PieceJointeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        predication_id = self.request.query_params.get('predication')
        if predication_id:
            queryset = queryset.filter(predication_id=predication_id)
        return queryset

    def perform_create(self, serializer):
        predication_id = self.request.data.get('predication')
        if not predication_id:
            raise serializers.ValidationError({"predication": "Ce champ est obligatoire."})

        try:
            predication = Predication.objects.get(id=predication_id, pasteur=self.request.user.profil_pasteur)
        except (Predication.DoesNotExist, Pasteur.DoesNotExist):
            raise serializers.ValidationError(
                {"detail": "Vous ne pouvez ajouter une pièce jointe que sur vos prédications."}
            )

        serializer.save(predication=predication)

    def perform_destroy(self, instance):
        user = self.request.user
        proprietaire = instance.predication.pasteur.utilisateur_id == user.id
        if not (user.is_staff or proprietaire):
            raise serializers.ValidationError(
                {"detail": "Vous ne pouvez supprimer que les pièces jointes de vos prédications."}
            )
        instance.delete()


class CommentaireViewSet(viewsets.ModelViewSet):
    serializer_class = CommentaireSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    throttle_scope = 'commentaire'

    def get_throttles(self):
        # Limite le debit uniquement sur la publication de commentaires.
        if self.action == 'create':
            return [ScopedRateThrottle()]
        return []

    def get_queryset(self):
        base = Commentaire.objects.select_related(
            'predication', 'predication__pasteur', 'utilisateur'
        ).order_by('-cree_le')

        user = self.request.user
        moderation = self.request.query_params.get('moderation', 'false') == 'true'
        pasteur_courant = getattr(user, 'profil_pasteur', None) if user.is_authenticated else None

        # En mode moderation, le pasteur voit tous les commentaires (y compris masques)
        # de ses propres predications; un admin voit tout.
        if moderation and user.is_authenticated and (user.is_staff or pasteur_courant is not None):
            queryset = base if user.is_staff else base.filter(predication__pasteur=pasteur_courant)
        else:
            queryset = base.filter(est_masque=False)

        predication_id = self.request.query_params.get('predication')
        if predication_id:
            queryset = queryset.filter(predication_id=predication_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)

    def _peut_moderer(self, commentaire, user):
        return bool(
            user.is_staff
            or commentaire.predication.pasteur.utilisateur_id == user.id
        )

    def perform_destroy(self, instance):
        user = self.request.user
        # L'auteur, le pasteur proprietaire de la predication ou un admin peuvent supprimer.
        if not (instance.utilisateur_id == user.id or self._peut_moderer(instance, user)):
            raise serializers.ValidationError(
                {"detail": "Vous n'etes pas autorise a supprimer ce commentaire."}
            )
        instance.delete()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def basculer_masquage(self, request, pk=None):
        commentaire = get_object_or_404(Commentaire, pk=pk)
        if not self._peut_moderer(commentaire, request.user):
            return Response(
                {"detail": "Vous n'etes pas autorise a moderer ce commentaire."},
                status=status.HTTP_403_FORBIDDEN,
            )
        commentaire.est_masque = not commentaire.est_masque
        commentaire.save(update_fields=['est_masque'])
        return Response({"id": commentaire.id, "est_masque": commentaire.est_masque})


class FavoriViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Favori.objects.select_related('utilisateur', 'predication', 'predication__pasteur').filter(
            utilisateur=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)


class AbonnementViewSet(viewsets.ModelViewSet):
    serializer_class = AbonnementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Abonnement.objects.select_related('utilisateur', 'pasteur').filter(
            utilisateur=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)


class HistoriqueLectureViewSet(viewsets.ModelViewSet):
    serializer_class = HistoriqueLectureSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return HistoriqueLecture.objects.select_related('utilisateur', 'predication', 'predication__pasteur').filter(
            utilisateur=self.request.user
        )

    def create(self, request, *args, **kwargs):
        # Upsert: une seule entree d'historique par (utilisateur, predication).
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        predication = serializer.validated_data['predication']
        entree, cree = HistoriqueLecture.objects.update_or_create(
            utilisateur=request.user,
            predication=predication,
            defaults={
                'position_secondes': serializer.validated_data.get('position_secondes', 0),
                'est_termine': serializer.validated_data.get('est_termine', False),
            },
        )
        sortie = self.get_serializer(entree)
        code = status.HTTP_201_CREATED if cree else status.HTTP_200_OK
        return Response(sortie.data, status=code)


class SignalementViewSet(viewsets.ModelViewSet):
    serializer_class = SignalementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        base = Signalement.objects.select_related(
            'utilisateur', 'predication', 'commentaire'
        ).order_by('-cree_le')
        if self.request.user.is_staff:
            statut = self.request.query_params.get('statut')
            if statut:
                base = base.filter(statut=statut)
            return base
        return base.filter(utilisateur=self.request.user)

    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def changer_statut(self, request, pk=None):
        """Met a jour le statut d'un signalement (reserve a l'administration)."""
        signalement = self.get_object()
        nouveau_statut = request.data.get('statut')
        statuts_valides = dict(Signalement.STATUT_CHOICES)
        if nouveau_statut not in statuts_valides:
            return Response(
                {"detail": f"Statut invalide. Valeurs possibles: {', '.join(statuts_valides)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        signalement.statut = nouveau_statut
        signalement.save(update_fields=['statut'])
        return Response({"id": signalement.id, "statut": signalement.statut})
