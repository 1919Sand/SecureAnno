#!/usr/bin/env bash

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$APP_DIR"

echo "[1/5] Installing production dependencies..."
if [ -f package-lock.json ]; then
    npm ci --omit=dev
else
    npm install --omit=dev
fi

echo "[2/5] Preparing runtime folders..."
mkdir -p data logs
touch data/leads.jsonl

echo "[3/5] Checking environment file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env from .env.example. Edit it before production traffic if DATABASE_URL is needed."
fi

echo "[4/5] Starting SecureAnno with PM2..."
if ! command -v pm2 >/dev/null 2>&1; then
    echo "PM2 is not installed. Run: sudo npm install -g pm2"
    exit 1
fi

pm2 startOrReload ecosystem.config.cjs --env production

echo "[5/5] Saving PM2 process list..."
pm2 save

echo ""
echo "SecureAnno is running with PM2."
echo "Useful commands:"
echo "  pm2 status"
echo "  pm2 logs secureanno"
echo "  pm2 restart secureanno"
