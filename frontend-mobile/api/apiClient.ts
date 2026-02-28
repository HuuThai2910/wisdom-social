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

// Request interceptor: attach idToken + refreshToken as Cookie
apiClient.interceptors.request.use(
    async (config) => {
        if (isPublicEndpoint(config.url)) {
            return config;
        }

        try {
            const idToken = await getIdToken();
            const refreshToken = await getRefreshToken();
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

// Response interceptor: refresh idToken on 401 then retry
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest?._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = await getRefreshToken();
                if (refreshToken) {
                    // Call refresh endpoint directly (bypasses apiClient interceptors)
                    const refreshResponse = await axios.get(`${API_URL}/auth/refresh`, {
                        headers: { Cookie: `refreshToken=${refreshToken}` },
                        timeout: 10000,
                    });

                    const newIdToken: string = refreshResponse.data;
                    if (newIdToken && typeof newIdToken === 'string') {
                        await saveIdToken(newIdToken);

                        // Rebuild cookie and retry original request
                        const cookieParts = [`idToken=${newIdToken}`];
                        cookieParts.push(`refreshToken=${refreshToken}`);
                        originalRequest.headers.Cookie = cookieParts.join('; ');
                        return apiClient(originalRequest);
                    }
                }
            } catch (_) {
                await clearStorage();
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
