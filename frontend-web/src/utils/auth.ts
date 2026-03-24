// Authentication utilities using cookies
import axios from 'axios';
import { setCookie, getCookie, deleteCookie } from './cookies';

const AUTH_KEY = 'authed';
const USER_KEY = 'current_user';
const ACCESS_TOKEN_KEY = 'accessToken'; // Cookie name - match backend
const REFRESH_TOKEN_KEY = 'refreshToken'; // Cookie name - match backend
const API_BASE_URL = 'http://localhost:8080/api';

// Callback để thông báo khi auth state thay đổi
let authChangeCallback: (() => void) | null = null;

export const setAuthChangeCallback = (callback: () => void) => {
    authChangeCallback = callback;
};

// Initialize auth - axios will automatically send cookies with withCredentials: true
export const initializeAuth = () => {
    const token = getCookie(ACCESS_TOKEN_KEY);
    if (token) {
        console.log('Auth initialized with token from cookie');
    }
};

export const login = async (phone: string, password: string): Promise<boolean> => {
    try {
        // Call login API with phone and password
        // Get device info
        const deviceInfo = {
            deviceType: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
            deviceName: navigator.userAgent,
        };

        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            phone,
            password,
            ...deviceInfo
        });

        console.log('Login response:', response.data);

        // Backend returns response in format: { success, message, status, data: { ...userData } }
        if (!response.data.success || !response.data.data) {
            throw new Error('Số điện thoại hoặc mật khẩu không chính xác.');
        }

        const userData = response.data.data;
        const token = userData.token;

        if (token) {
            const {
                id,
                phone,
                username,
                name,
                avatarUrl,
                bio,
                birthday,
                gender,
                createdAt
            } = userData;

            // Store JWT token in cookie (accessToken - to match backend filter)
            setCookie(ACCESS_TOKEN_KEY, token, 7); // Expires in 7 days

            // Also save to localStorage for backup/compatibility
            localStorage.setItem(AUTH_KEY, 'true');

            // Store user info with all available fields
            localStorage.setItem(USER_KEY, JSON.stringify({
                id,
                username,
                phone,
                fullName: name || username,
                avatar: avatarUrl,
                bio,
                birthday,
                gender,
                createdAt
            }));

            console.log('Token saved to cookie:', ACCESS_TOKEN_KEY);

            // Trigger callback để cập nhật AuthContext
            if (authChangeCallback) {
                authChangeCallback();
            }
            return true;
        } else {
            throw new Error('Số điện thoại hoặc mật khẩu không chính xác.');
        }
    } catch (error: any) {
        console.error('Login error:', error);
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        if (error.message) {
            throw error;
        }
        throw new Error('Đăng nhập thất bại. Vui lòng thử lại.');
    }
};

export const getToken = (): string | null => {
    return getCookie(ACCESS_TOKEN_KEY);
};

export const logout = (): void => {
    // Remove cookies
    deleteCookie(ACCESS_TOKEN_KEY);
    deleteCookie(REFRESH_TOKEN_KEY);

    // Remove localStorage items
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);

    console.log('Logged out, cookies and localStorage cleared');

    // Trigger callback để cập nhật AuthContext
    if (authChangeCallback) {
        authChangeCallback();
    }
};

export const isAuthenticated = (): boolean => {
    const hasToken = getCookie(ACCESS_TOKEN_KEY) !== null;
    const isAuthed = localStorage.getItem(AUTH_KEY) === 'true';
    return hasToken && isAuthed;
};

export const getCurrentUser = () => {
    const userStr = localStorage.getItem(USER_KEY);
    const user = userStr ? JSON.parse(userStr) : null;
    console.log('getCurrentUser:', user);
    return user;
};
