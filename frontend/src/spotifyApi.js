import axios from 'axios';
import { getApiBase } from './config';

/**
 * Spotify API client with automatic token refresh.
 * 
 * When a request gets a 401 (token expired), this automatically:
 * 1. Calls /api/auth/refresh_token with the stored refresh_token
 * 2. Saves the new access_token to localStorage
 * 3. Retries the original request with the fresh token
 */

const spotifyApi = axios.create();

// Track if a refresh is already in-flight to avoid concurrent refreshes
let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(newToken) {
    refreshSubscribers.forEach(cb => cb(newToken));
    refreshSubscribers = [];
}

function addRefreshSubscriber(cb) {
    refreshSubscribers.push(cb);
}

spotifyApi.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only intercept 401s from Spotify API, and only retry once
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // Only intercept requests to api.spotify.com
        if (!originalRequest.url?.includes('api.spotify.com')) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        const refreshToken = localStorage.getItem('spotify_refresh_token');
        if (!refreshToken) {
            // No refresh token available — user needs to re-login
            localStorage.removeItem('spotify_access_token');
            return Promise.reject(error);
        }

        if (isRefreshing) {
            // Another refresh is already in-flight; queue this request
            return new Promise((resolve) => {
                addRefreshSubscriber((newToken) => {
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                    resolve(spotifyApi(originalRequest));
                });
            });
        }

        isRefreshing = true;

        try {
            const apiBase = getApiBase();
            const res = await axios.get(`${apiBase}/api/auth/refresh_token`, {
                headers: { 'x-refresh-token': refreshToken },
                withCredentials: true,
                timeout: 10000,
            });

            const newAccessToken = res.data.access_token;
            if (newAccessToken) {
                localStorage.setItem('spotify_access_token', newAccessToken);
                onRefreshed(newAccessToken);

                // Retry the original request with the fresh token
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                return spotifyApi(originalRequest);
            }
        } catch (refreshError) {
            console.error('[Token Refresh] Failed to refresh token:', refreshError.message);
            // Refresh failed — clear tokens so user re-logs in
            localStorage.removeItem('spotify_access_token');
            localStorage.removeItem('spotify_refresh_token');
        } finally {
            isRefreshing = false;
        }

        return Promise.reject(error);
    }
);

export default spotifyApi;
