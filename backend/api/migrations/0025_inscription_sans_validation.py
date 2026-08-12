"""Aligne les comptes existants sur l'inscription sans validation.

La verification par email et l'approbation d'un administrateur ne sont plus
exigees : les nouveaux comptes naissent utilisables. Sans cette migration, les
comptes crees avant le changement resteraient dans l'ancien etat — banniere de
verification affichee indefiniment pour un email qui ne sera jamais confirme,
et pasteurs bloques en attente d'une validation que plus personne ne donne.

Les pasteurs explicitement rejetes (est_rejete) sont volontairement laisses de
cote : leur refus est une decision d'administration, pas un reliquat du
mecanisme supprime.
"""
from django.db import migrations


def aligner_comptes_existants(apps, schema_editor):
    ProfilUtilisateur = apps.get_model('api', 'ProfilUtilisateur')
    Pasteur = apps.get_model('api', 'Pasteur')

    ProfilUtilisateur.objects.filter(email_verifie=False).update(email_verifie=True)
    Pasteur.objects.filter(est_valide=False, est_rejete=False).update(est_valide=True)


def revenir_en_arriere(apps, schema_editor):
    """Sans effet : l'etat anterieur de chaque compte n'est pas conserve.

    Rien n'est reinitialise a False, ce qui invaliderait des comptes qui
    n'avaient jamais eu besoin d'etre valides.
    """


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0024_plantarifaire_transaction_souscriptionpasteur'),
    ]

    operations = [
        migrations.RunPython(aligner_comptes_existants, revenir_en_arriere),
    ]
