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
            'avatar', 'nom_eglise', 'lien_twitter', 'lien_facebook',
            'lien_youtube', 'cree_le', 'est_valide'
        )
        # La validation d'un pasteur est une action reservee a l'administration
        # (voir PasteurViewSet.valider); un pasteur ne peut pas s'auto-valider.
        read_only_fields = ('est_valide',)


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
            'url_video', 'image_couverture', 'url_image_couverture', 'duree_secondes',
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
            'fichier_audio', 'fichier_video', 'url_video', 'image_couverture',
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
        ProfilUtilisateur.objects.create(utilisateur=user)
        if validated_data.get('est_pasteur'):
            Pasteur.objects.create(
                utilisateur=user,
                nom_affichage=validated_data['nom_affichage'],
                nom_eglise=validated_data.get('nom_eglise', '')
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

