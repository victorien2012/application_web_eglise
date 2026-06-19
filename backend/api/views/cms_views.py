"""Vues pour le CMS : annonces, carrousel et configuration globale du site."""
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from api.models import Annonce, CarrouselMedia, ConfigurationSite
from api.serializers import (
    AnnonceSerializer,
    CarrouselMediaSerializer,
    ConfigurationSiteSerializer,
)


class AnnonceViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les annonces.
    Publique en lecture (uniquement actives), CRUD complet pour les administrateurs (toutes).
    """
    serializer_class = AnnonceSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        base_qs = Annonce.objects.all().order_by('-cree_le')
        if self.request.user.is_staff:
            return base_qs

        maintenant = timezone.now()
        return base_qs.filter(
            est_actif=True
        ).filter(
            Q(date_expiration__isnull=True) | Q(date_expiration__gt=maintenant)
        )


class CarrouselMediaViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les médias du carrousel de la page d'accueil.
    Publique en lecture (uniquement les médias actifs), CRUD pour les administrateurs.
    """
    serializer_class = CarrouselMediaSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        base_qs = CarrouselMedia.objects.all().order_by('ordre', '-cree_le')
        if self.request.user.is_staff:
            return base_qs
        return base_qs.filter(est_actif=True)


class ConfigurationSiteViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la configuration globale du site (logo, nom).
    Accessible publiquement en lecture (GET).
    Modifiable par les administrateurs (POST/PUT/PATCH).
    On force un pattern singleton (id=1).
    """
    queryset = ConfigurationSite.objects.all()
    serializer_class = ConfigurationSiteSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'current']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    @action(detail=False, methods=['get'])
    def current(self, request):
        config, created = ConfigurationSite.objects.get_or_create(id=1)
        serializer = self.get_serializer(config)
        return Response(serializer.data)

    @action(detail=False, methods=['patch', 'put'])
    def update_current(self, request):
        if not request.user.is_authenticated or not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)

        config, created = ConfigurationSite.objects.get_or_create(id=1)
        serializer = self.get_serializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
