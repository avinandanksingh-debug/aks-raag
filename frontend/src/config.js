import { Capacitor } from '@capacitor/core';

/**
 * Smart Dynamic API Base URL configuration for Aks Raag.
 * - Electron Desktop App: automatically connects to local Express host (http://127.0.0.1:3001).
 * - Standalone Mobile / Web: automatically connects to cloud backend (https://aks-raag.onrender.com).
 * - User override via Server Config panel is preserved.
 */

export function getApiBase() {
    const custom = localStorage.getItem('aks_raag_custom_api_base');
    if (custom && custom.trim()) {
        return custom.trim().replace(/\/+$/, '');
    }

    // In Electron desktop shell: use local port 3001
    if (typeof window !== 'undefined' && window.electronAPI) {
        return 'http://127.0.0.1:3001';
    }

    // Default Mobile / Web app: use cloud backend
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
