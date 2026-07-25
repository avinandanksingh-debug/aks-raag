/**
 * Official Spotify PKCE (Proof Key for Code Exchange) OAuth Helper
 * Enables serverless, client-side authentication for Android & Mobile Apps.
 */

export const CLIENT_ID = "afe50167e9a44d7fb99dfe22a75cbe4a";
export const DEFAULT_REDIRECT_URI = "http://127.0.0.1:3001/api/auth/callback";

export const SCOPES = [
    "user-read-private",
    "user-read-email",
    "user-library-read",
    "playlist-read-private",
    "playlist-read-collaborative"
].join(" ");

export function createSpotifyImplicitUrl(redirectUri = DEFAULT_REDIRECT_URI) {
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: "token",
        redirect_uri: redirectUri,
        scope: SCOPES,
        show_dialog: "true"
    });
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

import sha256 from 'crypto-js/sha256.js';
import encBase64 from 'crypto-js/enc-base64.js';

function generateRandomString(length = 64) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    
    try {
        if (window.crypto && window.crypto.getRandomValues) {
            const values = new Uint8Array(length);
            window.crypto.getRandomValues(values);
            for (let i = 0; i < length; i++) {
                text += possible.charAt(values[i] % possible.length);
            }
            return text;
        }
    } catch (e) {
        console.warn("crypto.getRandomValues failed, falling back to Math.random", e);
    }

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    const hash = sha256(codeVerifier);
    const base64Digest = encBase64.stringify(hash);
    return base64Digest
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export async function createSpotifyPkceUrl(redirectUri = DEFAULT_REDIRECT_URI) {
    const verifier = generateRandomString(64);
    const challenge = await generateCodeChallenge(verifier);
    localStorage.setItem("spotify_pkce_verifier", verifier);
    localStorage.setItem("spotify_pkce_redirect_uri", redirectUri);

    const params = new URLSearchParams({
        response_type: "code",
        client_id: CLIENT_ID,
        scope: SCOPES,
        code_challenge_method: "S256",
        code_challenge: challenge,
        redirect_uri: redirectUri,
        show_dialog: "true"
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code, customRedirectUri = null) {
    const verifier = localStorage.getItem("spotify_pkce_verifier");
    const redirectUri = customRedirectUri || localStorage.getItem("spotify_pkce_redirect_uri") || DEFAULT_REDIRECT_URI;
    
    if (!verifier) {
        // Fallback dummy verifier if state was cleared
        console.warn("PKCE verifier missing, generating fallback...");
    }

    const body = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
        code_verifier: verifier || generateRandomString(64)
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
    });

    if (!response.ok) {
        // Try fallback redirect URI if first one failed match
        if (redirectUri !== "http://127.0.0.1:3001/api/auth/callback") {
            return exchangeCodeForTokens(code, "http://127.0.0.1:3001/api/auth/callback");
        }
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${errorText}`);
    }

    const data = await response.json();
    localStorage.setItem("spotify_access_token", data.access_token);
    if (data.refresh_token) {
        localStorage.setItem("spotify_refresh_token", data.refresh_token);
    }
    localStorage.setItem("spotify_token_expires_at", Date.now() + (data.expires_in * 1000));
    return data;
}

export async function refreshAccessToken() {
    const refreshToken = localStorage.getItem("spotify_refresh_token");
    if (!refreshToken) return null;

    const body = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: refreshToken
    });

    try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body.toString()
        });

        if (!response.ok) return null;

        const data = await response.json();
        localStorage.setItem("spotify_access_token", data.access_token);
        if (data.refresh_token) {
            localStorage.setItem("spotify_refresh_token", data.refresh_token);
        }
        localStorage.setItem("spotify_token_expires_at", Date.now() + (data.expires_in * 1000));
        return data.access_token;
    } catch (_) {
        return null;
    }
}
