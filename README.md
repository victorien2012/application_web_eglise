# Plan d'execution - Version web

Ce README sert de plan de travail pour construire la version web de la plateforme de predications. Il est base sur le cahier des charges fourni et adapte au projet actuel: frontend React/Vite, backend Django REST Framework, PostgreSQL et Docker Compose.

## Objectif produit

Construire une plateforme web ou:

- les visiteurs consultent, recherchent, ecoutent et regardent des predications;
- les utilisateurs inscrits gerent favoris, abonnements, historique et commentaires;
- les pasteurs publient et administrent leurs contenus;
- les administrateurs valident les pasteurs, moderent les contenus et suivent l'activite.

La version web est prioritaire. Les fonctions mobile-only comme le hors-ligne, AirPlay, Chromecast et push mobile seront laissees en phase ulterieure.

## Stack retenue

- Frontend: React + Vite, React Router, Axios.
- Backend: Django + Django REST Framework.
- Base de donnees: PostgreSQL.
- Authentification: JWT via SimpleJWT.
- Conteneurs: Docker Compose.
- Medias MVP: upload local via Django `media/`.
- Medias cible production: stockage objet type S3 + CDN + pipeline de transcodage.

## Principes de developpement

- Utiliser des noms metier en francais autant que possible pour les modeles, classes, vues, services et methodes applicatives.
- Garder l'API REST claire, documentee et stable.
- Livrer par increments testables, chaque phase devant fonctionner dans Docker.
- Se concentrer d'abord sur le parcours web MVP avant les integrations avancees.
- Ne pas bloquer le MVP sur le transcodage HLS complet: commencer par fichiers audio/video lisibles, puis ajouter le pipeline.

## Etat actuel du projet

Deja present:

- Docker Compose avec `db`, `backend`, `frontend`.
- Backend Django/DRF avec modeles de base `Pasteur`, `Predication`, `JournalAnalytique`.
- Front React avec accueil, detail de predication, lecteur audio et lecteur video.
- API publique de predications.
- Migrations initiales de l'application `api`.
- Fichier `.env.example` pour initialiser un environnement local.
- Tests de sante backend pour l'API predications, l'authentification JWT et les permissions de creation.
- Fondations du modele metier MVP: categories, etiquettes, series, pieces jointes, commentaires, favoris, abonnements, historique de lecture et signalements.
- Schema base de donnees applicatif en francais: tables et colonnes metier francisees.

Manques principaux:

- Authentification cote front: inscription, connexion, mot de passe oublie et verification email sont en place.
- Roles et permissions complets.
- Back-office pasteur.
- Interface admin produit/moderation.
- Recherche avancee et filtres publics complets.
- Interfaces frontend pour commentaires, favoris, abonnements et historique: en place (voir ticket 6).
- Upload complet avec validation fichiers.
- Analytics utilisables.
- Tests automatises.
- Pages legales RGPD.

## Phase 0 - Stabilisation technique

Objectif: partir d'une base saine avant d'ajouter les fonctionnalites.

Taches:

- Verifier que `docker compose up --build` demarre toujours les trois services.
- Ajouter un fichier `.env.example` sans secrets reels.
- Ajouter une documentation rapide des commandes utiles.
- Nettoyer les imports front inutilises et les erreurs console.
- Creer une structure front stable: `pages`, `components`, `services`, `hooks`, `styles`.
- Creer une structure backend plus lisible: serializers, permissions, views, urls, tests.
- Ajouter des tests de sante backend: API predications, auth, permissions.

Critere d'acceptation:

- Un nouveau developpeur peut lancer le projet avec Docker et ouvrir le front sur `http://localhost:5173`.
- `npm run build` passe.
- `python manage.py test` passe dans le conteneur backend.

## Phase 1 - Modele metier MVP

Objectif: aligner la base de donnees avec le cahier des charges web.

Taches backend:

- Renommer ou completer les concepts metier en francais si necessaire.
- Enrichir le profil pasteur: eglise, bio, photo, reseaux sociaux, localisation, langues, statut de verification.
- Enrichir la predication: titre, description, type media, langue, duree, date de publication, statut, visibilite.
- Ajouter categories et tags.
- Ajouter series de predications.
- Ajouter fichiers joints: PDF, notes, document.
- Ajouter commentaires.
- Ajouter reactions ou favoris.
- Ajouter abonnements a un pasteur.
- Ajouter historique de lecture.
- Ajouter signalements.

Critere d'acceptation:

