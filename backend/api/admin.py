from django.contrib import admin

from .models import (
    Abonnement,
    Categorie,
    Commentaire,
    Etiquette,
    Favori,
    HistoriqueLecture,
    JournalAnalytique,
    Pasteur,
    PieceJointe,
    Predication,
    Serie,
    Signalement,
)


@admin.register(Pasteur)
class PasteurAdmin(admin.ModelAdmin):
    list_display = ('nom_affichage', 'nom_eglise', 'cree_le')
    search_fields = ('nom_affichage', 'nom_eglise')


@admin.register(Predication)
class PredicationAdmin(admin.ModelAdmin):
    list_display = (
        'titre', 'pasteur', 'type_media', 'serie',
        'nombre_vues', 'nombre_telechargements', 'est_publie', 'cree_le'
    )
    list_filter = ('type_media', 'est_publie', 'pasteur', 'categories', 'etiquettes')
    search_fields = ('titre', 'description')
    filter_horizontal = ('categories', 'etiquettes')


@admin.register(Categorie)
class CategorieAdmin(admin.ModelAdmin):
    list_display = ('nom', 'cree_le')
    search_fields = ('nom', 'description')


@admin.register(Etiquette)
class EtiquetteAdmin(admin.ModelAdmin):
    list_display = ('nom', 'cree_le')
    search_fields = ('nom',)


@admin.register(Serie)
class SerieAdmin(admin.ModelAdmin):
    list_display = ('titre', 'pasteur', 'cree_le')
    list_filter = ('pasteur',)
    search_fields = ('titre', 'description', 'pasteur__nom_affichage')


@admin.register(PieceJointe)
class PieceJointeAdmin(admin.ModelAdmin):
    list_display = ('nom', 'predication', 'cree_le')
    search_fields = ('nom', 'predication__titre')


@admin.register(Commentaire)
class CommentaireAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'predication', 'est_masque', 'cree_le')
    list_filter = ('est_masque', 'cree_le')
    search_fields = ('contenu', 'utilisateur__username', 'predication__titre')


@admin.register(Favori)
class FavoriAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'predication', 'cree_le')
    search_fields = ('utilisateur__username', 'predication__titre')


@admin.register(Abonnement)
class AbonnementAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'pasteur', 'cree_le')
    search_fields = ('utilisateur__username', 'pasteur__nom_affichage')


@admin.register(HistoriqueLecture)
class HistoriqueLectureAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'predication', 'position_secondes', 'est_termine', 'modifie_le')
    list_filter = ('est_termine', 'modifie_le')
    search_fields = ('utilisateur__username', 'predication__titre')


@admin.register(Signalement)
class SignalementAdmin(admin.ModelAdmin):
    list_display = ('raison', 'statut', 'predication', 'utilisateur', 'cree_le')
    list_filter = ('raison', 'statut', 'cree_le')
    search_fields = ('details', 'predication__titre', 'utilisateur__username')


@admin.register(JournalAnalytique)
class JournalAnalytiqueAdmin(admin.ModelAdmin):
    list_display = ('type_action', 'predication', 'cree_le', 'adresse_ip')
    list_filter = ('type_action', 'cree_le')
    readonly_fields = ('type_action', 'predication', 'cree_le', 'adresse_ip')
