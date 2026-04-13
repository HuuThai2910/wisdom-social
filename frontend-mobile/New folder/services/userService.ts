import apiClient from '../api/apiClient';
import { User } from '../types';

export interface UpdateProfileRequest {
    name?: string;
    username?: string;
    bio?: string;
    avatarUrl?: string;
    birthday?: string;
    gender?: string;
    backgroundUrl?: string;
}

class UserService {
    async getProfile(): Promise<User | null> {
        try {
            const response = await apiClient.get('/auth/me');
            return response.data.data;
        } catch {
            return null;
        }
    }

    async getUserById(userId: number): Promise<User | null> {
        try {
            const response = await apiClient.get(`/auth/user/${userId}`);
            return response.data.data;
        } catch {
            return null;
        }
    }
    
    async getUserByUsername(username: string): Promise<User[] | null> {
        try {
            const response = await apiClient.get(`/auth/users/username/${username}`);
            return response.data.data;
        } catch {
            return null;
        }
    }

    async updateProfile(userId: number, data: UpdateProfileRequest): Promise<boolean> {
        try {
            await apiClient.put(`/auth/users/${userId}`, data);
            return true;
        } catch {
            return false;
        }
    }

    async getAllUsers(): Promise<User[]> {
        try {
            const response = await apiClient.get('/auth/users');
            return response.data.data;
        } catch {
            return [];
        }
    }

    async getAllUsersExcludingBlocked(userId: number): Promise<User[]> {
        try {
            const response = await apiClient.get(`/auth/users/${userId}`);
            const data = response.data?.data ?? response.data;
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    async getAvatarUploadUrl(extension: string): Promise<{ uploadUrl: string; imageUrl: string } | null> {
        try {
            const res = await apiClient.get('/auth/upload-avatar', { params: { type: 'users', extension } });
            return res.data.data;
        } catch {
            return null;
        }
    }

    async getUpdateProfileUploadUrl(extension: string): Promise<string | null> {
        try {
            const res = await apiClient.get('/auth/users/update/upload-avatar', { params: { type: 'users', extension } });
            return res.data;
        } catch {
            return null;
        }
    }
}

export default new UserService();
