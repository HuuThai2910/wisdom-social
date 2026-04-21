import { useState, useEffect, useRef, useCallback } from "react";
import { Smile } from "lucide-react";
import { Theme } from "emoji-picker-react";
import { useAuth } from "../../../contexts/AuthContext";
import * as postApi from "../../../services/postService";
import { commentService } from "../../../services/commentService";
import type { Comment } from "../../../services/commentService";
import type { UserData } from "../../../types/postType";
import IconModal from "../../icon-modal/IconModal";

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
  currentUserId?: string;
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
  currentUserId,
}: CommentItemNormalizedProps) {
  const comment = commentsById[commentId];
  if (!comment) return null;

  const expanded = expandedMap[commentId] || false;
  const loading = loadingMap[commentId] || false;

  const [commentUser, setCommentUser] = useState<UserData | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const { currentUser } = useAuth();
  const activeUserId = currentUserId || currentUser?.id?.toString() || "";

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showReplyEmojiPicker, setShowReplyEmojiPicker] = useState(false);
  const [replyEmojiPosition, setReplyEmojiPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [replyCursorPos, setReplyCursorPos] = useState(0);
  const replyInputRef = useRef<HTMLInputElement | null>(null);
  const replyEmojiButtonRef = useRef<HTMLButtonElement | null>(null);

  const [currentReaction, setCurrentReaction] = useState<string | null>(null);
  const [reactionSummary, setReactionSummary] = useState<{
    totalCount: number;
    topReactions: { type: string; count: number }[];
  }>({
    totalCount: Number(comment.reactCount || 0),
    topReactions: [],
  });
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionDetail, setReactionDetail] = useState<{
    totalCount: number;
    topReactions: { type: string; count: number }[];
  }>({
    totalCount: 0,
    topReactions: [],
  });
  const fetchReactionSummary = useCallback(async () => {
    try {
      const summary = await commentService.fetchCommentReactionSummary(
        comment.id
      );
      setReactionSummary(summary);
    } catch (error) {
      setReactionSummary((prev) => ({
        ...prev,
        totalCount: Number(comment.reactCount || 0),
      }));
    }
  }, [comment.id, comment.reactCount]);

  useEffect(() => {
    fetchReactionSummary();
  }, [fetchReactionSummary]);

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
      if (!activeUserId) return;

      try {
        const reaction = await commentService.fetchUserCommentReaction(
          activeUserId,
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
  }, [activeUserId, comment.id]);

  useEffect(() => {
    if (!showReplyEmojiPicker) return;

    const updatePickerPosition = () => {
      const buttonRect = replyEmojiButtonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;

      setReplyEmojiPosition({
        top: buttonRect.top - 8,
        left: Math.max(8, Math.min(buttonRect.left, window.innerWidth - 320)),
      });
    };

    updatePickerPosition();
    window.addEventListener("resize", updatePickerPosition);
    window.addEventListener("scroll", updatePickerPosition, true);

    return () => {
      window.removeEventListener("resize", updatePickerPosition);
      window.removeEventListener("scroll", updatePickerPosition, true);
    };
  }, [showReplyEmojiPicker]);

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
    if (!replyContent.trim() || !activeUserId) return;

    setSubmittingReply(true);
    try {
      const newComment = await commentService.createComment(
        "POST",
        postId,
        replyContent,
        Number(activeUserId),
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

  const handleInsertReplyEmoji = (emoji: string) => {
    const selectionPos = replyInputRef.current?.selectionStart;
    const safeCursorPos = Math.min(
      Math.max(selectionPos ?? replyCursorPos, 0),
      replyContent.length
    );
    const newValue =
      replyContent.slice(0, safeCursorPos) +
      emoji +
      replyContent.slice(safeCursorPos);
    const nextCursorPos = safeCursorPos + emoji.length;

    setReplyContent(newValue);
    setReplyCursorPos(nextCursorPos);
    setShowReplyEmojiPicker(false);

    requestAnimationFrame(() => {
      if (replyInputRef.current) {
        replyInputRef.current.focus();
        replyInputRef.current.setSelectionRange(nextCursorPos, nextCursorPos);
      }
    });
  };

  const handleDeleteComment = () => {
    if (!activeUserId) return;

    // Parent handler (PostModal) is the single source of truth for delete API + state update.
    onDelete(comment.id, comment.parentId ?? undefined);
  };

  const handleReaction = async (reactionType: string) => {
    if (!activeUserId) {
      alert("Please login to react");
      return;
    }

    try {
      const reaction = await commentService.toggleCommentReaction(
        activeUserId,
        comment.id,
        reactionType
      );

      if (!reaction) {
        setCurrentReaction(null);
      } else {
        setCurrentReaction(reaction.type);
      }
      await fetchReactionSummary();
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

  const fetchReactionDetail = useCallback(async () => {
    try {
      const summary = await commentService.fetchCommentReactionSummary(
        comment.id,
        6
      );
      setReactionDetail(summary);
    } catch (error) {
      console.error("Error fetching reaction detail:", error);
    }
  }, [comment.id]);

  const getReactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      LIKE: "Like",
      LOVE: "Love",
      HAHA: "Haha",
      WOW: "Wow",
      SAD: "Sad",
      ANGRY: "Angry",
    };
    return labels[type] || type;
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
  const totalReactionCount = Number(reactionSummary.totalCount || 0);
  const topReactionIcons = (reactionSummary.topReactions || []).slice(0, 3);

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
            {activeUserId && comment.userId === activeUserId && (
              <button
                onClick={handleDeleteComment}
                className="text-xs text-red-500 dark:text-red-400 font-semibold hover:underline"
              >
                Delete
              </button>
            )}

            {/* Reaction Count with Hover Dropdown */}
            {totalReactionCount > 0 && (
              <div className="relative ml-auto group">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-full px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex -space-x-1">
                    {(topReactionIcons.length > 0
                      ? topReactionIcons
                      : [{ type: "LIKE", count: totalReactionCount }]
                    ).map((reaction, index) => (
                      <span
                        key={`${reaction.type}-${index}`}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700"
                        title={`${reaction.type}: ${reaction.count}`}
                      >
                        {getReactionEmoji(reaction.type)}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {totalReactionCount}
                  </span>
                </button>

                {/* Hover Dropdown */}
                <div
                  className="pointer-events-none absolute top-full right-0 z-50 mt-2 opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100"
                  onMouseEnter={fetchReactionDetail}
                >
                  <div className="w-44 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                      Chi tiết lượt react
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      {reactionDetail.topReactions.length === 0 && (
                        <div className="text-xs text-gray-400 text-center py-2">
                          No reactions yet
                        </div>
                      )}
                      {reactionDetail.topReactions.map((reaction, index) => (
                        <div
                          key={`${reaction.type}-${index}`}
                          className="flex items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm leading-none">
                              {getReactionEmoji(reaction.type)}
                            </span>
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              {getReactionLabel(reaction.type)}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                            {reaction.count}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-1.5 text-right text-xs text-gray-400 dark:text-gray-500">
                      Tổng: {reactionDetail.totalCount}
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="absolute right-3 -top-1.5 flex justify-center">
                    <div className="h-3 w-3 rotate-45 border-t border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reply Input */}
          {showReplyInput && (
            <div className="mt-2 flex gap-2 items-center">
              <div className="relative">
                <button
                  ref={replyEmojiButtonRef}
                  type="button"
                  onClick={() => setShowReplyEmojiPicker((prev) => !prev)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-[#363636] rounded-full"
                  aria-label="Insert emoji"
                  title="Insert emoji"
                >
                  <Smile
                    size={20}
                    className="text-gray-500 dark:text-gray-400"
                  />
                </button>

                <IconModal
                  open={showReplyEmojiPicker}
                  onClose={() => setShowReplyEmojiPicker(false)}
                  onEmojiClick={(emojiData) =>
                    handleInsertReplyEmoji(emojiData.emoji)
                  }
                  theme={
                    document.documentElement.classList.contains("dark")
                      ? Theme.DARK
                      : Theme.LIGHT
                  }
                  anchorRef={replyEmojiButtonRef}
                  containerClassName="fixed z-120"
                  containerStyle={
                    replyEmojiPosition
                      ? {
                          top: replyEmojiPosition.top,
                          left: replyEmojiPosition.left,
                          transform: "translateY(-100%)",
                        }
                      : undefined
                  }
                  pickerProps={{
                    height: 350,
                    width: 300,
                  }}
                />
              </div>

              <input
                ref={replyInputRef}
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onClick={(e) =>
                  setReplyCursorPos(e.currentTarget.selectionStart || 0)
                }
                onKeyUp={(e) =>
                  setReplyCursorPos(e.currentTarget.selectionStart || 0)
                }
                onSelect={(e) =>
                  setReplyCursorPos(
                    e.currentTarget.selectionStart || replyContent.length
                  )
                }
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
              currentUserId={activeUserId}
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
