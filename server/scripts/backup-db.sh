#!/usr/bin/env sh
# One-off logical backup of the app database. Run this BEFORE any deploy that
# carries a new migration — migrations are forward-only, so this dump is the
# rollback path for the data layer.
#
#   DATABASE_URL=postgres://user:pass@host:5432/db  ./scripts/backup-db.sh [outdir]
#
# Restore:
#   psql "$DATABASE_URL" < pharmaflow-YYYYMMDD-HHMMSS.sql
set -eu

: "${DATABASE_URL:?set DATABASE_URL}"
OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
FILE="$OUT_DIR/pharmaflow-$STAMP.sql"

echo "dumping -> $FILE"
pg_dump --no-owner --no-privileges --clean --if-exists "$DATABASE_URL" > "$FILE"
gzip -f "$FILE"
echo "done: $FILE.gz ($(du -h "$FILE.gz" | cut -f1))"

# keep the 14 most recent
ls -1t "$OUT_DIR"/pharmaflow-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
