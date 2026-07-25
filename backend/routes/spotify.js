const express = require('express');
const axios = require('axios');
const router = express.Router();

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Middleware to log requests
router.use((req, res, next) => {
    console.log(`[Spotify API Proxy] ${req.method} ${req.url}`);
    next();
});

// Middleware to extract access token from cookies
const requireAuth = (req, res, next) => {
    const token = req.cookies.spotify_access_token;
    if (!token) {
        console.error(`[Spotify API Proxy] Unauthorized request to ${req.url} (No token cookie)`);
        return res.status(401).json({ error: 'Unauthorized: No access token' });
    }
    req.token = token;
    next();
};

router.use(requireAuth);

router.get('/me', async (req, res) => {
    try {
        const response = await axios.get(`${SPOTIFY_API_BASE}/me`, {
            headers: { 'Authorization': `Bearer ${req.token}` }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching profile:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch profile' });
    }
});

router.get('/playlists', async (req, res) => {
    try {
        const response = await axios.get(`${SPOTIFY_API_BASE}/me/playlists`, {
            headers: { 'Authorization': `Bearer ${req.token}` }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching playlists:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch playlists' });
    }
});

router.get('/tracks', async (req, res) => {
    try {
        const response = await axios.get(`${SPOTIFY_API_BASE}/me/tracks`, {
            headers: { 'Authorization': `Bearer ${req.token}` }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching liked tracks:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch liked tracks' });
    }
});

router.get('/playlists/:playlist_id/tracks', async (req, res) => {
    try {
        const response = await axios.get(`${SPOTIFY_API_BASE}/playlists/${req.params.playlist_id}/items`, {
            headers: { 'Authorization': `Bearer ${req.token}` }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch playlist tracks' });
    }
});

router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ error: 'Missing query parameter q' });
        
        // Spotify Feb 2026 API update restricts limit to max 10
        const response = await axios.get(`${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
            headers: { 'Authorization': `Bearer ${req.token}` }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching search results:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to search' });
    }
});

module.exports = router;
