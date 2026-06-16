import re

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import (
    Abonnement,
    Categorie,
    Commentaire,
    Etiquette,
    Favori,
    HistoriqueLecture,
    JournalAnalytique,
    Pasteur,
    PieceJointe,
    Predication,
    ProfilUtilisateur,
    Serie,
    Signalement,
    Notification,
    Annonce,
    CarrouselMedia,
)


class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')


class PasteurSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='utilisateur.email', read_only=True)
    username = serializers.CharField(source='utilisateur.username', read_only=True)

    class Meta:
        model = Pasteur
        fields = (
            'id', 'username', 'email', 'nom_affichage', 'biographie',
            'avatar', 'nom_eglise', 'contact', 'logo_eglise', 'lien_twitter', 'lien_facebook',
            'lien_youtube', 'cree_le', 'est_valide', 'est_rejete', 'cree_par_admin'
        )
        # La validation d'un pasteur est une action reservee a l'administration
        # (voir PasteurViewSet.valider); un pasteur ne peut pas s'auto-valider.
        read_only_fields = ('est_valide', 'est_rejete', 'cree_par_admin')


class PasteurMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pasteur
        fields = ('id', 'nom_affichage', 'avatar', 'nom_eglise')


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


# Patterns pour extraire le nom du predicateur depuis un titre YouTube.
# Cherche des formules du type "Pasteur X", "avec Frère X", "par X", etc.
_MOTIFS_PREDICATEUR = (
    re.compile(r'\b(?:pasteur|past\.?|fr[èe]re|frer\.?|soeur|sr\.?|[ée]vang[ée]liste|evang\.?|proph[èe]te|prophet\.?|ap[ôo]tre|docteur|dr\.?|r[ée]v[ée]rend|rev\.?|ministre)\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+){0,3})', re.IGNORECASE),
    re.compile(r'\b(?:avec|par|message de|pr[ée]dication de|sermon de|enseignement de)\s+(?:(?:pasteur|past\.?|fr[èe]re|frer\.?|soeur|sr\.?|[ée]vang[ée]liste|evang\.?|proph[èe]te|prophet\.?|ap[ôo]tre|docteur|dr\.?|r[ée]v[ée]rend|rev\.?|ministre)\s+)?([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+){0,3})', re.IGNORECASE),
    re.compile(r'\|([^|]{3,40})\|', re.IGNORECASE),  # Nom encadré par des pipes
)


def extraire_nom_predicateur(titre):
    """
    Tente d'extraire le nom du predicateur depuis un titre YouTube.
    Retourne le nom trouve ou None si rien n'est detecte.
    """
    if not titre:
        return None
    for motif in _MOTIFS_PREDICATEUR:
        correspondance = motif.search(titre)
        if correspondance:
            nom = correspondance.group(1).strip()
            # On filtre les faux positifs trop courts ou trop longs
            if 3 <= len(nom) <= 80:
                return nom
    return None


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
        # Quand un lien video est fourni, on en derive le youtube_id (coherence avec
        # les imports) et on empeche les doublons de la meme video YouTube.
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

        # Si le nom du predicateur n'est pas fourni manuellement, on tente
        # une extraction automatique depuis le titre via des patterns communs.
        if not attrs.get('nom_predicateur'):
            titre = attrs.get('titre', '') or ''
            nom_extrait = extraire_nom_predicateur(titre)
            if nom_extrait:
                attrs['nom_predicateur'] = nom_extrait

        return attrs


class CommentaireSerializer(serializers.ModelSerializer):
    utilisateur = UtilisateurSerializer(read_only=True)

    class Meta:
        model = Commentaire
        fields = ('id', 'predication', 'utilisateur', 'contenu', 'est_masque', 'cree_le', 'modifie_le')
        read_only_fields = ('utilisateur', 'est_masque')


class FavoriSerializer(serializers.ModelSerializer):
    utilisateur = UtilisateurSerializer(read_only=True)
    predication_detail = PredicationSerializer(source='predication', read_only=True)

    class Meta:
        model = Favori
        fields = ('id', 'utilisateur', 'predication', 'predication_detail', 'cree_le')
        read_only_fields = ('utilisateur',)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'message', 'lu', 'type_notification', 'cree_le')
        read_only_fields = ('id', 'message', 'type_notification', 'cree_le')


class AnnonceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Annonce
        fields = ('id', 'titre', 'message', 'est_actif', 'cree_le', 'date_expiration')
        read_only_fields = ('id', 'cree_le')


class AbonnementSerializer(serializers.ModelSerializer):
    utilisateur = UtilisateurSerializer(read_only=True)
    pasteur_detail = PasteurMinimalSerializer(source='pasteur', read_only=True)

    class Meta:
        model = Abonnement
        fields = ('id', 'utilisateur', 'pasteur', 'pasteur_detail', 'cree_le')
        read_only_fields = ('utilisateur',)


class HistoriqueLectureSerializer(serializers.ModelSerializer):
    utilisateur = UtilisateurSerializer(read_only=True)
    predication_detail = PredicationSerializer(source='predication', read_only=True)

    class Meta:
        model = HistoriqueLecture
        fields = (
            'id', 'utilisateur', 'predication', 'predication_detail',
            'position_secondes', 'est_termine', 'modifie_le'
        )
        read_only_fields = ('utilisateur',)


class SignalementSerializer(serializers.ModelSerializer):
    utilisateur = UtilisateurSerializer(read_only=True)

    class Meta:
        model = Signalement
        fields = (
            'id', 'utilisateur', 'predication', 'commentaire',
            'raison', 'details', 'statut', 'cree_le'
        )
        read_only_fields = ('utilisateur', 'statut')


class JournalAnalytiqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalAnalytique
        fields = '__all__'


class InscriptionSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    est_pasteur = serializers.BooleanField(default=False)
    nom_affichage = serializers.CharField(max_length=255, required=False)
    nom_eglise = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    contact = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    avatar = serializers.ImageField(required=False, allow_null=True)
    logo_eglise = serializers.ImageField(required=False, allow_null=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cette adresse email est déjà utilisée.")
        return value

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as erreur:
            raise serializers.ValidationError(list(erreur.messages))
        return value

    def validate(self, attrs):
        if attrs.get('est_pasteur') and not attrs.get('nom_affichage'):
            raise serializers.ValidationError(
                {"nom_affichage": "Le nom d'affichage est requis pour un profil pasteur."}
            )
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        ProfilUtilisateur.objects.create(
            utilisateur=user,
            contact=validated_data.get('contact', '')
        )
        if validated_data.get('est_pasteur'):
            Pasteur.objects.create(
                utilisateur=user,
                nom_affichage=validated_data['nom_affichage'],
                nom_eglise=validated_data.get('nom_eglise', ''),
                contact=validated_data.get('contact', ''),
                avatar=validated_data.get('avatar', None),
                logo_eglise=validated_data.get('logo_eglise', None)
            )
        return user


class DemandeReinitialisationSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ConfirmationReinitialisationSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    nouveau_mot_de_passe = serializers.CharField(write_only=True)

    def validate_nouveau_mot_de_passe(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as erreur:
            raise serializers.ValidationError(list(erreur.messages))
        return value


class VerificationEmailSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()


class CarrouselMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarrouselMedia
        fields = '__all__'
