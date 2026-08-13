"""Cree les plans tarifaires par defaut, absents en production.

Aucune migration ni fixture ne peuplait PlanTarifaire : les deux plans
visibles en developpement y avaient ete crees a la main, via le shell, et
n'existaient donc que sur cette base locale. En production, /api/plans/
renvoyait une liste vide, et le formulaire de choix de formule de l'espace
pasteur affichait « Aucun forfait disponible pour le moment » a la place des
cartes de prix.

get_or_create rend l'operation sans effet si les plans existent deja (le cas
en local) : aucun doublon ne sera cree au prochain deploiement.
"""
from django.db import migrations


def creer_plans_par_defaut(apps, schema_editor):
    PlanTarifaire = apps.get_model('api', 'PlanTarifaire')

    PlanTarifaire.objects.get_or_create(
        nom='Abonnement Mensuel',
        defaults={'prix': 10000, 'duree_jours': 30, 'est_actif': True},
    )
    PlanTarifaire.objects.get_or_create(
        nom='Abonnement Annuel',
        defaults={'prix': 120000, 'duree_jours': 365, 'est_actif': True},
    )


def revenir_en_arriere(apps, schema_editor):
    """Sans effet : supprimer ces plans casserait toute souscription qui les
    reference deja (SouscriptionPasteur.plan), en production comme en local.
    """


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0025_inscription_sans_validation'),
    ]

    operations = [
        migrations.RunPython(creer_plans_par_defaut, revenir_en_arriere),
    ]
