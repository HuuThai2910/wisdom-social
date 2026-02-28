import * as Device from 'expo-device';
import { Platform } from 'react-native';

export interface DeviceInfo {
    deviceType: string;
    deviceName: string;
    ipAddress: string;
}

/** Fetch public IP from a free API (best-effort, returns empty string on failure) */
async function getPublicIp(): Promise<string> {
    try {
        const response = await fetch('https://api.ipify.org?format=json', {
            signal: AbortSignal.timeout(5000),
        });
        const data = await response.json();
        return data.ip ?? '';
    } catch {
        return '';
    }
}

/** Collect device metadata and public IP to send to the backend */
export async function getDeviceInfo(): Promise<DeviceInfo> {
    const os = Platform.OS.toUpperCase();                        // IOS / ANDROID / WEB
    const model = Device.modelName ?? Device.deviceName ?? 'Unknown Device';
    const manufacturer = Device.manufacturer ?? '';
    const deviceName = manufacturer ? `${manufacturer} ${model}` : model;
    const ipAddress = await getPublicIp();

    return {
        deviceType: os,
        deviceName,
        ipAddress,
    };
}
