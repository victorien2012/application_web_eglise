import logging
import re
import threading

from django.core.management import call_command

logger = logging.getLogger(__name__)


def resoudre_channel_id_youtube(service, lien):
    """Deduit l'identifiant de chaine YouTube (UC...) depuis un lien fourni par le pasteur.

    Gere : /channel/UC..., un identifiant UC... brut, un @handle, ou /user/NOM.
    """
    correspondance = re.search(r'(UC[\w-]{22})', lien)
    if correspondance:
        return correspondance.group(1)

    correspondance = re.search(r'@([\w.\-]+)', lien)
    if correspondance:
        reponse = service.channels().list(part='id', forHandle='@' + correspondance.group(1)).execute()
        elements = reponse.get('items')
        if elements:
            return elements[0]['id']

    correspondance = re.search(r'/user/([\w\-]+)', lien)
    if correspondance:
        reponse = service.channels().list(part='id', forUsername=correspondance.group(1)).execute()
        elements = reponse.get('items')
        if elements:
            return elements[0]['id']

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