- Les migrations representent le MVP web.
- Les donnees principales sont consultables via l'admin Django.
- Les relations pasteur, predication, categories, tags et series sont testees.

## Phase 2 - Authentification et roles

Objectif: securiser les parcours visiteur, utilisateur, pasteur et admin.

Taches backend:

- Finaliser endpoints JWT: login, refresh, profil courant.
- Ajouter inscription email/mot de passe.
- Ajouter verification email si possible dans le MVP.
- Ajouter mot de passe oublie.
- Ajouter permissions DRF par role.
- Bloquer les actions pasteur aux pasteurs valides.
- Bloquer la moderation aux admins.

Taches frontend:

- Creer pages connexion et inscription.
- Stocker le token proprement cote client.
- Ajouter garde de routes pour espace pasteur.
- Ajouter page profil utilisateur.
- Ajouter deconnexion.

Critere d'acceptation:

- Un visiteur peut naviguer sans compte.
- Un utilisateur peut creer un compte et se connecter.
- Un pasteur ne peut modifier que ses propres contenus.
- Un admin peut acceder aux actions de moderation.

## Phase 3 - Consultation publique web

Objectif: construire l'experience principale des visiteurs.

Taches frontend:

- Refaire l'accueil: nouveautes, categories, pasteurs mis en avant.
- Ajouter page decouverte.
- Ajouter page liste des pasteurs.
- Ajouter page detail pasteur avec bio, series et predications.
- Ajouter recherche par titre, pasteur, theme, langue et reference biblique.
- Ajouter filtres: date, duree, type audio/video/texte.
- Ameliorer la page detail predication.
- Ajouter etats vides, erreurs reseau et chargements.

Taches backend:

- Ajouter endpoints publics pour accueil, recherche, categories et pasteurs.
- Ajouter pagination.
- Ajouter filtres DRF.
- Ajouter tri par date, popularite, duree.

Critere d'acceptation:

- Un visiteur trouve une predication depuis l'accueil ou la recherche.
- La page pasteur est publique et exploitable.
- Les listes restent rapides et paginees.

## Phase 4 - Lecteurs audio et video

Objectif: fournir une lecture web stable et agreable.

Taches:

- Ameliorer le lecteur audio persistant.
- Ajouter reprise de lecture locale puis serveur pour utilisateur connecte.
- Ajouter vitesse de lecture.
- Ajouter progression et duree.
- Ajouter mode mini-player.
- Ajouter lecteur video avec controles propres.
- Ajouter support sous-titres VTT/SRT si fichier fourni.
- Journaliser vues, ecoutes et telechargements.

Critere d'acceptation:

- Un utilisateur peut ecouter une predication en continuant a naviguer.
- La reprise reprend au bon endroit.
- Les evenements de lecture alimentent les statistiques.

## Phase 5 - Back-office pasteur

Objectif: permettre au pasteur de publier et gerer son catalogue.

Taches frontend:

- Creer tableau de bord pasteur.
- Ajouter liste des predications du pasteur.
- Ajouter formulaire creation/modification.
- Ajouter upload audio, video, image de couverture et fichiers joints.
- Ajouter statut: brouillon, publie, prive, non liste, planifie.
- Ajouter gestion tags, categories et series.
- Ajouter previsualisation avant publication.
- Ajouter gestion commentaires de ses predications.
- Ajouter statistiques simples.

Taches backend:

- Ajouter endpoints CRUD pasteur.
- Valider tailles et types de fichiers.
- Ajouter permissions proprietaire.
- Ajouter publication planifiee.
- Ajouter compteurs vues, ecoutes, telechargements.

Critere d'acceptation:

- Un pasteur connecte cree une predication complete depuis le web.
- Il peut la modifier, la masquer ou la publier.
- Il voit ses statistiques de base.

## Phase 6 - Engagement utilisateur

Objectif: ajouter les fonctions qui creent la retention.

Taches:

- Ajouter favoris ou likes.
- Ajouter abonnements a un pasteur.
- Ajouter commentaires.
- Ajouter signalement d'un contenu ou commentaire.
- Ajouter historique de lecture.
- Ajouter playlists personnelles si temps disponible.
- Ajouter notifications in-app pour nouvelles publications.
- Ajouter email de notification en version simple.

Critere d'acceptation:

- Un utilisateur suit un pasteur.
- Une nouvelle publication peut generer une notification.
- Les commentaires et signalements sont moderables.

## Phase 7 - Administration et moderation

Objectif: donner le controle aux administrateurs.

Taches:

