import logging
import re
import threading

from django.core.management import call_command

from api.models.paiement import abonnement_pasteur_est_actif

logger = logging.getLogger(__name__)


def resoudre_channel_id_youtube(service, lien):
    """Deduit l'identifiant de chaine YouTube (UC...) depuis un lien fourni par le pasteur.

    Gere : /channel/UC..., un identifiant UC... brut, un @handle, /user/NOM et /c/NOM.
    """
    lien = (lien or '').strip()

    # L'identifiant n'est reconnu que dans un contexte sans ambiguite : chemin
    # /channel/ ou saisie brute. Une recherche libre sur tout le lien pouvait
    # capturer une sous-chaine d'un handle commencant par « UC ».
    correspondance = re.search(r'/channel/(UC[\w-]{22})', lien)
    if correspondance:
        return correspondance.group(1)
    if re.fullmatch(r'UC[\w-]{22}', lien):
        return lien

    correspondance = re.search(r'@([\w.\-]+)', lien)
    if correspondance:
        identifiant = _chercher_par_handle(service, correspondance.group(1))
        if identifiant:
            return identifiant

    correspondance = re.search(r'/user/([\w\-]+)', lien)
    if correspondance:
        reponse = service.channels().list(part='id', forUsername=correspondance.group(1)).execute()
        elements = reponse.get('items')
        if elements:
            return elements[0]['id']

    # URL personnalisee historique /c/NOM : l'API n'expose aucune recherche
    # directe, mais YouTube a migre la plupart de ces noms vers un handle
    # identique. On tente donc la resolution par handle avant d'abandonner.
    correspondance = re.search(r'/c/([\w.\-]+)', lien)
    if correspondance:
        identifiant = _chercher_par_handle(service, correspondance.group(1))
        if identifiant:
            return identifiant

    return None


def _chercher_par_handle(service, handle):
    """Resout un handle YouTube (sans le @) en identifiant de chaine, ou None."""
    reponse = service.channels().list(part='id', forHandle='@' + handle).execute()
    elements = reponse.get('items')
    return elements[0]['id'] if elements else None


def motif_blocage_import(pasteur):
    """Retourne le motif empechant l'import pour ce pasteur, ou None s'il est autorise.

    Le meme controle existe dans la commande import_youtube_videos, mais il s'y
    execute DANS le thread detache : la CommandError levee n'y est que
    journalisee, alors que la vue a deja repondu « Import demarre ». Verifier
    en amont permet de refuser franchement la demande au lieu de promettre un
    import qui n'aura jamais lieu.
    """
    if not abonnement_pasteur_est_actif(pasteur):
        return (
            "Votre abonnement a expiré : l'import de vidéos est suspendu. "
            "Renouvelez votre forfait pour relancer la synchronisation."
        )
    return None


def lancer_import_youtube_async(channel_id, pasteur_id):
    """Lance l'import de la chaine dans un thread afin de ne pas bloquer la requete HTTP."""
    def _tache():
        from django.db import connection
        try:
            call_command('import_youtube_videos', channel_id, pasteur=pasteur_id)
        except Exception:  # noqa: BLE001 — on journalise sans propager (thread detache)
            logger.exception(
                "Echec de l'import YouTube asynchrone (chaine %s, pasteur %s)",
                channel_id, pasteur_id,
            )
        finally:
            # Liberer la connexion DB ouverte par ce thread.
            connection.close()

    threading.Thread(target=_tache, daemon=True).start()
