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
import os

from django.conf import settings
from rest_framework import permissions
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication


class SanteView(APIView):
    """Repond 200 tant que le serveur applicatif traite les requetes."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({'statut': 'ok'})


class DiagnosticConfigurationView(APIView):
    """Indique quelles fonctionnalites optionnelles sont configurees.

    Une variable d'environnement absente ne se manifeste qu'au moment ou
    l'utilisateur declenche la fonctionnalite, par un message d'erreur qui ne
    dit pas si la variable est mal nommee, vide, ou posee sur le mauvais
    service. Cette vue repond a la question directement.

    Elle n'expose QUE des booleens et des comptages : jamais la valeur d'une
    cle, d'un mot de passe ou d'un domaine. Reservee aux administrateurs,
    elle reste inaccessible au public.
    """

    # La session s'ajoute au jeton JWT : une fois connecte a /admin/, il
    # suffit d'ouvrir cette adresse dans le navigateur, sans manipuler de
    # jeton — c'est precisement dans ce contexte de depannage qu'on la
    # consulte.
    authentication_classes = [SessionAuthentication, JWTAuthentication]
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        return Response({
            # Doit valoir False en production : sinon les traces d'erreur
            # completes sont exposees aux visiteurs.
            'debug_actif': settings.DEBUG,
            # Synchronisation des chaines YouTube (GOOGLE_API_KEY).
            'youtube_import': bool(os.environ.get('GOOGLE_API_KEY')),
            # Stockage objet : sans lui les fichiers televerses disparaissent
            # a chaque redeploiement sur un hebergeur a disque ephemere.
            'stockage_objet': settings.USE_S3,
            # Envoi reel des emails (verification, reinitialisation).
            'email_smtp': 'smtp' in settings.EMAIL_BACKEND,
            # Comptages seuls : les domaines eux-memes ne sont pas divulgues.
            'nb_domaines_autorises': len([h for h in settings.ALLOWED_HOSTS if h]),
            'nb_origines_cors': len([o for o in settings.CORS_ALLOWED_ORIGINS if o]),
        })
