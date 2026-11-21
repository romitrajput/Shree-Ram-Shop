#!/usr/bin/env bash
# Copy production data into the TEST database so new features are tested on real
# products and prices. Customer names, phones, emails and addresses are scrambled.
# Usage: ./refresh-test-data.sh
set -euo pipefail
cd "$(dirname "$0")"
read -r -p "This REPLACES all test data with a copy of production. Continue? [y/N] " ok
[ "$ok" = "y" ] || exit 1

docker compose exec -T db-prod pg_dump -U srt -d srt --no-owner --clean --if-exists \
  | docker compose exec -T db-test psql -q -U srt -d srt

docker compose exec -T db-test psql -U srt -d srt <<'SQL'
UPDATE "Order" SET name = 'Test Customer ' || left(id, 4), phone = '9' || lpad((abs(hashtext(id)) % 1000000000)::text, 9, '0'),
  email = NULL, "addressLine" = 'Test address', "paymentScreenshot" = NULL;
UPDATE "CorporateEnquiry" SET "contactName" = 'Test Contact', phone = '9000000000', email = NULL;
DELETE FROM "AdminUser";
DELETE FROM "Setting" WHERE key IN ('upiId', 'qrImageUrl');
SQL
echo "==> Test data refreshed. Recreate the test login: docker compose exec app-test tsx scripts/create-admin.ts"
