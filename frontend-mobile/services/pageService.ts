import apiClient from "@/api/apiClient";
import { mockFeaturePages, mockPageInteractions } from "@/constants";

export type PageStatus = "PUBLIC" | "PRIVATE" | "BANNED";

export type MemberStatus = "PENDING" | "ACTIVE" | "REMOVED" | "REJECTED";

export type PageRole = "ADMIN" | "MODERATOR" | "USER";

export type CreatePageRequest = {
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
};

export type UpdatePageRequest = {
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
    status?: PageStatus;
};

export type PageData = {
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
};

export type PageMemberData = {
    id?: number;
    pageId?: number;
    user: {
        id: number;
        name?: string;
        username?: string;
        avatarUrl?: string;
        phone?: string;
    };
    role: PageRole;
    status: MemberStatus;
    joinedAt?: string;
};

export type PageInteractionStatus = {
    isLiked: boolean;
    isFollowing: boolean;
    likeCount: number;
    followCount: number;
};

class PageService {
    private localPages: PageData[] = [...mockFeaturePages];
    private localInteractions = { ...mockPageInteractions };

    // ── Page CRUD ──────────────────────────────────────────────────────────

    async getAllPages(): Promise<PageData[]> {
        try {
            const response = await apiClient.get("/page/all");
            const data = response.data?.data ?? response.data;
            if (Array.isArray(data) && data.length > 0) return data;
            return this.localPages;
        } catch {
            return this.localPages;
        }
    }

    async getMyPages(): Promise<PageData[]> {
        try {
            const response = await apiClient.get("/page/my-pages");
            const data = response.data?.data ?? response.data;
            if (Array.isArray(data) && data.length > 0) return data;
            return this.localPages.slice(0, 2);
        } catch {
            return this.localPages.slice(0, 2);
        }
    }

    async createPage(data: CreatePageRequest): Promise<string> {
        try {
            const response = await apiClient.post("/page/create", data);
            return response.data?.data ?? "";
        } catch {
            const id = Date.now();
            const localPage: PageData = {
                id,
                name: data.name,
                username: data.username,
                category: data.category,
                description: data.description,
                status: data.status ?? "PUBLIC",
                createdBy: { id: 0, name: "Local User" },
            };
            this.localPages = [localPage, ...this.localPages];
            this.localInteractions[id] = {
                isLiked: false,
                isFollowing: false,
                likeCount: 0,
                followCount: 0,
            };
            return "local-created";
        }
    }

