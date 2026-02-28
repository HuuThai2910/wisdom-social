import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { getSettings, saveSettings } from '../utils/storage';
import deviceSettingService from '../services/deviceSettingService';
import { getDeviceInfo } from '../utils/deviceInfo';
import { useAuth } from './AuthContext';

interface NotificationSettings {
    pushEnabled: boolean;
    likesEnabled: boolean;
    commentsEnabled: boolean;
    followsEnabled: boolean;
    messagesEnabled: boolean;
    pageUpdatesEnabled: boolean;
}

const defaultNotificationSettings: NotificationSettings = {
    pushEnabled: true,
    likesEnabled: true,
    commentsEnabled: true,
    followsEnabled: true,
    messagesEnabled: true,
    pageUpdatesEnabled: true,
};

interface NotificationContextType {
    notificationSettings: NotificationSettings;
    updateNotificationSetting: (key: keyof NotificationSettings, value: boolean) => void;
    toggleAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
    const { user } = useAuth();

    useEffect(() => {
        loadNotificationSettings();
    }, [user]);

    const loadNotificationSettings = async () => {
        try {
            // Try API first when logged in
            if (user) {
                const info = await getDeviceInfo();
                const remote = await deviceSettingService.get(info.deviceName, info.deviceType);
                if (remote && remote.pushEnabled !== undefined) {
                    const fromApi: NotificationSettings = {
                        pushEnabled: remote.pushEnabled ?? true,
                        likesEnabled: remote.likesEnabled ?? true,
                        commentsEnabled: remote.commentsEnabled ?? true,
                        followsEnabled: remote.followsEnabled ?? true,
                        messagesEnabled: remote.messagesEnabled ?? true,
                        pageUpdatesEnabled: remote.pageUpdatesEnabled ?? true,
                    };
                    setNotificationSettings(fromApi);
                    // Sync to local storage
                    const settings = await getSettings();
                    await saveSettings({ ...settings, notifications: fromApi });
                    return;
                }
            }
            // Fallback to local
            const settings = await getSettings();
            if (settings?.notifications) {
                setNotificationSettings({ ...defaultNotificationSettings, ...settings.notifications });
            }
        } catch (_) {}
    };

    /** Helper: persist updated settings both locally and to API */
    const persistSettings = async (updated: NotificationSettings) => {
        try {
            const settings = await getSettings();
            await saveSettings({ ...settings, notifications: updated });
            if (user) {
                const info = await getDeviceInfo();
                await deviceSettingService.save({
                    deviceName: info.deviceName,
                    deviceType: info.deviceType,
                    ...updated,
                });
            }
        } catch (_) {}
    };

    const updateNotificationSetting = async (key: keyof NotificationSettings, value: boolean) => {
        const updated = { ...notificationSettings, [key]: value };
        
        // If turning off pushEnabled, turn off all notifications
        if (key === 'pushEnabled' && !value) {
            Object.keys(updated).forEach(k => {
                (updated as any)[k] = false;
            });
        }
        // If turning on any sub-notification, also enable push
        if (key !== 'pushEnabled' && value) {
            updated.pushEnabled = true;
        }

        setNotificationSettings(updated);
        await persistSettings(updated);
    };

    const toggleAllNotifications = async () => {
        const allEnabled = notificationSettings.pushEnabled;
        const updated: NotificationSettings = {
            pushEnabled: !allEnabled,
            likesEnabled: !allEnabled,
            commentsEnabled: !allEnabled,
            followsEnabled: !allEnabled,
            messagesEnabled: !allEnabled,
            pageUpdatesEnabled: !allEnabled,
        };
        setNotificationSettings(updated);
        await persistSettings(updated);
    };

    return (
        <NotificationContext.Provider value={{ notificationSettings, updateNotificationSetting, toggleAllNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};
