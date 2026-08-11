"""Point de controle de sante, interroge par l'hebergeur (Render, etc.).

Volontairement minimaliste et sans authentification : l'hebergeur l'appelle
toutes les quelques secondes pour decider si l'instance est vivante, et le
redemarre sinon. Il ne revele donc aucune information sur l'application
(version, base de donnees, variables) : une reponse 200 suffit a prouver que
le processus WSGI repond.

La connexion a la base n'est deliberement PAS testee ici : une base
momentanement indisponible provoquerait une boucle de redemarrages alors que
l'application, elle, fonctionne toujours.
"""
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class SanteView(APIView):
    """Repond 200 tant que le serveur applicatif traite les requetes."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({'statut': 'ok'})
