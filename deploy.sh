#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"
export COMPOSE_FILE=docker-compose.prod.yml

git pull && docker compose down && docker compose up -d --build
