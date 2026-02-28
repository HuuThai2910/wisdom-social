import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const ID_TOKEN_KEY = 'idToken';
const USER_KEY = 'user';

// In-memory fallback for when AsyncStorage is not available
const memoryStorage: { [key: string]: string } = {};

// Storage wrapper with fallback
const storage = {
    async setItem(key: string, value: string): Promise<void> {
        try {
            await AsyncStorage.setItem(key, value);
        } catch (error: any) {
            // Fallback to memory storage if native module fails
            if (error.message?.includes('Native module is null')) {
                memoryStorage[key] = value;
            } else {
                throw error;
            }
        }
    },
    
    async getItem(key: string): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(key);
        } catch (error: any) {
            // Fallback to memory storage if native module fails
            if (error.message?.includes('Native module is null')) {
                return memoryStorage[key] || null;
            } else {
                throw error;
            }
        }
    },
    
    async removeItem(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(key);
        } catch (error: any) {
            // Fallback to memory storage if native module fails
            if (error.message?.includes('Native module is null')) {
                delete memoryStorage[key];
            } else {
                throw error;
            }
        }
    }
};

// Token storage
export const saveToken = async (token: string): Promise<void> => {
    try {
        await storage.setItem(TOKEN_KEY, token);
    } catch (error) {
        console.error('Error saving token:', error);
    }
};

export const getToken = async (): Promise<string | null> => {
    try {
        return await storage.getItem(TOKEN_KEY);
    } catch (error: any) {
        console.error('Error getting token:', error);
        return null;
    }
};

export const saveRefreshToken = async (token: string): Promise<void> => {
    try {
        await storage.setItem(REFRESH_TOKEN_KEY, token);
    } catch (error) {
        console.error('Error saving refresh token:', error);
    }
};

export const getRefreshToken = async (): Promise<string | null> => {
    try {
        return await storage.getItem(REFRESH_TOKEN_KEY);
    } catch (error: any) {
        console.error('Error getting refresh token:', error);
        return null;
    }
};

export const saveIdToken = async (token: string): Promise<void> => {
    try {
        await storage.setItem(ID_TOKEN_KEY, token);
    } catch (error) {
        console.error('Error saving ID token:', error);
    }
};

export const getIdToken = async (): Promise<string | null> => {
    try {
        const token = await storage.getItem(ID_TOKEN_KEY);
        return token;
    } catch (error: any) {
        console.error('Error getting ID token:', error);
        return null;
    }
};

// User storage
export const saveUser = async (user: any): Promise<void> => {
    try {
        await storage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
        console.error('Error saving user:', error);
    }
};

export const getUser = async (): Promise<any | null> => {
    try {
        const userJson = await storage.getItem(USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
};

// Clear all data
export const clearStorage = async (): Promise<void> => {
    try {
        await Promise.all([
            storage.removeItem(TOKEN_KEY),
            storage.removeItem(REFRESH_TOKEN_KEY),
            storage.removeItem(ID_TOKEN_KEY),
            storage.removeItem(USER_KEY)
        ]);
    } catch (error) {
        console.error('Error clearing storage:', error);
    }
};
