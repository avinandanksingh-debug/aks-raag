import React, { useContext } from 'react';
import { Home, Search, Library, Heart, LogOut, Settings } from 'lucide-react';
import { SpotifyContext } from '../context/SpotifyContext';

const Sidebar = () => {
    const { playlists, logout, activeView, setActiveView } = useContext(SpotifyContext);

    return (
        <div className="sidebar glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="logo-container">
                Aks Raag
            </div>
            
            <nav className="nav-menu">
                <a href="#" className={`nav-item ${activeView.type === 'home' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveView({ type: 'home' }); }}>
                    <Home size={20} /> Home
                </a>
                <a href="#" className={`nav-item ${activeView.type === 'search' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveView({ type: 'search' }); }}>
                    <Search size={20} /> Search
                </a>
                <a href="#" className={`nav-item ${activeView.type === 'library' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveView({ type: 'library' }); }}>
                    <Library size={20} /> Your Library
                </a>
            </nav>
            
            <div style={{ marginTop: '20px' }}>
                <nav className="nav-menu">
                    <a href="#" className={`nav-item ${activeView.type === 'settings' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveView({ type: 'settings' }); }}>
                        <Settings size={20} /> Settings
                    </a>
                    <a href="#" className={`nav-item ${activeView.type === 'liked' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveView({ type: 'liked' }); }}>
                        <Heart size={20} fill="var(--text-secondary)" /> Liked Songs
                    </a>
                </nav>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', marginTop: '12px', borderTop: '1px solid var(--panel-border)', paddingTop: '12px' }}>
                {playlists && playlists.length > 0 ? (
                    playlists.map(playlist => (
                        <div key={playlist.id} style={{
                            padding: '8px 16px',
                            color: activeView.id === playlist.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontSize: '14px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseOut={(e) => e.currentTarget.style.color = activeView.id === playlist.id ? 'var(--text-primary)' : 'var(--text-secondary)'}
                        onClick={() => setActiveView({ type: 'playlist', id: playlist.id, name: playlist.name })}
                        >
                            {playlist.name}
                        </div>
                    ))
                ) : (
                    <p style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>No playlists found.</p>
                )}
            </div>

            <div style={{ marginTop: 'auto', paddingBottom: '16px', borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
                <nav className="nav-menu">
                    <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); logout(); }}>
                        <LogOut size={20} /> Log Out
                    </a>
                </nav>
            </div>
        </div>
    );
};

export default Sidebar;