- Configurer l'admin Django pour tous les modeles.
- Ajouter validation des profils pasteurs.
- Ajouter liste des signalements.
- Ajouter actions: masquer, supprimer, bannir, reouvrir.
- Ajouter gestion categories et tags.
- Ajouter journal d'audit admin.
- Ajouter analytics globaux simples.

Critere d'acceptation:

- Un admin valide un pasteur.
- Un admin traite un signalement.
- Les actions sensibles sont tracees.

## Phase 8 - Recherche et performance

Objectif: rendre la plateforme fluide sur un catalogue grandissant.

Taches:

- Ajouter index base de donnees utiles.
- Optimiser les serializers et requetes.
- Ajouter cache pour accueil et pages publiques frequentes.
- Ajouter recherche simple PostgreSQL.
- Prevoir OpenSearch/Elasticsearch en phase production si besoin.
- Optimiser images et miniatures.
- Ajouter mesures de temps de reponse API.

Critere d'acceptation:

- Recherche web sous 300 ms p95 en environnement cible.
- Accueil charge rapidement.
- Pas de requetes N+1 sur les listes principales.

## Phase 9 - Conformite, securite et accessibilite

Objectif: preparer une mise en ligne serieuse.

Taches:

- Ajouter HTTPS en environnement de production.
- Ajouter politique CORS stricte.
- Ajouter rate limiting sur auth, upload et commentaires.
- Ajouter validation antivirus ou controle minimal des fichiers uploads.
- Ajouter pages: mentions legales, confidentialite, cookies, conditions.
- Ajouter consentement cookies.
- Ajouter export et suppression de compte.
- Ajouter labels ARIA et navigation clavier.
- Verifier contrastes et responsive mobile/tablette/desktop.

Critere d'acceptation:

- Les pages legales sont accessibles.
- Les formulaires principaux sont navigables au clavier.
- Les endpoints sensibles sont proteges.

## Phase 10 - Preparation production

Objectif: rendre l'application deployable.

Taches:

- Ajouter configuration production Django.
- Servir les assets front via build statique ou hebergement dedie.
- Passer les medias sur stockage objet S3 compatible.
- Ajouter CDN.
- Ajouter sauvegardes PostgreSQL.
- Ajouter logs structures.
- Ajouter monitoring et alerting.
- Ajouter pipeline CI/CD.
- Ajouter procedure de rollback.

Critere d'acceptation:

- Une release peut etre deployee et rollbackee.
- Les logs permettent de diagnostiquer une erreur.
- Les sauvegardes base de donnees sont testees.

## Hors perimetre MVP web

Ces elements restent importants mais ne doivent pas bloquer la premiere version web:

- Application mobile native.
- Mode hors-ligne.
- AirPlay et Chromecast.
- Live streaming.
- Sous-titres auto-generes.
- Chapitrage automatique.
- Recommandations personnalisees avancees.
- Monétisation, dons et premium.
- Moderation IA assistee.
- Multi-tenant complet par eglise.

## Definition du MVP web

Le MVP web est considere termine quand:

- un visiteur peut consulter, rechercher, ecouter et regarder des predications;
- un utilisateur peut se connecter, commenter, liker/favoriser et suivre un pasteur;
- un pasteur valide peut publier et gerer ses predications;
- un admin peut valider les pasteurs et moderer les contenus;
- les medias sont uploades et servis correctement;
- les statistiques de base sont visibles;
- le projet se lance avec Docker;
- les tests critiques passent.

## Commandes de travail

Initialisation locale:

```bash
cp .env.example .env
docker compose up --build
```

Commandes utiles:

```bash
docker compose up --build
docker compose ps
docker compose logs -f frontend
docker compose logs -f backend
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py test
docker compose run --rm frontend npm run build
```

Verification rapide attendue:

```bash
curl http://localhost:5173/
curl http://localhost:8000/api/predications/
```

## Ordre recommande des prochains tickets

1. Ajouter `.env.example` et documentation de lancement.
2. Ajouter tests backend de sante.
3. Finaliser les modeles MVP: tags, categories, series, commentaires, abonnements, favoris, historique.
4. Finaliser auth front et routes protegees.
5. Construire le back-office pasteur.
6. Construire les pages publiques: decouverte, pasteurs, recherche.
7. Ajouter moderation admin et signalements.
8. Ajouter analytics de base.
9. Ajouter securite, RGPD et accessibilite.
10. Preparer production.

Statut actuel des trois premiers tickets: termine.

Ticket 4 (auth front et routes protegees): termine.

