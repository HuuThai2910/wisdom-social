import axios, { type AxiosInstance } from "axios";
import { getCookie, setCookie, clearAuthStorage } from "../utils/cookies";

const API_BASE_URL = "http://localhost:8080/api";

const axiosClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

const PUBLIC_ENDPOINTS = [
    '/auth/login',
    '/auth/register',
    '/auth/confirm',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/refresh',
    '/session/qr-login/create',
    '/session/qr-login/status/:sessionId',
    '/session/qr-login/access-token/:sessionId',
    '/session/qr-login/access-token',
];

const isPublicEndpoint = (url?: string): boolean => {
    if (!url) return false;
    return PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

// Token refresh queueing
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

// Decode JWT payload (without verification)
function decodeJwtPayload(token: string): Record<string, any> | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const decoded = JSON.parse(atob(parts[1]));
        return decoded;
    } catch {
        return null;
    }
}

// Check if token expires in next N seconds
function isTokenExpiringSoon(token: string, marginSeconds = 60): boolean {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return true;
    const expiresAt = payload.exp * 1000;
    return Date.now() >= expiresAt - marginSeconds * 1000;
}

// Get tokens from localStorage/cookies
function getAccessToken(): string | null {
    return getCookie('accessToken');
}

function getRefreshToken(): string | null {
    const authType = localStorage.getItem('type');
    if (authType === 'qr') {
        return getCookie('refreshTokenQr');
    }

    return getCookie('refreshToken');
}

// Refresh the access token
async function doRefreshToken(): Promise<string | null> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
        const authType = localStorage.getItem('type');
        const isQrAuth = authType === 'qr';

        const response = await axiosClient.get(
            isQrAuth ? `/session/qr-login/access-token` : `/auth/refresh`,
            {
            // Use axios directly to avoid interceptors, passing the matching refresh cookie in the request.
            headers: {
                Cookie: isQrAuth
                    ? `refreshTokenQr=${refreshToken}`
                    : `refreshToken=${refreshToken}`,
            },
            timeout: 15000,
            }
        );

        let newAccessToken: string = response.data;

        // Handle various response formats
        if (typeof newAccessToken === 'object' && newAccessToken !== null) {
            newAccessToken = (newAccessToken as any).data ?? (newAccessToken as any).accessToken ?? (newAccessToken as any).token ?? '';
        }

        // Ensure we have a valid token string
        if (typeof newAccessToken === 'string') {
            newAccessToken = newAccessToken.replace(/^"|"$/g, '').trim();
        }

        if (newAccessToken && typeof newAccessToken === 'string' && newAccessToken.length > 20) {
            // Save new token to cookie only (not localStorage for security)
            setCookie('accessToken', newAccessToken, 0.042); // 1 hour
            return newAccessToken;
        }
        return null;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
    }
}

// Ensure fresh token with deduplication
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

// Request interceptor: Proactive token refresh
axiosClient.interceptors.request.use(
    async (config) => {
        // Skip token check for public endpoints
        if (isPublicEndpoint(config.url)) {
            return config;
        }

        const token = getAccessToken();
        if (token && isTokenExpiringSoon(token, 60)) {
            await ensureFreshToken();
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 and retry with refreshed token
axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status;
        const config = error.config;

        // Skip retry for public endpoints
        if (isPublicEndpoint(config?.url)) {
            return Promise.reject(error);
        }

        // Retry on 401 (token expired)
        if (status === 401 && config && !config._retry) {
            config._retry = true;

            const newToken = await ensureFreshToken();
            if (newToken) {
                // Retry the request with new token
                return axiosClient(config);
            } else {
                // Token refresh failed, clear auth and redirect to login
                clearAuthStorage();

                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error);
    }
);

export default axiosClient;

