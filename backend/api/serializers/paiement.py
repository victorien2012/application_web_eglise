from rest_framework import serializers
from api.models import PlanTarifaire, SouscriptionPasteur, Transaction

class PlanTarifaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanTarifaire
        fields = '__all__'

class SouscriptionPasteurSerializer(serializers.ModelSerializer):
    jours_restants = serializers.ReadOnlyField()
    est_active = serializers.ReadOnlyField()

    class Meta:
        model = SouscriptionPasteur
        fields = '__all__'

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'
