"""Vues pour la gestion des pasteurs (CRUD, validation, profil, synchronisation YouTube)."""
import logging
import os
from datetime import timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.password_validation import validate_password
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import filters, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from api.models import (
    JournalAnalytique,
    Pasteur,
    Predication,
    ProfilUtilisateur,
)
from api.serializers import PasteurSerializer, PredicationSerializer
from api.services.email_service import (
    envoyer_email_rejet_pasteur,
    envoyer_email_validation_pasteur,
)
from api.services.youtube_service import (
    lancer_import_youtube_async,
    motif_blocage_import,
    resoudre_channel_id_youtube,
)

logger = logging.getLogger(__name__)


class PasteurViewSet(viewsets.ModelViewSet):
    # Les volumes de contenu sont annotes ici plutot que comptes par le
    # serializer : sans cela, afficher la liste des pasteurs declencherait
    # deux requetes supplementaires par ligne.
    queryset = Pasteur.objects.all().annotate(
        total_predications=Count('predications', distinct=True),
        total_documents=Count('documents', distinct=True),
    ).select_related('utilisateur').order_by('-cree_le')
    serializer_class = PasteurSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nom_affichage', 'nom_eglise']

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def creer_compte_admin(self, request):
        """Create a pastor account directly from admin interface.
        Expected fields: username, email, password, nom_affichage, nom_eglise (optional), contact (optional), avatar (optional), logo_eglise (optional)."""
        from django.contrib.auth.models import User
        required = ['username', 'email', 'password', 'nom_affichage']
        missing = [f for f in required if not request.data.get(f)]
        if missing:
            return Response({"detail": f"Champs manquants: {', '.join(missing)}"}, status=status.HTTP_400_BAD_REQUEST)
        username = request.data['username']
        email = request.data['email']
        password = request.data['password']
        nom_affichage = request.data['nom_affichage']
        nom_eglise = request.data.get('nom_eglise', '')
        contact = request.data.get('contact', '')
        avatar = request.data.get('avatar')
        logo_eglise = request.data.get('logo_eglise')
        if User.objects.filter(username=username).exists():
            return Response({"username": ["Ce nom d'utilisateur est déjà pris."]}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=email).exists():
            return Response({"email": ["Cette adresse email est déjà utilisée."]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(password)
        except DjangoValidationError as erreur:
            return Response({"password": list(erreur.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.create_user(username=username, email=email, password=password)
        # Create profile utilisateur if needed
        ProfilUtilisateur.objects.create(utilisateur=user, contact=contact)
        pasteur = Pasteur.objects.create(
            utilisateur=user,
            nom_affichage=nom_affichage,
            nom_eglise=nom_eglise,
            contact=contact,
            avatar=avatar,
            logo_eglise=logo_eglise,
            est_valide=True,
            est_rejete=False,
            cree_par_admin=True,
        )
        # Sans souscription, le compte serait validé mais bloqué à la publication
        # (« Votre abonnement est expiré »), comme à l'inscription publique.
        from api.models.paiement import creer_souscription_essai
        creer_souscription_essai(pasteur)
        serializer = self.get_serializer(pasteur)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser],
            url_path='admin_synchroniser_youtube')
    def admin_synchroniser_youtube(self, request, pk=None):
        """Permet à un admin de synchroniser la chaîne YouTube d'un pasteur créé par l'admin."""
        try:
            pasteur = Pasteur.objects.get(id=pk, cree_par_admin=True)
        except Pasteur.DoesNotExist:
            return Response(
                {"detail": "Pasteur introuvable ou non créé par l'admin."},
                status=status.HTTP_404_NOT_FOUND,
            )

        lien = (request.data.get('lien_youtube') or '').strip()
        if not lien:
            return Response(
                {"lien_youtube": "Le lien de la chaîne YouTube est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        blocage = motif_blocage_import(pasteur)
        if blocage:
            return Response({"detail": blocage}, status=status.HTTP_402_PAYMENT_REQUIRED)

        api_key = os.environ.get('GOOGLE_API_KEY')
        if not api_key:
            return Response(
                {"detail": "L'import YouTube n'est pas configuré sur le serveur (clé API absente)."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            from googleapiclient.discovery import build
            service = build('youtube', 'v3', developerKey=api_key, cache_discovery=False)
            channel_id = resoudre_channel_id_youtube(service, lien)
        except Exception as erreur:
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

        pasteur.lien_youtube = lien
        pasteur.save(update_fields=['lien_youtube'])
        lancer_import_youtube_async(channel_id, pasteur.id)

        return Response(
            {
                "detail": "Import démarré. Les vidéos apparaîtront dans la bibliothèque "
                          "dans quelques instants — rafraîchissez la page.",
                "channel_id": channel_id,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser],
            url_path='admin_supprimer_chaine_youtube')
    def admin_supprimer_chaine_youtube(self, request, pk=None):
        """Permet à un admin de supprimer la chaîne YouTube associée à un compte pasteur."""
        pasteur = self.get_object()
        pasteur.lien_youtube = None
        pasteur.save(update_fields=['lien_youtube'])
        
        if request.data.get('supprimer_videos'):
            Predication.objects.filter(pasteur=pasteur, url_video__icontains='youtube.com').delete()
            Predication.objects.filter(pasteur=pasteur, url_video__icontains='youtu.be').delete()
            
        return Response({"detail": "La chaîne a été retirée avec succès."}, status=status.HTTP_200_OK)

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy', 'synchroniser_youtube']:
            return [permissions.IsAuthenticated()]
        if self.action in ['valider', 'a_valider', 'admin_synchroniser_youtube', 'creer_compte_admin']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if user.is_staff:
            if self.request.query_params.get('non_valides') == 'true':
                queryset = queryset.filter(est_valide=False)
        else:
            pasteur_courant = getattr(user, 'profil_pasteur', None) if user.is_authenticated else None
            if pasteur_courant:
                queryset = queryset.filter(Q(est_valide=True) | Q(id=pasteur_courant.id))
            else:
                queryset = queryset.filter(est_valide=True)

        return queryset

    def update(self, request, *args, **kwargs):
        pasteur = self.get_object()
        if pasteur.utilisateur != request.user:
            return Response(
                {"detail": "Vous n'avez pas la permission de modifier ce profil."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        pasteur = self.get_object()
        if not request.user.is_staff and pasteur.utilisateur != request.user:
            return Response(
                {"detail": "Vous n'avez pas la permission de supprimer ce compte."},
                status=status.HTTP_403_FORBIDDEN,
            )
        user_to_delete = pasteur.utilisateur
        user_to_delete.delete()  # Supprime l'utilisateur et par cascade le profil pasteur
        return Response(status=status.HTTP_204_NO_CONTENT)

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
        """Valide ou rejette un pasteur (reserve a l'administration).
        Lorsqu'un pasteur est valide pour la premiere fois, un email de bienvenue
        lui est envoye. Lorsqu'il est rejete, un email de rejet est envoye.
        """
        pasteur = self.get_object()
        etait_valide = pasteur.est_valide
        nouvelle_valeur = request.data.get('est_valide', True) in (True, 'true', 'True', 1, '1')

        pasteur.est_valide = nouvelle_valeur
        if nouvelle_valeur:
            pasteur.est_rejete = False
        else:
            pasteur.est_rejete = True

        pasteur.save(update_fields=['est_valide', 'est_rejete'])

        if nouvelle_valeur and not etait_valide:
            # Première validation : email de bienvenue.
            envoyer_email_validation_pasteur(pasteur)
        elif not nouvelle_valeur and not etait_valide:
            # Rejet explicite : email de refus.
            envoyer_email_rejet_pasteur(pasteur)

        return Response({"id": pasteur.id, "est_valide": pasteur.est_valide, "est_rejete": pasteur.est_rejete})

    @action(detail=False, methods=['get', 'put', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def mon_profil(self, request):
        try:
            pasteur = request.user.profil_pasteur
            if request.method in ['PUT', 'PATCH']:
                serializer = self.get_serializer(pasteur, data=request.data, partial=(request.method == 'PATCH'))
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response(serializer.data)

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

        # Avant toute promesse d'import : un abonnement expiré fait echouer la
        # commande une fois dans le thread, sans que le pasteur en soit informe.
        blocage = motif_blocage_import(pasteur)
        if blocage:
            return Response({"detail": blocage}, status=status.HTTP_402_PAYMENT_REQUIRED)

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
