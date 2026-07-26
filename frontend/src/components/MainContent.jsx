import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { getApiBase } from '../config';
import { SpotifyContext } from '../context/SpotifyContext';
import { Music, Heart, Play, ListMusic } from 'lucide-react';

const MainContent = () => {
    const { user, activeView, setActiveView, playQueue, playlists, currentContext, setCurrentContext, currentTrack } = useContext(SpotifyContext);
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState([]);
    
    // Cache state
    const [cachedSongs, setCachedSongs] = useState([]);

    useEffect(() => {
        const fetchViewData = async () => {
            setLoading(true);
            setTracks([]);
            setErrorMsg('');
            const directToken = localStorage.getItem('spotify_access_token');

            try {
                if (activeView.type === 'liked') {
                    if (directToken) {
                        const res = await axios.get('https://api.spotify.com/v1/me/tracks?limit=50', {
                            headers: { Authorization: `Bearer ${directToken}` }
                        });
                        setTracks(res.data.items || []);
                        return;
                    }
                    const res = await axios.get(`${getApiBase()}/api/spotify/tracks`, { withCredentials: true });
                    setTracks(res.data.items || []);
                } else if (activeView.type === 'playlist' && activeView.id) {
                    if (directToken) {
                        const res = await axios.get(`https://api.spotify.com/v1/playlists/${activeView.id}/tracks?limit=50`, {
                            headers: { Authorization: `Bearer ${directToken}` }
                        });
                        setTracks(res.data.items || []);
                        return;
                    }
                    const res = await axios.get(`${getApiBase()}/api/spotify/playlists/${activeView.id}/tracks`, { withCredentials: true });
                    setTracks(res.data.items || []);
                } else if (activeView.type === 'library') {
                    const savedSearches = localStorage.getItem('aks_raag_recent_searches');
                    if (savedSearches) {
                        try {
                            setRecentSearches(JSON.parse(savedSearches));
                        } catch(e) {
                            console.error('Failed to parse recent searches', e);
                        }
                    }
                } else if (activeView.type === 'settings') {
                    fetchCache();
                }
            } catch (error) {
                console.error("Failed to fetch view data", error);
                setErrorMsg(error.response?.data?.error?.message || error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchViewData();
    }, [activeView]);

    const fetchCache = async () => {
        try {
            const res = await axios.get(`${getApiBase()}/api/stream/cache`, { withCredentials: true });
            setCachedSongs(res.data.cache || []);
        } catch (error) {
            console.error("Failed to fetch cache", error);
        }
    };

    const handleClearCache = async () => {
        try {
            await axios.delete(`${getApiBase()}/api/stream/cache`, { withCredentials: true });
            setCachedSongs([]);
        } catch (error) {
            console.error("Failed to clear cache", error);
        }
    };

    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setLoading(true);
        setErrorMsg('');
        const directToken = localStorage.getItem('spotify_access_token');

        try {
            if (directToken) {
                const res = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=20`, {
                    headers: { Authorization: `Bearer ${directToken}` }
                });
                const searchResults = (res.data.tracks?.items || []).map(track => ({ track }));
                setTracks(searchResults);
                return;
            }

            const res = await axios.get(`${getApiBase()}/api/youtube/search?q=${encodeURIComponent(searchQuery)}`, { withCredentials: true });
            const ytTracks = (res.data.results || []).map(item => ({
                track: {
                    id: item.videoId,
                    name: item.title,
                    artists: [{ name: item.channelTitle || 'YouTube' }],
                    album: {
                        name: 'YouTube Search',
                        images: [{ url: item.thumbnail }]
                    },
                    duration_ms: item.durationMs || 180000,
                    isYouTube: true,
                    videoId: item.videoId
                }
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
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const getHeaderDetails = () => {
        if (activeView.type === 'liked') return { title: 'Liked Songs', subtitle: 'Your favorite tracks' };
        if (activeView.type === 'library') return { title: 'Your Library', subtitle: 'Your Playlists & Saved Collection' };
        if (activeView.type === 'settings') return { title: 'Settings', subtitle: 'Manage Storage & Cache' };
        if (activeView.type === 'playlist') {
            const pl = playlists.find(p => p.id === activeView.id);
            return { title: pl ? pl.name : 'Playlist', subtitle: pl ? `By ${pl.owner?.display_name || 'Spotify'}` : '' };
        }
        return { title: 'Aks Raag', subtitle: '' };
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
                <div className="settings-panel">
                    <h2>Storage & Cache Management</h2>
                    <p>Cached songs allow instant playback without re-downloading.</p>
                    <div className="cache-info">
                        <span>Cached Tracks: {cachedSongs.length}</span>
                        <button className="clear-cache-btn" onClick={handleClearCache}>Clear Cache</button>
                    </div>
                </div>
            ) : activeView.type === 'library' ? (
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

                    <h2 className="library-section-title">Playlists</h2>
                    <div className="playlist-grid">
                        {playlists.length > 0 ? (
                            playlists.map(pl => (
                                <div 
                                    key={pl.id} 
                                    className="playlist-card"
                                    onClick={() => setActiveView({ type: 'playlist', id: pl.id })}
                                >
                                    <div className="playlist-cover-wrap">
                                        {pl.images?.[0]?.url ? (
                                            <img src={pl.images[0].url} alt={pl.name} className="playlist-cover" />
                                        ) : (
                                            <div className="playlist-cover-placeholder">
                                                <ListMusic size={32} color="#888" />
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="playlist-card-name">{pl.name}</h4>
                                    <p className="playlist-card-tracks">{pl.tracks?.total || 0} Tracks</p>
                                </div>
                            ))
                        ) : (
                            <div className="empty-playlists-msg">
                                No playlists found in your Spotify account.
                            </div>
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
                            No tracks to display. Search above or select a playlist.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MainContent;
