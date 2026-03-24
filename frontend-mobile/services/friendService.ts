import apiClient from '../api/apiClient';
import { User } from '../types';

export interface FriendRequest {
    senderId: number;
    receivedId: number;
}

class FriendService {
    async getFriends(userId: number): Promise<User[]> {
        try {
            const response = await apiClient.get(`/friends/${userId}`);
            return response.data.data;
        } catch {
            return [];
        }
    }

    async getFriendRequests(userId: number): Promise<User[]> {
        try {
            const response = await apiClient.get(`/friends/requests/${userId}`);
            return response.data.data;
        } catch {
            return [];
        }
    }

    async sendFriendRequest(senderId: number, receivedId: number): Promise<boolean> {
        try {
            await apiClient.post('/friends/request', { senderId, receivedId });
            return true;
        } catch {
            return false;
        }
    }

    async acceptFriendRequest(senderId: number, receivedId: number): Promise<boolean> {
        try {
            await apiClient.post('/friends/accept', { senderId, receivedId });
            return true;
        } catch {
            return false;
        }
    }

    async cancelFriendRequest(senderId: number, receivedId: number): Promise<boolean> {
        try {
            await apiClient.post('/friends/cancel', { senderId, receivedId });
            return true;
        } catch {
            return false;
        }
    }

    async rejectFriendRequest(senderId: number, receivedId: number): Promise<boolean> {
        try {
            await apiClient.post('/friends/reject', { senderId, receivedId });
            return true;
        } catch {
            return false;
        }
    }

    async getFriendStatus(myId: number, targetId: number): Promise<'NONE' | 'SENT' | 'RECEIVED' | 'FRIEND' | 'BLOCKED'> {
        try {
            const [blockedList, myFriends, receivedRequests, theirRequests] = await Promise.all([
                apiClient.get(`/auth/users/blocked/${myId}`).then(r => r.data.data).catch(() => []),
                apiClient.get(`/friends/${myId}`).then(r => r.data.data).catch(() => []),
                apiClient.get(`/friends/requests/${myId}`).then(r => r.data.data).catch(() => []),
                apiClient.get(`/friends/requests/${targetId}`).then(r => r.data.data).catch(() => []),
            ]);

            const hasId = (list: any[], id: number) =>
                list.some((u: any) => u.id === id || Number(u.id) === id);

            if (hasId(blockedList, targetId)) return 'BLOCKED';
            if (hasId(myFriends, targetId)) return 'FRIEND';
            if (hasId(receivedRequests, targetId)) return 'RECEIVED';
            if (hasId(theirRequests, myId)) return 'SENT';
            return 'NONE';
        } catch {
            return 'NONE';
        }
    }

    async removeFriend(userId: number, friendId: number): Promise<boolean> {
        return this.cancelFriendRequest(userId, friendId);
    }

    async blockUser(blockerId: number, blockedId: number): Promise<boolean> {
        try {
            await apiClient.post('/auth/users/block', { senderId: blockerId, receivedId: blockedId });
            return true;
        } catch {
            return false;
        }
    }

    async unblockUser(blockerId: number, blockedId: number): Promise<boolean> {
        try {
            await apiClient.post('/auth/users/cancel-block', { senderId: blockerId, receivedId: blockedId });
            return true;
        } catch {
            return false;
        }
    }
}

export default new FriendService();
