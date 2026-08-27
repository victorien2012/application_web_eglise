"""Telecharge les fichiers video (yt-dlp) de toutes les predications
synchronisees depuis une chaine YouTube pour un pasteur, et les regroupe
dans un unique fichier .zip (dossiers par annee de publication a
l'interieur) enregistre sur le stockage de la plateforme.

Usage :
    python manage.py telecharger_videos_youtube --pasteur <id> [--job <id>]

Complementaire a `import_youtube_videos` : cette derniere ne recupere que les
metadonnees (titre, description, miniature) et le lien YouTube — la video
reste diffusee depuis YouTube. Cette commande va plus loin en telechargeant
le fichier video lui-meme pour chaque predication synchronisee.

Pensee pour un usage local/administratif : potentiellement plusieurs Go et
plusieurs heures pour une chaine entiere, executee en arriere-plan (voir
api.services.youtube_service.lancer_telechargement_videos_async). Chaque
lancement regenere un zip complet (pas de reprise incrementale) : plus
simple, et coherent avec l'idee d'obtenir un export a jour de la chaine.
"""

import logging
import os
import tempfile
import zipfile

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from api.models import Pasteur, Predication, TelechargementYoutube

logger = logging.getLogger(__name__)

# Plafonne la resolution : une chaine entiere en qualite maximale representerait
# potentiellement des dizaines de Go. 720p est un bon compromis lisibilite/poids
# pour de la predication parlee.
FORMAT_YT_DLP = 'best[height<=720][ext=mp4]/best[height<=720]/best[ext=mp4]/best'


class Command(BaseCommand):
    help = (
        "Telecharge les fichiers video des predications d'un pasteur deja "
        "synchronisees depuis YouTube, et les regroupe dans un zip sur le "
        "stockage du site."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--pasteur', '-p',
            type=int,
            required=True,
            help="ID du pasteur dont les videos doivent etre telechargees.",
        )
        parser.add_argument(
            '--job',
            type=int,
            default=None,
            dest='job_id',
            help="ID du TelechargementYoutube a mettre a jour (progression, statut, zip).",
        )

    def handle(self, *args, **options):
        try:
            pasteur = Pasteur.objects.get(pk=options['pasteur'])
        except Pasteur.DoesNotExist:
            raise CommandError(f"Aucun pasteur avec l'ID {options['pasteur']}.")

        job = None
        if options['job_id']:
            try:
                job = TelechargementYoutube.objects.get(pk=options['job_id'])
            except TelechargementYoutube.DoesNotExist:
                raise CommandError(f"Aucun job de telechargement avec l'ID {options['job_id']}.")

        predications = list(
            Predication.objects.filter(
                pasteur=pasteur,
                type_media='VIDEO',
            ).exclude(youtube_id__isnull=True).exclude(youtube_id='')
             .order_by('date_publication')
        )

        if job:
            job.total_videos = len(predications)
            job.save(update_fields=['total_videos'])

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"Téléchargement de {len(predications)} vidéo(s) pour « {pasteur.nom_affichage} »"
        ))

        with tempfile.TemporaryDirectory() as dossier_temp:
            erreurs = 0
            fichiers_reussis = []

            for predication in predications:
                try:
                    chemin = self._telecharger(predication, dossier_temp)
                    fichiers_reussis.append(chemin)
                    self.stdout.write(self.style.SUCCESS(
                        f"  + {predication.youtube_id} — {predication.titre[:70]}"
                    ))
                except Exception as erreur:  # noqa: BLE001 — une video ne doit pas bloquer le lot
                    erreurs += 1
                    logger.exception(
                        "Echec telechargement video %s (predication %s) : %s",
                        predication.youtube_id, predication.pk, erreur,
                    )
                    self.stderr.write(self.style.WARNING(
                        f"  ! Echec sur {predication.youtube_id} : {erreur}"
                    ))
                finally:
                    if job:
                        job.videos_traitees += 1
                        if erreurs and job.videos_echouees != erreurs:
                            job.videos_echouees = erreurs
                        job.save(update_fields=['videos_traitees', 'videos_echouees'])

            if job and fichiers_reussis:
                chemin_zip = self._creer_zip(dossier_temp, fichiers_reussis, pasteur)
                try:
                    with open(chemin_zip, 'rb') as f:
                        nom_zip = f"{pasteur.nom_affichage}-videos-youtube.zip"
                        job.fichier_zip.save(nom_zip, File(f), save=False)
                finally:
                    os.remove(chemin_zip)

            if job:
                if predications and not fichiers_reussis:
                    job.statut = 'ERREUR'
                    job.message = f"Échec sur les {len(predications)} vidéo(s) : aucun fichier n'a pu être téléchargé."
                else:
                    job.statut = 'TERMINE'
                    job.message = (
                        f"{len(fichiers_reussis)} vidéo(s) téléchargée(s) et regroupée(s) en zip, {erreurs} échec(s)."
                        if predications else "Aucune vidéo à télécharger : la chaîne n'a rien de synchronisé."
                    )
                job.termine_le = timezone.now()
                job.save(update_fields=['statut', 'message', 'termine_le', 'fichier_zip'])

        self.stdout.write(self.style.SUCCESS(
            f"\nTerminé — {len(fichiers_reussis)} téléchargée(s), {erreurs} échec(s)."
        ))

    @staticmethod
    def _telecharger(predication, dossier_temp):
        """Telecharge une video dans <dossier_temp>/<annee>/<id>.<ext> et
        retourne le chemin absolu du fichier produit."""
        import yt_dlp

        annee = str(predication.date_publication.year) if predication.date_publication else 'sans-date'
        dossier_annee = os.path.join(dossier_temp, annee)
        os.makedirs(dossier_annee, exist_ok=True)
        modele_sortie = os.path.join(dossier_annee, '%(id)s.%(ext)s')

        options_ydl = {
            'format': FORMAT_YT_DLP,
            'outtmpl': modele_sortie,
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
            # Le client web declenche regulierement un 403 depuis une IP de
            # datacenter (protection anti-bot de YouTube) ; le client
            # « android » emprunte un chemin d'extraction different qui y
            # echappe generalement — option standard de yt-dlp, pas un
            # contournement maison.
            'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
        }
        with yt_dlp.YoutubeDL(options_ydl) as ydl:
            info = ydl.extract_info(predication.url_video, download=True)
            chemin_fichier = ydl.prepare_filename(info)

        if not os.path.exists(chemin_fichier):
            raise RuntimeError("yt-dlp n'a produit aucun fichier.")
        return chemin_fichier

    @staticmethod
    def _creer_zip(dossier_temp, fichiers, pasteur):
        """Regroupe les fichiers telecharges dans un zip (dossiers par annee
        preserves), a la racine de dossier_temp pour rester hors de l'arbre
        qu'il compresse."""
        chemin_zip = os.path.join(tempfile.gettempdir(), f'telechargement-youtube-{pasteur.pk}-{os.getpid()}.zip')
        with zipfile.ZipFile(chemin_zip, 'w', zipfile.ZIP_STORED) as archive:
            for chemin_fichier in fichiers:
                nom_dans_zip = os.path.relpath(chemin_fichier, dossier_temp)
                archive.write(chemin_fichier, arcname=nom_dans_zip)
        return chemin_zip
