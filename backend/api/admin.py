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
    ProfilUtilisateur,
    Serie,
    Signalement,
    DemandePasteur,
)


@admin.register(ProfilUtilisateur)
class ProfilUtilisateurAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'email_verifie', 'cree_le')
    list_filter = ('email_verifie',)
    search_fields = ('utilisateur__username', 'utilisateur__email')


@admin.register(Pasteur)
class PasteurAdmin(admin.ModelAdmin):
    list_display = ('nom_affichage', 'nom_eglise', 'est_valide', 'cree_le')
    list_filter = ('est_valide',)
    search_fields = ('nom_affichage', 'nom_eglise')

    def save_model(self, request, obj, form, change):
        if change:
            old_obj = self.model.objects.get(pk=obj.pk)
            if not old_obj.est_valide and obj.est_valide:
                from .views import envoyer_email_validation_pasteur
                try:
                    envoyer_email_validation_pasteur(obj)
                except Exception:
                    pass
            elif old_obj.est_valide and not obj.est_valide:
                from .views import envoyer_email_rejet_pasteur
                try:
                    envoyer_email_rejet_pasteur(obj)
                except Exception:
                    pass
        super().save_model(request, obj, form, change)


@admin.register(DemandePasteur)
class DemandePasteurAdmin(PasteurAdmin):
    list_display = ('nom_affichage', 'nom_eglise', 'email_contact', 'cree_le')
    search_fields = ('nom_affichage', 'nom_eglise')

    def email_contact(self, obj):
        return obj.utilisateur.email
    email_contact.short_description = 'Email'

    def get_queryset(self, request):
        return super(admin.ModelAdmin, self).get_queryset(request).filter(est_valide=False)

    def has_add_permission(self, request):
        return False


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
