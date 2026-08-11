from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]

# Fichiers statiques : servis par Django en developpement, par WhiteNoise en
# production (voir MIDDLEWARE dans settings.py).
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Fichiers medias (avatars, audios, couvertures, documents, carrousel).
#
# Avec USE_S3=True ils sont stockes et servis par le bucket objet : leurs URLs
# pointent directement vers lui, ce routage ne sert alors a rien.
#
# Sans stockage objet, ils doivent malgre tout etre accessibles. Le helper
# static() ne convient pas ici : il renvoie une liste vide des que DEBUG vaut
# False, ce qui rendait toutes les images et pieces jointes introuvables en
# production derriere un hebergeur sans serveur web dedie (Render, Fly...),
# alors que la pile Docker locale s'appuyait, elle, sur nginx.
if not settings.USE_S3:
    prefixe_media = settings.MEDIA_URL.lstrip('/')
    urlpatterns += [
        re_path(
            r'^%s(?P<path>.*)$' % prefixe_media,
            serve,
            {'document_root': settings.MEDIA_ROOT},
        ),
    ]
