#!/usr/bin/env bash
# Usage: ./backup-db.sh <prod|test>
# Dumps the database to ./backups and keeps the last 30 dumps. Run nightly from cron too:
#   15 2 * * * /opt/srt/backup-db.sh prod >> /opt/srt/backups/cron.log 2>&1
set -euo pipefail
cd "$(dirname "$0")"
ENVIRONMENT="${1:-prod}"
mkdir -p backups
FILE="backups/${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose exec -T "db-$ENVIRONMENT" pg_dump -U srt -d srt --no-owner | gzip > "$FILE"
echo "==> Backup written: $FILE ($(du -h "$FILE" | cut -f1))"
ls -1t backups/${ENVIRONMENT}-*.sql.gz | tail -n +31 | xargs -r rm --
# Uploaded photos are in the uploads-prod volume; copy them off-server weekly as well.
