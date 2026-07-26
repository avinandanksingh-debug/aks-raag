import React, { useContext } from 'react';
import { Home, Search, Library, Heart, LogOut, Settings } from 'lucide-react';
import { SpotifyContext } from '../context/SpotifyContext';

const Sidebar = () => {
    const { playlists, logout, activeView, setActiveView } = useContext(SpotifyContext);

    return (
        <>
            {/* Desktop Left Sidebar Panel */}
            <div className="sidebar desktop-only">
                <div className="logo-container">
                    Aks Raag
                </div>
                
                <nav className="nav-menu">
                    <div 
                        className={`nav-item ${activeView.type === 'home' ? 'active' : ''}`} 
                        onClick={() => setActiveView({ type: 'home' })}
                    >
                        <Home size={20} />
                        <span>Home</span>
                    </div>
                    <div 
                        className={`nav-item ${activeView.type === 'search' ? 'active' : ''}`} 
                        onClick={() => setActiveView({ type: 'search' })}
                    >
                        <Search size={20} />
                        <span>Search</span>
                    </div>
                    <div 
                        className={`nav-item ${activeView.type === 'library' ? 'active' : ''}`} 
                        onClick={() => setActiveView({ type: 'library' })}
                    >
                        <Library size={20} />
                        <span>Your Library</span>
                    </div>
                </nav>
                
                <div style={{ marginTop: '16px' }}>
                    <nav className="nav-menu">
                        <div 
                            className={`nav-item ${activeView.type === 'settings' ? 'active' : ''}`} 
                            onClick={() => setActiveView({ type: 'settings' })}
                        >
                            <Settings size={20} />
                            <span>Settings</span>
                        </div>
                        <div 
                            className={`nav-item ${activeView.type === 'liked' ? 'active' : ''}`} 
                            onClick={() => setActiveView({ type: 'liked' })}
                        >
                            <Heart size={20} fill="var(--text-secondary)" />
                            <span>Liked Songs</span>
                        </div>
                    </nav>
                </div>
                
                <div className="sidebar-playlists-list">
                    <div className="sidebar-playlists-title">YOUR PLAYLISTS</div>
                    {playlists && playlists.length > 0 ? (
                        playlists.map(playlist => (
                            <div 
                                key={playlist.id} 
                                className={`sidebar-playlist-item ${activeView.id === playlist.id ? 'active' : ''}`}
                                onClick={() => setActiveView({ type: 'playlist', id: playlist.id, name: playlist.name })}
                            >
                                {playlist.name}
                            </div>
                        ))
                    ) : (
                        <div className="sidebar-playlists-empty">No playlists found.</div>
                    )}
                </div>

                <div className="sidebar-footer">
                    <nav className="nav-menu">
                        <div className="nav-item" onClick={logout}>
                            <LogOut size={20} />
                            <span>Log Out</span>
                        </div>
                    </nav>
                </div>
            </div>

            {/* Mobile Bottom Navigation Bar */}
            <div className="mobile-bottom-nav mobile-only">
                <div 
                    className={`mobile-nav-btn ${activeView.type === 'home' ? 'active' : ''}`}
                    onClick={() => setActiveView({ type: 'home' })}
                >
                    <Home size={22} />
                    <span>Home</span>
                </div>
                <div 
                    className={`mobile-nav-btn ${activeView.type === 'search' ? 'active' : ''}`}
                    onClick={() => setActiveView({ type: 'search' })}
                >
                    <Search size={22} />
                    <span>Search</span>
                </div>
                <div 
                    className={`mobile-nav-btn ${activeView.type === 'library' || activeView.type === 'playlist' ? 'active' : ''}`}
                    onClick={() => setActiveView({ type: 'library' })}
                >
                    <Library size={22} />
                    <span>Library</span>
                </div>
                <div 
                    className={`mobile-nav-btn ${activeView.type === 'liked' ? 'active' : ''}`}
                    onClick={() => setActiveView({ type: 'liked' })}
                >
                    <Heart size={22} />
                    <span>Liked</span>
                </div>
                <div 
                    className={`mobile-nav-btn ${activeView.type === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveView({ type: 'settings' })}
                >
                    <Settings size={22} />
                    <span>Settings</span>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
