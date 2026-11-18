#!/bin/sh
# Spuštění API v kontejneru: nejprve aplikuje migrace, pak nastartuje server.
set -eu

echo "[teamflow] Aplikuji databázové migrace…"
node /app/node_modules/prisma/build/index.js migrate deploy

echo "[teamflow] Spouštím API…"
exec node dist/server.js
