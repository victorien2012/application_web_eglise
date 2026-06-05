# Scripts de synchronisation YouTube

Synchronisation automatique des vidéos d'une chaîne YouTube vers les prédications
(commande `import_youtube_videos`). Les scripts sont **idempotents** : ils ne créent
jamais de doublon (déduplication via `youtube_id`).

| Script | Environnement | Compose utilisé |
|--------|---------------|-----------------|
| `sync_youtube.sh`  | Production / Linux | `docker-compose.prod.yml` (via `exec`) |
| `sync_youtube.ps1` | Développement / Windows | `docker-compose.yml` (via `run --rm`) |

Le `CHANNEL_ID` par défaut est intégré dans chaque script ; on peut le surcharger
en argument. Le pasteur cible est **auto-détecté** via son champ `lien_youtube`.

Les logs sont écrits dans `logs/sync_youtube.log` (dossier ignoré par git).

Prérequis : `GOOGLE_API_KEY` renseignée dans `.env` (dev) ou `.env.prod` (prod).

---

## Production — cron (Linux)

Rendre le script exécutable puis l'ajouter à la crontab :

```bash
chmod +x scripts/sync_youtube.sh

crontab -e
```

Ajouter une ligne — exemple, tous les jours à 03h15 :

```cron
15 3 * * * /chemin/absolu/vers/projet/scripts/sync_youtube.sh
```

Test manuel :

```bash
./scripts/sync_youtube.sh
# ou pour une autre chaîne :
./scripts/sync_youtube.sh UCxxxxxxxxxxxxxxxxxxxxxx
```

---

## Développement — Planificateur de tâches (Windows)

Créer une tâche quotidienne (à 03h15) qui lance le script PowerShell :

```powershell
schtasks /Create /SC DAILY /ST 03:15 /TN "SyncYouTube" /TR "powershell -ExecutionPolicy Bypass -File `"D:\PROJET WEB EGLISE\scripts\sync_youtube.ps1`""
```

Test manuel :

```powershell
powershell -ExecutionPolicy Bypass -File scripts\sync_youtube.ps1
```

Supprimer la tâche :

```powershell
schtasks /Delete /TN "SyncYouTube" /F
```

---

## Notes

- En production, le conteneur `backend` doit être démarré (`docker compose -f docker-compose.prod.yml up -d`) car le script utilise `exec`.
- Pour ne synchroniser que les nouvelles vidéos d'un gros canal, la déduplication s'en charge automatiquement : seules les vidéos absentes sont créées.
- Pour publier en brouillon plutôt que public, ajouter `--non-publiee` dans le script.
