"""Telecharge les fichiers video (yt-dlp) des predications deja synchronisees
depuis une chaine YouTube et les enregistre sur le stockage de la plateforme.

Usage :
    python manage.py telecharger_videos_youtube --pasteur <id> [--job <id>]

Complementaire a `import_youtube_videos` : cette derniere ne recupere que les
metadonnees (titre, description, miniature) et le lien YouTube — la video
reste diffusee depuis YouTube. Cette commande va plus loin en telechargeant
le fichier video lui-meme pour chaque predication qui n'en a pas encore un,
et l'attache a `fichier_video` (organise par annee, voir
api.models.contenu.chemin_video_predication).

Pensee pour un usage local/administratif : potentiellement plusieurs Go et
plusieurs heures pour une chaine entiere, executee en arriere-plan (voir
api.services.youtube_service.lancer_telechargement_videos_async).
"""

import logging
import os
import tempfile

from django.core.files.base import ContentFile
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
        "synchronisees depuis YouTube, et les attache sur le stockage du site."
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
            help="ID du TelechargementYoutube a mettre a jour (progression, statut).",
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
             .filter(fichier_video__in=['', None])
             .order_by('date_publication')
        )

        if job:
            job.total_videos = len(predications)
            job.save(update_fields=['total_videos'])

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"Téléchargement de {len(predications)} vidéo(s) pour « {pasteur.nom_affichage} »"
        ))

        erreurs = 0
        for predication in predications:
            try:
                self._telecharger_et_attacher(predication)
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

        if job:
            job.statut = 'ERREUR' if erreurs == len(predications) and predications else 'TERMINE'
            job.message = (
                f"{len(predications) - erreurs} vidéo(s) téléchargée(s), {erreurs} échec(s)."
                if predications else "Aucune vidéo à télécharger : tout est déjà à jour."
            )
            job.termine_le = timezone.now()
            job.save(update_fields=['statut', 'message', 'termine_le'])

        self.stdout.write(self.style.SUCCESS(
            f"\nTerminé — {len(predications) - erreurs} téléchargée(s), {erreurs} échec(s)."
        ))

    @staticmethod
    def _telecharger_et_attacher(predication):
        import yt_dlp

        with tempfile.TemporaryDirectory() as dossier_temp:
            modele_sortie = os.path.join(dossier_temp, '%(id)s.%(ext)s')
            options_ydl = {
                'format': FORMAT_YT_DLP,
                'outtmpl': modele_sortie,
                'quiet': True,
                'no_warnings': True,
                'noplaylist': True,
                # Le client web declenche regulierement un 403 depuis une IP
                # de datacenter (protection anti-bot de YouTube) ; le client
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

            nom_fichier = os.path.basename(chemin_fichier)
            with open(chemin_fichier, 'rb') as f:
                predication.fichier_video.save(nom_fichier, ContentFile(f.read()), save=True)
