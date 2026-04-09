import axiosClient from '../api/axiosClient';

const COMMENTS_BASE = '/api/comments';

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

interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

export const commentService = {
    /**
     * Get root comments (cấp 1) of post/target with pagination
     * Sorted: mới → cũ
     * Each comment includes initial replies (first 3)
     */
    getRootComments: (
        targetType: string,
        targetId: string,
        page = 0,
        size = 10
    ): Promise<ApiResponse<PaginatedResponse>> =>
        axiosClient.get(`${COMMENTS_BASE}/root`, {
            params: { targetType, targetId, page, size },
        }),

    /**
     * Get a specific comment with its initial replies
     * Replies sorted: cũ → mới, limit to 3
     */
    getCommentWithReplies: (
        commentId: string,
        replyLimit = 3
    ): Promise<ApiResponse<Comment>> =>
        axiosClient.get(`${COMMENTS_BASE}/${commentId}/with-replies`, {
            params: { replyLimit },
        }),

    /**
     * Get more replies using cursor-based pagination
     * Sorted: cũ → mới
     */
    getMoreReplies: (
        parentId: string,
        cursor?: string | null,
        size = 10
    ): Promise<ApiResponse<PaginatedResponse>> =>
        axiosClient.get(`${COMMENTS_BASE}/${parentId}/replies`, {
            params: { cursor, size },
        }),

    /**
     * Create a new comment or reply
     */
    createComment: (
        targetType: string,
        targetId: string,
        content: string,
        userId: number,
        parentId?: string
    ): Promise<ApiResponse<Comment>> =>
        axiosClient.post(
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
        ),

    /**
     * Delete a comment
     */
    deleteComment: (commentId: string, userId: number): Promise<ApiResponse<void>> =>
        axiosClient.delete(`${COMMENTS_BASE}/${commentId}`, {
            params: { userId },
        }),
};

export type { Comment, PaginatedResponse };