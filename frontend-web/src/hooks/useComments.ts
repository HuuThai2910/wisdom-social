import { useState, useCallback } from 'react';
import { commentService } from '../services/commentService'
import type { Comment } from '../services/commentService';

interface UseCommentsParams {
    targetType: string;
    targetId: string;
}

export const useComments = ({ targetType, targetId }: UseCommentsParams) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    // Load root comments
    const loadRootComments = useCallback(
        async (page = 0) => {
            try {
                setLoading(true);
                const response = await commentService.getRootComments(
                    targetType,
                    targetId,
                    page,
                    10
                );

                if (page === 0) {
                    setComments(response.data.data);
                } else {
                    setComments((prev) => [...prev, ...response.data.data]);
                }

                setHasMore(response.data.hasMore);
                setTotalCount(response.data.totalCount);
                setCurrentPage(page);
            } catch (error) {
                console.error('Error loading root comments:', error);
            } finally {
                setLoading(false);
            }
        },
        [targetType, targetId]
    );

    // Load more replies for a comment
    const loadMoreReplies = useCallback(
        async (commentId: string) => {
            try {
                const comment = findCommentById(commentId);
                if (!comment) return;

                const response = await commentService.getMoreReplies(
                    commentId,
                    comment.nextCursor || undefined,
                    10
                );

                updateCommentReplies(
                    commentId,
                    response.data.data,
                    response.data.hasMore,
                    response.data.nextCursor
                );
            } catch (error) {
                console.error('Error loading more replies:', error);
            }
        },
        [comments]
    );

    // Find comment by ID recursively
    const findCommentById = (commentId: string, list = comments): Comment | null => {
        for (const comment of list) {
            if (comment.id === commentId) return comment;
            if (comment.replies && comment.replies.length > 0) {
                const found = findCommentById(commentId, comment.replies);
                if (found) return found;
            }
        }
        return null;
    };

    // Update comment with more replies
    const updateCommentReplies = (
        commentId: string,
        newReplies: Comment[],
        hasMoreReplies: boolean,
        nextCursor: string | null
    ) => {
        const updateRecursive = (list: Comment[]): Comment[] =>
            list.map((comment) => {
                if (comment.id === commentId) {
                    return {
                        ...comment,
                        replies: [...(comment.replies || []), ...newReplies],
                        hasMoreReplies,
                        nextCursor,
                    };
                }
                if (comment.replies && comment.replies.length > 0) {
                    return {
                        ...comment,
                        replies: updateRecursive(comment.replies),
                    };
                }
                return comment;
            });

        setComments(updateRecursive(comments));
    };

    return {
        comments,
        loading,
        hasMore,
        totalCount,
        currentPage,
        loadRootComments,
        loadMoreReplies,
        findCommentById,
        updateCommentReplies,
    };
};

export default useComments;