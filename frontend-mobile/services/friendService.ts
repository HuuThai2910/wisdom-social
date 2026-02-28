import apiClient from '../api/apiClient';
import { User } from '../types';

export interface FriendRequest {
    senderId: number;
    receivedId: number;
}

class FriendService {
    // Get all friends of a user
    async getFriends(userId: number): Promise<User[]> {
        try {
            const response = await apiClient.get(`/friends/${userId}`);
            return response.data.data || response.data || [];
        } catch (error: any) {
            this.handleError(error);
            return [];
        }
    }

    // Get friend requests for a user
    async getFriendRequests(userId: number): Promise<User[]> {
        try {
            const response = await apiClient.get(`/friends/requests/${userId}`);
            return response.data.data || response.data || [];
        } catch (error: any) {
            this.handleError(error);
            return [];
        }
    }

    async sendFriendRequest(senderId: number, receivedId: number): Promise<boolean> {
        try {
            await apiClient.post('/friends/request', { senderId, receivedId });
            return true;
        } catch (error: any) {
            this.handleError(error);
            return false;
        }
    }

    async acceptFriendRequest(senderId: number, receivedId: number): Promise<boolean> {
        try {
            await apiClient.post('/friends/accept', { senderId, receivedId });
            return true;
        } catch (error: any) {
            this.handleError(error);
            return false;
        }
    }

    async cancelFriendRequest(senderId: number, receivedId: number): Promise<boolean> {
        try {
            await apiClient.post('/friends/cancel', { senderId, receivedId });
            return true;
        } catch (error: any) {
            this.handleError(error);
            return false;
        }
    }

    async rejectFriendRequest(senderId: number, receivedId: number): Promise<boolean> {
        try {
            await apiClient.post('/friends/reject', { senderId, receivedId });
            return true;
        } catch (error: any) {
            this.handleError(error);
            return false;
        }
    }

    // Handle errors
    private handleError(error: any): void {
        if (error.response) {
            const message = error.response.data?.message || error.response.data?.error || 'Something went wrong';
            console.error('❌ Friend Service Error:', message);
        } else if (error.request) {
            console.error('❌ Network Error: Cannot connect to server');
        } else {
            console.error('❌ Error:', error.message || 'An unexpected error occurred');
        }
    }
}

export default new FriendService();
