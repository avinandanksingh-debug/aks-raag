import React, { useState, useEffect, useRef, useContext } from 'react';
import { getApiBase } from '../config';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, Radio, Clock } from 'lucide-react';
import { SpotifyContext } from '../context/SpotifyContext';

const Player = () => {
    const { currentTrack, isPlaying, setIsPlaying, playNext, playPrevious, shuffle, setShuffle, repeat, setRepeat, currentContext, setActiveView, autoplay, setAutoplay } = useContext(SpotifyContext);
    const audioRef = useRef(null);

    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(() => {
        const savedVol = localStorage.getItem('aks_raag_volume');
        if (savedVol && parseFloat(savedVol) >= 0.5) {
            return 0.25;
        }
        return savedVol ? parseFloat(savedVol) : 0.5;
    });

    const [sleepTimer, setSleepTimer] = useState(null);
    const [showTimerMenu, setShowTimerMenu] = useState(false);

    useEffect(() => {
        if (sleepTimer) {
            const timeout = setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.pause();
                }
                setIsPlaying(false);
                setSleepTimer(null);
            }, sleepTimer * 60 * 1000);
            return () => clearTimeout(timeout);
        }
    }, [sleepTimer]);

    // We need to keep track if we are currently seeking so we don't glitch the UI
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekOffset, setSeekOffset] = useState(0);

    // Save volume to localStorage on change
    useEffect(() => {
        localStorage.setItem('aks_raag_volume', volume.toString());
    }, [volume]);

    useEffect(() => {
        if (currentTrack && audioRef.current) {
            let streamUrl = '';
            if (currentTrack.preview_url) {
                streamUrl = currentTrack.preview_url;
            } else if (currentTrack.youtube_url) {
                streamUrl = `${getApiBase()}/api/stream/play?url=${encodeURIComponent(currentTrack.youtube_url)}`;
            } else {
                streamUrl = `${getApiBase()}/api/stream/play?track=${encodeURIComponent(currentTrack.name)}&artist=${encodeURIComponent(currentTrack.artists?.[0]?.name || 'Unknown')}`;
            }
            
            // If the URL is already loaded and we just paused/played, do nothing
            // Otherwise, we load the new track URL
            if (audioRef.current.src !== streamUrl) {
                audioRef.current.src = streamUrl;
                audioRef.current.volume = volume;
                audioRef.current.play().catch(e => console.error("Playback failed", e));
            }
            
            setIsPlaying(true);
            // Use Spotify's duration as the total time, since the stream doesn't send total length
            setDuration(currentTrack.duration_ms / 1000);
            setCurrentTime(0);
            setSeekOffset(0);
        }
    }, [currentTrack]);

    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(e => console.error("Playback failed", e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying]);

    const togglePlay = () => {
        if (!currentTrack) return;
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current && !isSeeking) {
            setCurrentTime(seekOffset + audioRef.current.currentTime);
        }
    };

    const handleEnded = () => {
        setSeekOffset(0);
        playNext();
    };

    const formatTime = (timeInSeconds) => {
        if (isNaN(timeInSeconds)) return "0:00";
        const m = Math.floor(timeInSeconds / 60);
        const s = Math.floor(timeInSeconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleSeek = (e) => {
        if (!currentTrack || !audioRef.current) return;
        
        const bar = e.currentTarget;
        const rect = bar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        
        const newTime = percent * duration;
        setCurrentTime(newTime);
        setIsSeeking(true);
        setSeekOffset(newTime);
        
        // Pause current playback
        audioRef.current.pause();
        
        // Re-request stream from backend with new start time
        const streamUrl = `${getApiBase()}/api/stream/play?track=${encodeURIComponent(currentTrack.name)}&artist=${encodeURIComponent(currentTrack.artists[0].name)}&start=${newTime}`;
        audioRef.current.src = streamUrl;
        
        audioRef.current.play().then(() => setIsSeeking(false)).catch(e => console.error(e));
        setIsPlaying(true);
    };

    const handleVolume = (e) => {
        const bar = e.currentTarget;
        const rect = bar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        
        setVolume(percent);
        if (audioRef.current) {
            audioRef.current.volume = percent;
        }
    };

    // Calculate progress safely
    const safeCurrentTime = Math.min(currentTime, duration);
    const progressPercent = duration > 0 ? (safeCurrentTime / duration) * 100 : 0;

    return (
        <div className="player-bar">
            <audio 
                ref={audioRef} 
                onTimeUpdate={handleTimeUpdate} 
                onEnded={handleEnded}
            />
            
            <div 
                style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '30%', cursor: 'pointer' }}
                onClick={() => {
                    if (!currentContext) return;
                    if (currentContext.type === 'playlist') {
                        setActiveView({ type: 'playlist', id: currentContext.id, name: currentContext.name });
                    } else if (currentContext.type === 'liked') {
                        setActiveView({ type: 'liked' });
                    } else {
                        setActiveView({ type: 'home' });
                    }
                }}
            >
                <div style={{ width: '56px', height: '56px', backgroundColor: '#282828', borderRadius: '4px', overflow: 'hidden' }}>
                    {currentTrack?.album?.images?.[0] && (
                        <img src={currentTrack.album.images[0].url} alt="album art" style={{ width: '100%', height: '100%' }} />
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{currentTrack ? currentTrack.name : 'Song Title'}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{currentTrack ? currentTrack.artists.map(a=>a.name).join(', ') : 'Artist Name'}</span>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40%', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <button onClick={() => setShuffle(!shuffle)} style={{ color: shuffle ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        <Shuffle size={20} />
                    </button>
                    <button onClick={playPrevious} style={{ color: 'var(--text-secondary)' }}>
                        <SkipBack size={24} fill="currentColor" />
                    </button>
                    
                    <button 
                        onClick={togglePlay}
                        style={{ 
                            width: '40px', height: '40px', 
                            backgroundColor: 'var(--text-primary)', 
                            color: '#000', 
                            borderRadius: '50%', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center' 
                        }}
                    >
                        {isPlaying ? <Pause fill="#000" size={20} /> : <Play fill="#000" size={20} style={{ marginLeft: '2px' }} />}
                    </button>
                    
                    <button onClick={playNext} style={{ color: 'var(--text-secondary)' }}>
                        <SkipForward size={24} fill="currentColor" />
                    </button>
                    <button 
                        onClick={() => setRepeat((repeat + 1) % 3)} 
                        style={{ color: repeat > 0 ? 'var(--text-primary)' : 'var(--text-secondary)', position: 'relative' }}
                    >
                        <Repeat size={20} />
                        {repeat === 2 && (
                            <span style={{ position: 'absolute', top: -5, right: -5, fontSize: '10px', fontWeight: 'bold' }}>1</span>
                        )}
                    </button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '35px', textAlign: 'right' }}>
                        {formatTime(currentTime)}
                    </span>
                    <div 
                        onClick={handleSeek}
                        style={{ flex: 1, height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', position: 'relative', cursor: 'pointer' }}
                    >
                        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(100, progressPercent)}%`, backgroundColor: 'var(--text-primary)', borderRadius: '2px' }}></div>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '35px', textAlign: 'left' }}>
                        {formatTime(duration)}
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '30%', gap: '16px', position: 'relative' }}>
                
                {/* Autoplay Toggle */}
                <button 
                    onClick={() => setAutoplay(!autoplay)} 
                    style={{ color: autoplay ? 'var(--spotify-green)' : 'var(--text-secondary)', position: 'relative' }}
                    title="AI Autoplay"
                >
                    <Radio size={20} />
                    {autoplay && <div style={{ position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', backgroundColor: 'var(--spotify-green)', borderRadius: '50%' }}></div>}
                </button>

                {/* Sleep Timer */}
                <div style={{ position: 'relative' }}>
                    <button 
                        onClick={() => setShowTimerMenu(!showTimerMenu)} 
                        style={{ color: sleepTimer ? 'var(--spotify-green)' : 'var(--text-secondary)', position: 'relative' }}
                        title="Sleep Timer"
                    >
                        <Clock size={20} />
                        {sleepTimer && <div style={{ position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', backgroundColor: 'var(--spotify-green)', borderRadius: '50%' }}></div>}
                    </button>
                    {showTimerMenu && (
                        <div style={{ position: 'absolute', bottom: '100%', right: '0', marginBottom: '12px', backgroundColor: '#282828', borderRadius: '4px', padding: '8px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', width: '120px', zIndex: 100 }}>
                            <div style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', color: !sleepTimer ? 'var(--spotify-green)' : 'var(--text-primary)' }} onClick={() => { setSleepTimer(null); setShowTimerMenu(false); }}>Off</div>
                            <div style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', color: sleepTimer===30 ? 'var(--spotify-green)' : 'var(--text-primary)' }} onClick={() => { setSleepTimer(30); setShowTimerMenu(false); }}>30 Minutes</div>
                            <div style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', color: sleepTimer===60 ? 'var(--spotify-green)' : 'var(--text-primary)' }} onClick={() => { setSleepTimer(60); setShowTimerMenu(false); }}>60 Minutes</div>
                            <div style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', color: sleepTimer===90 ? 'var(--spotify-green)' : 'var(--text-primary)' }} onClick={() => { setSleepTimer(90); setShowTimerMenu(false); }}>90 Minutes</div>
                            <div style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', color: sleepTimer===120 ? 'var(--spotify-green)' : 'var(--text-primary)' }} onClick={() => { setSleepTimer(120); setShowTimerMenu(false); }}>120 Minutes</div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Volume2 size={20} color="var(--text-secondary)" />
                    <div 
                        onClick={handleVolume}
                        style={{ width: '100px', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', position: 'relative', cursor: 'pointer' }}
                    >
                        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${volume * 100}%`, backgroundColor: 'var(--text-primary)', borderRadius: '2px' }}></div>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '30px' }}>
                        {Math.round(volume * 100)}%
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Player;



