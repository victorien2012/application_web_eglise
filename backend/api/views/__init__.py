"""Vues de l'API Plateforme Église."""

from .auth_views import (
    ConnexionTokenSerializer,
    ConnexionTokenView,
    RafraichirTokenView,
    InscriptionView,
    DemandeReinitialisationMotDePasseView,
    ConfirmationReinitialisationMotDePasseView,
    VerificationEmailView,
    RenvoyerVerificationEmailView,
    MesDonneesView,
    SupprimerCompteView,
)

from .admin_views import (
    StatistiquesGlobalesView,
)

from .sante import (
    DiagnosticConfigurationView,
    SanteView,
)

from .pasteur_views import (
    PasteurViewSet,
)

from .predication_views import (
    PredicationViewSet,
    CategorieViewSet,
    EtiquetteViewSet,
    SerieViewSet,
    PieceJointeViewSet,
)

from .interaction_views import (
    CommentaireViewSet,
    FavoriViewSet,
    AbonnementViewSet,
    NotificationViewSet,
    HistoriqueLectureViewSet,
    SignalementViewSet,
)

from .cms_views import (
    AnnonceViewSet,
    CarrouselMediaViewSet,
    ConfigurationSiteViewSet,
)

from .documents import DocumentViewSet

from .paiement_views import (
    PlanTarifaireViewSet,
    SouscriptionPasteurViewSet,
    PaiementSimulationViewSet,
)
