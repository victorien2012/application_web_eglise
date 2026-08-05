from rest_framework import serializers

from api.models import Annonce, CarrouselMedia, ConfigurationSite
from .contenu import valider_fichier_uploade

EXTENSIONS_IMAGE = {'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'}


class AnnonceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Annonce
        fields = ('id', 'titre', 'message', 'est_actif', 'cree_le', 'date_expiration')
        read_only_fields = ('id', 'cree_le')

    def validate_date_expiration(self, value):
        # Une annonce expirant dans le passe ne s'afficherait jamais : l'auteur
        # croirait l'avoir publiee alors qu'elle est deja caduque.
        if value is not None:
            from django.utils import timezone
            if value <= timezone.now():
                raise serializers.ValidationError(
                    "La date d'expiration doit etre posterieure a maintenant."
                )
        return value


class CarrouselMediaSerializer(serializers.ModelSerializer):
    # Le carrousel s'affiche sur la page d'accueil : le champ etant un FileField
    # sans contrainte, n'importe quel type de fichier pouvait y etre depose puis
    # servi aux visiteurs.
    TAILLE_MAX_MO = 5

    class Meta:
        model = CarrouselMedia
        fields = '__all__'

    def validate_fichier(self, value):
        return valider_fichier_uploade(value, EXTENSIONS_IMAGE, self.TAILLE_MAX_MO)

    def validate(self, attrs):
        def valeur_finale(champ):
            if champ in attrs:
                return attrs[champ]
            return getattr(self.instance, champ, None) if self.instance is not None else None

        type_media = valeur_finale('type_media') or 'IMAGE'
        if type_media == 'IMAGE' and not valeur_finale('fichier'):
            raise serializers.ValidationError(
                {'fichier': "Une image est requise pour un media de type Image."}
            )
        if type_media == 'VIDEO' and not valeur_finale('url_video'):
            raise serializers.ValidationError(
                {'url_video': "Un lien video est requis pour un media de type Video."}
            )
        return attrs


class ConfigurationSiteSerializer(serializers.ModelSerializer):
    # Le logo est charge sur chaque page par chaque visiteur : plafonner sa
    # taille evite qu'un fichier de plusieurs Mo penalise tout le site.
    TAILLE_MAX_MO = 2

    class Meta:
        model = ConfigurationSite
        fields = '__all__'

    def validate_logo(self, value):
        return valider_fichier_uploade(value, EXTENSIONS_IMAGE, self.TAILLE_MAX_MO)

    def validate_nom_site(self, value):
        if value is not None and not value.strip():
            raise serializers.ValidationError("Le nom du site ne peut pas etre vide.")
        return value
