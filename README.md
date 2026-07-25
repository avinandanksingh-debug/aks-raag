# Aks Raag - Music Streaming Application

A lightweight, ad-free alternative music streaming application built with React, Node.js/Express, Electron, and Spotify API / YouTube streaming engines.

---

## 📁 Project Architecture

- **`backend/`**: Express.js server (`http://127.0.0.1:3001`). Handles Spotify OAuth (`/api/auth`), Spotify API proxies (`/api/spotify`), YouTube search & audio streaming (`/api/stream`).
- **`frontend/`**: React + Vite SPA. Contains components (`MainContent`, `Sidebar`, `Player`), pages (`Login`), and state context (`SpotifyContext`). Also configured for Capacitor Android (`frontend/android`).
- **`.vscode/`**: Contains VS Code launch configurations and settings for seamless debugging.
- **`vscode_export/`**: Documentation and agent guidance for working in VS Code.

---

## 🚀 How to Run in Development (VS Code)

### 1. Start Backend Server
```powershell
cd backend
node server.js
```
> Server runs on `http://127.0.0.1:3001`

### 2. Start Frontend Dev Server
```powershell
cd frontend
npm run dev
```
> Frontend runs on `http://localhost:5173`

### 3. Run Electron App (Optional)
```powershell
npm start
```

---

## 🔑 Environment Variables
Ensure `backend/.env` contains your Spotify API credentials:
```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3001/api/auth/callback
PORT=3001
```
