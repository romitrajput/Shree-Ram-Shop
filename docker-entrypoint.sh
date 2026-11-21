#!/bin/sh
set -e

# Apply any new database migrations before starting. Migrations are additive and
# reviewed in the test environment first (see docs/RELEASE_PROCESS.md).
echo "[$APP_ENV] applying database migrations..."
prisma migrate deploy --schema=./prisma/schema.prisma

echo "[$APP_ENV] starting Shree Ram Trading (build ${APP_VERSION})"
exec node server.js
