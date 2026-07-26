#!/bin/bash
# ============================================================
# Aks Raag — Termux Backend Server Setup Script
# ============================================================
# This script installs and runs the Aks Raag backend server
# locally on your Android phone via Termux.
#
# PREREQUISITES:
#   1. Install Termux from F-Droid (NOT Google Play Store)
#      https://f-droid.org/en/packages/com.termux/
#   2. Open Termux and run:
#      curl -sL https://raw.githubusercontent.com/avinandanksingh-debug/aks-raag/master/termux-setup.sh | bash
#
# WHAT THIS DOES:
#   - Installs Node.js 20 and git in Termux
#   - Clones the Aks Raag backend
#   - Installs npm dependencies
#   - Starts the server on http://127.0.0.1:3001
# ============================================================

set -e

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         Aks Raag — Local Backend Setup               ║"
echo "║         Running on Termux (Android)                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Step 1: Update packages and install Node.js + git
echo "[1/5] Installing Node.js and git..."
pkg update -y
pkg install -y nodejs-lts git

echo ""
echo "[2/5] Node.js version: $(node -v)"
echo "       npm version: $(npm -v)"

# Step 2: Clone the repository (or pull latest if already cloned)
AKS_DIR="$HOME/aks-raag"

if [ -d "$AKS_DIR" ]; then
    echo ""
    echo "[3/5] Updating existing Aks Raag installation..."
    cd "$AKS_DIR"
    git pull origin master 2>/dev/null || true
else
    echo ""
    echo "[3/5] Cloning Aks Raag repository..."
    git clone https://github.com/avinandanksingh-debug/aks-raag.git "$AKS_DIR"
    cd "$AKS_DIR"
fi

# Step 3: Install backend dependencies
echo ""
echo "[4/5] Installing backend dependencies..."
cd "$AKS_DIR/backend"
npm install --production 2>&1 | tail -5

# Step 4: Create .env if it doesn't exist
if [ ! -f "$AKS_DIR/backend/.env" ]; then
    cat > "$AKS_DIR/backend/.env" << 'EOF'
PORT=3001
SPOTIFY_CLIENT_ID=afe50167e9a44d7fb99dfe22a75cbe4a
SPOTIFY_CLIENT_SECRET=baaff70d77284be5a44002397e56c447
SPOTIFY_REDIRECT_URI=https://aks-raag.onrender.com/api/auth/callback
EOF
    echo "   Created .env with default config"
fi

# Step 5: Start the server
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  [5/5] Starting Aks Raag Backend Server...           ║"
echo "║                                                      ║"
echo "║  Server URL: http://127.0.0.1:3001                   ║"
echo "║  Health:     http://127.0.0.1:3001/health             ║"
echo "║                                                      ║"
echo "║  Press Ctrl+C to stop the server                     ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

node server.js
