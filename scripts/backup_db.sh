#!/usr/bin/env bash
# Sauvegarde de la base PostgreSQL de production.
# Usage: ./scripts/backup_db.sh [repertoire_de_sortie]
set -euo pipefail

SORTIE_DIR="${1:-./backups}"
COMPOSE_FILE="docker-compose.prod.yml"
SERVICE_DB="db"
DB_NAME="${POSTGRES_DB:-sermon_db}"
DB_USER="${POSTGRES_USER:-sermon_user}"

mkdir -p "$SORTIE_DIR"
HORODATAGE="$(date +%Y%m%d_%H%M%S)"
FICHIER="$SORTIE_DIR/sermon_db_$HORODATAGE.sql.gz"

echo "Sauvegarde de la base $DB_NAME vers $FICHIER ..."
docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE_DB" \
  pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FICHIER"

echo "Sauvegarde terminee: $FICHIER"

# Retention: conserver les 14 dernieres sauvegardes.
ls -1t "$SORTIE_DIR"/sermon_db_*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm --
echo "Retention appliquee (14 sauvegardes conservees)."
