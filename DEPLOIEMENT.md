# Déploiement — Plateforme Église

Document de référence pour le déploiement de test sur **Vercel** (frontend) +
**Render** (backend Django + PostgreSQL) + **Cloudflare R2** (fichiers).

> Dernière mise à jour : 12 août 2026
> Branche déployée : `main`
> Dépôt : `github.com/victorien2012/application_web_eglise`

## 0. Environnement en ligne

| Service | URL | État |
|---|---|---|
| Frontend (Vercel) | https://application-web-eglise.vercel.app | ✅ En ligne |
| Backend (Render) | https://sermon-backend.onrender.com | ✅ En ligne |
| Base PostgreSQL (Render) | `sermon-db` (interne) | ✅ Connectée |
| Stockage objet | — | ⬜ À brancher (étape 6) |

Vérifications effectuées sur l'environnement réel le 12 août 2026 :
sonde de santé 200, API 200, CORS validé depuis l'origine Vercel dans un
navigateur, HTTPS forcé, HSTS actif, en-têtes de sécurité présents des deux
côtés, routage SPA fonctionnel, aucune fuite d'information sur erreur.

**Reste à faire :** créer le compte administrateur (§4, étape 4) et brancher
le stockage objet (§4, étape 6) — sans lui, les fichiers téléversés ne
survivent pas à un redéploiement.

---

## 1. Répartition des rôles

| Ce qui a été fait pour vous | Ce qui reste à votre charge |
|---|---|
| Préparation complète du code | Création des comptes Render / Vercel / Cloudflare |
| Configuration `render.yaml`, `vercel.json`, Dockerfile prod | Saisie des secrets dans les tableaux de bord |
| Corrections de sécurité + vérifications | Acceptation des conditions d'utilisation |
| Ce document | Création du compte administrateur en production |

**Pourquoi la création de comptes reste de votre côté :** elle impose de saisir
un mot de passe, de valider une adresse email et d'accepter des conditions
contractuelles engageant votre responsabilité. Ces actions ne peuvent pas être
déléguées. Une fois les services créés, la vérification du déploiement (en-têtes
de sécurité, CORS, upload de médias, parcours de connexion) peut être reprise en
charge.

---

## 2. Inventaire des modifications

### 2.1 Préparation au déploiement

