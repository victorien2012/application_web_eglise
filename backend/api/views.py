from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import filters, generics, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
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
    Serie,
    Signalement,
)
from .serializers import (
    AbonnementSerializer,
    CategorieSerializer,
    CommentaireSerializer,
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
)


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


class ConnexionTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['pasteur'] = _payload_pasteur(self.user)
        return data


class ConnexionTokenView(TokenObtainPairView):
    serializer_class = ConnexionTokenSerializer


class InscriptionView(generics.CreateAPIView):
    """Cree un compte utilisateur (et optionnellement un profil pasteur),
    puis renvoie directement les tokens JWT pour une connexion immediate."""
    serializer_class = InscriptionSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'pasteur': _payload_pasteur(user),
            },
            status=status.HTTP_201_CREATED,
        )


class PasteurViewSet(viewsets.ModelViewSet):
    queryset = Pasteur.objects.all().order_by('-cree_le')
    serializer_class = PasteurSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nom_affichage', 'nom_eglise']

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def update(self, request, *args, **kwargs):
        pasteur = self.get_object()
        if pasteur.utilisateur != request.user:
            return Response(
                {"detail": "Vous n'avez pas la permission de modifier ce profil."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

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
        espace_pasteur = self.request.query_params.get('espace_pasteur', 'false') == 'true'

        if espace_pasteur and self.request.user.is_authenticated:
            try:
                pasteur = self.request.user.profil_pasteur
                return queryset.filter(pasteur=pasteur)
            except Pasteur.DoesNotExist:
                return queryset.none()

        queryset = queryset.filter(est_publie=True)

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


class CommentaireViewSet(viewsets.ModelViewSet):
    queryset = Commentaire.objects.select_related('predication', 'utilisateur').filter(est_masque=False).order_by('-cree_le')
    serializer_class = CommentaireSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        predication_id = self.request.query_params.get('predication')
        if predication_id:
            queryset = queryset.filter(predication_id=predication_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)


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

    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)


class SignalementViewSet(viewsets.ModelViewSet):
    serializer_class = SignalementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Signalement.objects.select_related('utilisateur', 'predication', 'commentaire').all()
        return Signalement.objects.select_related('utilisateur', 'predication', 'commentaire').filter(
            utilisateur=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)
