from rest_framework import serializers

from api.models import (
    Abonnement,
    Commentaire,
    Favori,
    HistoriqueLecture,
    JournalAnalytique,
    Signalement,
)
from .utilisateurs import UtilisateurSerializer, PasteurMinimalSerializer
from .contenu import PredicationSerializer


class CommentaireSerializer(serializers.ModelSerializer):
    utilisateur = UtilisateurSerializer(read_only=True)
    predication_detail = PredicationSerializer(source='predication', read_only=True)

    class Meta:
        model = Commentaire
        fields = ('id', 'predication', 'predication_detail', 'utilisateur', 'contenu', 'est_masque', 'cree_le', 'modifie_le')
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
    # Sans ces champs, l'interface de moderation n'affiche que la raison et ne
    # permet pas de savoir quel contenu est vise : l'administrateur ne peut pas
    # verifier le bien-fonde du signalement avant de trancher.
    predication_titre = serializers.CharField(source='predication.titre', read_only=True, default=None)
    commentaire_contenu = serializers.CharField(source='commentaire.contenu', read_only=True, default=None)

    class Meta:
        model = Signalement
        fields = (
            'id', 'utilisateur', 'predication', 'predication_titre',
            'commentaire', 'commentaire_contenu',
            'raison', 'details', 'statut', 'cree_le'
        )
        read_only_fields = ('utilisateur', 'statut')


class JournalAnalytiqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalAnalytique
        fields = '__all__'