| Fichier | Nature | Détail |
|---|---|---|
| `backend/Dockerfile.prod` | **Nouveau** | Image de production : gunicorn (2 workers × 4 threads, dimensionné pour les 512 Mo de l'offre gratuite Render), écoute sur `$PORT`, migrations + `collectstatic` au démarrage |
| `render.yaml` | **Nouveau** | Blueprint Render : base PostgreSQL + service web, variables d'environnement déclarées, aucun secret versionné |
| `frontend/vercel.json` | **Nouveau** | Routage SPA + en-têtes de sécurité |
| `backend/api/views/sante.py` | **Nouveau** | Sonde `/api/health/` |
| `.env.prod.example` | Modifié | Section stockage objet documentée (exemple Cloudflare R2) |
| `frontend/dist/index.html` | Retiré du suivi git | Artefact de build versionné par erreur (fichier conservé sur le disque) |

### 2.2 Corrections nécessaires au déploiement

**a. Fichiers médias inaccessibles hors développement** — `backend/sermon_platform/urls.py`

Le helper `static()` de Django renvoie une liste vide dès que `DEBUG=False`.
En local ce n'était pas visible : nginx servait les médias via un volume
partagé. Sur Render, sans serveur web dédié devant Django, **toutes les images,
audios et pièces jointes auraient renvoyé 404** — soit 11 champs d'upload
(avatars, logos, couvertures, audios, vidéos, documents, carrousel).

Corrigé par un routage explicite actif uniquement quand `USE_S3=False`.

**b. Boucle de redémarrages sur la sonde de santé** — `backend/sermon_platform/settings.py`

Render interroge la sonde en HTTP interne, sans en-tête `X-Forwarded-Proto`.
Avec `SECURE_SSL_REDIRECT=True`, elle aurait reçu une redirection **301**,
interprétée comme un échec, provoquant un redémarrage permanent du service.

Corrigé par `SECURE_REDIRECT_EXEMPT = [r'^api/health/$']` — la redirection HTTPS
reste appliquée partout ailleurs.

**c. `runserver` en production** — remplacé par gunicorn (voir `Dockerfile.prod`).

**d. URL d'API sans valeur de repli** — `frontend/src/services/api.js`

`baseURL: import.meta.env.VITE_API_URL` valait `undefined` si la variable
manquait ; axios repliait alors sur l'origine du site et chaque appel partait
vers le frontend, en 404. Repli ajouté vers `/api`.

### 2.3 Vérifications effectuées

| Contrôle | Résultat |
|---|---|
| `manage.py check --deploy` (DEBUG=False, clé valide) | **0 avertissement** |
| `/api/health/` en HTTP interne sans `X-Forwarded-Proto` | **200** (pas de redirection) |
| `/api/predications/` en HTTP | **301** vers HTTPS (protection maintenue) |
| `/media/...` avec `DEBUG=False`, `USE_S3=False` | **200** (fichier servi) |
| Traversée de répertoire `/media/../../etc/passwd` | **400** bloqué par `safe_join` |
| Suite de tests frontend | **21 tests passent** |
| Application en navigateur | Fonctionnelle |

### 2.4 Travaux fonctionnels de la même session (non liés au déploiement)

Ces modifications sont également non commitées :

- **Composant `DataTable` généralisé** à tous les tableaux de l'application
  (Administration, Documents, Vidéos, espace pasteur). Ancien composant `Table.jsx`
  supprimé, devenu inutilisé. Variante `admin` (en-tête vert sauge) / `site`
  (en-tête bleu marine) pour respecter les deux chartes.
- **Modale d'ajout/modification de document** (`DocumentModal.jsx` / `.css`) dans
  l'espace pasteur, en remplacement du formulaire latéral permanent.
- **Modification d'une vidéo en modale** au lieu d'une navigation vers l'onglet
  Publier.
- **Alerte de modération** sur le tableau de bord admin : la donnée
  `signalements_par_statut` était calculée par l'API mais jamais affichée.
- **Corrections de couleurs codées en dur** illisibles en thème sombre
  (cartes KPI admin et pasteur, modération des commentaires, notifications).

---

## 3. Comptes et accès

### 3.1 Comptes créés pendant les tests — **tous supprimés**

Des comptes jetables ont été créés pour valider les développements, puis
systématiquement supprimés après vérification. **Aucun ne subsiste en base** et
aucun n'a jamais été accessible depuis l'extérieur (base locale Docker).

| Compte | Rôle | Statut |
|---|---|---|
| `qa_admin_dash`, `qa_admin_dash2`, `qa_admin_dt` | Administrateur | Supprimé ✓ |
| `qa_pasteur_dt`, `qa_pasteur_ov`, `qa_pasteur_ov2` | Pasteur | Supprimé ✓ |
| `qa_pasteur_com`, `qa_pasteur_doc`, `qa_pasteur_editmodal` | Pasteur | Supprimé ✓ |
| `qa_pasteur_addcheck`, `qa_commentateur` | Pasteur / Fidèle | Supprimé ✓ |

Données de test associées (prédications, documents, commentaires, signalements,
médias de carrousel, catégorie de test) : également supprimées.

**Vérification :** `User.objects.filter(username__startswith='qa_').count()` → `0`

### 3.2 Comptes actuellement en base (les vôtres, antérieurs)

| # | Identifiant | Rôle |
|---|---|---|
| 1 | `victorien` | Superutilisateur |
| 3 | `victo` | Superutilisateur |
| 4 | `PRUNELLE` | Superutilisateur |
| 5 | `kouakou` | Pasteur |
| 6 | `Brahnam` | Pasteur |
| 7 | `Coleman` | Pasteur |
| 8 | `Magnan` | Pasteur |

> **Base locale uniquement.** Ces comptes ne seront pas transférés vers Render :
> la base de production démarre vide. Il faudra y créer un superutilisateur.

### 3.3 Accès à créer pour la production

Aucun mot de passe ne doit figurer dans ce document ni dans le dépôt.
Les secrets se saisissent exclusivement dans les tableaux de bord des services.

| Service | À créer | Où stocker le secret |
|---|---|---|
| Render | Compte + base PostgreSQL + service web | Dashboard Render > Environment |
| Vercel | Compte + projet lié au dépôt | Dashboard Vercel > Environment Variables |
| Cloudflare R2 | Compte + bucket + token API | Reporté dans Render uniquement |
| Django admin | Superutilisateur (`createsuperuser`) | Gestionnaire de mots de passe |

**Génération de la `SECRET_KEY`** (ne jamais réutiliser celle de développement,
elle signe aussi les jetons de connexion JWT) :

```bash
docker compose exec backend python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Le démarrage échoue volontairement si elle fait moins de 32 caractères.

---

## 4. Procédure de déploiement

> **Ordre conseillé :** mettre d'abord le site en ligne avec Render + Vercel
> (étapes 1 à 4), puis ajouter le stockage objet (étape 6). Deux services à
> créer au lieu de trois, et un site visible plus vite.
>
> `render.yaml` livre donc `USE_S3=False` : les fichiers téléversés
> fonctionnent, mais ne survivent pas à un redéploiement tant que l'étape 6
> n'est pas faite.

### Étape 1 — Render

1. Dashboard > **New** > **Blueprint** > sélectionner le dépôt
2. Render lit `render.yaml` et crée la base + le service web
3. Renseigner les variables marquées `sync: false` :

**Obligatoire dès le premier déploiement :**

| Variable | Valeur |
|---|---|
| `SECRET_KEY` | Clé générée (≥ 32 caractères) |
| `ALLOWED_HOSTS` | Domaine Render du backend, sans `https://` |

**Facultatif au premier déploiement** (peut rester vide) : `AWS_*` (étape 6),
`EMAIL_*` (§6), `GOOGLE_API_KEY`, et les trois variables de l'étape 3.

> Si Render refuse `runtime: docker`, remplacer par `env: docker` — la clé
> diffère selon la version du schéma.

### Étape 2 — Vercel

1. Importer le dépôt
2. **Root Directory = `frontend`**
3. Variable `VITE_API_URL` = `https://<backend>.onrender.com/api`

### Étape 3 — Boucler la configuration croisée

Une fois l'URL Vercel connue, compléter côté Render :

| Variable | Valeur |
|---|---|
| `CORS_ALLOWED_ORIGINS` | `https://<projet>.vercel.app` |
| `CSRF_TRUSTED_ORIGINS` | `https://<projet>.vercel.app` |
| `FRONTEND_URL` | `https://<projet>.vercel.app` |

### Étape 4 — Compte administrateur

Via le Shell Render :

```bash
python manage.py createsuperuser
```

À ce stade le site est en ligne et utilisable.

### Étape 5 — Vérification

Voir la liste de contrôle du §7.

### Étape 6 — Stockage objet (à faire ensuite)

Sans cette étape, les fichiers téléversés disparaissent à chaque
redéploiement ou réveil du service : le disque de Render est éphémère.

1. Créer un bucket Cloudflare R2 (ex. `eglise-medias`)
2. Générer un token API avec les droits **Object Read & Write**
3. Activer un domaine public sur le bucket
4. Renseigner dans Render, puis redéployer :

| Variable | Valeur |
|---|---|
| `USE_S3` | `True` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Token R2 |
| `AWS_STORAGE_BUCKET_NAME` | Nom du bucket |
| `AWS_S3_ENDPOINT_URL` | `https://<account_id>.r2.cloudflarestorage.com` |
| `AWS_S3_CUSTOM_DOMAIN` | Domaine public du bucket |

> Les fichiers téléversés avant cette étape ne sont pas repris
> automatiquement : les remettre en ligne après la bascule.

---

## 5. Sécurité

### Déjà en place

- `SECRET_KEY` obligatoire hors `DEBUG`, ≥ 32 caractères, démarrage bloqué sinon
- HSTS (1 an, sous-domaines inclus), redirection HTTPS, cookies `Secure`
- `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: same-origin`
- `SECURE_PROXY_SSL_HEADER` — indispensable derrière le proxy TLS de Render
- CORS en **liste blanche stricte** (pas de `CORS_ALLOW_ALL_ORIGINS`)
- Limitation de débit : connexion 30/min, inscription 20/min, mot de passe 10/min
- Aucun secret dans le dépôt, ni dans l'historique git (vérifié)
- En-têtes de sécurité côté Vercel (`vercel.json`)

### Points de vigilance

| Point | Recommandation |
|---|---|
| `/admin/` exposé publiquement | Mot de passe fort obligatoire ; envisager une restriction d'accès |
| `DEBUG` vaut `True` par défaut | Explicitement forcé à `False` dans `render.yaml` — ne pas retirer |
| `ALLOWED_HOSTS` vaut `*` par défaut | Toujours renseigner explicitement |
| Politique CSP absente | Non ajoutée : nécessite la liste exacte des domaines (YouTube, Google Fonts, R2) une fois connus |
| Rotation des jetons JWT désactivée | `ROTATE_REFRESH_TOKENS=False` — acceptable en test, à revoir en production réelle |

---

## 6. Limites de l'offre gratuite

| Limite | Conséquence |
|---|---|
| Le service Render s'endort après ~15 min d'inactivité | Premier accès ensuite très lent (30–60 s) |
| Base PostgreSQL gratuite à durée limitée | À vérifier lors de la création — les conditions de Render évoluent |
| URLs de preview Vercel | Non couvertes par la liste blanche CORS ; seul le domaine de production fonctionne |
| SMTP non configuré | Les emails de vérification et de réinitialisation partent dans les logs : les liens sont perdus. Prévoir un SMTP réel (Brevo, Resend, Mailgun proposent une offre gratuite) |

---

## 7. Vérification post-déploiement

À effectuer une fois les services en ligne :

- [ ] En-têtes de sécurité présents sur les réponses du backend
- [ ] Aucune fuite d'information en cas d'erreur (`DEBUG=False` effectif)
- [ ] CORS : le frontend Vercel joint le backend Render
- [ ] Upload puis relecture d'un média (validation du stockage R2)
- [ ] Persistance des médias après un redéploiement
- [ ] Parcours complet : inscription, connexion, publication
- [ ] Sonde `/api/health/` répond 200 sans redémarrages en boucle
