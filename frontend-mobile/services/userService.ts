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
    // Get current user profile
    async getProfile(): Promise<User | null> {
        try {
            const response = await apiClient.get('/auth/me');
            return response.data.data;
        } catch (error: any) {
            this.handleError(error);
            return null;
        }
    }

    // Get user profile by ID
    async getUserById(userId: number): Promise<User | null> {
        try {
            const response = await apiClient.get(`/auth/user/${userId}`);
            return response.data.data;
        } catch (error: any) {
            this.handleError(error);
            return null;
        }
    }

    // Update user profile
    async updateProfile(userId: number, data: UpdateProfileRequest): Promise<boolean> {
        try {
            await apiClient.put(`/auth/users/${userId}`, data);
            return true;
        } catch (error: any) {
            this.handleError(error);
            return false;
        }
    }

    // Get all users (for search/discovery)
    async getAllUsers(): Promise<User[]> {
        try {
            const response = await apiClient.get('/auth/users');
            return response.data.data;
        } catch (error: any) {
            this.handleError(error);
            return [];
        }
    }

    // Handle errors
    private handleError(error: any): void {
        if (error.response) {
            const message = error.response.data?.message;
            console.error('User Service Error:', message);
        } else if (error.request) {
            console.error('Network Error: Cannot connect to server');
        } else {
            console.error('Error:', error.message);
        }
    }
}

export default new UserService();
