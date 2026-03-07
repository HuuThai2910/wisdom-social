import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const ID_TOKEN_KEY = 'idToken';
const USER_KEY = 'user';
const SETTINGS_KEY = 'appSettings';

const memoryStorage: { [key: string]: string } = {};

const storage = {
    async setItem(key: string, value: string): Promise<void> {
        try {
            await AsyncStorage.setItem(key, value);
        } catch (error: any) {
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
            if (error.message?.includes('Native module is null')) {
                delete memoryStorage[key];
            } else {
                throw error;
            }
        }
    }
};

export const saveToken = async (token: string): Promise<void> => {
    try {
        await storage.setItem(TOKEN_KEY, token);
    } catch {}
};

export const getToken = async (): Promise<string | null> => {
    try {
        return await storage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
};

export const saveRefreshToken = async (token: string): Promise<void> => {
    try {
        await storage.setItem(REFRESH_TOKEN_KEY, token);
    } catch {}
};

export const getRefreshToken = async (): Promise<string | null> => {
    try {
        return await storage.getItem(REFRESH_TOKEN_KEY);
    } catch {
        return null;
    }
};

export const saveIdToken = async (token: string): Promise<void> => {
    try {
        await storage.setItem(ID_TOKEN_KEY, token);
    } catch {}
};

export const getIdToken = async (): Promise<string | null> => {
    try {
        return await storage.getItem(ID_TOKEN_KEY);
    } catch {
        return null;
    }
};

export const saveUser = async (user: any): Promise<void> => {
    try {
        await storage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
};

export const getUser = async (): Promise<any | null> => {
    try {
        const userJson = await storage.getItem(USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    } catch {
        return null;
    }
};

export const clearStorage = async (): Promise<void> => {
    try {
        await Promise.all([
            storage.removeItem(TOKEN_KEY),
            storage.removeItem(REFRESH_TOKEN_KEY),
            storage.removeItem(ID_TOKEN_KEY),
            storage.removeItem(USER_KEY)
        ]);
    } catch {}
};

export const saveSettings = async (settings: any): Promise<void> => {
    try {
        await storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
};

export const getSettings = async (): Promise<any | null> => {
    try {
        const settingsJson = await storage.getItem(SETTINGS_KEY);
        return settingsJson ? JSON.parse(settingsJson) : null;
    } catch {
        return null;
    }
};
