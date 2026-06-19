"""Vues pour les interactions utilisateurs (commentaires, favoris, abonnements, historique, signalements)."""
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework import serializers

from api.models import (
    Abonnement,
    Commentaire,
    Favori,
    HistoriqueLecture,
    Notification,
    Signalement,
)
from api.serializers import (
    AbonnementSerializer,
    CommentaireSerializer,
    FavoriSerializer,
    HistoriqueLectureSerializer,
    NotificationSerializer,
    SignalementSerializer,
)


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
        abonnement = serializer.save(utilisateur=self.request.user)
        # Créer une notification pour le pasteur
        Notification.objects.create(
            utilisateur=abonnement.pasteur.utilisateur,
            message=f"Le fidèle {self.request.user.username} s'est abonné à votre chaîne.",
            type_notification='ABONNEMENT'
        )


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(utilisateur=self.request.user)

    @action(detail=True, methods=['post'])
    def marquer_lu(self, request, pk=None):
        notification = self.get_object()
        notification.lu = True
        notification.save(update_fields=['lu'])
        return Response({"status": "success"})


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
