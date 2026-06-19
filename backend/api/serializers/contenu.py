import re

from rest_framework import serializers

from api.models import (
    Categorie,
    Etiquette,
    PieceJointe,
    Predication,
    Serie,
    Document,
)
from .utilisateurs import PasteurMinimalSerializer


def valider_fichier_uploade(fichier, extensions_autorisees, taille_max_mo):
    """Valide l'extension et la taille d'un fichier uploade."""
    if not fichier:
        return fichier

    nom = getattr(fichier, 'name', '') or ''
    extension = nom.rsplit('.', 1)[-1].lower() if '.' in nom else ''
    if extension not in extensions_autorisees:
        raise serializers.ValidationError(
            f"Format non supporte ({extension or 'inconnu'}). "
            f"Formats acceptes: {', '.join(sorted(extensions_autorisees))}."
        )

    taille = getattr(fichier, 'size', 0) or 0
    if taille > taille_max_mo * 1024 * 1024:
        raise serializers.ValidationError(
            f"Fichier trop volumineux ({taille / (1024 * 1024):.1f} Mo). "
            f"Taille maximale: {taille_max_mo} Mo."
        )
    return fichier


class CategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categorie
        fields = ('id', 'nom', 'description', 'cree_le')


class EtiquetteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Etiquette
        fields = ('id', 'nom', 'cree_le')


class SerieSerializer(serializers.ModelSerializer):
    pasteur = PasteurMinimalSerializer(read_only=True)

    class Meta:
        model = Serie
        fields = ('id', 'pasteur', 'titre', 'description', 'image_couverture', 'cree_le')


class SerieEcritureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Serie
        fields = ('id', 'titre', 'description', 'image_couverture')


class PieceJointeSerializer(serializers.ModelSerializer):
    EXTENSIONS_DOCUMENT = {'pdf', 'doc', 'docx', 'odt', 'txt', 'rtf', 'ppt', 'pptx'}
    TAILLE_MAX_DOCUMENT_MO = 25

    class Meta:
        model = PieceJointe
        fields = ('id', 'predication', 'nom', 'fichier', 'cree_le')
        read_only_fields = ('predication',)

    def validate_fichier(self, value):
        return valider_fichier_uploade(value, self.EXTENSIONS_DOCUMENT, self.TAILLE_MAX_DOCUMENT_MO)


class PredicationSerializer(serializers.ModelSerializer):
    pasteur = PasteurMinimalSerializer(read_only=True)
    categories = CategorieSerializer(many=True, read_only=True)
    etiquettes = EtiquetteSerializer(many=True, read_only=True)
    serie = SerieSerializer(read_only=True)
    pieces_jointes = PieceJointeSerializer(many=True, read_only=True)
    url_fichier_audio = serializers.SerializerMethodField()
    url_fichier_video = serializers.SerializerMethodField()
    url_image_couverture = serializers.SerializerMethodField()
    est_planifiee = serializers.SerializerMethodField()

    class Meta:
        model = Predication
        fields = [
            'id', 'pasteur', 'titre', 'description', 'type_media',
            'fichier_audio', 'url_fichier_audio', 'fichier_video', 'url_fichier_video',
            'url_video', 'youtube_id', 'nom_predicateur', 'image_couverture', 'url_image_couverture', 'duree_secondes',
            'nombre_vues', 'nombre_telechargements', 'est_publie', 'date_publication',
            'est_planifiee', 'categories', 'etiquettes', 'serie', 'pieces_jointes', 'cree_le'
        ]

    def get_est_planifiee(self, obj):
        from django.utils import timezone
        return bool(obj.date_publication and obj.date_publication > timezone.now())

    def get_url_fichier_audio(self, obj):
        if obj.fichier_audio:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.fichier_audio.url)
            return obj.fichier_audio.url
        return None

    def get_url_fichier_video(self, obj):
        if obj.fichier_video:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.fichier_video.url)
            return obj.fichier_video.url
        return None

    def get_url_image_couverture(self, obj):
        if obj.image_couverture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_couverture.url)
            return obj.image_couverture.url
        return None


_MOTIFS_YOUTUBE = (
    re.compile(r'youtube\.com/watch\?v=([\w-]{11})'),
    re.compile(r'youtu\.be/([\w-]{11})'),
    re.compile(r'youtube\.com/embed/([\w-]{11})'),
    re.compile(r'youtube\.com/shorts/([\w-]{11})'),
)


def extraire_youtube_id(url):
    """Extrait l'identifiant d'une video YouTube depuis ses differentes formes d'URL."""
    if not url:
        return None
    for motif in _MOTIFS_YOUTUBE:
        correspondance = motif.search(url)
        if correspondance:
            return correspondance.group(1)
    return None


_MOTIFS_PREDICATEUR = (
    re.compile(r'\b(?:pasteur|past\.?|fr[èe]re|frer\.?|soeur|sr\.?|[ée]vang[ée]liste|evang\.?|proph[èe]te|prophet\.?|ap[ôo]tre|docteur|dr\.?|r[ée]v[ée]rend|rev\.?|ministre)\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+){0,3})', re.IGNORECASE),
    re.compile(r'\b(?:avec|par|message de|pr[ée]dication de|sermon de|enseignement de)\s+(?:(?:pasteur|past\.?|fr[èe]re|frer\.?|soeur|sr\.?|[ée]vang[ée]liste|evang\.?|proph[èe]te|prophet\.?|ap[ôo]tre|docteur|dr\.?|r[ée]v[ée]rend|rev\.?|ministre)\s+)?([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+){0,3})', re.IGNORECASE),
    re.compile(r'\|([^|]{3,40})\|', re.IGNORECASE),
)


