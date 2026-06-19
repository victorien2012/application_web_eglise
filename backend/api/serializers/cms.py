from rest_framework import serializers

from api.models import Annonce, CarrouselMedia, ConfigurationSite


class AnnonceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Annonce
        fields = ('id', 'titre', 'message', 'est_actif', 'cree_le', 'date_expiration')
        read_only_fields = ('id', 'cree_le')


class CarrouselMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarrouselMedia
        fields = '__all__'


class ConfigurationSiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfigurationSite
        fields = '__all__'
