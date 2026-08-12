"""Stockage des fichiers statiques en production.

CompressedManifestStaticFilesStorage associe a chaque fichier collecte un nom
comportant une empreinte, et refuse par defaut de rendre un template citant un
fichier absent de ce manifeste : il leve alors une erreur, soit une page 500
complete.

Ce comportement est sain pour le code de l'application, dont on maitrise les
references. Il l'est beaucoup moins pour un theme d'administration tiers
(Jazzmin) qui embarque des centaines d'assets et en reference parfois qui ne
survivent pas a la collecte : une seule icone manquante rendait alors toute
l'administration inaccessible en production, alors qu'en developpement le
stockage simple, sans manifeste, ne signalait rien.

manifest_strict = False conserve les empreintes et la compression, mais
retombe sur le nom d'origine pour un fichier absent du manifeste. Le pire cas
devient une image non chargee, au lieu d'une page entiere en erreur.
"""
from whitenoise.storage import CompressedManifestStaticFilesStorage


class StockageStatiquesTolerant(CompressedManifestStaticFilesStorage):
    """Ne fait pas echouer le rendu sur une reference statique introuvable."""

    manifest_strict = False
