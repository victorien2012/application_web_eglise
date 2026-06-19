"""Vue d'administration : statistiques globales de la plateforme."""
from datetime import timedelta

from django.contrib.auth.models import User
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import (
    Abonnement,
    Commentaire,
    Favori,
    JournalAnalytique,
    Pasteur,
    Predication,
    Signalement,
)
from api.serializers import PredicationSerializer


class StatistiquesGlobalesView(APIView):
    """Tableau de bord analytique global, reserve a l'administration."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        predications = Predication.objects.all()
        total_vues = predications.aggregate(Sum('nombre_vues'))['nombre_vues__sum'] or 0
        total_telechargements = (
            predications.aggregate(Sum('nombre_telechargements'))['nombre_telechargements__sum'] or 0
        )

        signalements_par_statut = {
            statut: Signalement.objects.filter(statut=statut).count()
            for statut, _ in Signalement.STATUT_CHOICES
        }

        meilleures = predications.select_related('pasteur').order_by('-nombre_vues')[:5]
        meilleures_data = PredicationSerializer(
            meilleures, many=True, context={'request': request}
        ).data

        trente_jours = timezone.now() - timedelta(days=30)
        journaux = JournalAnalytique.objects.filter(
            cree_le__gte=trente_jours
        ).annotate(date=TruncDate('cree_le')).values('date', 'type_action').annotate(
            count=Count('id')
        ).order_by('date')

        stats_par_jour = {}
        for jour in range(30):
            date_jour = (timezone.now() - timedelta(days=jour)).date()
            stats_par_jour[date_jour.isoformat()] = {
                'date': date_jour.strftime('%d/%m'),
                'lectures': 0,
                'telechargements': 0,
            }
        for journal in journaux:
            cle = journal['date'].isoformat()
            if cle in stats_par_jour:
                if journal['type_action'] in ['PLAY_AUDIO', 'WATCH_VIDEO']:
                    stats_par_jour[cle]['lectures'] += journal['count']
                elif journal['type_action'] == 'DOWNLOAD':
                    stats_par_jour[cle]['telechargements'] += journal['count']
        serie_analytique = sorted(
            stats_par_jour.values(),
            key=lambda item: timezone.datetime.strptime(item['date'], '%d/%m'),
        )

        return Response({
            'total_utilisateurs': User.objects.count(),
            'total_pasteurs': Pasteur.objects.count(),
            'total_pasteurs_valides': Pasteur.objects.filter(est_valide=True).count(),
            'total_predications': predications.count(),
            'total_predications_publiees': predications.filter(est_publie=True).count(),
            'total_vues': total_vues,
            'total_telechargements': total_telechargements,
            'total_commentaires': Commentaire.objects.count(),
            'total_favoris': Favori.objects.count(),
            'total_abonnements': Abonnement.objects.count(),
            'signalements_par_statut': signalements_par_statut,
            'meilleures_predications': meilleures_data,
            'serie_analytique': serie_analytique,
        })
