import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import * as postApi from "../../services/postService";
import { commentService } from "../../services/commentService";
import type { Comment } from "../../services/commentService";
import type { UserData } from "../../types/postType";

interface CommentItemProps {
  comment: Comment;
  onDelete: (commentId: string, parentId?: string) => void;
  onLoadMoreReplies: (commentId: string) => void;
  onReplyCreated?: (parentId: string, newReply: Comment) => void;
  postId: string;
  level?: number;
}

export default function CommentItem({
  comment,
  onDelete,
  onLoadMoreReplies,
  onReplyCreated,
  postId,
  level = 0,
}: CommentItemProps) {
  const [commentUser, setCommentUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  // Reply state
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  // Reaction state
  const [currentReaction, setCurrentReaction] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionTimeout, setReactionTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const renderCommentContent = (content: string) => {
    // Split by mentions (@username) - match @ followed by word characters
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

  // Fetch comment user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await postApi.fetchUserById(comment.userId);
        setCommentUser(user);
      } catch (error) {
        console.error("Error fetching comment user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [comment.userId]);

  // Fetch user's reaction on comment
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

  // AUTO-LOAD initial replies when showReplies becomes true
  useEffect(() => {
    if (
      showReplies &&
      (!comment.replies || comment.replies.length === 0) &&
      comment.replyCount > 0
    ) {
      onLoadMoreReplies(comment.id);
    }
  }, [
    showReplies,
    comment.id,
    comment.replies?.length,
    comment.replyCount,
    onLoadMoreReplies,
  ]);

  // Toggle replies visibility
  const toggleReplies = () => {
    const newShowReplies = !showReplies;
    setShowReplies(newShowReplies);

    // If showing replies and no replies loaded yet, load them
    if (newShowReplies && (!comment.replies || comment.replies.length === 0)) {
      onLoadMoreReplies(comment.id);
    }
  };

  // Handle reply submission
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
      setShowReplies(true);

      // Use optimistic update via callback if provided, otherwise load replies
      if (onReplyCreated) {
        onReplyCreated(comment.id, newComment);
      } else {
        onLoadMoreReplies(comment.id);
      }
    } catch (error: any) {
      console.error("Error submitting reply:", error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit reply";
      console.error("Error details:", {
        status: error?.response?.status,
        data: error?.response?.data,
        message: errorMsg,
      });
      alert(errorMsg);
    } finally {
      setSubmittingReply(false);
    }
  };

  // Handle delete reply
  const handleDeleteReply = (commentId: string) => {
    onDelete(commentId, comment.id);
  };

  // Handle delete current comment (confirmation & API call handled by parent)
  const handleDeleteComment = async () => {
    if (!currentUser?.id) {
      alert("Please login to delete comment");
      return;
    }

    // Optimistic: delete immediately from UI
    // undefined means this is a root comment (no parentId)
    onDelete(comment.id);

    // Then call API to delete from backend
    try {
      await commentService.deleteComment(comment.id, currentUser.id);
    } catch (error: any) {
      console.error("Error deleting comment:", error);
      alert("Không thể xóa bình luận");
    }
  };

  // Handle reaction
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
        // Reaction removed
        setCurrentReaction(null);
      } else {
        // Reaction added or changed
        setCurrentReaction(reaction.type);
        // Count will be synced from server
      }
      setShowReactionPicker(false);
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  const handleLikeClick = () => {
    if (currentReaction) {
      // If already has reaction, clicking again will remove it
      // Just call handleReaction with current reaction, backend will toggle it off
      handleReaction(currentReaction);
    } else {
      // Add like
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

  if (loading || !commentUser) {
    return (
      <div className="h-12 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
    );
  }

  const timeAgo = new Date(comment.createdAt).toLocaleDateString("vi-VN");

  return (
    <div className={level > 0 ? "ml-10" : ""}>
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

              {/* Reaction Picker */}
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

            {/* Reply Button - NO DEPTH LIMIT */}
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
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

          {/* Show Replies Button */}
          {comment.replyCount > 0 && (
            <button
              onClick={toggleReplies}
              className="mt-2 text-xs text-gray-600 dark:text-gray-400 font-semibold hover:underline"
            >
              {showReplies ? "Hide" : "View"} {comment.replyCount}{" "}
              {comment.replyCount === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onDelete={handleDeleteReply}
              onLoadMoreReplies={onLoadMoreReplies}
              onReplyCreated={onReplyCreated}
              postId={postId}
              level={level + 1}
            />
          ))}
          {comment.hasMoreReplies && (
            <button
              onClick={() => onLoadMoreReplies(comment.id)}
              className="ml-10 text-xs text-blue-500 hover:text-blue-600 font-semibold"
            >
              Load more replies
            </button>
          )}
        </div>
      )}
    </div>
  );
}
