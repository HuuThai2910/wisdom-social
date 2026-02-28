import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUser, getToken, clearStorage, saveUser } from '../utils/storage';
import authService from '../services/authService';
import websocketService from '../services/websocketService';

interface AuthContextType {
    user: any | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (phone: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    updateUser: (userData: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Add small delay to ensure AsyncStorage native module is ready
        const timer = setTimeout(() => {
            checkAuth();
        }, 100);
        
        return () => clearTimeout(timer);
    }, []);

    const checkAuth = async () => {
        try {
            setIsLoading(true);
            const token = await getToken();
            if (token) {
                const userData = await getUser();
                setUser(userData);
                if (userData) {
                    await websocketService.connect();
                }
            }
        } catch (error) {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (phone: string, password: string) => {
        try {
            const response = await authService.login({ phone, password });
            if (response) {
                await new Promise(resolve => setTimeout(resolve, 100));
                const userData = await getUser();
                setUser(userData);
                await websocketService.connect();
            }
        } catch (error) {
            console.error('Login error:', error);
        }
    };

    const logout = async () => {
        try {
            websocketService.disconnect();
            await authService.logout();
            setUser(null);
        } catch (error) {
            setUser(null);
        }
    };

    const updateUser = async (userData: any) => {
        setUser(userData);
        await saveUser(userData);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout,
                checkAuth,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
