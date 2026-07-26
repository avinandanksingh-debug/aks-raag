import React, { createContext, useState, useEffect } from 'react';
import spotifyApi from '../spotifyApi';
import { getApiBase } from '../config';

export const SpotifyContext = createContext();

export const SpotifyProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [playlists, setPlaylists] = useState([]);
    
    // View state
    const [activeView, setActiveView] = useState({ type: 'library' });
    const [currentContext, setCurrentContext] = useState(null);
    
    // Player state
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [queue, setQueue] = useState([]);
    const [shuffle, setShuffle] = useState(false);
    // repeat: 0 = off, 1 = repeat all, 2 = repeat one
    const [repeat, setRepeat] = useState(0);
    const [autoplay, setAutoplay] = useState(true);

    useEffect(() => {
        const fetchSpotifyData = async () => {
            const directToken = localStorage.getItem('spotify_access_token');

            if (directToken) {
                try {
                    // Use spotifyApi which has the auto-refresh interceptor
                    const userRes = await spotifyApi.get('https://api.spotify.com/v1/me', {
                        headers: { Authorization: `Bearer ${directToken}` }
                    });
                    setUser(userRes.data);

                    const playlistRes = await spotifyApi.get('https://api.spotify.com/v1/me/playlists?limit=50', {
                        headers: { Authorization: `Bearer ${directToken}` }
                    });
                    setPlaylists(playlistRes.data.items || []);
                    return;
                } catch (err) {
                    console.warn("Spotify API failed (token may be fully expired):", err.message);
                    if (err.response?.status === 401) {
                        // Token refresh was already attempted by interceptor and failed
                        localStorage.removeItem('spotify_access_token');
                    }
                }
            }

            // Fallback to backend proxy (cookie-based auth)
            try {
                const apiBase = getApiBase();
                const userRes = await spotifyApi.get(`${apiBase}/api/spotify/me`, { withCredentials: true, timeout: 8000 });
                setUser(userRes.data);

                const playlistRes = await spotifyApi.get(`${apiBase}/api/spotify/playlists`, { withCredentials: true, timeout: 8000 });
                setPlaylists(playlistRes.data.items || []);
            } catch (error) {
                console.warn("Backend auth check failed:", error?.message);
            }
        };

        fetchSpotifyData();
    }, []);

    const playQueue = (tracks, startIndex) => {
        setQueue(tracks);
        setCurrentTrack(tracks[startIndex]);
        setIsPlaying(true);
    };

    const playNext = () => {
        if (queue.length === 0) return;
        
        let currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
        
        if (repeat === 2) {
            setCurrentTrack({...currentTrack});
            setIsPlaying(true);
            return;
        }

        if (shuffle) {
            let nextIndex = Math.floor(Math.random() * queue.length);
            setCurrentTrack(queue[nextIndex]);
        } else {
            let nextIndex = currentIndex + 1;
            if (nextIndex >= queue.length) {
                if (repeat === 1) {
                    nextIndex = 0;
                } else {
                    if (autoplay && currentTrack?.artists?.[0]?.name) {
                        const token = localStorage.getItem('spotify_access_token');
                        if (token) {
                            spotifyApi.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(currentTrack.artists[0].name)}&type=track&limit=5`, {
                                headers: { Authorization: `Bearer ${token}` }
                            })
                            .then(res => {
                                const tracks = res.data.tracks?.items || [];
                                if (tracks.length > 0) {
                                    const newTrack = tracks[Math.floor(Math.random() * tracks.length)];
                                    setCurrentTrack(newTrack);
                                }
                            }).catch(() => {});
                        }
                    }
                    setIsPlaying(false);
                    return;
                }
            }
            setCurrentTrack(queue[nextIndex]);
        }
        setIsPlaying(true);
    };

    const playPrevious = () => {
        if (queue.length === 0) return;
        let currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
        
        if (currentIndex <= 0) {
            if (repeat === 1) currentIndex = queue.length;
            else return;
        }
        
        setCurrentTrack(queue[currentIndex - 1]);
        setIsPlaying(true);
    };

    const logout = async () => {
        try {
            localStorage.removeItem('spotify_access_token');
            localStorage.removeItem('spotify_refresh_token');
            const apiBase = getApiBase();
            await spotifyApi.post(`${apiBase}/api/auth/logout`, {}, { withCredentials: true }).catch(() => {});
            setUser(null);
            setPlaylists([]);
            setCurrentTrack(null);
            setIsPlaying(false);
            window.location.reload(); 
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <SpotifyContext.Provider value={{
            user,
            playlists,
            activeView,
            setActiveView,
            currentContext,
            setCurrentContext,
            currentTrack,
            isPlaying,
            setIsPlaying,
            queue,
            playQueue,
            playNext,
            playPrevious,
            shuffle,
            setShuffle,
            repeat,
            setRepeat,
            autoplay,
            setAutoplay,
            logout
        }}>
            {children}
        </SpotifyContext.Provider>
    );
};
