import axios from 'axios';
import { Platform } from 'react-native';
import { getIdToken, getRefreshToken, saveIdToken, clearStorage } from '../utils/storage';

const API_URL = Platform.select({
    android: 'http://10.0.2.2:8080/api',
    ios: 'http://192.168.1.150:8080/api',
    default: 'http://10.0.2.2:8080/api',
});

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
    '/auth/login',
    '/auth/register',
    '/auth/confirm',
    '/auth/forgot-password',
    '/auth/reset-password',
];

const isPublicEndpoint = (url?: string): boolean => {
    if (!url) return false;
    return PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

// ─── JWT helper: decode payload without verification ───
function decodeJwtPayload(token: string): any | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        // Base64url → Base64 → decode
        let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (payload.length % 4 !== 0) payload += '=';
        const json = atob(payload);
        return JSON.parse(json);
    } catch {
        return null;
    }
}

// Check if token expires within `marginSeconds` seconds
function isTokenExpiringSoon(token: string, marginSeconds = 60): boolean {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return true; // can't tell → treat as expired
    const expiresAt = payload.exp * 1000; // seconds → ms
    return Date.now() >= expiresAt - marginSeconds * 1000;
}

// ─── Refresh lock to prevent concurrent refreshes ───
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function doRefreshToken(): Promise<string | null> {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
        console.log('[Auth] No refresh token found');
        return null;
    }

    try {
        console.log('[Auth] Refreshing idToken...');
        const refreshResponse = await axios.get(`${API_URL}/auth/refresh`, {
            headers: { Cookie: `refreshToken=${refreshToken}` },
            timeout: 15000,
        });

        // Backend returns new idToken as plain String (FormatApiResponse passes String as-is)
        let newIdToken: string = refreshResponse.data;

        // If response was unexpectedly JSON-wrapped, extract the string
        if (typeof newIdToken === 'object' && newIdToken !== null) {
            newIdToken = (newIdToken as any).data ?? (newIdToken as any).idToken ?? '';
        }

        // Strip surrounding quotes if present
        if (typeof newIdToken === 'string') {
            newIdToken = newIdToken.replace(/^"|"$/g, '').trim();
        }

        if (newIdToken && typeof newIdToken === 'string' && newIdToken.length > 20) {
            await saveIdToken(newIdToken);
            console.log('[Auth] Token refreshed successfully');
            return newIdToken;
        } else {
            console.error('[Auth] Refresh returned invalid token');
            return null;
        }
    } catch (err) {
        console.error('[Auth] Token refresh failed:', err);
        return null;
    }
}

async function ensureFreshToken(): Promise<string | null> {
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }
    isRefreshing = true;
    refreshPromise = doRefreshToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
    });
    return refreshPromise;
}

// ─── Request interceptor: proactive refresh + attach cookies ───
apiClient.interceptors.request.use(
    async (config) => {
        if (isPublicEndpoint(config.url)) {
            return config;
        }

        try {
            let idToken = await getIdToken();
            const refreshToken = await getRefreshToken();

            // Proactive refresh: if idToken is about to expire (< 60s), refresh now
            if (idToken && isTokenExpiringSoon(idToken, 60)) {
                console.log('[Auth] idToken expiring soon, refreshing proactively...');
                const newToken = await ensureFreshToken();
                if (newToken) {
                    idToken = newToken;
                }
            }

            const cookieParts: string[] = [];
            if (idToken) cookieParts.push(`idToken=${idToken}`);
            if (refreshToken) cookieParts.push(`refreshToken=${refreshToken}`);
            if (cookieParts.length > 0) {
                config.headers.Cookie = cookieParts.join('; ');
            }
        } catch (_) {}

        return config;
    },
    (error) => Promise.reject(error)
);

// ─── Response interceptor: retry on 401 OR 403 ───
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;

        // Backend returns 403 when idToken is expired/invalid (Spring Security default)
        if ((status === 401 || status === 403) && !originalRequest?._retry && !isPublicEndpoint(originalRequest?.url)) {
            originalRequest._retry = true;

            try {
                const newIdToken = await ensureFreshToken();
                if (newIdToken) {
                    const refreshToken = await getRefreshToken();
                    originalRequest.headers.Cookie = `idToken=${newIdToken}; refreshToken=${refreshToken || ''}`;
                    return apiClient(originalRequest);
                } else {
                    console.log('[Auth] Refresh failed, clearing session');
                    await clearStorage();
                }
            } catch (refreshError) {
                console.error('[Auth] Refresh error in interceptor:', refreshError);
                await clearStorage();
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
