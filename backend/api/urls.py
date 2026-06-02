from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AbonnementViewSet,
    CategorieViewSet,
    CommentaireViewSet,
    ConnexionTokenView,
    EtiquetteViewSet,
    FavoriViewSet,
    HistoriqueLectureViewSet,
    InscriptionView,
    PasteurViewSet,
    PieceJointeViewSet,
    PredicationViewSet,
    SerieViewSet,
    SignalementViewSet,
)

router = DefaultRouter()
router.register(r'pasteurs', PasteurViewSet, basename='pasteur')
router.register(r'predications', PredicationViewSet, basename='predication')
router.register(r'categories', CategorieViewSet, basename='categorie')
router.register(r'etiquettes', EtiquetteViewSet, basename='etiquette')
router.register(r'series', SerieViewSet, basename='serie')
router.register(r'pieces-jointes', PieceJointeViewSet, basename='piece-jointe')
router.register(r'commentaires', CommentaireViewSet, basename='commentaire')
router.register(r'favoris', FavoriViewSet, basename='favori')
router.register(r'abonnements', AbonnementViewSet, basename='abonnement')
router.register(r'historique-lecture', HistoriqueLectureViewSet, basename='historique-lecture')
router.register(r'signalements', SignalementViewSet, basename='signalement')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/inscription/', InscriptionView.as_view(), name='inscription'),
    path('auth/connexion/', ConnexionTokenView.as_view(), name='token_obtain_pair'),
    path('auth/rafraichir/', TokenRefreshView.as_view(), name='token_refresh'),
]