def extraire_nom_predicateur(titre):
    """Tente d'extraire le nom du predicateur depuis un titre YouTube."""
    if not titre:
        return None
    for motif in _MOTIFS_PREDICATEUR:
        correspondance = motif.search(titre)
        if correspondance:
            nom = correspondance.group(1).strip()
            if 3 <= len(nom) <= 80:
                return nom
    return None


class PredicationEcritureSerializer(serializers.ModelSerializer):
    EXTENSIONS_AUDIO = {'mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'flac'}
    EXTENSIONS_VIDEO = {'mp4', 'webm', 'mov', 'm4v', 'mkv'}
    EXTENSIONS_IMAGE = {'jpg', 'jpeg', 'png', 'webp', 'gif'}
    TAILLE_MAX_AUDIO_MO = 100
    TAILLE_MAX_VIDEO_MO = 1024
    TAILLE_MAX_IMAGE_MO = 5

    categories_ids = serializers.PrimaryKeyRelatedField(
        queryset=Categorie.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source='categories',
    )
    etiquettes_ids = serializers.PrimaryKeyRelatedField(
        queryset=Etiquette.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source='etiquettes',
    )

    class Meta:
        model = Predication
        fields = [
            'id', 'pasteur', 'titre', 'description', 'type_media',
            'fichier_audio', 'fichier_video', 'url_video', 'nom_predicateur', 'image_couverture',
            'duree_secondes', 'est_publie', 'date_publication', 'serie',
            'categories_ids', 'etiquettes_ids'
        ]
        read_only_fields = ('pasteur',)

    def validate_fichier_audio(self, value):
        return valider_fichier_uploade(value, self.EXTENSIONS_AUDIO, self.TAILLE_MAX_AUDIO_MO)

    def validate_fichier_video(self, value):
        return valider_fichier_uploade(value, self.EXTENSIONS_VIDEO, self.TAILLE_MAX_VIDEO_MO)

    def validate_image_couverture(self, value):
        return valider_fichier_uploade(value, self.EXTENSIONS_IMAGE, self.TAILLE_MAX_IMAGE_MO)

    def validate(self, attrs):
        if 'url_video' in attrs:
            youtube_id = extraire_youtube_id(attrs.get('url_video'))
            if youtube_id:
                doublons = Predication.objects.filter(youtube_id=youtube_id)
                if self.instance is not None:
                    doublons = doublons.exclude(pk=self.instance.pk)
                if doublons.exists():
                    raise serializers.ValidationError(
                        {'url_video': "Cette video YouTube est deja publiee sur la plateforme."}
                    )
            attrs['youtube_id'] = youtube_id

        if not attrs.get('nom_predicateur'):
            titre = attrs.get('titre', '') or ''
            nom_extrait = extraire_nom_predicateur(titre)
            if nom_extrait:
                attrs['nom_predicateur'] = nom_extrait

        return attrs

class DocumentSerializer(serializers.ModelSerializer):
    pasteur = PasteurMinimalSerializer(read_only=True)
    categories = CategorieSerializer(many=True, read_only=True)
    url_fichier = serializers.SerializerMethodField()
    url_image_couverture = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'pasteur', 'titre', 'description', 'fichier', 'url_fichier',
            'image_couverture', 'url_image_couverture', 'nombre_telechargements',
            'est_publie', 'categories', 'cree_le'
        ]

    def get_url_fichier(self, obj):
        if obj.fichier:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.fichier.url)
            return obj.fichier.url
        return None

    def get_url_image_couverture(self, obj):
        if obj.image_couverture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_couverture.url)
            return obj.image_couverture.url
        return None

class DocumentEcritureSerializer(serializers.ModelSerializer):
    EXTENSIONS_DOCUMENT = {'pdf', 'doc', 'docx', 'odt', 'txt', 'rtf', 'ppt', 'pptx', 'xls', 'xlsx'}
    EXTENSIONS_IMAGE = {'jpg', 'jpeg', 'png', 'webp', 'gif'}
    TAILLE_MAX_DOCUMENT_MO = 50
    TAILLE_MAX_IMAGE_MO = 5

    categories_ids = serializers.PrimaryKeyRelatedField(
        queryset=Categorie.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source='categories',
    )

    class Meta:
        model = Document
        fields = [
            'id', 'pasteur', 'titre', 'description', 'fichier',
            'image_couverture', 'est_publie', 'categories_ids'
        ]
        read_only_fields = ('pasteur',)

    def validate_fichier(self, value):
        return valider_fichier_uploade(value, self.EXTENSIONS_DOCUMENT, self.TAILLE_MAX_DOCUMENT_MO)

    def validate_image_couverture(self, value):
        return valider_fichier_uploade(value, self.EXTENSIONS_IMAGE, self.TAILLE_MAX_IMAGE_MO)
