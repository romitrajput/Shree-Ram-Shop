#!/usr/bin/env bash
# Usage (on the server, from /opt/srt):  ./deploy.sh <test|prod> <image-tag>
# Called by GitHub Actions. Backs up production first, swaps the image, waits for
# the health check, and rolls back automatically if the new version is unhealthy.
set -euo pipefail
cd "$(dirname "$0")"

ENVIRONMENT="${1:?test or prod}"
TAG="${2:?image tag}"
case "$ENVIRONMENT" in
  test) VAR=TEST_TAG ;;
  prod) VAR=PROD_TAG ;;
  *) echo "environment must be test or prod"; exit 1 ;;
esac
SERVICE="app-$ENVIRONMENT"
PREVIOUS=$(grep "^$VAR=" .env | cut -d= -f2)

echo "==> Deploying $TAG to $ENVIRONMENT (currently $PREVIOUS)"
if [ "$ENVIRONMENT" = "prod" ]; then ./backup-db.sh prod; fi

set_tag() { sed -i "s|^$VAR=.*|$VAR=$1|" .env; }
set_tag "$TAG"
docker compose pull "$SERVICE"
docker compose up -d "$SERVICE"

echo "==> Waiting for health check"
for i in $(seq 1 40); do
  STATUS=$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q "$SERVICE")" 2>/dev/null || echo starting)
  if [ "$STATUS" = "healthy" ]; then
    echo "==> $ENVIRONMENT is healthy on $TAG"
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 5
done

echo "!! $TAG did not become healthy – rolling back to $PREVIOUS"
docker compose logs --tail=80 "$SERVICE" || true
set_tag "$PREVIOUS"
docker compose up -d "$SERVICE"
exit 1
