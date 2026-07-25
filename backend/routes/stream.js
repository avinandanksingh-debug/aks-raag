const express = require('express');
const play = require('play-dl');
const youtubedl = require('youtube-dl-exec');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const stream = require('stream');

const router = express.Router();

// Set the ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Cache directory — lazily resolved so the env var is always set before first use
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

// Get all cached items
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
        }).filter(item => item.sizeBytes > 0); // only return if mp3 actually exists
        
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
        // sanitize hash to prevent path traversal
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
            
            const searchResults = await play.search(searchQuery, {
                limit: 1,
                source: { youtube: 'video' }
            });

            if (!searchResults || searchResults.length === 0) {
                return res.status(404).json({ error: 'Track not found on YouTube' });
            }

            const videoInfo = searchResults[0];
            console.log(`Found video: ${videoInfo.title} (${videoInfo.url})`);
            videoUrl = videoInfo.url;
        }

        const isSeek = start && !isNaN(parseFloat(start)) && parseFloat(start) > 0;
        
        // Generate a unique ID based on the URL
        const hash = crypto.createHash('md5').update(videoUrl).digest('hex');
        const mp3Path = path.join(getCacheDir(), `${hash}.mp3`);
        const metaPath = path.join(getCacheDir(), `${hash}.json`);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Check if the file is already cached locally
        if (fs.existsSync(mp3Path)) {
            console.log(`[Cache Hit] Streaming local file for: ${videoUrl}`);
            
            if (isSeek) {
                // If seeking a local file, run it through ffmpeg to slice it
                let command = ffmpeg(mp3Path)
                    .setStartTime(parseFloat(start))
                    .format('mp3')
                    .audioBitrate(320)
                    .on('error', (err) => {
                        console.error('FFmpeg local seek error:', err.message);
                    });
                command.pipe(res, { end: true });
            } else {
                // Instantly stream the local file
                const readStream = fs.createReadStream(mp3Path);
                readStream.pipe(res);
            }
            return;
        }

        console.log(`[Cache Miss] Fetching from YouTube: ${videoUrl}`);

        // Use youtube-dl-exec (yt-dlp) for robust audio stream extraction
        const ytDlpProcess = youtubedl.exec(videoUrl, {
            output: '-',
            format: 'bestaudio',
            quiet: true
        });

        // Bump audio bitrate to 320 for highest quality
        let command = ffmpeg(ytDlpProcess.stdout)
            .format('mp3')
            .audioBitrate(320)
            .on('error', (err) => {
                console.error('FFmpeg error:', err.message);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to transcode audio' });
                }
            });

        if (isSeek) {
            // Apply start seek if provided - do NOT cache partial streams
            command = command.setStartTime(parseFloat(start));
            command.pipe(res, { end: true });
        } else {
            // Full stream - pipe to both Response and a local FileWriteStream
            const pt = new stream.PassThrough();
            
            command.pipe(pt);
            
            // Pipe to user
            pt.pipe(res, { end: true });
            
            // Pipe to disk
            const fileStream = fs.createWriteStream(mp3Path);
            pt.pipe(fileStream);
            
            // Save metadata
            fs.writeFileSync(metaPath, JSON.stringify({
                track: trackName,
                artist: artistName,
                videoUrl: videoUrl,
                savedAt: new Date().toISOString()
            }));
            
            // Clean up if there's an error during file write
            fileStream.on('error', () => {
                if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
            });
        }

    } catch (error) {
        console.error('Error in /play endpoint:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error during streaming' });
        }
    }
});

module.exports = router;
