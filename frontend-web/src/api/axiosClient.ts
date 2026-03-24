import axios, { type AxiosInstance } from "axios";
import { deleteCookie } from "../utils/cookies";

const axiosClient: AxiosInstance = axios.create({
    baseURL: "http://localhost/api",
    withCredentials: true, // Important: Send cookies with requests
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

// No need for request interceptor - backend reads token from cookie automatically
// The cookie is sent automatically with withCredentials: true

// Response interceptor: Handle 401 Unauthorized errors
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;

        // If token is invalid or expired (401), clear auth and redirect to login
        if (status === 401 && !isPublicEndpoint(error.config?.url)) {
            // Clear cookies
            deleteCookie('accessToken');
            deleteCookie('refreshToken');

            // Clear localStorage
            localStorage.removeItem('authed');
            localStorage.removeItem('current_user');

            console.log('401 Unauthorized - cleared auth data');

            // Redirect to login page
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default axiosClient;

