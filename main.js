const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

// Spoof a real Chrome UA so Spotify does not block OAuth
app.userAgentFallback =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

let mainWindow = null;

// --- File Logger ------------------------------------------------------------
function logToFile(msg) {
  try {
    const logPath = path.join(app.getPath("userData"), "aks-raag-debug.log");
    fs.appendFileSync(logPath, new Date().toISOString() + ": " + msg + "\n");
  } catch (_) {}
}

// --- Backend Startup ---------------------------------------------------------
function startBackend() {
  try {
    logToFile("Starting backend...");

    // In the packaged app the frontend is served by Express, not the Vite dev server
    process.env.FRONTEND_URL = "http://127.0.0.1:3001";

    // Redirect file-cache writes out of the read-only asar archive
    process.env.AKS_RAAG_CACHE = path.join(app.getPath("userData"), "cache");

    require(path.join(__dirname, "backend", "server.js"));
    logToFile("Backend server started.");
  } catch (err) {
    logToFile("Failed to start backend: " + err.stack);
  }
}

// --- Browser Window ----------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Aks Raag",
    autoHideMenuBar: true,
    backgroundColor: "#121212",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL("http://127.0.0.1:3001");
  logToFile("Window created, loading http://127.0.0.1:3001");

  mainWindow.webContents.on("will-navigate", (event, url) => {
    // If Electron is about to navigate to Spotify accounts, intercept and
    // open in the system browser instead
    if (url.includes("accounts.spotify.com")) {
      event.preventDefault();
      logToFile("Intercepted Spotify redirect ? opening in system browser: " + url);
      shell.openExternal(url);
    }
  });

  // When the OAuth callback brings us back to localhost, just reload the app
  mainWindow.webContents.on("did-navigate", (event, url) => {
    if (url.startsWith("http://127.0.0.1:3001") && !url.includes("/api/")) {
      logToFile("Back at app URL: " + url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// --- IPC: open-external (called by renderer via preload) ---------------------
ipcMain.handle("open-external", (_event, url) => {
  logToFile("Opening external URL: " + url);
  shell.openExternal(url);
});

// --- App Lifecycle ------------------------------------------------------------
app.whenReady().then(() => {
  startBackend();

  // Give the Express server ~1.5 s to bind before loading the window
  setTimeout(createWindow, 1500);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
