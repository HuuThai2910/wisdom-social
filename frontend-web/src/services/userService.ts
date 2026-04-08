import axiosClient from "../api/axiosClient";
import type { User, ApiResponse } from '../types';

export interface UserRequestRegister {
    phone: string;
    username: string;
    password: string;
    ipAddress?: string;
}

export interface UserResponseRegister {
    success: boolean;
    message: string;
    data: {
        id: string;
        phone: string;
        username: string;
        createdAt: string;
    };
}

export interface UserRequestConfirmRegister {
    phone: string;
    otp: string;
}

export interface UserResponseConfirmRegister {
    token: string;
    userId: string;
    username: string;
}

export interface UserRequestLogin {
    phone: string;
    password: string;
    ipAddress?: string;
}

export interface UserResponseLogin {
    token: string;
    id: string;
    phone: string;
     username: string;
    name: string;
    avatarUrl: string;
    bio?: string;
    birthday?: string;
     gender?: string;
    createdAt: string;
    
}

export interface UserRequestUpdate {
    username?: string;
    name?: string;
    bio?: string;
    avatarUrl?: string;
    birthday?: string;
    gender?: string;
}

export interface UserRequestForgotPassword {
    phone: string;
}

export interface UserResponseOTPPassword {
    otpId: string;
    expiresIn: number;

}

export interface UserRequestResetPassword {
    phone: string;
    otp: string;
    newPassword: string;
}

export interface UserProfileResponse {
    id: string;
    username: string;
    fullName?: string;
    name?: string;
    avatarUrl: string;
    bio?: string;
    postsCount: number;
    followersCount: number;
    followingCount: number;
    friendsCount?: number;
    isVerified?: boolean;
}

// User Service
export const userService = {
    // Auth endpoints
    async register(data: UserRequestRegister): Promise<UserResponseRegister> {
        const response = await axiosClient.post(`auth/register`, data);
        return response.data.data;
    },

    async confirmRegister(data: UserRequestConfirmRegister): Promise<UserResponseConfirmRegister> {
        const response = await axiosClient.post(`auth/confirm`, data);
        return response.data.data;
    },

    async login(data: UserRequestLogin): Promise<UserResponseLogin> {
        const response = await axiosClient.post(`auth/login`, data);
        return response.data.data;
    },

    async logout(): Promise<void> {
        await axiosClient.post(`auth/logout`, {});
    },

    async refreshToken(): Promise<string> {
        const response = await axiosClient.get(`auth/refresh`);
        return response.data.data;
    },

    async getCurrentUser(): Promise<ApiResponse<User>> {
        const response = await axiosClient.get(`auth/me`);
        return response.data.data;
    },

    async forgotPassword(data: UserRequestForgotPassword): Promise<UserResponseOTPPassword> {
        const response = await axiosClient.post(`auth/forgot-password`, data);
        return response.data.data;
    },

    async resetPassword(data: UserRequestResetPassword): Promise<string> {
        const response = await axiosClient.post(`auth/reset-password`, data);
        return response.data.data;
    },

    async getAllUsers(): Promise<User[]> {
        const response = await axiosClient.get(`auth/users`);
        return response.data.data;
    },

    async deleteUser(id: number): Promise<string> {
        const response = await axiosClient.delete(`auth/users/${id}`);
        return response.data.data;
    },

    async updateUser(id: number, data: UserRequestUpdate): Promise<User> {
        const response = await axiosClient.put(`auth/users/${id}`, data);
        return response.data.data;
    },

    async getUserProfile(id: string | number): Promise<UserProfileResponse> {
        const response = await axiosClient.get(`auth/users/${id}`);
        return response.data.data;
    },

    async searchUserByUsername(keyword: string): Promise<User[]> {
        const response = await axiosClient.get(`auth/users/username/${keyword}`);
        return response.data.data;
    },

    // Image upload endpoints
    async getUploadAvatarUrl(type: string, extension: string): Promise<{ imageUrl: string; uploadUrl: string }> {
        const response = await axiosClient.get(`auth/upload-avatar`, {
            params: { type, extension }
        });
        return response.data.data;
    },

    async updateUploadAvatarUrl(type: string, extension: string): Promise<string> {
        const response = await axiosClient.get(`auth/users/update/upload-avatar`, {
            params: { type, extension }
        });
        return response.data;
    },
};

export default userService;
