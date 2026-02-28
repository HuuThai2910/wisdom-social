import apiClient from '../api/apiClient';

// Matches backend PageStatus enum
export type PageStatus = 'PUBLIC' | 'PRIVATE' | 'BANNED';

// Matches backend PageRole enum
export type PageRole = 'ADMIN' | 'EDITOR' | 'MODERATOR' | 'ANALYST' | 'USER';

// Matches backend UserRequestCreatePage DTO
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

// Matches backend UserRequestUpdatePage DTO
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

// Matches backend Page entity
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

// Matches backend PageMember entity
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

// Matches backend UserRequestPage DTO
export interface PageRequestDTO {
    userId: number;
    pageId: number;
}

// Matches backend UserRequestMemberPage DTO
export interface MemberPageRequest {
    userId: number;
    pageId: number;
    pageRole: PageRole;
}

// Matches backend UserRequestAuthorizePage DTO
export interface AuthorizePageRequest {
    userId: number;
    pageId: number;
    pageRole: PageRole;
}

const pageService = {
    // ═══════════ Page CRUD ═══════════

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
            return response.data?.data ?? response.data ?? null;
        } catch {
            return null;
        }
    },

    getAllPages: async (): Promise<PageData[]> => {
        try {
            const response = await apiClient.get('/page/all');
            const d = response.data?.data ?? response.data;
            return Array.isArray(d) ? d : [];
        } catch {
            return [];
        }
    },

    getMyPages: async (): Promise<PageData[]> => {
        try {
            const response = await apiClient.get('/page/my-pages');
            const d = response.data?.data ?? response.data;
            return Array.isArray(d) ? d : [];
        } catch {
            return [];
        }
    },

    // ═══════════ Page Interactions ═══════════

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

    // ═══════════ Page Member Management ═══════════

    addMember: async (data: MemberPageRequest): Promise<string> => {
        const response = await apiClient.post('/page-member/add', data);
        return response.data.data;
    },

    deleteMember: async (pageId: number, userId: number): Promise<string> => {
        const response = await apiClient.post('/page-member/delete', { pageId, userId });
        return response.data.data;
    },

    blockMember: async (pageId: number, userId: number): Promise<string> => {
        const response = await apiClient.post('/page-member/block', { pageId, userId });
        return response.data.data;
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
};

export default pageService;
