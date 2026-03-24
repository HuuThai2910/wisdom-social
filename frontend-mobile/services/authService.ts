import apiClient from '../api/apiClient';
import { saveToken, saveRefreshToken, saveIdToken, saveUser, clearStorage } from '../utils/storage';
import { getDeviceInfo } from '../utils/deviceInfo';

export interface RegisterRequest {
    phone: string;
    password: string;
    confirmPassword: string;
    deviceType?: string;
    deviceName?: string;
    ipAddress?: string;
}

export interface ConfirmRegisterRequest {
    phone: string;
    OTP: string;
}

export interface LoginRequest {
    phone: string;
    password: string;
    deviceType?: string;
    deviceName?: string;
    ipAddress?: string;
}

export interface ForgotPasswordRequest {
    phone: string;
}

export interface ResetPasswordRequest {
    phone: string;
    password: string;
    confirmPassword: string;
    confirmationCode: string;
}

export interface RegisterResponse {
    phone: string;
    username: string;
    gender: string;
    birthday: string;
    createdAt: string;
}

export interface LoginResponse {
    phone: string;
    username?: string | null;
    gender?: string | null;
    birthday?: string | null;
    createdAt?: string | null;
    token: string;
    refreskToken: string;
    idToken: string;
}

export interface OTPResponse {
    OTP: string;
}

class AuthService {
    async register(data: RegisterRequest): Promise<RegisterResponse | null> {
        try {
            const device = await getDeviceInfo();
            const response = await apiClient.post('/auth/register', {
                ...data,
                deviceType: device.deviceType,
                deviceName: device.deviceName,
                ipAddress: device.ipAddress,
            });
            return response.data.data;
        } catch {
            return null;
        }
    }

    async confirmRegister(data: ConfirmRegisterRequest): Promise<any> {
        try {
            const response = await apiClient.post('/auth/confirm', data);
            return response.data.data;
        } catch {
            return null;
        }
    }

    async login(data: LoginRequest): Promise<LoginResponse | null> {
        try {
            const device = await getDeviceInfo();
            const response = await apiClient.post('/auth/login', {
                ...data,
                deviceType: device.deviceType,
                deviceName: device.deviceName,
                ipAddress: device.ipAddress,
            });
            const loginData: LoginResponse = response.data.data;

            await saveToken(loginData.token);
            await saveRefreshToken(loginData.refreskToken);
            await saveIdToken(loginData.idToken);
            
            const userProfile = await this.getCurrentUser();
            
            if (userProfile) {
                await saveUser({
                    id: userProfile.id,
                    phone: userProfile.phone,
                    name: userProfile.name || null,
                    username: userProfile.username || null,
                    avatarUrl: userProfile.avatarUrl || null,
                    birthday: userProfile.birthday || null,
                    bio: userProfile.bio || null,
                    gender: userProfile.gender || null,
                    createdAt: userProfile.createdAt || null,
                    updatedAt: userProfile.updatedAt || null,
                    confirmUseAI: userProfile.confirmUseAI || false,
                });
            }

            return loginData;
        } catch {
            return null;
        }
    }

    async logout(): Promise<void> {
        try {
            await apiClient.post('/auth/logout');
            await clearStorage();
        } catch {
            await clearStorage();
        }
    }

    async forgotPassword(data: ForgotPasswordRequest): Promise<OTPResponse | null> {
        try {
            const requestData = {
                ...data,
                instant: new Date().toISOString(),
            };
            const response = await apiClient.post('/auth/forgot-password', requestData);
            return response.data.data;
        } catch {
            return null;
        }
    }

    async resetPassword(data: ResetPasswordRequest): Promise<string | null> {
        try {
            const requestData = {
                ...data,
                instant: new Date().toISOString(),
            };
            const response = await apiClient.post('/auth/reset-password', requestData);
            return response.data.message || 'Password reset successfully';
        } catch {
            return null;
        }
    }

    async getCurrentUser(): Promise<any> {
        try {
            const response = await apiClient.get('/auth/me');
            return response.data.data;
        } catch {
            return null;
        }
    }
}

export default new AuthService();
