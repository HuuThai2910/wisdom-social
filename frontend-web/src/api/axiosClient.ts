import axios, { type AxiosInstance } from "axios";
import { getIdToken, getRefreshToken, saveIdToken, clearStorage } from '../utils/storage';

const axiosClient: AxiosInstance = axios.create({
    baseURL: "http://localhost/api",
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
    '/session/qr-login/create',
    '/session/qr-login/status',
];

const isPublicEndpoint = (url?: string): boolean => {
    if (!url) return false;
    return PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

function decodeJwtPayload(token: string): any | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (payload.length % 4 !== 0) payload += '=';
        const json = atob(payload);
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function isTokenExpiringSoon(token: string, marginSeconds = 60): boolean {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return true;
    const expiresAt = payload.exp * 1000;
    return Date.now() >= expiresAt - marginSeconds * 1000;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function doRefreshToken(): Promise<string | null> {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
        return null;
    }

    try {
        const refreshResponse = await axios.get(`http://localhost/api/auth/refresh`, {
            headers: { Cookie: `refreshToken=${refreshToken}` },
            timeout: 15000,
        });

        let newIdToken: string = refreshResponse.data;

        if (typeof newIdToken === 'object' && newIdToken !== null) {
            newIdToken = (newIdToken as any).data ?? (newIdToken as any).idToken ?? '';
        }

        if (typeof newIdToken === 'string') {
            newIdToken = newIdToken.replace(/^"|"$/g, '').trim();
        }

        if (newIdToken && typeof newIdToken === 'string' && newIdToken.length > 20) {
            await saveIdToken(newIdToken);
            return newIdToken;
        } else {
            return null;
        }
    } catch (err) {
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

axiosClient.interceptors.request.use(
    async (config) => {
        if (isPublicEndpoint(config.url)) {
            return config;
        }

        try {
            let idToken = await getIdToken();
            const refreshToken = await getRefreshToken();

            if (idToken && isTokenExpiringSoon(idToken, 60)) {
                const newToken = await ensureFreshToken();
                if (newToken) {
                    idToken = newToken;
                }
            }

            const cookieParts: string[] = [];
            if (idToken) cookieParts.push(`accessToken=${idToken}`);
            if (refreshToken) cookieParts.push(`refreshToken=${refreshToken}`);
            if (cookieParts.length > 0) {
                config.headers.Cookie = cookieParts.join('; ');
            }
        } catch (_) {}

        return config;
    },
    (error) => Promise.reject(error)
);

<<<<<<< HEAD
axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;

        if ((status === 401 || status === 403) && !originalRequest?._retry && !isPublicEndpoint(originalRequest?.url)) {
            originalRequest._retry = true;

            try {
                const newIdToken = await ensureFreshToken();
                if (newIdToken) {
                    const refreshToken = await getRefreshToken();
                    originalRequest.headers.Cookie = `accessToken=${newIdToken}; refreshToken=${refreshToken || ''}`;
                    return axiosClient(originalRequest);
                } else {
                    await clearStorage();
                }
            } catch (refreshError) {
                await clearStorage();
            }
        }

        return Promise.reject(error);
    }
);

=======
>>>>>>> bfd5bdfd71129f50ffa398818af7f7cabeff2333
export default axiosClient;