- Inscription: `POST /api/auth/inscription/` renvoie directement les tokens JWT; page `/inscription` avec option "Je suis pasteur".
- Connexion et routes protegees: en place.
- Mot de passe oublie: `POST /api/auth/mot-de-passe-oublie/` (envoi du lien) et `POST /api/auth/reinitialiser-mot-de-passe/` (uid + token + nouveau mot de passe); pages `/mot-de-passe-oublie` et `/reinitialiser-mot-de-passe`.
- Verification email: email envoye a l'inscription, `POST /api/auth/verifier-email/` et `POST /api/auth/renvoyer-verification/`; page `/verifier-email`, banniere de rappel tant que l'email n'est pas verifie. Modele `ProfilUtilisateur` (champ `email_verifie`).
- En dev, les emails s'affichent dans les logs du conteneur backend (backend console). Configurer un vrai SMTP en production via les variables `EMAIL_*` (voir `.env.example`).

Migrations ajoutees: `0007_pasteur_est_valide` (le champ `est_valide` du modele Pasteur n'avait jamais ete migre) et `0008_profilutilisateur`.

Ticket 5 (back-office pasteur) en cours:

- Creation et **modification** de predications depuis le tableau de bord, avec **upload** audio, video et image de couverture (multipart), lien video externe, choix de serie et categories, statut publie/brouillon.
- **Suppression** d'une predication (proprietaire uniquement).
- **Validation des fichiers** cote backend: extensions et tailles maximales (audio 100 Mo, video 1 Go, image 5 Mo, pieces jointes 25 Mo).
- Correction d'un bug: un pasteur peut desormais consulter/modifier/supprimer ses propres predications **non publiees** via `/api/predications/{id}/` (le filtre `est_publie=True` masquait ses brouillons); le public ne voit toujours que les predications publiees.
- Tableau de bord et statistiques de base deja en place.
- **Moderation des commentaires**: le pasteur voit tous les commentaires de ses predications (y compris masques) via `?moderation=true`, peut masquer/reafficher (`POST /api/commentaires/{id}/basculer_masquage/`) et supprimer. Faille corrigee au passage: la suppression d'un commentaire est desormais reservee a son auteur, au pasteur proprietaire de la predication ou a un admin.
- **Pieces jointes**: ajout/suppression de documents (PDF, doc, odt, txt, ppt...) par predication depuis le dashboard, avec validation de format et de taille; suppression reservee au pasteur proprietaire ou a un admin.
- **Publication planifiee**: champ `date_publication`; une predication publiee n'est publique qu'a partir de cette date (avant, seul le pasteur la voit, badge "Planifiee"). Champ `date_publication` + indicateur `est_planifiee` exposes par l'API.
- Restent: statuts avances prive/non liste, previsualisation avant publication.

Pagination (Phases 3 & 8): l'API REST est desormais **paginee** (`PageNumberPagination`, 20 par page). Les reponses de liste ont la forme `{ count, next, previous, results }`. Cote front, le helper `extraireListe` (dans `services/api.js`) accepte indifferemment un tableau brut ou une reponse paginee.

Ticket 6 (engagement utilisateur) cote UI:

- **Favoris**: bouton coeur sur la page predication (ajout/retrait), liste sur la page profil. Hook `useFavori`.
- **Abonnements**: bouton "S'abonner / Se desabonner" sur la page pasteur, liste sur le profil. Hook `useAbonnement`.
- **Commentaires**: affichage et ajout sur la page predication (`SectionCommentaires`), moderation cote pasteur deja en place.
- **Historique de lecture**: enregistre automatiquement a l'ouverture d'une predication par un utilisateur connecte (endpoint rendu idempotent via upsert sur (utilisateur, predication)), liste sur le profil.
- Restent: signalement depuis l'UI, notifications in-app/email, playlists.

Ticket 7 (administration et moderation) en cours:

- **Validation des pasteurs**: page `/administration` (reservee aux comptes `is_staff`) listant les pasteurs en attente (`GET /api/pasteurs/a_valider/`) avec action de validation (`POST /api/pasteurs/{id}/valider/`). Faille corrigee: `est_valide` est desormais en lecture seule cote serializer; un pasteur ne peut plus s'auto-valider, seule l'administration le peut.
- **Traitement des signalements**: liste filtrable par statut (`GET /api/signalements/?statut=`), changement de statut reserve aux admins (`POST /api/signalements/{id}/changer_statut/`, statuts NOUVEAU/EN_COURS/TRAITE/REJETE).
- L'API de connexion expose `est_admin` (is_staff); le front affiche le lien Administration et protege la route (`RouteProtegee adminUniquement`).
- L'admin Django couvre deja tous les modeles (voir `api/admin.py`).
- Restent: actions bannir/reouvrir, journal d'audit admin.

Ticket 8 (analytics): endpoint admin `GET /api/admin/statistiques/` (reserve `is_staff`) agregeant utilisateurs, pasteurs (dont valides), predications (dont publiees), vues, telechargements, commentaires, favoris, abonnements, signalements par statut, top 5 predications et serie d'activite sur 30 jours. Affiche en tete de la page `/administration`.

Phase 9 (securite, RGPD, accessibilite) - premiers elements:

- **CORS strict**: `CORS_ALLOWED_ORIGINS` (liste blanche par variable d'environnement, defaut `localhost:5173`) remplace `CORS_ALLOW_ALL_ORIGINS`.
- **Rate limiting** (DRF `ScopedRateThrottle`): connexion 30/min, inscription 20/min, mot de passe oublie 10/min, publication de commentaires 60/min.
- **RGPD**: export de ses donnees (`GET /api/auth/mes-donnees/`) et suppression de compte (`DELETE /api/auth/mon-compte/`), accessibles depuis la page profil.
- **Pages legales**: mentions legales, confidentialite, cookies, conditions (`/mentions-legales`, `/confidentialite`, `/cookies`, `/conditions`) + pied de page; **banniere de consentement cookies**.
- **En-tetes de securite** (actifs hors DEBUG): redirection HTTPS, HSTS, cookies securises, `X-Frame-Options: DENY`, nosniff, `Referrer-Policy`, `SECURE_PROXY_SSL_HEADER`, `CSRF_TRUSTED_ORIGINS`.
- **Accessibilite**: lien d'evitement ("Aller au contenu principal"), `aria-label` sur la navigation et les boutons-icones, focus clavier visible (`:focus-visible`).
- Restent: controle antivirus des uploads, audit d'accessibilite complet (contrastes, lecteurs d'ecran).

## Phase 10 - Preparation production

- **Configuration Django de production** (activee quand `DEBUG=False`): en-tetes de securite, journalisation structuree vers stdout (`LOGGING`), service des fichiers statiques par **WhiteNoise** (compresses + manifeste).
- **Stockage objet S3 + CDN** (optionnel via `USE_S3=True`): `django-storages` + `boto3`, endpoint et domaine CDN configurables.
- **Images de production**:
  - Backend servi par **gunicorn** (3 workers), avec `migrate` + `collectstatic` au demarrage.
  - Frontend build Vite servi par **nginx** ([frontend/Dockerfile.prod](frontend/Dockerfile.prod) + [frontend/nginx.conf](frontend/nginx.conf)), qui proxifie `/api`, `/admin`, `/static` vers le backend et sert `/media` depuis le volume partage.
- **Orchestration**: [docker-compose.prod.yml](docker-compose.prod.yml) + [.env.prod.example](.env.prod.example).
- **Sauvegardes PostgreSQL**: [scripts/backup_db.sh](scripts/backup_db.sh) (avec retention) et [scripts/restore_db.sh](scripts/restore_db.sh).
- **CI/CD**: [.github/workflows/ci.yml](.github/workflows/ci.yml) lance les tests backend (sur PostgreSQL) et le build frontend a chaque push/PR sur `main`.
- Restent: monitoring/alerting, CDN reel, sauvegardes planifiees externes.

### Lancer la stack de production

```bash
cp .env.prod.example .env.prod   # puis completer les secrets
docker compose -f docker-compose.prod.yml --env-file .env.prod up --build -d
# Creer un compte administrateur
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

L'application est servie sur le port 80 (front + API proxifiee). Stack validee localement: gunicorn + WhiteNoise + nginx, migrations et collectstatic au demarrage.

### Sauvegarde et restauration

```bash
./scripts/backup_db.sh ./backups            # sauvegarde horodatee + retention (14)
./scripts/restore_db.sh ./backups/xxx.sql.gz  # restauration
```

### Procedure de rollback

1. Identifier la version (tag/commit) precedente stable.
2. `git checkout <tag-precedent>` puis `docker compose -f docker-compose.prod.yml --env-file .env.prod up --build -d`.
3. Si une migration doit etre annulee: `docker compose -f docker-compose.prod.yml exec backend python manage.py migrate api <numero_migration_precedente>`.
4. En cas de corruption de donnees: restaurer la derniere sauvegarde via `scripts/restore_db.sh`.
