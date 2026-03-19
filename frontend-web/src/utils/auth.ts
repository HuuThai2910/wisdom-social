// Authentication utilities using localStorage
import axios from 'axios';

const AUTH_KEY = 'authed';
const USER_KEY = 'current_user';
const API_BASE_URL = 'http://localhost:8080/api';

// Callback để thông báo khi auth state thay đổi
let authChangeCallback: (() => void) | null = null;

export const setAuthChangeCallback = (callback: () => void) => {
    authChangeCallback = callback;
};

export const login = async (username: string): Promise<boolean> => {
    try {
        // Call test-login API (no password needed)
        const response = await axios.get(`${API_BASE_URL}/auth/test-login`, {
            params: { username }
        });

        console.log('Login response:', response.data);

        if (response.data.success) {
            const userData = response.data.data;
            localStorage.setItem(AUTH_KEY, 'true');
            localStorage.setItem(USER_KEY, JSON.stringify({
                id: userData.userId,
                username: userData.username,
                fullName: userData.name,
                avatar: userData.avatarUrl || 'https://i.pravatar.cc/150?img=5',
                bio: userData.bio,
                phone: userData.phone
            }));
            // Trigger callback để cập nhật AuthContext
            if (authChangeCallback) {
                authChangeCallback();
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error('Login error:', error);
        return false;
    }
};

export const logout = (): void => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    // Trigger callback để cập nhật AuthContext
    if (authChangeCallback) {
        authChangeCallback();
    }
};

export const isAuthenticated = (): boolean => {
    return localStorage.getItem(AUTH_KEY) === 'true';
};

export const getCurrentUser = () => {
    const userStr = localStorage.getItem(USER_KEY);
    const user = userStr ? JSON.parse(userStr) : null;
    console.log('getCurrentUser:', user);
    return user;
};
