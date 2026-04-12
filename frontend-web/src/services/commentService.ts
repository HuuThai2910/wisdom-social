import axiosClient from '../api/axiosClient';

const COMMENTS_BASE = '/comments';

interface Comment {
    id: string;
    userId: string;
    targetType: string;
    targetId: string;
    parentId: string | null;
    content: string;
    mentions: string[];
    reactCount: number;
    replyCount: number;
    status: string;
    isEdited: boolean;
    isPinned: boolean;
    createdAt: string;
    updatedAt: string;
    replies: Comment[];
    hasMoreReplies: boolean;
    nextCursor: string | null;
}

interface PaginatedResponse {
    data: Comment[];
    hasMore: boolean;
    nextCursor: string | null;
    totalCount: number;
}

export const commentService = {
    /**
     * Get root comments (cấp 1) of post/target with pagination
     * Sorted: mới → cũ
     * Each comment includes initial replies (first 3)
     */
    getRootComments: async (
        targetType: string,
        targetId: string,
        page = 0,
        size = 10
    ): Promise<PaginatedResponse> => {
        const response = await axiosClient.get(`${COMMENTS_BASE}/root`, {
            params: { targetType, targetId, page, size },
        });
        return response.data.data;
    },

    /**
     * Get a specific comment with its initial replies
     * Replies sorted: cũ → mới, limit to 3
     */
    getCommentWithReplies: async (
        commentId: string,
        replyLimit = 3
    ): Promise<Comment> => {
        const response = await axiosClient.get(`${COMMENTS_BASE}/${commentId}/with-replies`, {
            params: { replyLimit },
        });
        return response.data.data;
    },

    /**
     * Get more replies using cursor-based pagination
     * Sorted: cũ → mới
     */
    getMoreReplies: async (
        parentId: string,
        cursor?: string | null,
        size = 10
    ): Promise<PaginatedResponse> => {
        const response = await axiosClient.get(`${COMMENTS_BASE}/${parentId}/replies`, {
            params: { cursor, size },
        });
        return response.data.data;
    },

    /**
     * Create a new comment or reply
     */
    createComment: async (
        targetType: string,
        targetId: string,
        content: string,
        userId: number,
        parentId?: string
    ): Promise<Comment> => {
        const response = await axiosClient.post(
            COMMENTS_BASE,
            {
                targetType,
                targetId,
                content,
                parentId: parentId || null,
            },
            {
                params: { userId },
            }
        );
        return response.data.data;
    },

    /**
     * Delete a comment
     */
    deleteComment: async (commentId: string, userId: number): Promise<void> => {
        await axiosClient.delete(`${COMMENTS_BASE}/${commentId}`, {
            params: { userId },
        });
    },
};

export type { Comment, PaginatedResponse };