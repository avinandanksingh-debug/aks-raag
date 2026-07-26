const express = require('express');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const stream = require('stream');

const router = express.Router();

if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
}

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
        const files = fs.readdirSync(getCacheDir());
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        const cacheList = jsonFiles.map(file => {
            const hash = file.replace('.json', '');
            const metaPath = path.join(getCacheDir(), file);
            const mp3Path = path.join(getCacheDir(), `${hash}.mp3`);
            
            let metadata = {};
            try { metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) {}
            
            let size = 0;
            if (fs.existsSync(mp3Path)) {
                size = fs.statSync(mp3Path).size;
            }
            
            return {
                id: hash,
                ...metadata,
                sizeBytes: size
            };
        }).filter(item => item.sizeBytes > 0);
        
        res.json({ items: cacheList });
    } catch (error) {
        console.error('Error fetching cache list:', error);
        res.status(500).json({ error: 'Failed to fetch cache' });
    }
});

// Delete a cached item
router.delete('/cache/:id', (req, res) => {
    try {
        const hash = req.params.id;
        if (!/^[a-f0-9]+$/i.test(hash)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }
        
        const metaPath = path.join(getCacheDir(), `${hash}.json`);
        const mp3Path = path.join(getCacheDir(), `${hash}.mp3`);
        
        if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
        if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting cache item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

router.get('/play', async (req, res) => {
    // Set CORS headers on all stream responses for native Android WebView HTML5 Audio compatibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');

    const { track, artist, start, url } = req.query;

    if (!url && (!track || !artist)) {
        return res.status(400).json({ error: 'Missing url or track/artist parameters' });
    }

    try {
        let videoUrl = url;
        let trackName = track || 'Unknown Track';
        let artistName = artist || 'Unknown Artist';

        if (!videoUrl) {
            const searchQuery = `${track} ${artist} official audio`;
            console.log(`Searching YouTube for: ${searchQuery}`);
            
            const searchResults = await yts(searchQuery).catch(() => null);
            const videos = searchResults ? searchResults.videos : [];

            if (!videos || videos.length === 0) {
                return res.status(404).json({ error: 'Track not found on YouTube' });
            }

            videoUrl = videos[0].url;
        }

        const hash = crypto.createHash('md5').update(videoUrl).digest('hex');
        const mp3Path = path.join(getCacheDir(), `${hash}.mp3`);

        // Check if cached MP3 exists
        if (fs.existsSync(mp3Path)) {
            console.log(`[Cache Hit] Streaming local file for: ${videoUrl}`);
            const stat = fs.statSync(mp3Path);
            const fileSize = stat.size;
            const range = req.headers.range;

            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const startByte = parseInt(parts[0], 10);
                const endByte = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (endByte - startByte) + 1;
                const file = fs.createReadStream(mp3Path, { start: startByte, end: endByte });

                res.writeHead(206, {
                    'Content-Range': `bytes ${startByte}-${endByte}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'audio/mpeg',
                });
                file.pipe(res);
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

        console.log(`[Cache Miss] Resolving direct audio stream URL: ${videoUrl}`);

        try {
            const info = await ytdl.getInfo(videoUrl);
            const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });

            if (format && format.url) {
                console.log(`[Stream Redirect] Serving direct audio stream for: ${videoUrl}`);
                return res.redirect(302, format.url);
            }
        } catch (infoErr) {
            console.warn("[ytdl-core getInfo warning]:", infoErr.message);
        }

        // Fallback: pipe directly via ytdl-core stream
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Accept-Ranges', 'bytes');

        const audioStream = ytdl(videoUrl, { 
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25 
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
