"""Synchronise les videos d'une chaine YouTube vers les predications d'un pasteur.

Usage :
    python manage.py import_youtube_videos <channel_id> [--pasteur <id>] [options]

La commande interroge la playlist "Uploads" de la chaine via l'API YouTube Data v3,
parcourt l'integralite des pages (au-dela de 50 videos) et cree une `Predication`
pour chaque nouvelle video. Les doublons sont detectes via `youtube_id`.

Securite : la cle API est lue depuis la variable d'environnement GOOGLE_API_KEY
(surchargeable avec --api-key).

Dependances : google-api-python-client (voir requirements.txt).
"""

import logging
import os
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction

from api.models import Pasteur, Predication
from api.serializers import extraire_nom_predicateur


logger = logging.getLogger(__name__)

# Quota / taille de page maximale autorisee par l'API YouTube Data v3.
TAILLE_PAGE_MAX = 50

# Resolutions de miniatures par ordre de preference (de la meilleure a la plus basse).
ORDRE_MINIATURES = ('maxres', 'standard', 'high', 'medium', 'default')

# Delai max (secondes) pour le telechargement d'une miniature.
TIMEOUT_MINIATURE = 15

# Regex pour convertir une duree ISO 8601 (ex: "PT1H2M30S") en secondes.
_DUREE_ISO_RE = re.compile(
    r'P(?:(?P<jours>\d+)D)?'
    r'(?:T(?:(?P<heures>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<secondes>\d+)S)?)?'
)


def duree_iso_en_secondes(duree):
    """Convertit une duree ISO 8601 YouTube (ex: 'PT1H2M30S') en nombre de secondes."""
    if not duree:
        return 0
    correspondance = _DUREE_ISO_RE.fullmatch(duree)
    if not correspondance:
        return 0
    parties = {cle: int(valeur) for cle, valeur in correspondance.groupdict().items() if valeur}
    return (
        parties.get('jours', 0) * 86400
        + parties.get('heures', 0) * 3600
        + parties.get('minutes', 0) * 60
        + parties.get('secondes', 0)
    )


def parser_date_publication(valeur):
    """Convertit une date RFC3339 YouTube (ex: '2024-01-05T10:00:00Z') en datetime aware."""
    if not valeur:
        return None
    try:
        # Python <3.11 ne gere pas le suffixe 'Z' dans fromisoformat : on le normalise.
        date = datetime.fromisoformat(valeur.replace('Z', '+00:00'))
    except (ValueError, TypeError):
        return None
    if date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)
    return date


