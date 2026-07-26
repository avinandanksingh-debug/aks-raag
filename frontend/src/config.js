import { Capacitor } from '@capacitor/core';

/**
 * Smart Dynamic API Base URL configuration for Aks Raag.
 * - Defaults to Local Termux / Express Server (http://127.0.0.1:3001).
 * - User override via Server Config panel is preserved.
 */

export function getApiBase() {
    const custom = localStorage.getItem('aks_raag_custom_api_base');
    if (custom && custom.trim()) {
        return custom.trim().replace(/\/+$/, '');
    }

    // In Electron desktop shell or Native Mobile (Termux local server)
    return 'http://127.0.0.1:3001';
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
