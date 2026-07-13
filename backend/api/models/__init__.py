# ==========================================================================
# Ce package ré-exporte tous les modèles pour maintenir la compatibilité
# avec le code existant (migrations, admin, serializers, views, tests).
#
# Usage : from api.models import Pasteur, Predication, ...
# ==========================================================================

from .utilisateurs import (  # noqa: F401
    ProfilUtilisateur,
    Pasteur,
    DemandePasteur,
)

from .contenu import (  # noqa: F401
    Predication,
    Categorie,
    Etiquette,
    PredicationCategorie,
    PredicationEtiquette,
    Serie,
    PieceJointe,
    Document,
)

from .interactions import (  # noqa: F401
    Commentaire,
    Favori,
    Abonnement,
    HistoriqueLecture,
    Signalement,
    JournalAnalytique,
)

from .notifications import (  # noqa: F401
    Notification,
)

from .cms import (  # noqa: F401
    Annonce,
    CarrouselMedia,
    ConfigurationSite,
)

from .paiement import (  # noqa: F401
    PlanTarifaire,
    SouscriptionPasteur,
    Transaction,
)
