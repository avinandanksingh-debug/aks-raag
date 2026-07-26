import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { getApiBase } from '../config';
import { SpotifyContext } from '../context/SpotifyContext';
import { Heart, ListMusic, Sparkles } from 'lucide-react';
import SettingsPanel from './SettingsPanel';

const MainContent = () => {
    const { user, activeView, setActiveView, playQueue, playlists, currentTrack, logout } = useContext(SpotifyContext);
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState([]);
    
    // Featured playlists state
    const [youtubeFeatured, setYoutubeFeatured] = useState([]);

    // Fetch 20 YouTube Music Featured Playlists on mount
    useEffect(() => {
        const loadFeatured = async () => {
            try {
                const ytRes = await axios.get(`${getApiBase()}/api/youtube/featured-playlists`).catch(() => null);
                if (ytRes && ytRes.data?.playlists) {
                    setYoutubeFeatured(ytRes.data.playlists);
                }
            } catch (e) {
                console.error('Failed to load featured playlists', e);
            }
        };
        loadFeatured();
    }, []);

    useEffect(() => {
        const fetchViewData = async () => {
            setLoading(true);
            setTracks([]);
            setErrorMsg('');
            const directToken = localStorage.getItem('spotify_access_token');

            try {
                if (activeView.type === 'liked') {
                    let items = [];
                    if (directToken) {
                        try {
                            const res = await axios.get('https://api.spotify.com/v1/me/tracks?limit=50', {
                                headers: { Authorization: `Bearer ${directToken}` }
                            });
                            items = res.data.items || [];
                        } catch (err) {
                            console.warn("Direct Spotify API failed for liked songs, using backend proxy:", err.message);
                        }
                    }
                    if (items.length === 0) {
                        const res = await axios.get(`${getApiBase()}/api/spotify/tracks`, { 
                            withCredentials: true,
                            headers: directToken ? { Authorization: `Bearer ${directToken}` } : {}
                        }).catch(() => ({ data: {} }));
                        items = res.data.items || [];
                    }
                    setTracks(items);
                } else if (activeView.type === 'playlist' && activeView.id) {
                    let items = [];
                    // 1. YouTube Featured Playlist
                    if (activeView.id.startsWith('yt-')) {
                        const featuredPl = youtubeFeatured.find(p => p.id === activeView.id);
                        if (featuredPl) {
                            items = featuredPl.tracks?.items || [];
                        }
                    } else {
                        // 2. Spotify User Playlist Tracks (Direct Spotify API)
                        if (directToken) {
                            try {
                                const res = await axios.get(`https://api.spotify.com/v1/playlists/${activeView.id}/tracks?limit=50`, {
                                    headers: { Authorization: `Bearer ${directToken}` }
                                });
                                items = res.data.items || [];
                            } catch (err) {
                                console.warn("Direct Spotify API failed for playlist tracks, attempting backend proxy:", err.message);
                            }
                        }
                        // 3. Spotify User Playlist Tracks (Backend Proxy)
                        if (items.length === 0) {
                            const res = await axios.get(`${getApiBase()}/api/spotify/playlists/${activeView.id}/tracks`, { 
                                withCredentials: true,
                                headers: directToken ? { Authorization: `Bearer ${directToken}` } : {}
                            }).catch(() => ({ data: {} }));
                            items = res.data.items || [];
                        }
                    }

                    setTracks(items);
                } else if (activeView.type === 'library') {
                    const savedSearches = localStorage.getItem('aks_raag_recent_searches');
                    if (savedSearches) {
                        try {
                            setRecentSearches(JSON.parse(savedSearches));
                        } catch(e) {}
                    }
                }
            } catch (error) {
                console.error("Failed to fetch view data", error);
                setErrorMsg(error.response?.data?.error?.message || error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchViewData();
    }, [activeView, youtubeFeatured]);

    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setLoading(true);
        setErrorMsg('');
        const directToken = localStorage.getItem('spotify_access_token');

        try {
            if (directToken) {
                try {
                    const res = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=20`, {
                        headers: { Authorization: `Bearer ${directToken}` }
                    });
                    const searchResults = (res.data.tracks?.items || []).map(track => ({ track }));
                    setTracks(searchResults);
                    return;
                } catch (err) {
                    console.warn("Direct Spotify search failed, using YouTube search fallback:", err.message);
                }
            }

            const res = await axios.get(`${getApiBase()}/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
            const ytTracks = (res.data.results || []).map(item => ({
                track: item
            }));
            setTracks(ytTracks);
        } catch (error) {
            console.error("Search failed", error);
            setErrorMsg("Search failed. Check connection.");
        } finally {
            setLoading(false);
        }
    };

    const addToRecent = (song) => {
        const updated = [song, ...recentSearches.filter(s => s.id !== song.id)].slice(0, 10);
        setRecentSearches(updated);
        localStorage.setItem('aks_raag_recent_searches', JSON.stringify(updated));
    };

    const formatDuration = (ms) => {
        const totalSeconds = Math.floor((ms || 180000) / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const getHeaderDetails = () => {
        if (activeView.type === 'liked') return { title: 'Liked Songs', subtitle: 'Your favorite tracks' };
        if (activeView.type === 'library') return { title: 'Your Library', subtitle: 'Your Playlists & Featured Collections' };
        if (activeView.type === 'settings') return { title: 'Settings', subtitle: 'Server, Audio Quality & Account Settings' };
        if (activeView.type === 'playlist') {
            const pl = playlists.find(p => p.id === activeView.id) || youtubeFeatured.find(p => p.id === activeView.id);
            return { title: pl ? pl.name : (activeView.name || 'Playlist'), subtitle: 'Playlist Tracks' };
        }
        return { title: 'Aks Raag', subtitle: 'Ad-Free High Quality Music Streaming' };
    };

    const details = getHeaderDetails();

    return (
        <div className="main-content">
            <div className="content-header">
                <form className="search-bar-container" onSubmit={handleSearchSubmit}>
                    <input 
                        type="text" 
                        placeholder="Search songs, artists, or YouTube..." 
                        className="search-bar" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>
                <div className="user-profile">
                    <span>{user?.display_name || 'Spotify User'}</span>
                </div>
            </div>

            <div className="banner">
                <h1>{details.title}</h1>
                <p>{details.subtitle}</p>
            </div>

            {activeView.type === 'settings' ? (
                <SettingsPanel user={user} logout={logout} />
            ) : activeView.type === 'library' || activeView.type === 'home' ? (
                <div className="library-view-container">
                    <div 
                        className="library-card liked-songs-card"
                        onClick={() => setActiveView({ type: 'liked' })}
                    >
                        <div className="liked-card-icon">
                            <Heart size={32} fill="#fff" color="#fff" />
                        </div>
                        <h3>Liked Songs</h3>
                        <p>Quick access to all your favorite tracks</p>
                    </div>

                    {/* Spotify User Playlists */}
                    {playlists.length > 0 && (
                        <>
                            <h2 className="library-section-title">Your Spotify Playlists</h2>
                            <div className="playlist-grid">
                                {playlists.map(pl => (
                                    <div 
                                        key={pl.id} 
                                        className="playlist-card"
                                        onClick={() => setActiveView({ type: 'playlist', id: pl.id, name: pl.name })}
                                    >
                                        <div className="playlist-cover-wrap">
                                            {pl.images?.[0]?.url ? (
                                                <img src={pl.images[0].url} alt={pl.name} className="playlist-cover" />
                                            ) : (
                                                <div className="playlist-cover-placeholder">
                                                    <ListMusic size={28} color="#888" />
                                                </div>
                                            )}
                                        </div>
                                        <h4 className="playlist-card-name">{pl.name}</h4>
                                        <p className="playlist-card-tracks">{pl.tracks?.total || 0} Tracks</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* 20 Featured Music Playlists from YouTube/YouTube Music */}
                    <h2 className="library-section-title" style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={20} color="#1ed760" />
                        <span>20 Featured Playlists (YouTube Music)</span>
                    </h2>
                    <div className="playlist-grid">
                        {youtubeFeatured.length > 0 ? (
                            youtubeFeatured.map(pl => (
                                <div 
                                    key={pl.id} 
                                    className="playlist-card"
                                    onClick={() => setActiveView({ type: 'playlist', id: pl.id, name: pl.name })}
                                >
                                    <div className="playlist-cover-wrap">
                                        {pl.images?.[0]?.url ? (
                                            <img src={pl.images[0].url} alt={pl.name} className="playlist-cover" />
                                        ) : (
                                            <div className="playlist-cover-placeholder">
                                                <ListMusic size={28} color="#888" />
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="playlist-card-name">{pl.name}</h4>
                                    <p className="playlist-card-tracks">Featured Collection</p>
                                </div>
                            ))
                        ) : (
                            <div style={{ color: 'var(--text-secondary)', padding: '12px' }}>Loading 20 featured music playlists...</div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="song-list">
                    {loading ? (
                        <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Loading tracks...</div>
                    ) : errorMsg ? (
                        <div style={{ color: '#f44336', padding: '20px' }}>{errorMsg}</div>
                    ) : tracks.length > 0 ? (
                        tracks.map((item, index) => {
                            const track = item.track || item;
                            const isCurrentTrack = currentTrack?.id === track.id;

                            return (
                                <div 
                                    key={track.id || index} 
                                    className={`song-row ${isCurrentTrack ? 'active-track' : ''}`}
                                    onClick={() => {
                                        addToRecent(track);
                                        playQueue(tracks.map(t => t.track || t), index);
                                    }}
                                >
                                    <div className="song-index">{index + 1}</div>
                                    <img 
                                        src={track.album?.images?.[0]?.url || 'https://via.placeholder.com/48'} 
                                        alt={track.name} 
                                        className="song-img"
                                    />
                                    <div className="song-details">
                                        <div className="song-title">{track.name}</div>
                                        <div className="song-artist">
                                            {track.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
                                        </div>
                                    </div>
                                    <div className="song-album">{track.album?.name || 'Single'}</div>
                                    <div className="song-duration">{formatDuration(track.duration_ms || 180000)}</div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>
                            No tracks found in this playlist. Search above or pick another playlist.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MainContent;
