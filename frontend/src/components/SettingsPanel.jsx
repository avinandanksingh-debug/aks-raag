import React, { useState, useEffect } from 'react';
import { Cloud, Check, RefreshCw, Trash2, UserX, ShieldCheck, Zap, HardDrive, Sliders } from 'lucide-react';
import { getApiBase, setApiBase } from '../config';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const SettingsPanel = ({ user, logout }) => {
    const [serverUrl, setServerUrl] = useState(getApiBase());
    const [pingStatus, setPingStatus] = useState({ testing: false, success: null, latency: null, msg: '' });
    const [audioQuality, setAudioQuality] = useState(() => localStorage.getItem('aks_raag_audio_quality') || '320k');
    const [cacheCount, setCacheCount] = useState(0);
    const [clearingCache, setClearingCache] = useState(false);
    const [saveNotice, setSaveNotice] = useState(false);

    useEffect(() => {
        fetchCacheStats();
        testPing(serverUrl);
    }, []);

    const fetchCacheStats = async () => {
        try {
            const res = await fetch(`${getApiBase()}/api/stream/cache`);
            if (res.ok) {
                const data = await res.json();
                setCacheCount(data.items?.length || 0);
            }
        } catch (e) {
            console.error("Cache stat error:", e);
        }
    };

    const testPing = async (urlToTest) => {
        const target = urlToTest || serverUrl;
        setPingStatus({ testing: true, success: null, latency: null, msg: 'Testing connection...' });
        const start = Date.now();
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(`${target}/health`, { signal: controller.signal });
            clearTimeout(timeout);
            const duration = Date.now() - start;
            if (res.ok) {
                setPingStatus({ testing: false, success: true, latency: duration, msg: `Online (${duration}ms response)` });
            } else {
                setPingStatus({ testing: false, success: false, latency: duration, msg: `Server returned status ${res.status}` });
            }
        } catch (err) {
            const duration = Date.now() - start;
            const msg = err.name === 'AbortError' ? 'Connection timed out (>8s)' : 'Server offline or unreachable';
            setPingStatus({ testing: false, success: false, latency: duration, msg });
        }
    };

    const handleSaveServer = (newUrl) => {
        setApiBase(newUrl);
        setServerUrl(newUrl);
        setSaveNotice(true);
        setTimeout(() => setSaveNotice(false), 2500);
        testPing(newUrl);
    };

    const handleQualityChange = (q) => {
        setAudioQuality(q);
        localStorage.setItem('aks_raag_audio_quality', q);
    };

    const handleClearCache = async () => {
        setClearingCache(true);
        try {
            await fetch(`${getApiBase()}/api/stream/cache`, { method: 'DELETE' });
            setCacheCount(0);
        } catch (e) {
            console.error("Failed to clear cache:", e);
        } finally {
            setClearingCache(false);
        }
    };

    const handleSwitchAccount = async () => {
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_refresh_token');
        const logoutUrl = "https://accounts.spotify.com/en/logout";
        
        if (Capacitor.isNativePlatform()) {
            await Browser.open({ url: logoutUrl });
        } else {
            window.open(logoutUrl, '_blank');
        }
        window.location.reload();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px' }}>
            {/* 1. Backend Server & Connection Card */}
            <div style={{ background: '#181818', padding: '20px', borderRadius: '12px', border: '1px solid #282828' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <Cloud color="#1ed760" size={22} />
                    <h3 style={{ margin: 0, fontSize: '18px' }}>Backend Server Configuration</h3>
                </div>
                <p style={{ fontSize: '13px', color: '#b3b3b3', margin: '0 0 16px 0', lineHeight: '1.4' }}>
                    Choose between your Standalone Embedded Local Backend or Cloud Backend on Render.
                </p>

                {/* Preset Options */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <button 
                        onClick={() => handleSaveServer('https://aks-raag.onrender.com')}
                        style={{
                            background: serverUrl.includes('onrender.com') ? '#1ed760' : '#282828',
                            color: serverUrl.includes('onrender.com') ? '#000' : '#fff',
                            border: 'none', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                        }}
                    >
                        Render Cloud (aks-raag.onrender.com)
                    </button>
                    <button 
                        onClick={() => handleSaveServer('http://127.0.0.1:3001')}
                        style={{
                            background: serverUrl.includes('127.0.0.1') ? '#1ed760' : '#282828',
                            color: serverUrl.includes('127.0.0.1') ? '#000' : '#fff',
                            border: 'none', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                        }}
                    >
                        Local Embedded Server (127.0.0.1:3001)
                    </button>
                </div>

                {/* Custom Server URL Input */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                    <input 
                        type="text" 
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                        placeholder="http://127.0.0.1:3001"
                        style={{ flex: 1, padding: '10px 12px', background: '#121212', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                    />
                    <button 
                        onClick={() => handleSaveServer(serverUrl)}
                        style={{ background: '#1ed760', color: '#000', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                    >
                        {saveNotice ? <Check size={16} /> : "Save"}
                    </button>
                </div>

                {/* Server Health Status Ping */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#121212', padding: '10px 14px', borderRadius: '6px', border: '1px solid #242424' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: pingStatus.success ? '#1ed760' : pingStatus.success === false ? '#f44336' : '#ff9800' }} />
                        <span style={{ fontSize: '13px', color: '#fff' }}>{pingStatus.msg}</span>
                    </div>
                    <button 
                        onClick={() => testPing(serverUrl)}
                        disabled={pingStatus.testing}
                        style={{ background: 'transparent', border: 'none', color: '#b3b3b3', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                    >
                        <RefreshCw size={14} className={pingStatus.testing ? 'spin' : ''} />
                        Ping
                    </button>
                </div>
            </div>

            {/* 2. Audio Stream Quality Selector Card */}
            <div style={{ background: '#181818', padding: '20px', borderRadius: '12px', border: '1px solid #282828' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <Zap color="#1ed760" size={22} />
                    <h3 style={{ margin: 0, fontSize: '18px' }}>Audio Stream Quality</h3>
                </div>
                <p style={{ fontSize: '13px', color: '#b3b3b3', margin: '0 0 16px 0', lineHeight: '1.4' }}>
                    Select the preferred audio streaming bitrate for playback.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {[
                        { key: '320k', label: 'High Quality (320 kbps)', desc: 'Best audio fidelity' },
                        { key: '192k', label: 'Standard (192 kbps)', desc: 'Balanced bandwidth' },
                        { key: '128k', label: 'Data Saver (128 kbps)', desc: 'Fastest loading' }
                    ].map(item => (
                        <div 
                            key={item.key}
                            onClick={() => handleQualityChange(item.key)}
                            style={{
                                flex: 1, minWidth: '150px', background: audioQuality === item.key ? 'rgba(30, 215, 96, 0.12)' : '#121212',
                                border: `1px solid ${audioQuality === item.key ? '#1ed760' : '#333'}`,
                                borderRadius: '8px', padding: '12px', cursor: 'pointer'
                            }}
                        >
                            <div style={{ fontSize: '13px', fontWeight: '600', color: audioQuality === item.key ? '#1ed760' : '#fff', marginBottom: '4px' }}>
                                {item.label}
                            </div>
                            <div style={{ fontSize: '11px', color: '#888' }}>{item.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Storage & Cache Management Card */}
            <div style={{ background: '#181818', padding: '20px', borderRadius: '12px', border: '1px solid #282828' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <HardDrive color="#1ed760" size={22} />
                    <h3 style={{ margin: 0, fontSize: '18px' }}>Storage & Local Cache</h3>
                </div>
                <p style={{ fontSize: '13px', color: '#b3b3b3', margin: '0 0 16px 0', lineHeight: '1.4' }}>
                    Songs are cached locally on your device for instant offline playback.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#121212', padding: '12px 16px', borderRadius: '8px', border: '1px solid #242424' }}>
                    <span style={{ fontSize: '14px', color: '#fff' }}>Cached Audio Tracks: <strong>{cacheCount}</strong></span>
                    <button 
                        onClick={handleClearCache}
                        disabled={clearingCache}
                        style={{ background: '#f44336', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Trash2 size={14} />
                        {clearingCache ? 'Clearing...' : 'Clear Cache'}
                    </button>
                </div>
            </div>

            {/* 4. Spotify Account & Session Card */}
            <div style={{ background: '#181818', padding: '20px', borderRadius: '12px', border: '1px solid #282828' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <ShieldCheck color="#1ed760" size={22} />
                    <h3 style={{ margin: 0, fontSize: '18px' }}>Spotify Account Session</h3>
                </div>
                <p style={{ fontSize: '13px', color: '#b3b3b3', margin: '0 0 16px 0' }}>
                    Currently logged in as: <strong>{user?.display_name || 'Spotify User'}</strong>
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button 
                        onClick={handleSwitchAccount}
                        style={{ background: '#282828', color: '#fff', border: '1px solid #444', padding: '10px 18px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <UserX size={16} />
                        <span>Switch Spotify Account</span>
                    </button>
                    <button 
                        onClick={logout}
                        style={{ background: 'transparent', color: '#f44336', border: '1px solid rgba(244, 67, 54, 0.4)', padding: '10px 18px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer' }}
                    >
                        Log Out of Aks Raag
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
