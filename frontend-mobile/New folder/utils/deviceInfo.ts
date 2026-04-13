import * as Device from 'expo-device';
import { Platform } from 'react-native';

export interface DeviceInfo {
    deviceType: string;
    deviceName: string;
    ipAddress: string;
}

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

export async function getDeviceInfo(): Promise<DeviceInfo> {
    const os = Platform.OS.toUpperCase();
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
