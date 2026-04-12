/**
 * Comment Tree Helper Functions
 * Handles tree mutations without full reloads
 */
import type { Comment } from '../services/commentService';

/**
 * Find a comment by ID in tree (recursive)
 */
export const findCommentInTree = (
    commentId: string,
    tree: Comment[]
): Comment | null => {
    for (const comment of tree) {
        if (comment.id === commentId) return comment;
        if (comment.replies?.length) {
            const found = findCommentInTree(commentId, comment.replies);
            if (found) return found;
        }
    }
    return null;
};

/**
 * Find path to a comment in tree (returns array of IDs from root to target)
 */
export const findCommentPath = (
    commentId: string,
    tree: Comment[],
    path: string[] = []
): string[] | null => {
    for (const comment of tree) {
        const newPath = [...path, comment.id];
        if (comment.id === commentId) return newPath;
        if (comment.replies?.length) {
            const found = findCommentPath(commentId, comment.replies, newPath);
            if (found) return found;
        }
    }
    return null;
};

/**
 * Append reply to parent comment (with deduplication)
 * Returns new tree
 */
export const appendReplyToComment = (
    tree: Comment[],
    parentId: string,
    newReplies: Comment[]
): Comment[] => {
    // Create a set of existing reply IDs for fast lookup
    const existingIds = new Set<string>();

    const findAndUpdateParent = (comments: Comment[]): Comment[] =>
        comments.map((comment) => {
            if (comment.id === parentId) {
                // Get existing reply IDs
                const existing = comment.replies || [];
                existing.forEach((r) => existingIds.add(r.id));

                // Filter out duplicates from newReplies
                const dedupedNewReplies = newReplies.filter(
                    (r) => !existingIds.has(r.id)
                );

                return {
                    ...comment,
                    replies: [...existing, ...dedupedNewReplies],
                };
            }

            // Recurse into nested replies
            if (comment.replies?.length) {
                return {
                    ...comment,
                    replies: findAndUpdateParent(comment.replies),
                };
            }

            return comment;
        });

    return findAndUpdateParent(tree);
};

/**
 * Insert single reply at end of parent's replies
 * For optimistic updates after creating new reply
 */
export const insertReplyToComment = (
    tree: Comment[],
    parentId: string,
    newReply: Comment
): Comment[] => {
    const findAndUpdateParent = (comments: Comment[]): Comment[] =>
        comments.map((comment) => {
            if (comment.id === parentId) {
                // Check if reply already exists (avoid duplicate)
                const exists = (comment.replies || []).some((r) => r.id === newReply.id);
                if (exists) return comment;

                return {
                    ...comment,
                    replies: [...(comment.replies || []), newReply],
                    replyCount: (comment.replyCount || 0) + 1,
                };
            }

            if (comment.replies?.length) {
                return {
                    ...comment,
                    replies: findAndUpdateParent(comment.replies),
                };
            }

            return comment;
        });

    return findAndUpdateParent(tree);
};

/**
 * Delete comment from tree
 * Preserves parent and siblings
 */
export const deleteCommentFromTree = (
    tree: Comment[],
    commentId: string,
    parentId: string | null
): Comment[] => {
    if (parentId === null) {
        // Delete root comment
        return tree.filter((c) => c.id !== commentId);
    }

    // Delete nested reply
    const findAndUpdateParent = (comments: Comment[]): Comment[] =>
        comments.map((comment) => {
            if (comment.id === parentId) {
                return {
                    ...comment,
                    replies: (comment.replies || []).filter((r) => r.id !== commentId),
                    replyCount: Math.max(0, (comment.replyCount || 0) - 1),
                };
            }

            if (comment.replies?.length) {
                return {
                    ...comment,
                    replies: findAndUpdateParent(comment.replies),
                };
            }

            return comment;
        });

    return findAndUpdateParent(tree);
};

/**
 * Update pagination info for a comment (hasMoreReplies, nextCursor)
 */
export const updateCommentPaginationInfo = (
    tree: Comment[],
    commentId: string,
    hasMoreReplies: boolean,
    nextCursor: string | null
): Comment[] => {
    const updateRecursive = (comments: Comment[]): Comment[] =>
        comments.map((comment) => {
            if (comment.id === commentId) {
                return {
                    ...comment,
                    hasMoreReplies,
                    nextCursor,
                };
            }

            if (comment.replies?.length) {
                return {
                    ...comment,
                    replies: updateRecursive(comment.replies),
                };
            }

            return comment;
        });

    return updateRecursive(tree);
};

/**
 * Deduplicate comments in array by ID
 */
export const deduplicateComments = (comments: Comment[]): Comment[] => {
    const seen = new Set<string>();
    return comments.filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
    });
};
