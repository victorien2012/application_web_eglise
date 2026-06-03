#!/usr/bin/env bash
# Restauration de la base PostgreSQL de production depuis une sauvegarde.
# Usage: ./scripts/restore_db.sh chemin/vers/sauvegarde.sql.gz
set -euo pipefail

FICHIER="${1:?Indiquez le fichier de sauvegarde (.sql.gz) a restaurer}"
COMPOSE_FILE="docker-compose.prod.yml"
SERVICE_DB="db"
DB_NAME="${POSTGRES_DB:-sermon_db}"
DB_USER="${POSTGRES_USER:-sermon_user}"

if [ ! -f "$FICHIER" ]; then
  echo "Fichier introuvable: $FICHIER" >&2
  exit 1
fi

echo "ATTENTION: cette operation remplace les donnees de $DB_NAME."
read -r -p "Confirmer la restauration depuis $FICHIER ? [y/N] " reponse
case "$reponse" in
  [yY]*) ;;
  *) echo "Annule."; exit 0;;
esac

echo "Restauration en cours ..."
gunzip -c "$FICHIER" | docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE_DB" \
  psql -U "$DB_USER" -d "$DB_NAME"

echo "Restauration terminee."
