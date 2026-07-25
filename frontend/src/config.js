import { Capacitor } from '@capacitor/core';

/**
 * Smart Dynamic API Base URL configuration.
 * - Electron Desktop App: automatically connects to local Express host (http://127.0.0.1:3001).
 * - Android Mobile App: automatically connects to cloud backend (https://aks-raag.onrender.com).
 * - User override via Server Config panel is preserved (ignores localhost/127.0.0.1 on mobile).
 */

export function getApiBase() {
    const custom = localStorage.getItem('aks_raag_custom_api_base');
    if (custom && custom.trim()) {
        const cleanCustom = custom.trim().replace(/\/+$/, '');
        // On native mobile app, ignore 127.0.0.1/localhost as no local node server runs on the phone
        if (!Capacitor.isNativePlatform() || (!cleanCustom.includes('127.0.0.1') && !cleanCustom.includes('localhost'))) {
            return cleanCustom;
        }
    }

    // In Electron desktop shell: use local port 3001
    if (typeof window !== 'undefined' && window.electronAPI) {
        return 'http://127.0.0.1:3001';
    }

    // Standalone Mobile / Web: use production cloud backend
    return (import.meta.env.VITE_API_BASE || 'https://aks-raag.onrender.com').replace(/\/+$/, '');
}

export function setApiBase(url) {
    if (url && url.trim()) {
        let clean = url.trim().replace(/\/+$/, '');
        if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
            clean = 'https://' + clean;
        }
        localStorage.setItem('aks_raag_custom_api_base', clean);
    } else {
        localStorage.removeItem('aks_raag_custom_api_base');
    }
}

const API_BASE = getApiBase();
export default API_BASE;
