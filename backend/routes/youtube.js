const express = require('express');
const yts = require('yt-search');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Load pre-built instant 20 featured playlists
const FEATURED_FILE = path.join(__dirname, '../data/featured_playlists.json');
let cachedFeatured = [];

try {
    if (fs.existsSync(FEATURED_FILE)) {
        cachedFeatured = JSON.parse(fs.readFileSync(FEATURED_FILE, 'utf8'));
        console.log(`[YouTube API] Loaded ${cachedFeatured.length} instant featured playlists from disk.`);
    }
} catch (e) {
    console.error("[YouTube API] Error loading featured_playlists.json:", e);
}

router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Missing query parameter q' });
        }

        console.log(`[YouTube Search] Searching for: ${query}`);
        const searchResults = await yts(query);
        const videos = searchResults.videos ? searchResults.videos.slice(0, 20) : [];

        const mappedTracks = videos.map(video => ({
            id: video.videoId,
            name: video.title,
            youtube_url: video.url,
            duration_ms: (video.seconds || 0) * 1000,
            artists: [{ name: video.author?.name || 'YouTube' }],
            album: {
                name: 'YouTube',
                images: [{ url: video.thumbnail || '' }]
            }
        }));

        res.json({ results: mappedTracks });
    } catch (error) {
        console.error('Error fetching YouTube search results:', error);
        res.status(500).json({ error: 'Failed to search YouTube' });
    }
});

// Instant 1ms response for 20 Featured Playlists
router.get('/featured-playlists', (req, res) => {
    res.json({ playlists: cachedFeatured });
});

router.get('/recommend', async (req, res) => {
    try {
        const { seed_artist } = req.query;
        if (!seed_artist) return res.status(400).json({ error: 'Missing seed_artist' });

        const searchResults = await yts(`${seed_artist} mix`);
        const videos = searchResults.videos ? searchResults.videos.slice(0, 10) : [];

        const tracks = videos.map(v => ({
            id: v.videoId,
            name: v.title,
            youtube_url: v.url,
            duration_ms: (v.seconds || 0) * 1000,
            artists: [{ name: v.author?.name || 'YouTube' }],
            album: { images: [{ url: v.thumbnail || '' }] }
        }));

        res.json({ tracks });
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
});

module.exports = router;
