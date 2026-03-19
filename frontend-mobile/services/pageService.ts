import apiClient from '../api/apiClient';

export type PageStatus = 'PUBLIC' | 'PRIVATE' | 'BANNED';

export type PageRole = 'ADMIN' | 'EDITOR' | 'MODERATOR' | 'ANALYST' | 'USER';

export interface CreatePageRequest {
    name: string;
    username?: string;
    category?: string;
    description?: string;
    avatarUrl?: string;
    coverUrl?: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    isVerified?: boolean;
    status?: PageStatus;
}

export interface UpdatePageRequest {
    name?: string;
    username?: string;
    category?: string;
    description?: string;
    avatarUrl?: string;
    coverUrl?: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    isVerified?: boolean;
    status?: PageStatus;
}

export interface PageData {
    id: number;
    name: string;
    username?: string;
    category?: string;
    description?: string;
    avatarUrl?: string;
    coverUrl?: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    isVerified?: boolean;
    status?: PageStatus;
    createdBy?: {
        id: number;
        name?: string;
        username?: string;
        avatarUrl?: string;
        phone?: string;
    };
    createdAt?: string;
    updatedAt?: string;
}

export interface PageMemberData {
    id: number;
    user: {
        id: number;
        name?: string;
        username?: string;
        avatarUrl?: string;
        phone?: string;
    };
    role: PageRole;
    status: string;
    joinedAt?: string;
}

export interface PageRequestDTO {
    userId: number;
    pageId: number;
}

export interface MemberPageRequest {
    userId: number;
    pageId: number;
    pageRole: PageRole;
}

export interface AuthorizePageRequest {
    userId: number;
    pageId: number;
    pageRole: PageRole;
}

export interface PagePostRequest {
    userId: number;
    pageId: number;
    postId: string;
}

