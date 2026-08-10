import uuid
from django.utils import timezone
from datetime import timedelta
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from api.models import PlanTarifaire, SouscriptionPasteur, Transaction
from api.serializers import PlanTarifaireSerializer, SouscriptionPasteurSerializer, TransactionSerializer

class PlanTarifaireViewSet(viewsets.ReadOnlyModelViewSet):
    """Permet aux pasteurs de lister les plans tarifaires disponibles."""
    queryset = PlanTarifaire.objects.filter(est_actif=True)
    serializer_class = PlanTarifaireSerializer
    permission_classes = [permissions.IsAuthenticated]

class SouscriptionPasteurViewSet(viewsets.ReadOnlyModelViewSet):
    """Permet à un pasteur de voir l'état de sa souscription."""
    serializer_class = SouscriptionPasteurSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'profil_pasteur'):
            return SouscriptionPasteur.objects.none()
        return SouscriptionPasteur.objects.filter(pasteur=user.profil_pasteur)

    @action(detail=False, methods=['get'])
    def courante(self, request):
        user = request.user
        if not hasattr(user, 'profil_pasteur'):
            return Response({"detail": "Vous n'êtes pas un pasteur."}, status=status.HTTP_403_FORBIDDEN)
        
        souscription, created = SouscriptionPasteur.objects.get_or_create(
            pasteur=user.profil_pasteur,
            defaults={
                'date_fin': timezone.now() + timedelta(days=365),
                'est_essai': True
            }
        )
        serializer = self.get_serializer(souscription)
        return Response(serializer.data)

class PaiementSimulationViewSet(viewsets.ViewSet):
    """Endpoint de mock pour simuler un paiement Wave/Orange."""
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def simuler(self, request):
        user = request.user
        if not hasattr(user, 'profil_pasteur'):
            return Response({"detail": "Seuls les pasteurs peuvent payer."}, status=status.HTTP_403_FORBIDDEN)
        
        plan_id = request.data.get('plan_id')
        methode = request.data.get('methode', 'WAVE')

        # int() sur une valeur non numerique (chaine invalide, liste, None
        # explicite) levait une exception non interceptee -> 500 au lieu d'un
        # refus propre. Un simple POST {"quantite": "abc"} suffisait a le
        # declencher.
        try:
            quantite = int(request.data.get('quantite', 1))
        except (TypeError, ValueError):
            return Response({"detail": "Quantité invalide."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = PlanTarifaire.objects.get(id=plan_id, est_actif=True)
        except (PlanTarifaire.DoesNotExist, ValueError, TypeError):
            return Response({"detail": "Plan introuvable ou inactif."}, status=status.HTTP_404_NOT_FOUND)

        # Le nombre de jours ajoute est plan.duree_jours * quantite : sans
        # plafond, une quantite trop grande (fatidoigt ou appel direct a
        # l'API) produit une date au-dela de l'an 9999 et fait deborder
        # `datetime`, provoquant une erreur serveur au lieu d'un refus clair.
        jours_max = 3650  # 10 ans, toutes formules confondues
        if plan.duree_jours < 1:
            return Response({"detail": "Ce plan est mal configuré (durée invalide)."}, status=status.HTTP_400_BAD_REQUEST)
        if quantite < 1 or plan.duree_jours * quantite > jours_max:
            max_unites = max(1, jours_max // plan.duree_jours)
            return Response(
                {"detail": f"Quantité invalide. Choisissez entre 1 et {max_unites} pour cette formule."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        montant_total = plan.prix * quantite
        jours_total = plan.duree_jours * quantite

        # Créer la transaction "succès"
        reference = f"SIM_{uuid.uuid4().hex[:10].upper()}"
        transaction = Transaction.objects.create(
            pasteur=user.profil_pasteur,
            plan=plan,
            montant=montant_total,
            reference=reference,
            methode=methode,
            statut='SUCCESS'
        )

        # Mettre à jour la souscription
        souscription, created = SouscriptionPasteur.objects.get_or_create(
            pasteur=user.profil_pasteur,
            defaults={
                'date_fin': timezone.now() + timedelta(days=jours_total),
                'est_essai': False,
                'plan': plan
            }
        )
        
        if not created:
            # Si elle existe déjà, on ajoute les jours à partir d'aujourd'hui
            # Ou à partir de la date de fin si elle n'est pas encore expirée
            nouvelle_fin = max(timezone.now(), souscription.date_fin) + timedelta(days=jours_total)
            souscription.date_fin = nouvelle_fin
            souscription.est_essai = False
            souscription.plan = plan
            souscription.save()

        return Response({
            "message": "Paiement simulé avec succès.",
            "transaction_reference": reference,
            "nouvelle_date_fin": souscription.date_fin
        })
