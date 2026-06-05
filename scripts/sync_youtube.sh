#!/usr/bin/env bash
#
# Synchronisation planifiee des videos YouTube vers les predications.
# A executer via cron sur le serveur de PRODUCTION.
#
#   Usage : ./scripts/sync_youtube.sh [CHANNEL_ID]
#   (CHANNEL_ID optionnel — par defaut la chaine deja configuree.)
#
# Exemple de tache cron (tous les jours a 03h15) :
#   15 3 * * * /chemin/vers/projet/scripts/sync_youtube.sh >> /chemin/vers/projet/logs/cron.log 2>&1
#
set -euo pipefail

CHANNEL_ID="${1:-UCiWst6pwIt2xSBdhpSuUOAQ}"

# Racine du projet (dossier parent de ce script), quel que soit le repertoire d'appel.
PROJET_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJET_DIR"

LOG_DIR="${PROJET_DIR}/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/sync_youtube.log"

horodatage() { date '+%Y-%m-%d %H:%M:%S'; }

echo "[$(horodatage)] === Demarrage synchro chaine ${CHANNEL_ID} ===" >> "$LOG_FILE"

# On execute dans le conteneur backend deja en cours d'execution (-T : pas de pseudo-TTY).
# Le pasteur est auto-detecte via son champ lien_youtube ; ajouter --pasteur <id> au besoin.
if docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T backend \
      python manage.py import_youtube_videos "$CHANNEL_ID" >> "$LOG_FILE" 2>&1; then
  echo "[$(horodatage)] === Synchro terminee avec succes ===" >> "$LOG_FILE"
else
  code=$?
  echo "[$(horodatage)] !!! Echec de la synchro (code ${code}) !!!" >> "$LOG_FILE"
  exit "$code"
fi
