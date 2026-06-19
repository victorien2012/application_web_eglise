# ==========================================================================
# Ce package ré-exporte tous les serializers pour maintenir la compatibilité
# avec le code existant (views, urls, tests).
#
# Usage : from api.serializers import PasteurSerializer, ...
# ==========================================================================

from .utilisateurs import (  # noqa: F401
    UtilisateurSerializer,
    PasteurSerializer,
    PasteurMinimalSerializer,
    InscriptionSerializer,
    DemandeReinitialisationSerializer,
    ConfirmationReinitialisationSerializer,
    VerificationEmailSerializer,
)

from .contenu import (  # noqa: F401
    CategorieSerializer,
    EtiquetteSerializer,
    SerieSerializer,
    SerieEcritureSerializer,
    PieceJointeSerializer,
    PredicationSerializer,
    PredicationEcritureSerializer,
    valider_fichier_uploade,
    extraire_youtube_id,
    extraire_nom_predicateur,
    DocumentSerializer,
    DocumentEcritureSerializer,
)

from .interactions import (  # noqa: F401
    CommentaireSerializer,
    FavoriSerializer,
    AbonnementSerializer,
    HistoriqueLectureSerializer,
    SignalementSerializer,
    JournalAnalytiqueSerializer,
)

from .notifications import (  # noqa: F401
    NotificationSerializer,
)

from .cms import (  # noqa: F401
    AnnonceSerializer,
    CarrouselMediaSerializer,
    ConfigurationSiteSerializer,
)
