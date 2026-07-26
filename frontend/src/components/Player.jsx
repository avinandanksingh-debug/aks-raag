import React, { useState, useEffect, useRef, useContext } from 'react';
import { getApiBase } from '../config';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, Radio, Clock } from 'lucide-react';
import { SpotifyContext } from '../context/SpotifyContext';

const Player = () => {
    const { currentTrack, isPlaying, setIsPlaying, playNext, playPrevious, shuffle, setShuffle, repeat, setRepeat, setActiveView, autoplay, setAutoplay } = useContext(SpotifyContext);
    const audioRef = useRef(null);

    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(() => {
        const savedVol = localStorage.getItem('aks_raag_volume');
        if (savedVol !== null) {
            const parsed = parseFloat(savedVol);
            if (!isNaN(parsed)) return parsed;
        }
        return 0.25; // Always start at 25% default
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

    useEffect(() => {
        localStorage.setItem('aks_raag_volume', volume.toString());
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    useEffect(() => {
        if (currentTrack && audioRef.current) {
            let streamUrl = '';
            if (currentTrack.youtube_url) {
                streamUrl = `${getApiBase()}/api/stream/play?url=${encodeURIComponent(currentTrack.youtube_url)}`;
            } else {
                streamUrl = `${getApiBase()}/api/stream/play?track=${encodeURIComponent(currentTrack.name)}&artist=${encodeURIComponent(currentTrack.artists?.[0]?.name || 'Unknown')}`;
            }
            
            console.log(`[Player] Loading audio stream: ${streamUrl}`);
            audioRef.current.src = streamUrl;
            audioRef.current.volume = volume;
            
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(e => {
                    console.error("[Player] Playback launch error:", e);
                    // Retrying once if initial play gesture was interrupted
                    setTimeout(() => {
                        if (audioRef.current) {
                            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                        }
                    }, 500);
                });

            setDuration((currentTrack.duration_ms || 180000) / 1000);
            setCurrentTime(0);
        }
    }, [currentTrack]);

    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(e => console.error("[Player] Playback toggle error:", e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying]);

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
                setDuration(audioRef.current.duration);
            }
        }
    };

    const handleEnded = () => {
        if (repeat === 2) {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => {});
            }
        } else {
            playNext();
        }
    };

    const handleSeek = (e) => {
        const bounds = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - bounds.left) / bounds.width;
        const newTime = percent * duration;
        setCurrentTime(newTime);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }
    };

    const handleVolume = (e) => {
        const bounds = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - bounds.left) / bounds.width;
        const newVol = Math.max(0, Math.min(1, percent));
        setVolume(newVol);
    };

    const formatTime = (secs) => {
        if (isNaN(secs) || secs < 0) return '0:00';
        const totalSecs = Math.floor(secs);
        const mins = Math.floor(totalSecs / 60);
        const remainingSecs = totalSecs % 60;
        return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
    };

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="player-bar">
            <audio 
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
            />

            {/* Left Track Info */}
            <div className="player-left" onClick={() => setActiveView({ type: 'home' })}>
                <div className="player-cover-wrap">
                    {currentTrack?.album?.images?.[0]?.url ? (
                        <img src={currentTrack.album.images[0].url} alt="cover" className="player-cover" />
                    ) : (
                        <div className="player-cover-placeholder" />
                    )}
                </div>
                <div className="player-track-info">
                    <span className="player-track-name">{currentTrack ? currentTrack.name : 'Select a song'}</span>
                    <span className="player-track-artist">{currentTrack ? currentTrack.artists?.map(a=>a.name).join(', ') : 'Aks Raag'}</span>
                </div>
            </div>

            {/* Middle Playback Controls & Progress Bar */}
            <div className="player-center">
                <div className="player-controls">
                    <button onClick={() => setShuffle(!shuffle)} className={`icon-btn ${shuffle ? 'active' : ''}`} title="Shuffle">
                        <Shuffle size={18} />
                    </button>
                    <button onClick={playPrevious} className="icon-btn" title="Previous">
                        <SkipBack size={20} fill="currentColor" />
                    </button>
                    
                    <button onClick={togglePlay} className="play-pause-btn">
                        {isPlaying ? <Pause fill="#000" size={20} /> : <Play fill="#000" size={20} style={{ marginLeft: '2px' }} />}
                    </button>
                    
                    <button onClick={playNext} className="icon-btn" title="Next">
                        <SkipForward size={20} fill="currentColor" />
                    </button>
                    <button onClick={() => setRepeat((repeat + 1) % 3)} className={`icon-btn ${repeat > 0 ? 'active' : ''}`} title="Repeat">
                        <Repeat size={18} />
                    </button>
                </div>
                
                <div className="player-progress-bar-container">
                    <span className="time-stamp">{formatTime(currentTime)}</span>
                    <div className="progress-bar-bg" onClick={handleSeek}>
                        <div className="progress-bar-fill" style={{ width: `${Math.min(100, progressPercent)}%` }} />
                    </div>
                    <span className="time-stamp">{formatTime(duration)}</span>
                </div>
            </div>

            {/* Right Tools (Volume with percentage text, Sleep Timer, Autoplay) */}
            <div className="player-right desktop-only">
                <button onClick={() => setAutoplay(!autoplay)} className={`icon-btn ${autoplay ? 'active' : ''}`} title="AI Autoplay">
                    <Radio size={18} />
                </button>

                <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowTimerMenu(!showTimerMenu)} className={`icon-btn ${sleepTimer ? 'active' : ''}`} title="Sleep Timer">
                        <Clock size={18} />
                    </button>
                    {showTimerMenu && (
                        <div className="timer-dropdown">
                            <div onClick={() => { setSleepTimer(null); setShowTimerMenu(false); }}>Off</div>
                            <div onClick={() => { setSleepTimer(30); setShowTimerMenu(false); }}>30 Mins</div>
                            <div onClick={() => { setSleepTimer(60); setShowTimerMenu(false); }}>60 Mins</div>
                            <div onClick={() => { setSleepTimer(90); setShowTimerMenu(false); }}>90 Mins</div>
                        </div>
                    )}
                </div>

                <div className="volume-control">
                    <Volume2 size={18} color="var(--text-secondary)" />
                    <div className="volume-bar-bg" onClick={handleVolume}>
                        <div className="volume-bar-fill" style={{ width: `${volume * 100}%` }} />
                    </div>
                    <span className="volume-percent-text">{Math.round(volume * 100)}%</span>
                </div>
            </div>
        </div>
    );
};

export default Player;
