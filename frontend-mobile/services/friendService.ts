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

    /**
     * Derive friendship status from existing tables:
     *  blocked_users  → BLOCKED
     *  friends (ACCEPTED) → FRIEND
     *  friends/requests/{myId} contains targetId → RECEIVED
     *  friends/requests/{targetId} contains myId → SENT
     *  otherwise → NONE
     */
    async getFriendStatus(myId: number, targetId: number): Promise<'NONE' | 'SENT' | 'RECEIVED' | 'FRIEND' | 'BLOCKED'> {
        try {
            const [blockedList, myFriends, receivedRequests, theirRequests] = await Promise.all([
                apiClient.get(`/auth/users/blocked/${myId}`).then(r => r.data.data || r.data || []).catch(() => []),
                apiClient.get(`/friends/${myId}`).then(r => r.data.data || r.data || []).catch(() => []),
                apiClient.get(`/friends/requests/${myId}`).then(r => r.data.data || r.data || []).catch(() => []),
                apiClient.get(`/friends/requests/${targetId}`).then(r => r.data.data || r.data || []).catch(() => []),
            ]);

            const hasId = (list: any[], id: number) =>
                list.some((u: any) => u.id === id || Number(u.id) === id);

            if (hasId(blockedList, targetId)) return 'BLOCKED';
            if (hasId(myFriends, targetId)) return 'FRIEND';
            if (hasId(receivedRequests, targetId)) return 'RECEIVED';
            if (hasId(theirRequests, myId)) return 'SENT';
            return 'NONE';
        } catch (error: any) {
            this.handleError(error);
            return 'NONE';
        }
    }

    // Remove friend — reuses cancel which handles both PENDING and ACCEPTED
    async removeFriend(userId: number, friendId: number): Promise<boolean> {
        return this.cancelFriendRequest(userId, friendId);
    }

    // Block user — POST /auth/users/block
    async blockUser(blockerId: number, blockedId: number): Promise<boolean> {
        try {
            await apiClient.post('/auth/users/block', { senderId: blockerId, receivedId: blockedId });
            return true;
        } catch (error: any) {
            this.handleError(error);
            return false;
        }
    }

    // Unblock user — POST /auth/users/cancel-block
    async unblockUser(blockerId: number, blockedId: number): Promise<boolean> {
        try {
            await apiClient.post('/auth/users/cancel-block', { senderId: blockerId, receivedId: blockedId });
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
