import apiClient from '../api/apiClient';
import { User } from '../types';

class BlockService {
    /**
     * Get list of users blocked by the given user
     * GET /api/auth/users/blocked/{userId}
     */
    async getBlockedUsers(userId: number): Promise<User[]> {
        try {
            const response = await apiClient.get(`/auth/users/blocked/${userId}`);
            const data = response.data?.data ?? response.data;
            return Array.isArray(data) ? data : [];
        } catch (error: any) {
            console.error('[BlockService] getBlockedUsers error:', error?.response?.data || error.message);
            return [];
        }
    }

    /**
     * Block a user
     * POST /api/auth/users/block   body: { senderId, receivedId }
     */
    async blockUser(blockerId: number, blockedId: number): Promise<boolean> {
        try {
            await apiClient.post('/auth/users/block', {
                senderId: blockerId,
                receivedId: blockedId,
            });
            return true;
        } catch (error: any) {
            console.error('[BlockService] blockUser error:', error?.response?.data || error.message);
            return false;
        }
    }

    /**
     * Unblock a user
     * POST /api/auth/users/cancel-block   body: { senderId, receivedId }
     */
    async unblockUser(blockerId: number, blockedId: number): Promise<boolean> {
        try {
            await apiClient.post('/auth/users/cancel-block', {
                senderId: blockerId,
                receivedId: blockedId,
            });
            return true;
        } catch (error: any) {
            console.error('[BlockService] unblockUser error:', error?.response?.data || error.message);
            return false;
        }
    }
}

export default new BlockService();
