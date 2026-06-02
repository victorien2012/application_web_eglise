from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission pour autoriser uniquement le propriétaire
    d'un objet (ex: Commentaire) à le modifier ou le supprimer.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return getattr(obj, 'utilisateur', None) == request.user


class IsPastorOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission pour autoriser uniquement le pasteur propriétaire
    d'une série à la modifier ou la supprimer.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        pasteur = getattr(obj, 'pasteur', None)
        if pasteur:
            return pasteur.utilisateur == request.user
        return False


class IsSermonPastorOrReadOnly(permissions.BasePermission):
    """
    Permission pour autoriser les modifications de pièces jointes
    uniquement au pasteur propriétaire de la prédication associée.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        predication = getattr(obj, 'predication', None)
        if predication and predication.pasteur:
            return predication.pasteur.utilisateur == request.user
        return False
