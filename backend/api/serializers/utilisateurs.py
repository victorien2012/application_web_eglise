import re

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from api.models import (
    Pasteur,
    ProfilUtilisateur,
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
        read_only_fields = ('est_valide', 'est_rejete', 'cree_par_admin')


class PasteurMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pasteur
        fields = ('id', 'nom_affichage', 'avatar', 'nom_eglise', 'lien_youtube')


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
            pasteur = Pasteur.objects.create(
                utilisateur=user,
                nom_affichage=validated_data['nom_affichage'],
                nom_eglise=validated_data.get('nom_eglise', ''),
                contact=validated_data.get('contact', ''),
                avatar=validated_data.get('avatar', None),
                logo_eglise=validated_data.get('logo_eglise', None)
            )
            from django.utils import timezone
            from datetime import timedelta
            from api.models.paiement import SouscriptionPasteur
            SouscriptionPasteur.objects.create(
                pasteur=pasteur,
                date_fin=timezone.now() + timedelta(days=365),
                est_essai=True
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
