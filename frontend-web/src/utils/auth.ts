import { setCookie, getCookie, deleteCookie } from './cookies';
import userService, { UserRequestLogin, UserRequestRegister, UserRequestForgotPassword, UserRequestResetPassword } from '../services/userService';

const AUTH_KEY = 'authed';
const USER_KEY = 'current_user';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

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

export const register = async (phone: string, username: string, password: string): Promise<boolean> => {
    try {
        const data: UserRequestRegister = {
            phone,
            username,
            password
        };
        const response = await userService.register(data);

        if (!response.success) {
            throw new Error(response.message || 'Đăng ký thất bại');
        }

        console.log('Registration successful:', response.data);
        return true;
    } catch (error: any) {
        console.error('Register error:', error);
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        if (error.message) {
            throw error;
        }
        throw new Error('Đăng ký thất bại. Vui lòng thử lại.');
    }
};

export const confirmRegister = async (phone: string, otp: string): Promise<boolean> => {
    try {
        const response = await userService.confirmRegister({ phone, otp });

        if (!response.success || !response.data?.token) {
            throw new Error(response.message || 'Xác nhận OTP thất bại');
        }

        const { token, userId, username } = response.data;

        // Store token
        setCookie(ACCESS_TOKEN_KEY, token, 7);
        localStorage.setItem(AUTH_KEY, 'true');
        localStorage.setItem(USER_KEY, JSON.stringify({
            id: userId,
            username,
            phone,
            fullName: username
        }));

        if (authChangeCallback) {
            authChangeCallback();
        }
        return true;
    } catch (error: any) {
        console.error('Confirm register error:', error);
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw new Error('Xác nhận OTP thất bại. Vui lòng thử lại.');
    }
};

export const login = async (phone: string, password: string): Promise<boolean> => {
    try {
        const data: UserRequestLogin = {
            phone,
            password
        };

        const response = await userService.login(data);

        console.log('Login response:', response.data);

        if (!response.success || !response.data) {
            throw new Error(response.message || 'Số điện thoại hoặc mật khẩu không chính xác.');
        }

        const userData = response.data;
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

export const logout = async (): Promise<void> => {
    try {
        // Call logout API
        await userService.logout();

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
    } catch (error) {
        console.error('Logout error:', error);
        // Still clear local data even if API call fails
        deleteCookie(ACCESS_TOKEN_KEY);
        deleteCookie(REFRESH_TOKEN_KEY);
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(USER_KEY);

        if (authChangeCallback) {
            authChangeCallback();
        }
    }
};

export const forgotPassword = async (phone: string): Promise<{ otpId: string; expiresIn: number }> => {
    try {
        const data: UserRequestForgotPassword = { phone };
        const response = await userService.forgotPassword(data);

        if (!response.success || !response.data) {
            throw new Error(response.message || 'Gửi OTP thất bại');
        }

        return response.data;
    } catch (error: any) {
        console.error('Forgot password error:', error);
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw new Error('Gửi OTP thất bại. Vui lòng thử lại.');
    }
};

export const resetPassword = async (phone: string, otp: string, newPassword: string): Promise<boolean> => {
    try {
        const data: UserRequestResetPassword = { phone, otp, newPassword };
        const response = await userService.resetPassword(data);

        if (!response) {
            throw new Error('Cập nhật mật khẩu thất bại');
        }

        console.log('Password reset successful');
        return true;
    } catch (error: any) {
        console.error('Reset password error:', error);
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw new Error('Cập nhật mật khẩu thất bại. Vui lòng thử lại.');
    }
};

export const refreshTokenAsync = async (): Promise<string> => {
    try {
        const token = await userService.refreshToken();
        if (token) {
            setCookie(ACCESS_TOKEN_KEY, token, 7);
            return token;
        }
        throw new Error('Refresh token failed');
    } catch (error) {
        console.error('Refresh token error:', error);
        throw error;
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
