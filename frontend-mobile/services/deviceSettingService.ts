import apiClient from '../api/apiClient';

export interface DeviceSettingDTO {
    id?: number;
    userId?: number;
    deviceName: string;
    deviceType: string;
    themeMode?: string;
    pushEnabled?: boolean;
    likesEnabled?: boolean;
    commentsEnabled?: boolean;
    followsEnabled?: boolean;
    messagesEnabled?: boolean;
    pageUpdatesEnabled?: boolean;
}

class DeviceSettingService {
    /**
     * Fetch the settings stored on the server for this device.
     * Returns null when there is no saved record yet.
     */
    async get(deviceName: string, deviceType: string): Promise<DeviceSettingDTO | null> {
        try {
            const res = await apiClient.get('/device-settings', {
                params: { deviceName, deviceType },
            });
            return res.data?.data ?? res.data ?? null;
        } catch {
            return null;
        }
    }

    /**
     * Create or update the settings for the current user + device.
     */
    async save(dto: DeviceSettingDTO): Promise<DeviceSettingDTO | null> {
        try {
            const res = await apiClient.put('/device-settings', dto);
            return res.data?.data ?? res.data ?? null;
        } catch {
            return null;
        }
    }
}

export default new DeviceSettingService();
