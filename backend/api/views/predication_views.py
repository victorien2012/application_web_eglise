"""Vues pour la gestion des prédications, catégories, étiquettes, séries et pièces jointes."""
import logging
import os

from django.db.models import Q
from django.http import Http404, FileResponse
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import filters, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from api.models import (
    Categorie,
    Etiquette,
    JournalAnalytique,
    Pasteur,
    PieceJointe,
    Predication,
    Serie,
)
from api.serializers import (
    CategorieSerializer,
    EtiquetteSerializer,
    PieceJointeSerializer,
    PredicationEcritureSerializer,
    PredicationSerializer,
    SerieEcritureSerializer,
    SerieSerializer,
)

logger = logging.getLogger(__name__)


class PredicationViewSet(viewsets.ModelViewSet):
    queryset = Predication.objects.filter(est_publie=True).order_by('-date_publication', '-cree_le')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['titre', 'description', 'pasteur__nom_affichage']
    pagination_class = None

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PredicationEcritureSerializer
        return PredicationSerializer

    def get_queryset(self):
        queryset = Predication.objects.select_related('pasteur', 'serie').prefetch_related('categories', 'etiquettes', 'pieces_jointes').all().order_by('-date_publication', '-cree_le')
        user = self.request.user
        espace_pasteur = self.request.query_params.get('espace_pasteur', 'false') == 'true'

        espace_admin = self.request.query_params.get('espace_admin', 'false') == 'true'

        pasteur_courant = None
        if user.is_authenticated:
            pasteur_courant = getattr(user, 'profil_pasteur', None)

        if espace_admin and user.is_staff:
            pass # L'administrateur a accès à toutes les prédications
        elif espace_pasteur and user.is_authenticated:
            if pasteur_courant is None:
                return queryset.none()
            return queryset.filter(pasteur=pasteur_courant)
        else:
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
        # Admins can create predications for any validated pastor via pasteur_id in request data
        if self.request.user.is_staff:
            pasteur_id = self.request.data.get('pasteur_id')
            if not pasteur_id:
                raise serializers.ValidationError({"pasteur_id": ["Champ requis pour les administrateurs."]})
            try:
                pasteur = Pasteur.objects.get(id=pasteur_id, est_valide=True)
            except Pasteur.DoesNotExist:
                raise serializers.ValidationError({"detail": "Pasteur spécifié introuvable ou non validé."})
            serializer.save(pasteur=pasteur)
        else:
            try:
                pasteur = self.request.user.profil_pasteur
                if not pasteur.est_valide:
                    raise serializers.ValidationError(
                        {"detail": "Votre compte n'est pas encore validé. Vous ne pouvez pas publier de prédications."}
                    )
                
                # Vérifier la souscription
                if not hasattr(pasteur, 'souscription') or not pasteur.souscription.est_active:
                    raise serializers.ValidationError(
                        {"detail": "Votre abonnement est expiré. Veuillez le renouveler pour publier de nouvelles vidéos."}
                    )
                    
                serializer.save(pasteur=pasteur)
            except Pasteur.DoesNotExist:
                raise serializers.ValidationError(
                    {"detail": "Seuls les pasteurs authentifiés peuvent créer des prédications."}
                )

    def perform_update(self, serializer):
        predication = self.get_object()
        if not self.request.user.is_staff and predication.pasteur.utilisateur != self.request.user:
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

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def lien_telechargement_externe(self, request, pk=None):
        """Utilise yt-dlp pour extraire le lien direct d'une video YouTube."""
        predication = self.get_object()
        media_demande = request.query_params.get('media', 'video')

        if not predication.url_video:
            return Response(
                {"detail": "Cette prédication ne possède pas de lien externe."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            import yt_dlp
            ydl_opts = {
                'format': 'bestaudio[ext=m4a]' if media_demande == 'audio' else 'best[ext=mp4]/best',
                'quiet': True,
                'no_warnings': True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(predication.url_video, download=False)
                url_directe = info.get('url')

                if url_directe:
                    # On enregistre la stat comme pour un telechargement classique
                    predication.nombre_telechargements += 1
                    predication.save(update_fields=['nombre_telechargements'])
                    JournalAnalytique.objects.create(
                        predication=predication,
                        type_action='DOWNLOAD',
                        adresse_ip=self._get_adresse_ip(request),
                    )
                    return Response({"url": url_directe}, status=status.HTTP_200_OK)
                else:
                    return Response(
                        {"detail": "Impossible d'extraire le lien de téléchargement."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
        except ImportError:
            return Response(
                {"detail": "L'extracteur YouTube (yt-dlp) n'est pas installé sur le serveur."},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).exception("Erreur yt-dlp: %s", e)
            return Response(
                {"detail": "Erreur lors de l'extraction de la vidéo externe."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

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
    pagination_class = None


class EtiquetteViewSet(viewsets.ModelViewSet):
    queryset = Etiquette.objects.all().order_by('nom')
    serializer_class = EtiquetteSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nom']
    pagination_class = None


class SerieViewSet(viewsets.ModelViewSet):
    queryset = Serie.objects.select_related('pasteur').all().order_by('-cree_le')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['titre', 'description', 'pasteur__nom_affichage']
    pagination_class = None

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
