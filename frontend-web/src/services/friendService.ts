import axiosClient from "../api/axiosClient";
import type { User } from '../types';

export interface FriendRequest {
    senderId: number;
    receivedId: number;
}

export const friendService = {
    async getFriends(userId: string | number): Promise<User[]> {
        const response = await axiosClient.get(`friends/${userId}`, {
            params: { _t: Date.now() }
        });
        return response.data.data;
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
