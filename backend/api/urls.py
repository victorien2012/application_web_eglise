from django.urls import include, path
from rest_framework.routers import DefaultRouter


from .views import (
    AbonnementViewSet,
    CategorieViewSet,
    CommentaireViewSet,
    ConfirmationReinitialisationMotDePasseView,
    ConnexionTokenView,
    RafraichirTokenView,
    DemandeReinitialisationMotDePasseView,
    EtiquetteViewSet,
    FavoriViewSet,
    HistoriqueLectureViewSet,
    InscriptionView,
    MesDonneesView,
    PasteurViewSet,
    PieceJointeViewSet,
    PredicationViewSet,
    RenvoyerVerificationEmailView,
    SerieViewSet,
    SignalementViewSet,
    StatistiquesGlobalesView,
    SupprimerCompteView,
    VerificationEmailView,
    NotificationViewSet,
    AnnonceViewSet,
    CarrouselMediaViewSet,
    DocumentViewSet,
    ConfigurationSiteViewSet,
    PlanTarifaireViewSet,
    SouscriptionPasteurViewSet,
    PaiementSimulationViewSet,
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
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'annonces', AnnonceViewSet, basename='annonce')
router.register(r'carrousel', CarrouselMediaViewSet, basename='carrousel')
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'configuration', ConfigurationSiteViewSet, basename='configuration')
router.register(r'plans', PlanTarifaireViewSet, basename='plan')
router.register(r'souscriptions', SouscriptionPasteurViewSet, basename='souscription')
router.register(r'paiements', PaiementSimulationViewSet, basename='paiement')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/inscription/', InscriptionView.as_view(), name='inscription'),
    path('auth/connexion/', ConnexionTokenView.as_view(), name='token_obtain_pair'),
    path("auth/rafraichir/", RafraichirTokenView.as_view(), name="token_refresh"),
    path(
        'auth/mot-de-passe-oublie/',
        DemandeReinitialisationMotDePasseView.as_view(),
        name='mot_de_passe_oublie',
    ),
    path(
        'auth/reinitialiser-mot-de-passe/',
        ConfirmationReinitialisationMotDePasseView.as_view(),
        name='reinitialiser_mot_de_passe',
    ),
    path('admin/statistiques/', StatistiquesGlobalesView.as_view(), name='statistiques_globales'),
    path('auth/verifier-email/', VerificationEmailView.as_view(), name='verifier_email'),
    path(
        'auth/renvoyer-verification/',
        RenvoyerVerificationEmailView.as_view(),
        name='renvoyer_verification',
    ),
    path('auth/mes-donnees/', MesDonneesView.as_view(), name='mes_donnees'),
    path('auth/mon-compte/', SupprimerCompteView.as_view(), name='supprimer_compte'),
]