class Command(BaseCommand):
    help = (
        "Importe et synchronise les videos de la playlist 'Uploads' d'une chaine "
        "YouTube vers les predications d'un pasteur."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'channel_id',
            help="Identifiant de la chaine YouTube (ex: UCxxxxxxxxxxxxxxxxxxxxxx).",
        )
        parser.add_argument(
            '--pasteur', '-p',
            type=int,
            default=None,
            help=(
                "ID du pasteur auquel rattacher les videos. "
                "Si omis, la commande tente de le resoudre via le champ lien_youtube."
            ),
        )
        parser.add_argument(
            '--api-key',
            default=None,
            help="Surcharge la cle API (par defaut : variable d'environnement GOOGLE_API_KEY).",
        )
        parser.add_argument(
            '--max',
            type=int,
            default=None,
            dest='maximum',
            help="Nombre maximum de videos a traiter (utile pour un test rapide).",
        )
        parser.add_argument(
            '--non-publiee',
            action='store_true',
            help="Cree les predications en brouillon (est_publie=False) au lieu de publiees.",
        )
        parser.add_argument(
            '--sans-miniature',
            action='store_true',
            help="N'importe pas la miniature YouTube comme image de couverture.",
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Simulation : affiche ce qui serait importe sans rien ecrire en base.",
        )

    # ------------------------------------------------------------------ #
    #  Point d'entree
    # ------------------------------------------------------------------ #
    def handle(self, *args, **options):
        channel_id = options['channel_id']
        api_key = options['api_key'] or os.environ.get('GOOGLE_API_KEY')
        dry_run = options['dry_run']
        publier = not options['non_publiee']
        maximum = options['maximum']
        telecharger_miniatures = not options['sans_miniature']

        if not api_key:
            raise CommandError(
                "Cle API absente. Definissez la variable d'environnement GOOGLE_API_KEY "
                "ou passez --api-key."
            )

        pasteur = self._resoudre_pasteur(options['pasteur'], channel_id)
        service = self._construire_service(api_key)

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"Synchronisation de la chaine {channel_id} -> pasteur « {pasteur.nom_affichage} »"
            f"{' [DRY-RUN]' if dry_run else ''}"
        ))

        # 1. Recuperer la playlist "Uploads" de la chaine.
        playlist_uploads = self._recuperer_playlist_uploads(service, channel_id)

        # 2. Parcourir toutes les pages et importer.
        compteur = {'crees': 0, 'ignores': 0, 'erreurs': 0, 'traites': 0}
        ids_existants = set(
            Predication.objects.exclude(youtube_id__isnull=True)
            .values_list('youtube_id', flat=True)
        )

        for video in self._iterer_videos(service, playlist_uploads, maximum):
            compteur['traites'] += 1
            youtube_id = video['youtube_id']

            if youtube_id in ids_existants:
                compteur['ignores'] += 1
                logger.debug("Doublon ignore : %s", youtube_id)
                continue

            if dry_run:
                compteur['crees'] += 1
                ids_existants.add(youtube_id)
                self.stdout.write(f"  [simulation] {youtube_id} — {video['titre'][:70]}")
                continue

            try:
                miniature = (
                    self._telecharger_miniature(video)
                    if telecharger_miniatures else None
                )
                self._creer_predication(pasteur, video, publier, miniature)
                ids_existants.add(youtube_id)
                compteur['crees'] += 1
                self.stdout.write(self.style.SUCCESS(
                    f"  + {youtube_id} — {video['titre'][:70]}"
                ))
            except IntegrityError:
                # Course possible (deja insere entre-temps) : on traite comme un doublon.
                compteur['ignores'] += 1
                logger.warning("Doublon detecte a l'insertion : %s", youtube_id)
            except Exception as erreur:  # noqa: BLE001 — une video ne doit pas bloquer le lot
                compteur['erreurs'] += 1
                logger.exception("Echec de l'import de la video %s : %s", youtube_id, erreur)
                self.stderr.write(self.style.WARNING(
                    f"  ! Echec sur {youtube_id} : {erreur}"
                ))

        self.stdout.write(self.style.SUCCESS(
            "\nTermine — {traites} video(s) examinee(s) : "
            "{crees} creee(s), {ignores} doublon(s) ignore(s), {erreurs} erreur(s).".format(**compteur)
        ))

    # ------------------------------------------------------------------ #
    #  Resolution du pasteur cible
    # ------------------------------------------------------------------ #
    def _resoudre_pasteur(self, pasteur_id, channel_id):
        if pasteur_id is not None:
            try:
                return Pasteur.objects.get(pk=pasteur_id)
            except Pasteur.DoesNotExist:
                raise CommandError(f"Aucun pasteur avec l'ID {pasteur_id}.")

        # Auto-resolution : on cherche un pasteur dont lien_youtube contient le channel_id.
        correspondances = list(Pasteur.objects.filter(lien_youtube__icontains=channel_id))
        if len(correspondances) == 1:
            return correspondances[0]
        if not correspondances:
            raise CommandError(
                "Impossible de determiner le pasteur cible. "
                "Precisez-le avec --pasteur <id>, ou renseignez le champ lien_youtube du pasteur "
                f"avec l'identifiant de chaine « {channel_id} »."
            )
        raise CommandError(
            "Plusieurs pasteurs correspondent a cette chaine. "
            "Precisez lequel avec --pasteur <id>."
        )

    # ------------------------------------------------------------------ #
    #  Acces a l'API YouTube
    # ------------------------------------------------------------------ #
    def _construire_service(self, api_key):
        try:
            from googleapiclient.discovery import build
        except ImportError:
            raise CommandError(
                "La bibliotheque google-api-python-client est requise. "
                "Installez-la : pip install google-api-python-client"
            )
        try:
            return build('youtube', 'v3', developerKey=api_key, cache_discovery=False)
        except Exception as erreur:  # noqa: BLE001
            raise CommandError(f"Impossible d'initialiser le client YouTube : {erreur}")

    def _executer_avec_retentatives(self, requete, essais=3, attente=2):
        """Execute une requete API en re-essayant sur erreur transitoire (reseau / 5xx)."""
        from googleapiclient.errors import HttpError

        derniere_erreur = None
        for tentative in range(1, essais + 1):
            try:
                return requete.execute()
            except HttpError as erreur:
                statut = getattr(erreur.resp, 'status', None)
                # 4xx (sauf 429) = erreur definitive : message clair, sans re-essai ni traceback.
                if statut and 400 <= int(statut) < 500 and int(statut) != 429:
                    raise CommandError(self._message_http(erreur, statut))
                derniere_erreur = erreur
            except (OSError, TimeoutError) as erreur:
                # Erreurs reseau / socket : transitoires.
                derniere_erreur = erreur

            if tentative < essais:
                logger.warning(
                    "Erreur API transitoire (tentative %s/%s), nouvel essai dans %ss : %s",
                    tentative, essais, attente, derniere_erreur,
                )
                time.sleep(attente)
                attente *= 2  # backoff exponentiel

        raise CommandError(
            f"Echec de l'appel API apres {essais} tentatives : {derniere_erreur}"
        )

    @staticmethod
    def _message_http(erreur, statut):
        """Construit un message lisible a partir d'une HttpError 4xx de l'API YouTube."""
        try:
            raison = erreur.reason
        except Exception:  # noqa: BLE001
            raison = str(erreur)
        indices = {
            400: "verifiez la cle API et l'identifiant de chaine",
            403: "cle invalide, quota depasse ou API YouTube Data v3 non activee dans Google Cloud",
            404: "ressource introuvable (identifiant de chaine errone ?)",
        }
        indice = indices.get(int(statut))
        base = f"Erreur API YouTube (HTTP {statut}) : {raison}"
        return f"{base} — {indice}." if indice else base

    def _recuperer_playlist_uploads(self, service, channel_id):
        reponse = self._executer_avec_retentatives(
            service.channels().list(part='contentDetails', id=channel_id)
        )
        elements = reponse.get('items', [])
        if not elements:
            raise CommandError(
                f"Chaine introuvable : « {channel_id} ». "
                "Verifiez l'identifiant (format UCxxxx...) et la validite de la cle API."
            )
        return elements[0]['contentDetails']['relatedPlaylists']['uploads']

    def _iterer_videos(self, service, playlist_id, maximum):
        """Generateur : parcourt toutes les pages de la playlist et produit des dicts normalises."""
        page_token = None
        produits = 0

        while True:
            reponse = self._executer_avec_retentatives(
                service.playlistItems().list(
                    part='snippet,contentDetails',
                    playlistId=playlist_id,
                    maxResults=TAILLE_PAGE_MAX,
                    pageToken=page_token,
                )
            )
            elements = reponse.get('items', [])

            # Recuperation groupee des durees (1 appel pour les 50 videos de la page).
            ids_page = [
                el['contentDetails']['videoId']
                for el in elements
                if el.get('contentDetails', {}).get('videoId')
            ]
            durees = self._recuperer_durees(service, ids_page)

            for element in elements:
                video = self._normaliser_element(element, durees)
                if video is None:
                    continue
                yield video
                produits += 1
                if maximum and produits >= maximum:
                    return

            page_token = reponse.get('nextPageToken')
            if not page_token:
                break

    def _recuperer_durees(self, service, ids_videos):
        """Retourne {video_id: duree_secondes} via un appel groupe videos.list (best-effort)."""
        if not ids_videos:
            return {}
        try:
            reponse = self._executer_avec_retentatives(
                service.videos().list(part='contentDetails', id=','.join(ids_videos))
            )
        except CommandError as erreur:
            # La duree est non critique : on continue sans bloquer l'import.
            logger.warning("Durees indisponibles pour cette page : %s", erreur)
            return {}
        return {
            item['id']: duree_iso_en_secondes(item['contentDetails'].get('duration'))
            for item in reponse.get('items', [])
        }

    @staticmethod
    def _normaliser_element(element, durees):
        snippet = element.get('snippet', {})
        details = element.get('contentDetails', {})
        youtube_id = details.get('videoId') or snippet.get('resourceId', {}).get('videoId')
        if not youtube_id:
            return None

        # videoPublishedAt (date reelle de publication) est plus fiable que snippet.publishedAt
        # (date d'ajout a la playlist) ; on utilise le second en repli.
        date_publication = parser_date_publication(
            details.get('videoPublishedAt') or snippet.get('publishedAt')
        )
        titre = (snippet.get('title') or 'Sans titre').strip()[:255]
        description = snippet.get('description') or ''

        # Tente d'extraire le nom du predicateur depuis le titre, puis la description.
        # Fallback sur le channelTitle (nom de la chaine).
        nom_pred = extraire_nom_predicateur(titre)
        if not nom_pred:
            nom_pred = extraire_nom_predicateur(description)
        if not nom_pred:
            nom_pred = (snippet.get('channelTitle') or '').strip()

        return {
            'youtube_id': youtube_id,
            'titre': titre,
            'description': description,
            'date_publication': date_publication,
            'duree_secondes': durees.get(youtube_id, 0),
            'url_video': f'https://www.youtube.com/watch?v={youtube_id}',
            'miniature_url': Command._meilleure_miniature(snippet.get('thumbnails', {})),
            'nom_predicateur': nom_pred[:255] if nom_pred else '',
        }

    @staticmethod
    def _meilleure_miniature(thumbnails):
        """Retourne l'URL de la miniature de meilleure resolution disponible, ou None."""
        for cle in ORDRE_MINIATURES:
            if cle in thumbnails and thumbnails[cle].get('url'):
                return thumbnails[cle]['url']
        return None

    def _telecharger_miniature(self, video):
        """Telecharge la miniature (best-effort). Retourne (nom_fichier, ContentFile) ou None."""
        url = video.get('miniature_url')
        if not url:
            return None
        try:
            requete = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(requete, timeout=TIMEOUT_MINIATURE) as reponse:
                donnees = reponse.read()
        except (urllib.error.URLError, OSError, TimeoutError) as erreur:
            # La couverture est non critique : on continue sans bloquer l'import.
            logger.warning("Miniature indisponible pour %s : %s", video['youtube_id'], erreur)
            return None
        if not donnees:
            return None
        return f"{video['youtube_id']}.jpg", ContentFile(donnees)

    # ------------------------------------------------------------------ #
    #  Ecriture en base
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def _creer_predication(pasteur, video, publier, miniature=None):
        predication = Predication.objects.create(
            pasteur=pasteur,
            titre=video['titre'],
            description=video['description'],
            type_media='VIDEO',
            url_video=video['url_video'],
            youtube_id=video['youtube_id'],
            nom_predicateur=video.get('nom_predicateur') or '',
            duree_secondes=video['duree_secondes'],
            date_publication=video['date_publication'],
            est_publie=publier,
        )
        if miniature:
            nom_fichier, contenu = miniature
            predication.image_couverture.save(nom_fichier, contenu, save=True)
        return predication
