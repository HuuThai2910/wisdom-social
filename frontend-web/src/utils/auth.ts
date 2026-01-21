// Authentication utilities using localStorage

const AUTH_KEY = 'authed';
const USER_KEY = 'current_user';

export const login = (username: string, password: string): boolean => {
    // Mock authentication - in real app, this would call an API
    if (username && password) {
        localStorage.setItem(AUTH_KEY, 'true');
        // Store user info (in real app, this would come from API)
        localStorage.setItem(USER_KEY, JSON.stringify({
            username,
            fullName: 'Robert Fox',
            avatar: 'https://i.pravatar.cc/150?img=5'
        }));
        return true;
    }
    return false;
};

export const logout = (): void => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = (): boolean => {
    return localStorage.getItem(AUTH_KEY) === 'true';
};

export const getCurrentUser = () => {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
};
