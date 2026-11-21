#!/usr/bin/env bash
# Runs once when the Codespace is created: config, packages, database, sample data, build.
set -euo pipefail

if [ ! -f .env ]; then
  PASSWORD="srt-$(openssl rand -hex 4)"
  cat > .env <<EOF
APP_ENV=test
SITE_URL=https://${CODESPACE_NAME:-localhost}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}
DATABASE_URL=postgresql://srt:srt@localhost:5432/srt_dev?schema=public
AUTH_SECRET=$(openssl rand -base64 48 | tr -d '\n')
UPLOAD_DIR=./uploads
ADMIN_EMAIL=owner@shreeramtrading.in
ADMIN_PASSWORD=$PASSWORD
SERVER_ACTIONS_ALLOWED_ORIGINS=*.app.github.dev,localhost:3000
EOF
fi

echo "==> Installing packages"
npm install --no-audit --no-fund

echo "==> Waiting for the database"
for i in $(seq 1 30); do (echo > /dev/tcp/localhost/5432) 2>/dev/null && break; sleep 2; done

echo "==> Creating tables"
if [ -d prisma/migrations ]; then npx prisma migrate deploy; else npx prisma db push; fi

echo "==> Adding sample products, the owner login and 30 days of sample traffic"
set -a; . ./.env; set +a
SEED_DEMO_ANALYTICS=1 npm run db:seed

echo "==> Building the shop (takes 1–2 minutes)"
npm run build
