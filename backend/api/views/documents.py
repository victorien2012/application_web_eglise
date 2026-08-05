from rest_framework import viewsets, permissions, filters
from django.db.models import F
from rest_framework.decorators import action
from rest_framework.response import Response

from api.models import Document
from api.serializers import DocumentSerializer, DocumentEcritureSerializer

class EstPasteurProprietaireOuLectureSeule(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_staff:
            return True
        return hasattr(request.user, 'profil_pasteur') and obj.pasteur == request.user.profil_pasteur

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.filter(est_publie=True).order_by('-cree_le')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, EstPasteurProprietaireOuLectureSeule]
    filter_backends = [filters.SearchFilter]
    search_fields = ['titre', 'description']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return DocumentEcritureSerializer
        return DocumentSerializer

    def get_queryset(self):
        qs = Document.objects.all().order_by('-cree_le')
        # Filtre espace_pasteur
        espace_pasteur = self.request.query_params.get('espace_pasteur')
        if espace_pasteur == 'true' and self.request.user.is_authenticated and hasattr(self.request.user, 'profil_pasteur'):
            qs = qs.filter(pasteur=self.request.user.profil_pasteur)
            return qs

        # Filtrage standard
        if not (self.request.user.is_authenticated and self.request.user.is_staff):
            qs = qs.filter(est_publie=True)
            
        pasteur_id = self.request.query_params.get('pasteur')
        if pasteur_id:
            qs = qs.filter(pasteur_id=pasteur_id)
            
        categorie_id = self.request.query_params.get('categorie')
        if categorie_id:
            qs = qs.filter(categories__id=categorie_id)
            
        return qs

    def perform_create(self, serializer):
        pasteur = self.request.user.profil_pasteur
        if not hasattr(pasteur, 'souscription') or not pasteur.souscription.est_active:
            from rest_framework import serializers
            raise serializers.ValidationError(
                {"detail": "Votre abonnement est expiré. Veuillez le renouveler pour publier des documents."}
            )
        serializer.save(pasteur=pasteur)

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def enregistrer_telechargement(self, request, pk=None):
        Document.objects.filter(pk=pk).update(nombre_telechargements=F('nombre_telechargements') + 1)
        return Response({'status': 'ok'})
