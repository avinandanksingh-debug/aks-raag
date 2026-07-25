/**
 * server-android.js — Entry point when running on Render.com for Android clients.
 * Same as server.js but allows cross-origin requests from Capacitor (capacitor:// scheme)
 * and does NOT serve the frontend static files (the frontend is bundled in the APK).
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes    = require("./routes/auth");
const streamRoutes  = require("./routes/stream");
const spotifyRoutes = require("./routes/spotify");
const youtubeRoutes = require("./routes/youtube");

const app  = express();
const PORT = process.env.PORT || 10000;

app.use(cors({
  origin: true,   // Allow all origins — Android app uses its own scheme
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth",    authRoutes);
app.use("/api/stream",  streamRoutes);
app.use("/api/spotify", spotifyRoutes);
app.use("/api/youtube", youtubeRoutes);

app.get("/health", (_req, res) => res.status(200).send("OK"));

app.listen(PORT, () => {
  console.log(`[Aks Raag Cloud] Backend running on port ${PORT}`);
});
