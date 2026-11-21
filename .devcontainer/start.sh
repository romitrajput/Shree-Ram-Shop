#!/usr/bin/env bash
# Runs every time the Codespace starts: launches the shop and prints the link to share.
set -uo pipefail

set -a; . ./.env; set +a
pkill -f "next start" 2>/dev/null || true
nohup setsid npm start > /tmp/shop.log 2>&1 &

# Make the link openable by the owner without a GitHub login.
gh codespace ports visibility 3000:public -c "$CODESPACE_NAME" >/dev/null 2>&1 \
  || echo "Could not make the port public automatically: Ports tab → right-click 3000 → Port visibility → Public"

URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
cat <<EOF

=====================================================================
 Test shop:    $URL
 Owner admin:  $URL/admin
 Login:        $ADMIN_EMAIL  /  $ADMIN_PASSWORD
 (Reprint any time with: bash .devcontainer/start.sh)
=====================================================================
EOF