const pageService = {
    createPage: async (data: CreatePageRequest): Promise<string> => {
        const response = await apiClient.post('/page/create', data);
        return response.data.data;
    },

    updatePage: async (pageId: number, data: UpdatePageRequest): Promise<string> => {
        const response = await apiClient.post(`/page/update/${pageId}`, data);
        return response.data.data;
    },

    deletePage: async (id: number): Promise<string> => {
        const response = await apiClient.delete(`/page/delete/${id}`);
        return response.data.data;
    },

    findPageById: async (id: number): Promise<PageData | null> => {
        try {
            const response = await apiClient.get(`/page/${id}`);
            return response.data.data;
        } catch {
            return null;
        }
    },

    getAllPages: async (): Promise<PageData[]> => {
        try {
            const response = await apiClient.get('/page/all');
            const d = response.data?.data ?? response.data;
            return response.data.data;
        } catch {
            return [];
        }
    },

    getMyPages: async (): Promise<PageData[]> => {
        try {
            const response = await apiClient.get('/page/my-pages');
            return response.data.data ;
        } catch {
            return [];
        }
    },

    likePage: async (userId: number, pageId: number): Promise<string> => {
        const response = await apiClient.post('/page/like', { userId, pageId });
        return response.data.data;
    },

    followPage: async (userId: number, pageId: number): Promise<string> => {
        const response = await apiClient.post('/page/follow', { userId, pageId });
        return response.data.data;
    },

    cancelLikePage: async (userId: number, pageId: number): Promise<string> => {
        const response = await apiClient.post('/page/cancel-like', { userId, pageId });
        return response.data.data;
    },

    cancelFollowPage: async (userId: number, pageId: number): Promise<string> => {
        const response = await apiClient.post('/page/cancel-follow', { userId, pageId });
        return response.data.data;
    },

    getPageInteractionStatus: async (pageId: number): Promise<{
        isLiked: boolean; isFollowing: boolean; likeCount: number; followCount: number;
    }> => {
        try {
            const response = await apiClient.get(`/page/${pageId}/interaction-status`);
            const d = response.data?.data ?? response.data;
            return {
                isLiked: !!d?.isLiked,
                isFollowing: !!d?.isFollowing,
                likeCount: Number(d?.likeCount) || 0,
                followCount: Number(d?.followCount) || 0,
            };
        } catch {
            return { isLiked: false, isFollowing: false, likeCount: 0, followCount: 0 };
        }
    },

    addMember: async (data: MemberPageRequest): Promise<string> => {
        const response = await apiClient.post('/page-member/add', data);
        return response.data.data;
    },

    deleteMember: async (pageId: number, userId: number): Promise<string> => {
        const response = await apiClient.post('/page-member/delete', { pageId, userId });
        return response.data;
    },

    blockMember: async (pageId: number, userId: number): Promise<string> => {
        const response = await apiClient.post('/page-member/block', { pageId, userId });
        return response.data;
    },

    cancelBlockMember: async (pageId: number, userId: number): Promise<string> => {
        const response = await apiClient.post('/page-member/cancel-block', { pageId, userId });
        return response.data.data;
    },

    authorizeMember: async (data: AuthorizePageRequest): Promise<string> => {
        const response = await apiClient.post('/page-member/authorize', data);
        return response.data.data;
    },

    getPageMembers: async (pageId: number): Promise<PageMemberData[]> => {
        try {
            const response = await apiClient.get(`/page-member/list/${pageId}`);
            const d = response.data?.data ?? response.data;
            return Array.isArray(d) ? d : [];
        } catch {
            return [];
        }
    },

    getUploadUrl: async (type: string, extension: string): Promise<{ uploadUrl: string; imageUrl: string ; uuid: string ,extension: string} | null> => {
        try {
            const res = await apiClient.get('page/upload-avatar', { params: { type, extension } });
            return res.data.data;
        } catch {
            return null;
        }
    },

    getUpdateUploadUrl: async (type: string, id: number, extension: string): Promise<string | null> => {
        try {
            const res = await apiClient.get('page/update/upload-avatar', { params: { type, id, extension } });
            return  res.data;
        } catch {
            return null;
        }
    },

    getUpdateCoverUploadUrl: async (type: string, id: number, extension: string): Promise<string | null> => {
        try {
            const res = await apiClient.get('page/update/upload-cover', { params: { type, id, extension } });
            return res.data;
        } catch {
            return null;
        }
    },

    approvePostPage: async (userId: number, pageId: number, postId: string): Promise<string> => {
        const response = await apiClient.post('/page/post/approve', { userId, pageId, postId });
        return response.data.data;
    },

    cancelApprovePostPage: async (userId: number, pageId: number, postId: string): Promise<string> => {
        const response = await apiClient.post('/page/post/cancel-approve', { userId, pageId, postId });
        return response.data.data;
    },

    addPostPage: async (userId: number, pageId: number, post: any): Promise<string> => {
        const response = await apiClient.post('/page/post/add', post, {
            params: { userId, pageId }
        });
        return response.data.data;
    },

    removePostPage: async (userId: number, pageId: number, postId: string): Promise<string> => {
        const response = await apiClient.post('/page/post/remove', { userId, pageId, postId });
        return response.data.data;
    },

    getAllPostsOfPage: async (pageId: number): Promise<any[]> => {
        try {
            const response = await apiClient.get(`/page/post/all/${pageId}`);
            return response.data.data || [];
        } catch {
            return [];
        }
    },

    getAllPostsWaitingForApprove: async (pageId: number): Promise<any[]> => {
        try {
            const response = await apiClient.get(`/page/post/waiting-approve/${pageId}`);
            return response.data.data || [];
        } catch {
            return [];
        }
    },

    approveAllPosts: async (userId: number, pageId: number): Promise<string> => {
        const response = await apiClient.post('/page/post/approve-all', { userId, pageId });
        return response.data.data;
    },

    cancelAllPosts: async (userId: number, pageId: number): Promise<string> => {
        const response = await apiClient.post('/page/post/cancel-all', { userId, pageId });
        return response.data.data;
    },
};

export default pageService;
