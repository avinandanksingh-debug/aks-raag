const express = require('express');
const yts = require('yt-search');
const router = express.Router();

router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Missing query parameter q' });
        }

        console.log(`[YouTube API Proxy] Searching for: ${query}`);
        
        const searchResults = await yts(query);
        const videos = searchResults.videos ? searchResults.videos.slice(0, 20) : [];

        const mappedTracks = videos.map(video => {
            return {
                id: video.videoId,
                name: video.title,
                youtube_url: video.url,
                duration_ms: (video.seconds || 0) * 1000,
                artists: [{ name: video.author?.name || 'YouTube' }],
                album: {
                    name: 'YouTube Search',
                    images: [{ url: video.thumbnail || '' }]
                }
            };
        });

        res.json({ results: mappedTracks });
    } catch (error) {
        console.error('Error fetching YouTube search results:', error);
        res.status(500).json({ error: 'Failed to search YouTube' });
    }
});

let featuredPlaylistsCache = null;
let featuredPlaylistsCacheTime = 0;

router.get('/featured-playlists', async (req, res) => {
    try {
        if (featuredPlaylistsCache && Date.now() - featuredPlaylistsCacheTime < 1000 * 60 * 60) {
            return res.json({ playlists: featuredPlaylistsCache });
        }

        const queries = [
            { id: 'yt-1', name: 'Global Top 50', query: 'Global Top 50 Songs 2026' },
            { id: 'yt-2', name: 'Viral Pop Hits', query: 'Viral Pop Hits 2026' },
            { id: 'yt-3', name: 'Bollywood Top 50', query: 'Bollywood Top 50 Hindi Songs' },
            { id: 'yt-4', name: 'Lofi Chill Beats', query: 'Lofi Chill Beats aesthetic' },
            { id: 'yt-5', name: 'Top 100 EDM', query: 'Top 100 EDM drops' },
            { id: 'yt-6', name: 'Best of 90s', query: 'Best of 90s pop songs' },
            { id: 'yt-7', name: 'Rap Caviar', query: 'Rap Caviar top hits' },
            { id: 'yt-8', name: 'Acoustic Covers', query: 'Best acoustic covers' },
            { id: 'yt-9', name: 'Workout Motivation', query: 'Workout music mix' },
            { id: 'yt-10', name: 'K-Pop Hits', query: 'K-Pop top songs 2026' },
            { id: 'yt-11', name: 'Latin Hits', query: 'Latin hits top Reggaeton' },
            { id: 'yt-12', name: 'Indie Pop', query: 'Indie pop top hits' },
            { id: 'yt-13', name: 'Classical Essentials', query: 'Classical music essentials' },
            { id: 'yt-14', name: 'R&B Classics', query: 'Best R&B classics' },
            { id: 'yt-15', name: 'Bollywood Romantic', query: 'Bollywood romantic hits' },
            { id: 'yt-16', name: 'Gaming Music', query: 'Gaming music EDM dubstep' },
            { id: 'yt-17', name: 'Focus Music', query: 'Deep focus study music' },
            { id: 'yt-18', name: 'Country Hits', query: 'Country top hits 2026' },
            { id: 'yt-19', name: 'Best of 2000s', query: '2000s throwback hits' },
            { id: 'yt-20', name: 'Viral TikTok', query: 'Viral TikTok songs' }
        ];

        const playlists = [];
        for (const q of queries) {
            try {
                const results = await yts(q.query);
                const videos = results.videos ? results.videos.slice(0, 10) : [];
                if (videos.length > 0) {
                    const tracks = videos.map(v => ({
                        id: v.videoId,
                        name: v.title,
                        youtube_url: v.url,
                        duration_ms: (v.seconds || 0) * 1000,
                        artists: [{ name: v.author?.name || 'YouTube' }],
                        album: { images: [{ url: v.thumbnail || '' }] }
                    }));
                    
                    playlists.push({
                        id: q.id,
                        name: q.name,
                        description: 'Featured Music Collection',
                        images: [{ url: tracks[0]?.album.images[0].url || '' }],
                        tracks: { items: tracks.map(t => ({ track: t })) }
                    });
                }
            } catch (e) {
                console.error(`Error fetching playlist ${q.name}:`, e.message);
            }
        }

        featuredPlaylistsCache = playlists;
        featuredPlaylistsCacheTime = Date.now();
        res.json({ playlists });
    } catch (error) {
        console.error('Error generating featured playlists:', error);
        res.status(500).json({ error: 'Failed to fetch featured playlists' });
    }
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
