import { useState, useCallback } from "react";
import { commentService } from "../services/commentService";
import type { Comment } from "../services/commentService";
import {
    appendReplyToComment,
    insertReplyToComment,
    deleteCommentFromTree,
    deduplicateComments,
    findCommentInTree,
} from "../utils/commentTreeHelpers";

interface UseCommentsParams {
    targetType: string;
    targetId: string;
}

/**
 * FIXED useComments Hook
 *
 * Key improvements:
 * 1. Deduplicates replies when loading more (fixes duplicate bug)
 * 2. Uses tree helpers to avoid full reloads
 * 3. Optimistic updates for create/delete (fixes state sync)
 * 4. Ready for unlimited nesting (no depth limit)
 */
export const useComments = ({ targetType, targetId }: UseCommentsParams) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [operationInProgress, setOperationInProgress] = useState(false);

    /**
     * Load root comments (page-based pagination)
     * Fetches fresh data for specified page
     */
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
                    // First page: replace all
                    setComments(response.data);
                } else {
                    // Subsequent pages: append with deduplication
                    setComments((prev) => {
                        const combined = [...prev, ...response.data];
                        return deduplicateComments(combined);
                    });
                }

                setHasMore(response.hasMore);
                setTotalCount(response.totalCount);
                setCurrentPage(page);
            } catch (error) {
                console.error("❌ Error loading root comments:", error);
            } finally {
                setLoading(false);
            }
        },
        [targetType, targetId]
    );

    /**
     * Load more replies for a specific comment (cursor-based pagination)
     * Carefully appends replies with deduplication
     */
    const loadMoreReplies = useCallback(
        async (commentId: string) => {
            try {
                const comment = findCommentInTree(commentId, comments);
                if (!comment) {
                    console.warn(`Comment ${commentId} not found in tree`);
                    return;
                }

                const response = await commentService.getMoreReplies(
                    commentId,
                    comment.nextCursor || undefined,
                    10
                );

                // Use tree helper to append replies with deduplication
                setComments((prev) => {
                    const updated = appendReplyToComment(prev, commentId, response.data);

                    // Also update hasMoreReplies and nextCursor for this comment
                    const updatedComment = findCommentInTree(commentId, updated);
                    if (updatedComment) {
                        updatedComment.hasMoreReplies = response.hasMore;
                        updatedComment.nextCursor = response.nextCursor;
                    }

                    return updated;
                });
            } catch (error) {
                console.error(
                    `❌ Error loading more replies for ${commentId}:`,
                    error
                );
            }
        },
        [comments]
    );

    /**
     * Optimistic insert: Add new comment to tree immediately
     * Called after createComment API succeeds
     */
    const insertNewReply = useCallback(
        (parentId: string | null, newComment: Comment) => {
            setComments((prev) => {
                if (parentId === null) {
                    // Root comment: prepend to beginning
                    return [newComment, ...prev];
                }

                // Nested reply: insert into parent's replies
                return insertReplyToComment(prev, parentId, newComment);
            });
        },
        []
    );

    /**
     * Remove comment from tree
     * Called after deleteComment API succeeds
     */
    const removeComment = useCallback(
        (commentId: string, parentId: string | null) => {
            setComments((prev) => deleteCommentFromTree(prev, commentId, parentId));
        },
        []
    );

    /**
     * Find comment anywhere in tree
     */
    const findComment = useCallback(
        (commentId: string): Comment | null => {
            return findCommentInTree(commentId, comments);
        },
        [comments]
    );

    return {
        comments,
        loading,
        operationInProgress,
        hasMore,
        totalCount,
        currentPage,
        // API loaders
        loadRootComments,
        loadMoreReplies,
        // Optimistic mutations
        insertNewReply,
        removeComment,
        // Utilities
        findComment,
        setOperationInProgress,
    };
};

export default useComments;