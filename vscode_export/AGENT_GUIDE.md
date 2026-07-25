# Aks Raag - VS Code Agent Handover Guide

This guide is designed for AI coding agents working on **Aks Raag** within VS Code.

---

## 🎯 System Summary
- **App Name**: Aks Raag
- **Tech Stack**: React 19, Vite, Node.js, Express, Electron, Capacitor (Android)
- **Primary Auth Mode**: Express Session & Spotify OAuth 2.0 PKCE / Authorization Code Flow.
- **Backend Port**: `3001` (`http://127.0.0.1:3001`)
- **Frontend Port**: `5173` (`http://localhost:5173`)

---

## 🛠 Key Files to Note

| Path | Purpose |
| :--- | :--- |
| `backend/server.js` | Express server entry point |
| `backend/routes/auth.js` | Spotify OAuth routes (`/url`, `/callback`, `/check-session`, `/me`) |
| `backend/routes/stream.js` | YouTube audio stream pipeline (`yt-dlp` / `play-dl` / `ffmpeg`) |
| `frontend/src/App.jsx` | Main React entry component & auth gate |
| `frontend/src/pages/Login.jsx` | Login page & auth trigger |
| `frontend/src/context/SpotifyContext.jsx` | Global state management for user, tracks, player |
| `frontend/src/components/Player.jsx` | Fixed audio player bar & HTML5 audio stream controller |

---

## ⚡ Quick Start Checklist for Agents
1. Verify `backend/.env` has valid Spotify credentials.
2. Run backend via `node backend/server.js`.
3. Run frontend via `npm run dev` in `frontend/`.
4. Check browser console & terminal output for clean session logs.
