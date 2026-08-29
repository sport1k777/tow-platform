#!/bin/sh
set -eu

echo "Running database migrations..."
attempt=1
max_attempts=15
until node dist/db/migrate.js; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Migrations failed after ${max_attempts} attempts"
    exit 1
  fi
  attempt=$((attempt + 1))
  echo "Database not ready for migrations yet, retrying (${attempt}/${max_attempts})..."
  sleep 2
done

if [ "${RUN_DB_SEED:-true}" = "true" ]; then
  echo "Seeding staging fixtures..."
  node dist/db/seed.js
fi

echo "Starting API..."
exec node dist/main.js
