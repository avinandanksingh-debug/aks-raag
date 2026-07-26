#!/bin/bash
# Quick-start: run this in Termux after initial setup
# to restart the Aks Raag backend server.
cd ~/aks-raag/backend
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Aks Raag Backend — Starting...                      ║"
echo "║  Server: http://127.0.0.1:3001                       ║"
echo "║  Press Ctrl+C to stop                                ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
# Pull latest changes before starting
git pull origin master 2>/dev/null || true
node server.js
