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

// Helper function to convert phone to international format
const convertPhoneToInternational = (phone: string): string => {
    if (!phone) return '';
    if (phone.startsWith('+84')) return phone;
    if (phone.startsWith('0')) return '+84' + phone.substring(1);
    if (phone.startsWith('84')) return '+' + phone;
    return '+84' + phone;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            checkAuth();
        }, 100);
        
        return () => clearTimeout(timer);
    }, []);

    // Subscribe to profile updates via WebSocket
    useEffect(() => {
        if (!user?.phone) return;

        const handleProfileUpdate = (message: any) => {
            try {
                const updatedUser = typeof message === 'string' ? JSON.parse(message) : message;
                console.log('📱 Profile updated via WebSocket:', updatedUser);
                setUser(updatedUser);
                saveUser(updatedUser);
            } catch (error) {
                console.error('❌ Error parsing profile update:', error);
            }
        };

        const setupProfileUpdates = async () => {
            try {
                const internationalPhone = convertPhoneToInternational(user.phone);

                // Subscribe to profile update events
                websocketService.on('profile-update', handleProfileUpdate);

                console.log('✅ Subscribed to profile updates for:', internationalPhone);
            } catch (error) {
                console.error('❌ Error setting up profile updates:', error);
            }
        };

        setupProfileUpdates();

        // Cleanup: unsubscribe when component unmounts or user changes
        return () => {
            websocketService.off('profile-update', handleProfileUpdate);
        };
    }, [user?.phone]);

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
        const response = await authService.login({ phone, password });
        if (response) {
            await new Promise(resolve => setTimeout(resolve, 100));
            const userData = await getUser();
            setUser(userData);
            await websocketService.connect();
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
