import axiosClient from "../api/axiosClient";
import type { User } from '../types';

export interface FriendRequest {
    senderId: number;
    receivedId: number;
}

export const friendService = {
    // Get all friends for a user
    async getFriends(userId: string | number): Promise<any[]> {
        try {
            // Add timestamp to prevent browser caching
            const response = await axiosClient.get(`friends/${userId}`, {
                params: { _t: Date.now() }
            });

            const rawData = response.data.data || response.data || [];

            // Map friends data to expected format for frontend components
            return rawData.map((friend: any) => ({
                id: friend.userId?.toString() || friend.id?.toString(),
                username: friend.username,
                fullName: friend.fullName || friend.name || friend.username,
                name: friend.name || friend.fullName || friend.username,
                avatarUrl: friend.avatarUrl || friend.avatar || "https://i.pravatar.cc/150?img=5",
                avatar: friend.avatar || friend.avatarUrl || "https://i.pravatar.cc/150?img=5",
            }));
        } catch (error) {
            console.error(`Error fetching friends for user ${userId}:`, error);
            return [];
        }
    },

    // Alias for getFriends to support legacy code/consistency
    async fetchFriends(userId: string | number): Promise<any[]> {
        return this.getFriends(userId);
    },

    async getFriendRequests(userId: string | number): Promise<User[]> {
        const response = await axiosClient.get(`friends/requests/${userId}`, {
            params: { _t: Date.now() }
        });
        return response.data.data;
    },

    async getSentRequests(userId: string | number): Promise<User[]> {
        const response = await axiosClient.get(`friends/sent-requests/${userId}`, {
            params: { _t: Date.now() }
        });
        return response.data.data;
    },

    async sendFriendRequest(data: FriendRequest): Promise<string> {
        const response = await axiosClient.post(`friends/request`, data);
        return response.data.data;
    },

    async acceptFriendRequest(data: FriendRequest): Promise<string> {
        const response = await axiosClient.post(`friends/accept`, data);
        return response.data.data;
    },

    async cancelFriendRequest(data: FriendRequest): Promise<string> {
        const response = await axiosClient.post(`friends/cancel`, data);
        return response.data.data;
    },

    async rejectFriendRequest(data: FriendRequest): Promise<string> {
        const response = await axiosClient.post(`friends/reject`, data);
        return response.data.data;
    },
};

export default friendService;
