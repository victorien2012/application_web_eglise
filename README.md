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

- Authentification complete cote front.
- Roles et permissions complets.
- Back-office pasteur.
- Interface admin produit/moderation.
- Recherche avancee et filtres publics complets.
- Interfaces frontend pour commentaires, favoris, abonnements et historique.
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
