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
    class Meta:
        model = PieceJointe
        fields = ('id', 'predication', 'nom', 'fichier', 'cree_le')
        read_only_fields = ('predication',)


class PredicationSerializer(serializers.ModelSerializer):
    pasteur = PasteurMinimalSerializer(read_only=True)
    categories = CategorieSerializer(many=True, read_only=True)
    etiquettes = EtiquetteSerializer(many=True, read_only=True)
    serie = SerieSerializer(read_only=True)
    pieces_jointes = PieceJointeSerializer(many=True, read_only=True)
    url_fichier_audio = serializers.SerializerMethodField()
    url_fichier_video = serializers.SerializerMethodField()
    url_image_couverture = serializers.SerializerMethodField()

    class Meta:
        model = Predication
        fields = [
            'id', 'pasteur', 'titre', 'description', 'type_media',
            'fichier_audio', 'url_fichier_audio', 'fichier_video', 'url_fichier_video',
            'url_video', 'image_couverture', 'url_image_couverture', 'duree_secondes',
            'nombre_vues', 'nombre_telechargements', 'est_publie', 'categories',
            'etiquettes', 'serie', 'pieces_jointes', 'cree_le'
        ]

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


class PredicationEcritureSerializer(serializers.ModelSerializer):
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
            'duree_secondes', 'est_publie', 'serie', 'categories_ids',
            'etiquettes_ids'
        ]
        read_only_fields = ('pasteur',)


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
        if validated_data.get('est_pasteur'):
            Pasteur.objects.create(
                utilisateur=user,
                nom_affichage=validated_data['nom_affichage'],
                nom_eglise=validated_data.get('nom_eglise', '')
            )
        return user

