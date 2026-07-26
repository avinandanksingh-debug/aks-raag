const express = require('express');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

let _cacheDir = null;
function getCacheDir() {
    if (!_cacheDir) {
        _cacheDir = process.env.AKS_RAAG_CACHE || path.join(__dirname, '../cache');
        if (!fs.existsSync(_cacheDir)) {
            fs.mkdirSync(_cacheDir, { recursive: true });
        }
    }
    return _cacheDir;
}

// Get cached items
router.get('/cache', (req, res) => {
    try {
        const dir = getCacheDir();
        const files = fs.readdirSync(dir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        const cacheList = jsonFiles.map(file => {
            const hash = file.replace('.json', '');
            const metaPath = path.join(dir, file);
            const mp3Path = path.join(dir, `${hash}.mp3`);
            let metadata = {};
            try { metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) {}
            let size = 0;
            if (fs.existsSync(mp3Path)) size = fs.statSync(mp3Path).size;
            return { id: hash, ...metadata, sizeBytes: size };
        }).filter(item => item.sizeBytes > 0);
        res.json({ items: cacheList });
    } catch (error) {
        console.error('Error fetching cache list:', error);
        res.status(500).json({ error: 'Failed to fetch cache' });
    }
});

// Delete all cached items
router.delete('/cache', (req, res) => {
    try {
        const dir = getCacheDir();
        const files = fs.readdirSync(dir);
        files.forEach(f => {
            try { fs.unlinkSync(path.join(dir, f)); } catch (e) {}
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

router.get('/play', async (req, res) => {
    // CORS headers for Android WebView HTML5 Audio compatibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');

    const { track, artist, url } = req.query;

    if (!url && (!track || !artist)) {
        return res.status(400).json({ error: 'Missing url or track/artist parameters' });
    }

    try {
        let videoUrl = url;

        // Step 1: If no direct YouTube URL, search for the track (fast, ~2-3s)
        if (!videoUrl) {
            const searchQuery = `${track} ${artist} official audio`;
            console.log(`[Stream] Searching YouTube for: ${searchQuery}`);
            const searchResults = await yts(searchQuery).catch(() => null);
            const videos = searchResults ? searchResults.videos : [];
            if (!videos || videos.length === 0) {
                return res.status(404).json({ error: 'Track not found on YouTube' });
            }
            videoUrl = videos[0].url;
            console.log(`[Stream] Found: ${videos[0].title} → ${videoUrl}`);
        }

        const hash = crypto.createHash('md5').update(videoUrl).digest('hex');
        const mp3Path = path.join(getCacheDir(), `${hash}.mp3`);

        // Step 2: Check cache — serve from local file if available (instant)
        if (fs.existsSync(mp3Path)) {
            console.log(`[Stream Cache Hit] ${videoUrl}`);
            const stat = fs.statSync(mp3Path);
            const fileSize = stat.size;
            const range = req.headers.range;
            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const startByte = parseInt(parts[0], 10);
                const endByte = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (endByte - startByte) + 1;
                res.writeHead(206, {
                    'Content-Range': `bytes ${startByte}-${endByte}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'audio/mpeg',
                });
                fs.createReadStream(mp3Path, { start: startByte, end: endByte }).pipe(res);
            } else {
                res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Accept-Ranges': 'bytes',
                    'Content-Type': 'audio/mpeg',
                });
                fs.createReadStream(mp3Path).pipe(res);
            }
            return;
        }

        // Step 3: IMMEDIATELY start piping audio via ytdl() stream.
        // This sends Content-Type headers within <1 second, keeping the connection alive.
        // No getInfo() call — ytdl() handles resolution internally.
        console.log(`[Stream Pipe] Streaming directly via ytdl: ${videoUrl}`);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Accept-Ranges', 'none');
        res.setHeader('Cache-Control', 'no-cache');

        const audioStream = ytdl(videoUrl, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25, // 32MB buffer for smooth streaming
        });

        audioStream.on('error', (err) => {
            console.error('[Stream Error]', err.message);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Audio stream failed' });
            } else {
                res.end();
            }
        });

        audioStream.pipe(res);

    } catch (error) {
        console.error('Error in /play endpoint:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error during streaming' });
        }
    }
});

module.exports = router;