    async updatePage(pageId: number, data: UpdatePageRequest): Promise<boolean> {
        try {
            const response = await apiClient.post(`/page/update/${pageId}`, data);
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async deletePage(pageId: number): Promise<boolean> {
        try {
            const response = await apiClient.delete(`/page/delete/${pageId}`);
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async findPageById(pageId: number): Promise<PageData | null> {
        try {
            const response = await apiClient.get(`/page/${pageId}`);
            return response.data?.data ?? null;
        } catch {
            return this.localPages.find((p) => p.id === pageId) ?? null;
        }
    }

    // ── Like / Follow ──────────────────────────────────────────────────────

    async likePage(userId: number, pageId: number): Promise<string> {
        try {
            const response = await apiClient.post("/page/like", { userId, pageId });
            return response.data?.data ?? "";
        } catch {
            const current = this.localInteractions[pageId] ?? { isLiked: false, isFollowing: false, likeCount: 0, followCount: 0 };
            this.localInteractions[pageId] = { ...current, isLiked: true, likeCount: current.isLiked ? current.likeCount : current.likeCount + 1 };
            return "local-liked";
        }
    }

    async followPage(userId: number, pageId: number): Promise<string> {
        try {
            const response = await apiClient.post("/page/follow", { userId, pageId });
            return response.data?.data ?? "";
        } catch {
            const current = this.localInteractions[pageId] ?? { isLiked: false, isFollowing: false, likeCount: 0, followCount: 0 };
            this.localInteractions[pageId] = { ...current, isFollowing: true, followCount: current.isFollowing ? current.followCount : current.followCount + 1 };
            return "local-followed";
        }
    }

    async cancelLikePage(userId: number, pageId: number): Promise<string> {
        try {
            const response = await apiClient.post("/page/cancel-like", { userId, pageId });
            return response.data?.data ?? "";
        } catch {
            const current = this.localInteractions[pageId] ?? { isLiked: false, isFollowing: false, likeCount: 0, followCount: 0 };
            this.localInteractions[pageId] = { ...current, isLiked: false, likeCount: Math.max(0, current.likeCount - 1) };
            return "local-unliked";
        }
    }

    async cancelFollowPage(userId: number, pageId: number): Promise<string> {
        try {
            const response = await apiClient.post("/page/cancel-follow", { userId, pageId });
            return response.data?.data ?? "";
        } catch {
            const current = this.localInteractions[pageId] ?? { isLiked: false, isFollowing: false, likeCount: 0, followCount: 0 };
            this.localInteractions[pageId] = { ...current, isFollowing: false, followCount: Math.max(0, current.followCount - 1) };
            return "local-unfollowed";
        }
    }

    async getPageInteractionStatus(pageId: number): Promise<PageInteractionStatus> {
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
            return this.localInteractions[pageId] ?? { isLiked: false, isFollowing: false, likeCount: 0, followCount: 0 };
        }
    }

    // ── Member management ──────────────────────────────────────────────────

    async getPageMembers(pageId: number): Promise<PageMemberData[]> {
        try {
            const response = await apiClient.get(`/page-member/list/${pageId}`);
            const data = response.data?.data ?? response.data;
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    async getMemberStatus(pageId: number, userId: number): Promise<MemberStatus | null> {
        try {
            const response = await apiClient.get(`/page-member/member-status/${pageId}/${userId}`);
            return response.data?.data ?? response.data ?? null;
        } catch {
            return null;
        }
    }

    async getMemberCount(pageId: number): Promise<number> {
        try {
            const response = await apiClient.get(`/page-member/member-count/${pageId}`);
            return Number(response.data?.data ?? response.data) || 0;
        } catch {
            return 0;
        }
    }

    async addMember(userId: number, pageId: number, role: PageRole = "USER"): Promise<boolean> {
        try {
            const response = await apiClient.post("/page-member/add", { userId, pageId, pageRole: role });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async removeMember(pageId: number, userId: number): Promise<boolean> {
        try {
            const response = await apiClient.post("/page-member/delete", { pageId, userId });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async blockMember(pageId: number, userId: number): Promise<boolean> {
        try {
            const response = await apiClient.post("/page-member/block", { pageId, userId });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async unblockMember(pageId: number, userId: number): Promise<boolean> {
        try {
            const response = await apiClient.post("/page-member/cancel-block", { pageId, userId });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async authorizeMember(userId: number, pageId: number, role: PageRole): Promise<boolean> {
        try {
            const response = await apiClient.post("/page-member/authorize", { userId, pageId, pageRole: role });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    // ── Join requests ──────────────────────────────────────────────────────

    async requestJoinPage(userId: number, pageId: number, message?: string): Promise<string> {
        try {
            const response = await apiClient.post("/page-member/request-join", { userId, pageId, message });
            return response.data?.data ?? "";
        } catch {
            return "local-requested";
        }
    }

    async cancelJoinRequest(pageId: number, userId: number): Promise<boolean> {
        try {
            const response = await apiClient.post("/page-member/cancel-join", { pageId, userId });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async getPendingJoinRequests(pageId: number): Promise<PageMemberData[]> {
        try {
            const response = await apiClient.get(`/page-member/pending-requests/${pageId}`);
            const data = response.data?.data ?? response.data;
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    async approveJoinRequest(pageId: number, userId: number): Promise<boolean> {
        try {
            const response = await apiClient.post("/page-member/approve-join", { pageId, userId });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async rejectJoinRequest(pageId: number, userId: number): Promise<boolean> {
        try {
            const response = await apiClient.post("/page-member/reject-join", { pageId, userId });
            return response.status === 200;
        } catch {
            return false;
        }
    }
}

export default new PageService();
