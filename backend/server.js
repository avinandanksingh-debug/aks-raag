const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes    = require("./routes/auth");
const streamRoutes  = require("./routes/stream");
const spotifyRoutes = require("./routes/spotify");
const youtubeRoutes = require("./routes/youtube");

const app  = express();
const PORT = process.env.PORT || 3001;

// Allow all origins with credentials for Electron, Mobile (Capacitor), and Web
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// API Routes
app.use("/api/auth",    authRoutes);
app.use("/api/stream",  streamRoutes);
app.use("/api/spotify", spotifyRoutes);
app.use("/api/youtube", youtubeRoutes);

// Health check endpoints
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.get("/api/health", (_req, res) => res.status(200).json({ status: "ok" }));

// Serve compiled React frontend if built
const FRONTEND_DIST = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
}

// Express 5 compatible catch-all middleware for non-API routes
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  if (fs.existsSync(FRONTEND_DIST)) {
    return res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  }
  return res.status(404).json({ error: "Not found" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Aks Raag] Backend running on port ${PORT}`);
});
