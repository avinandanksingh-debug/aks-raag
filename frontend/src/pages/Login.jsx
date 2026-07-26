import React, { useState, useEffect } from "react";
import { Play, Settings, RefreshCw, Check, Cloud } from "lucide-react";
import { getApiBase, setApiBase } from "../config";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App as CapApp } from "@capacitor/app";

const Login = () => {
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");
    const [error, setError] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [serverUrlInput, setServerUrlInput] = useState(getApiBase());
    const [savedMsg, setSavedMsg] = useState(false);

    useEffect(() => {
        let appUrlListener;

        // 1. Silent background ping to wake up sleeping Render backend as soon as screen mounts
        const apiBase = getApiBase();
        fetch(`${apiBase}/health`, { mode: 'no-cors' }).catch(() => {});

        // 2. Listen for deep link callbacks on native mobile
        if (Capacitor.isNativePlatform()) {
            appUrlListener = CapApp.addListener('appUrlOpen', async (data) => {
                console.log('App opened with deep link URL:', data?.url);
                try {
                    await Browser.close();
                } catch (_) {}

                if (data?.url && (data.url.includes('callback') || data.url.includes('code='))) {
                    setStatusMsg("Verifying Spotify login...");
                    try {
                        const rawUrl = data.url.replace('aksraag://', 'https://dummy/');
                        const urlObj = new URL(rawUrl);
                        const code = urlObj.searchParams.get('code');
                        const state = urlObj.searchParams.get('state');

                        if (code && state) {
                            const res = await fetch(`${apiBase}/api/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
                            if (res.ok) {
                                // Session polling will capture tokens, reload page
                                window.location.reload();
                                return;
                            }
                        }
                    } catch (err) {
                        console.error("Deep link callback processing error:", err);
                    }
                    window.location.reload();
                }
            });
        }

        return () => {
            if (appUrlListener) appUrlListener.remove();
        };
    }, []);

    const startPolling = (apiBase, state) => {
        let attempts = 0;
        const poll = setInterval(async () => {
            attempts++;
            if (attempts > 120) { // Stop polling after 2 minutes
                clearInterval(poll);
                setLoading(false);
                setStatusMsg("");
                return;
            }
            try {
                const check = await fetch(`${apiBase}/api/auth/check-session?state=${encodeURIComponent(state)}`);
                if (check.ok) {
                    const statusData = await check.json();
                    if (statusData.loggedIn) {
                        clearInterval(poll);
                        // Save tokens locally so the app stays logged in permanently on mobile WebView
                        if (statusData.access_token) {
                            localStorage.setItem('spotify_access_token', statusData.access_token);
                        }
                        if (statusData.refresh_token) {
                            localStorage.setItem('spotify_refresh_token', statusData.refresh_token);
                        }
                        try { await Browser.close(); } catch (_) {}
                        window.location.reload();
                    }
                }
            } catch (_) {}
        }, 1000);
    };

    const handleLogin = async () => {
        setLoading(true);
        setError(null);
        setStatusMsg("Connecting to backend...");

        const apiBase = getApiBase();

        // 45-second timeout allowing Render cold-start to complete cleanly
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        // Update status text at 8 seconds if server is waking up from sleep
        const progressTimer = setTimeout(() => {
            setStatusMsg("Waking up cloud server... Please wait");
        }, 8000);

        try {
            const res = await fetch(`${apiBase}/api/auth/url`, { 
                signal: controller.signal 
            });
            clearTimeout(timeoutId);
            clearTimeout(progressTimer);

            if (!res.ok) {
                throw new Error(`Server returned status ${res.status}`);
            }

            const data = await res.json();
            if (!data.url || !data.state) {
                throw new Error("Invalid authorization URL returned from server");
            }

            const spotifyUrl = data.url;
            const state = data.state;

            setStatusMsg("Opening Spotify...");

            // Desktop Electron handling
            if (window.electronAPI && window.electronAPI.openExternal) {
                window.electronAPI.openExternal(spotifyUrl);
                startPolling(apiBase, state);
                return;
            }

            // Native Mobile App (Capacitor) handling
            if (Capacitor.isNativePlatform()) {
                const finishedListener = await Browser.addListener('browserFinished', () => {
                    setLoading(false);
                    setStatusMsg("");
                    finishedListener.remove();
                });

                await Browser.open({ url: spotifyUrl });
                startPolling(apiBase, state);
                return;
            }

            // Standard Web Browser redirect
            window.location.href = spotifyUrl;

        } catch (err) {
            clearTimeout(timeoutId);
            clearTimeout(progressTimer);
            console.error("Login launch error:", err);
            const isTimeout = err.name === 'AbortError';
            const msg = isTimeout 
                ? `Server request timed out after 45s. Please check if your Render backend is deployed and active.`
                : `Could not connect to backend server (${apiBase}): ${err.message}`;
            setError(msg);
            setLoading(false);
            setStatusMsg("");
        }
    };

    const handleSaveServerUrl = (e) => {
        e.preventDefault();
        setApiBase(serverUrlInput);
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 2000);
        setError(null);
    };

    const defaultUrlLabel = Capacitor.isNativePlatform() 
        ? "https://aks-raag.onrender.com" 
        : "http://127.0.0.1:3001";

    return (
        <div className="login-page" style={{ position: 'relative' }}>
            <div 
                style={{ position: 'absolute', top: '24px', right: '24px', cursor: 'pointer', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#b3b3b3' }}
                onClick={() => setShowSettings(!showSettings)}
            >
                <Settings size={18} />
                <span>Server Config</span>
            </div>

            <h1 className="login-title">Aks Raag</h1>
            <p className="login-subtitle">
                A lightweight, ad-free alternative streaming client. Connect with Spotify to load
                your library, and stream high-quality audio seamlessly.
            </p>

            {error && (
                <div style={{ background: 'rgba(244, 67, 54, 0.1)', border: '1px solid rgba(244, 67, 54, 0.3)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
                    <p style={{ color: '#f44336', margin: 0, fontSize: '13px', lineHeight: '1.4' }}>{error}</p>
                </div>
            )}

            <button className="login-button" onClick={handleLogin} disabled={loading}>
                {loading ? <RefreshCw className="spin" size={20} /> : <Play fill="#000" size={24} />}
                {loading ? (statusMsg || "Opening Spotify...") : "Connect with Spotify"}
            </button>

            {showSettings && (
                <form 
                    onSubmit={handleSaveServerUrl}
                    style={{ marginTop: '24px', background: '#1e1e1e', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '440px', border: '1px solid #333', textAlign: 'left' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Cloud size={16} color="#1ed760" />
                        <label style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>
                            Backend Server URL
                        </label>
                    </div>
                    <p style={{ fontSize: '12px', color: '#b3b3b3', marginTop: 0, marginBottom: '12px', lineHeight: '1.4' }}>
                        Default: {defaultUrlLabel}
                    </p>
                    <input 
                        type="text" 
                        value={serverUrlInput}
                        onChange={(e) => setServerUrlInput(e.target.value)}
                        placeholder={defaultUrlLabel}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', background: '#121212', border: '1px solid #444', color: '#fff', fontSize: '13px', boxSizing: 'border-box', marginBottom: '12px' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button 
                            type="submit"
                            style={{ background: '#1ed760', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            {savedMsg ? <Check size={16} /> : null}
                            {savedMsg ? "Saved!" : "Save"}
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setApiBase(''); setServerUrlInput(getApiBase()); }}
                            style={{ background: 'transparent', color: '#888', border: 'none', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            Reset
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default Login;
