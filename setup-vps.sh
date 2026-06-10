#!/usr/bin/env bash

set -euo pipefail

APP_PATH="${1:-$(pwd)}"
NODE_VERSION="${NODE_VERSION:-20}"
APP_USER="${SUDO_USER:-$(whoami)}"

log() { printf '[INFO] %s\n' "$1"; }
ok() { printf '[OK] %s\n' "$1"; }
warn() { printf '[WARN] %s\n' "$1"; }

echo "SecureAnno VPS setup"
echo "App path: $APP_PATH"
echo ""

if ! command -v sudo >/dev/null 2>&1; then
    warn "sudo not found. Run this script as root or install sudo."
fi

log "Updating apt package index..."
sudo apt-get update

log "Installing base packages..."
sudo apt-get install -y curl ca-certificates git unzip nginx

if ! command -v node >/dev/null 2>&1; then
    log "Installing Node.js $NODE_VERSION..."
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | sudo -E bash -
    sudo apt-get install -y nodejs
else
    ok "Node.js already installed: $(node --version)"
fi

if ! command -v pm2 >/dev/null 2>&1; then
    log "Installing PM2..."
    sudo npm install -g pm2
else
    ok "PM2 already installed: $(pm2 --version)"
fi

cd "$APP_PATH"

log "Installing SecureAnno dependencies..."
if [ -f package-lock.json ]; then
    npm ci --omit=dev
else
    npm install --omit=dev
fi

log "Preparing runtime folders..."
mkdir -p data logs
touch data/leads.jsonl

if [ ! -f .env ]; then
    log "Creating .env from .env.example..."
    cp .env.example .env
    warn "Edit .env before production traffic if you need PostgreSQL lead storage."
fi

log "Starting app with PM2..."
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save

echo ""
ok "SecureAnno setup complete."
echo ""
echo "Run this once to make PM2 restart after VPS reboot:"
echo "  sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u $APP_USER --hp /home/$APP_USER"
echo "  pm2 save"
echo ""
echo "Useful commands:"
echo "  pm2 status"
echo "  pm2 logs secureanno"
echo "  pm2 restart secureanno"
echo ""
echo "Nginx config template:"
echo "  deploy/nginx.secureanno.conf.example"
