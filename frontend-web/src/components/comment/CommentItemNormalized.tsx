import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import * as postApi from "../../services/postService";
import { commentService } from "../../services/commentService";
import type { Comment } from "../../services/commentService";
import type { UserData } from "../../types/postType";

interface CommentItemNormalizedProps {
  commentId: string;
  commentsById: Record<string, Comment>;
  expandedMap: Record<string, boolean>;
  onToggleExpanded: (commentId: string) => void;
  onLoadMore: (commentId: string) => void;
  onDelete: (commentId: string, parentId?: string) => void;
  onCreateReply: (parentId: string, newComment: Comment) => void;
  onReplyClick?: (commentId: string, e: React.MouseEvent) => void;
  getDirectChildren: (commentId: string) => Comment[];
  hasMoreReplies: Record<string, boolean>;
  loadingMap: Record<string, boolean>;
  postId: string;
  level?: number;
}

export default function CommentItemNormalized({
  commentId,
  commentsById,
  expandedMap,
  onToggleExpanded,
  onLoadMore,
  onDelete,
  onCreateReply,
  onReplyClick,
  getDirectChildren,
  hasMoreReplies,
  loadingMap,
  postId,
  level = 0,
}: CommentItemNormalizedProps) {
  const comment = commentsById[commentId];
  if (!comment) return null;

  const expanded = expandedMap[commentId] || false;
  const loading = loadingMap[commentId] || false;

  const [commentUser, setCommentUser] = useState<UserData | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const { currentUser } = useAuth();

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const [currentReaction, setCurrentReaction] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionTimeout, setReactionTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await postApi.fetchUserById(comment.userId);
        setCommentUser(user);
      } catch (error) {
        console.error("Error fetching comment user:", error);
      } finally {
        setUserLoading(false);
      }
    };
    fetchUser();
  }, [comment.userId]);

  // Fetch user's reaction
  useEffect(() => {
    const fetchUserReaction = async () => {
      if (!currentUser?.id) return;

      try {
        const reaction = await postApi.fetchUserCommentReaction(
          currentUser.id.toString(),
          comment.id
        );
        if (reaction) {
          setCurrentReaction(reaction.type);
        }
      } catch (error) {
        console.debug("No reaction found for comment:", comment.id);
      }
    };

    fetchUserReaction();
  }, [currentUser, comment.id]);

  const renderCommentContent = (content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) => {
      if (part.match(/^@[a-zA-Z0-9_]+$/)) {
        return (
          <span key={index} className="text-blue-500 font-semibold">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !currentUser?.id) return;

    setSubmittingReply(true);
    try {
      const newComment = await commentService.createComment(
        "POST",
        postId,
        replyContent,
        currentUser.id,
        comment.id
      );

      setReplyContent("");
      setShowReplyInput(false);
      onCreateReply(comment.id, newComment);
    } catch (error: any) {
      console.error("Error submitting reply:", error);
      alert(error?.response?.data?.message || "Failed to submit reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteComment = () => {
    if (!currentUser?.id) return;

    // Parent handler (PostModal) is the single source of truth for delete API + state update.
    onDelete(comment.id, comment.parentId ?? undefined);
  };

  const handleReaction = async (reactionType: string) => {
    if (!currentUser?.id) {
      alert("Please login to react");
      return;
    }

    try {
      const reaction = await postApi.toggleCommentReaction(
        currentUser.id.toString(),
        comment.id,
        reactionType
      );

      if (!reaction) {
        setCurrentReaction(null);
      } else {
        setCurrentReaction(reaction.type);
      }
      setShowReactionPicker(false);
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  const handleLikeClick = () => {
    if (currentReaction) {
      handleReaction(currentReaction);
    } else {
      handleReaction("LIKE");
    }
  };

  const handleReactionMouseEnter = () => {
    if (reactionTimeout) {
      clearTimeout(reactionTimeout);
      setReactionTimeout(null);
    }
    setShowReactionPicker(true);
  };

  const handleReactionMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowReactionPicker(false);
    }, 300);
    setReactionTimeout(timeout);
  };

  const getReactionEmoji = (type: string) => {
    const emojis: Record<string, string> = {
      LIKE: "👍",
      LOVE: "❤️",
      HAHA: "😂",
      WOW: "😮",
      SAD: "😢",
      ANGRY: "😡",
    };
    return emojis[type] || "👍";
  };

  if (userLoading || !commentUser) {
    return (
      <div className="h-12 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
    );
  }

  // Get direct children for preview/expanded
  const directChildren = getDirectChildren(commentId);
  // FIX: When collapsed, show NO children (not preview). When expanded, show all.
  const visibleChildren = expanded ? directChildren : [];

  // DEBUG - More detailed logging
  if (comment.replyCount > 0) {
    console.log(
      `🔍 Comment ${commentId} [L${level}]: replyCount=${comment.replyCount}, hasMoreReplies=${comment.hasMoreReplies}`,
      {
        expanded,
        directChildrenCount: directChildren.length,
        visibleChildrenCount: visibleChildren.length,
        expandedMapValue: expandedMap[commentId],
        loadingMapValue: loadingMap[commentId],
        hasMoreRepliesValue: hasMoreReplies?.[commentId],
        directChildIds: directChildren.map((c) => c.id),
      }
    );
  }

  // FIX: Hidden count should be all children minus visible ones
  const hiddenChildrenCount = Math.max(
    0,
    comment.replyCount - (expanded ? directChildren.length : 0)
  );
  const showToggleButton = comment.replyCount > 0;

  const timeAgo = new Date(comment.createdAt).toLocaleDateString("vi-VN");

  return (
    <div id={`comment-${commentId}`} className={level > 0 ? "ml-10" : ""}>
      <div className="flex gap-3 px-4">
        <img
          src={commentUser.avatarUrl || "https://i.pravatar.cc/150?img=5"}
          alt={commentUser.username}
          className="w-8 h-8 rounded-full shrink-0"
        />
        <div className="flex-1">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2">
            <p className="font-semibold text-sm dark:text-white">
              {commentUser.username}
            </p>
            <p className="text-sm dark:text-white">
              {renderCommentContent(comment.content)}
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1 px-3 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {timeAgo}
            </span>

            {/* Reaction Button */}
            <div className="relative">
              <button
                onClick={handleLikeClick}
                onMouseEnter={handleReactionMouseEnter}
                onMouseLeave={handleReactionMouseLeave}
                className={`text-xs font-semibold hover:underline ${
                  currentReaction
                    ? "text-blue-500 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {currentReaction ? getReactionEmoji(currentReaction) : "Like"}
              </button>

              {showReactionPicker && (
                <div
                  onMouseEnter={handleReactionMouseEnter}
                  onMouseLeave={handleReactionMouseLeave}
                  className="absolute bottom-full left-0 mb-1 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 px-2 py-1 flex gap-1 z-10"
                >
                  {["LIKE", "LOVE", "HAHA", "WOW", "SAD", "ANGRY"].map(
                    (type) => (
                      <button
                        key={type}
                        onClick={() => handleReaction(type)}
                        className="text-xl hover:scale-125 transition-transform"
                        title={type}
                      >
                        {getReactionEmoji(type)}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Reply Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onReplyClick) {
                  onReplyClick(commentId, e);
                } else {
                  setShowReplyInput(!showReplyInput);
                }
              }}
              className="text-xs text-gray-500 dark:text-gray-400 font-semibold hover:underline"
            >
              Reply
            </button>

            {/* Delete Button */}
            {currentUser && comment.userId === currentUser.id.toString() && (
              <button
                onClick={handleDeleteComment}
                className="text-xs text-red-500 dark:text-red-400 font-semibold hover:underline"
              >
                Delete
              </button>
            )}

            {/* Reaction Count */}
            {comment.reactCount > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {comment.reactCount}{" "}
                {comment.reactCount === 1 ? "like" : "likes"}
              </span>
            )}
          </div>

          {/* Reply Input */}
          {showReplyInput && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitReply();
                  }
                }}
                placeholder={`Reply to ${commentUser.username}...`}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-900 dark:text-white outline-none focus:border-blue-500"
                disabled={submittingReply}
              />
              <button
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || submittingReply}
                className="px-3 py-1.5 text-sm text-blue-500 font-semibold hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingReply ? "..." : "Post"}
              </button>
            </div>
          )}

          {/* Toggle Replies Button */}
          {showToggleButton && (
            <button
              onClick={() => {
                const nextExpanded = !expanded;
                onToggleExpanded(commentId);

                // Auto-load on first expand so level 2+ replies appear immediately.
                if (
                  nextExpanded &&
                  !loading &&
                  directChildren.length === 0 &&
                  comment.replyCount > 0
                ) {
                  onLoadMore(commentId);
                }
              }}
              className="mt-2 text-xs text-gray-600 dark:text-gray-400 font-semibold hover:underline"
            >
              {expanded
                ? "Hide replies"
                : `View more replies${
                    hiddenChildrenCount > 0 ? ` (${hiddenChildrenCount})` : ""
                  }`}
            </button>
          )}
        </div>
      </div>

      {/* Render Direct Children (NO RECURSION) */}
      {expanded && (
        <div className="mt-3 space-y-3">
          {visibleChildren.map((child) => (
            <CommentItemNormalized
              key={child.id}
              commentId={child.id}
              commentsById={commentsById}
              expandedMap={expandedMap}
              onToggleExpanded={onToggleExpanded}
              onLoadMore={onLoadMore}
              onDelete={onDelete}
              onCreateReply={onCreateReply}
              getDirectChildren={getDirectChildren}
              hasMoreReplies={hasMoreReplies}
              loadingMap={loadingMap}
              postId={postId}
              level={level + 1}
            />
          ))}

          {/* Show load-more even when current children is empty but replyCount > 0 */}
          {comment.replyCount > directChildren.length && (
            <button
              onClick={() => onLoadMore(commentId)}
              disabled={loading}
              className="ml-10 text-xs text-blue-500 hover:text-blue-600 font-semibold disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load more replies"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
