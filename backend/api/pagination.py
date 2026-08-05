"""Pagination partagée de l'API."""
from rest_framework.pagination import PageNumberPagination


class PaginationOptionnelle(PageNumberPagination):
    """Pagination activée à la demande, via le paramètre `?page=`.

    Historiquement l'endpoint des prédications renvoyait la liste complète, et
    plusieurs écrans s'appuient encore sur ce comportement (espace pasteur,
    administration, page d'accueil). Passer brutalement à une pagination
    systématique les tronquerait silencieusement à la première page.

    Le compromis retenu : sans paramètre `page`, la réponse reste une liste
    complète (comportement inchangé) ; dès qu'un client demande `?page=N`, il
    reçoit la réponse paginée standard de DRF (`count` / `next` / `previous` /
    `results`). La page publique Vidéos utilise cette seconde forme, ce qui lui
    évite de télécharger tout le catalogue à chaque visite.
    """

    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        if self.page_query_param not in request.query_params:
            return None
        return super().paginate_queryset(queryset, request, view)
