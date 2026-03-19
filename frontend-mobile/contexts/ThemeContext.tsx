import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { getSettings, saveSettings } from '../utils/storage';
import deviceSettingService from '../services/deviceSettingService';
import { getDeviceInfo } from '../utils/deviceInfo';
import { useAuth } from './AuthContext';

export interface ThemeColors {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    inputBg: string;
    primary: string;
    primaryText: string;
    tabActive: string;
    tabInactive: string;
    overlay: string;
    danger: string;
    dangerBg: string;
    success: string;
    successBg: string;
    warning: string;
    warningBg: string;
    error: string;
    errorBg: string;
    badge: string;
    shadow: string;
    chipBg: string;
    statusBar: 'light' | 'dark';
}

const lightColors: ThemeColors = {
    background: '#F5F5F7',
    card: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    border: '#E5E7EB',
    inputBg: '#F9FAFB',
    primary: '#111827',
    primaryText: '#FFFFFF',
    tabActive: '#111827',
    tabInactive: '#737373',
    overlay: 'rgba(0,0,0,0.45)',
    danger: '#EF4444',
    dangerBg: '#FEF2F2',
    success: '#22C55E',
    successBg: '#F0FDF4',
    warning: '#F59E0B',
    warningBg: '#FFFBEB',
    error: '#EF4444',
    errorBg: '#FEF2F2',
    badge: '#EF4444',
    shadow: '#000',
    chipBg: '#F3F4F6',
    statusBar: 'dark',
};

const darkColors: ThemeColors = {
    background: '#0F172A',
    card: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    border: '#334155',
    inputBg: '#1E293B',
    primary: '#3B82F6',
    primaryText: '#FFFFFF',
    tabActive: '#F1F5F9',
    tabInactive: '#64748B',
    overlay: 'rgba(0,0,0,0.7)',
    danger: '#EF4444',
    dangerBg: '#1E1215',
    success: '#22C55E',
    successBg: '#052E16',
    warning: '#F59E0B',
    warningBg: '#1C1917',
    error: '#EF4444',
    errorBg: '#1E1215',
    badge: '#EF4444',
    shadow: '#000',
    chipBg: '#334155',
    statusBar: 'light',
};

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    isDark: boolean;
    themeMode: ThemeMode;
    colors: ThemeColors;
    setThemeMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
    const { user } = useAuth();

    useEffect(() => {
        loadTheme();
    }, [user]);

    const loadTheme = async () => {
        try {
            if (user) {
                const info = await getDeviceInfo();
                const remote = await deviceSettingService.get(info.deviceName, info.deviceType);
                if (remote?.themeMode) {
                    setThemeModeState(remote.themeMode as ThemeMode);
                    const settings = await getSettings();
                    await saveSettings({ ...settings, themeMode: remote.themeMode });
                    return;
                }
            }
            const settings = await getSettings();
            if (settings?.themeMode) {
                setThemeModeState(settings.themeMode as ThemeMode);
            }
        } catch (_) {}
    };

    const setThemeMode = async (mode: ThemeMode) => {
        setThemeModeState(mode);
        try {
            const settings = await getSettings();
            await saveSettings({ ...settings, themeMode: mode });
            if (user) {
                const info = await getDeviceInfo();
                await deviceSettingService.save({
                    deviceName: info.deviceName,
                    deviceType: info.deviceType,
                    themeMode: mode,
                });
            }
        } catch (_) {}
    };

    const toggleTheme = () => {
        const newMode = isDark ? 'light' : 'dark';
        setThemeMode(newMode);
    };

    const isDark = themeMode === 'system'
        ? systemScheme === 'dark'
        : themeMode === 'dark';

    const colors = isDark ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ isDark, themeMode, colors, setThemeMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};
