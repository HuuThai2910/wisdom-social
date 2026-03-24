// Authentication utilities using localStorage
import axios from 'axios';

const AUTH_KEY = 'authed';
const USER_KEY = 'current_user';
const TOKEN_KEY = 'token';
const API_BASE_URL = 'http://localhost:8080/api';

// Callback để thông báo khi auth state thay đổi
let authChangeCallback: (() => void) | null = null;

export const setAuthChangeCallback = (callback: () => void) => {
    authChangeCallback = callback;
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

            // Store JWT token
            localStorage.setItem(TOKEN_KEY, token);
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

            // Set default Authorization header for future requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

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
    return localStorage.getItem(TOKEN_KEY);
};

export const logout = (): void => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    delete axios.defaults.headers.common['Authorization'];
    // Trigger callback để cập nhật AuthContext
    if (authChangeCallback) {
        authChangeCallback();
    }
};

export const isAuthenticated = (): boolean => {
    return localStorage.getItem(AUTH_KEY) === 'true' && !!localStorage.getItem(TOKEN_KEY);
};

export const getCurrentUser = () => {
    const userStr = localStorage.getItem(USER_KEY);
    const user = userStr ? JSON.parse(userStr) : null;
    console.log('getCurrentUser:', user);
    return user;
};
