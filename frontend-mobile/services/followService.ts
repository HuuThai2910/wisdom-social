import apiClient from '../api/apiClient';

export type FollowStatus = 'FOLLOWING' | 'NOT_FOLLOWING';

class FollowService {
    async follow(followerId: number, followingId: number): Promise<boolean> {
        try {
            await apiClient.post('/follows/follow', { followerId, followingId });
            return true;
        } catch {
            return false;
        }
    }

    async unfollow(followerId: number, followingId: number): Promise<boolean> {
        try {
            await apiClient.post('/follows/unfollow', { followerId, followingId });
            return true;
        } catch {
            return false;
        }
    }

    async getFollowStatus(followerId: number, followingId: number): Promise<FollowStatus> {
        try {
            const response = await apiClient.get(`/follows/status/${followerId}/${followingId}`);
            return response.data.data;
        } catch {
            return 'NOT_FOLLOWING';
        }
    }

    async getFollowers(userId: number): Promise<any[]> {
        try {
            const response = await apiClient.get(`/follows/followers/${userId}`);
            return response.data.data;
        } catch {
            return [];
        }
    }

    async getFollowing(userId: number): Promise<any[]> {
        try {
            const response = await apiClient.get(`/follows/following/${userId}`);
            return response.data.data;
        } catch {
            return [];
        }
    }
}

export default new FollowService();
