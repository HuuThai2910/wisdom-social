import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  X,
  Heart,
  Send,
  Bookmark,
  MoreHorizontal,
  Edit2,
  Trash2,
  Link as LinkIcon,
  MapPin,
  Users,
  Globe,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import FriendSelectorModal from "./FriendSelectorModal";
import EditPostModal from "./EditPostModal";
import { useAuth } from "../../contexts/AuthContext";
import useCommentsNormalized from "../../hooks/useCommentsNormalized";
import { commentService } from "../../services/commentService";
import type { Comment } from "../../services/commentService";
import CommentItemNormalized from "../comment/CommentItemNormalized";
import type { PostData, UserData, PostModalProps } from "../../types/postType";
import * as postApi from "../../services/postService";

export default function PostModal({ postId, onClose }: PostModalProps) {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [post, setPost] = useState<PostData | null>(null);
  const [author, setAuthor] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState<UserData[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Use new comment tree hook
  const {
    commentsById,
    rootIds,
    expandedMap,
    loadingMap,
    hasMoreReplies,
    currentPage,
    rootHasMore,
    loadRootComments,
    loadMoreReplies,
    toggleExpanded,
    createReply,
    deleteComment,
    getDirectChildren,
    resetComments,
  } = useCommentsNormalized({
    targetType: "POST",
    targetId: postId,
  });
  const handleCloseModal = () => {
    // Ensure comment UI state is cleared before leaving modal route.
    resetComments();
    onClose();
  };

  const [showReactions, setShowReactions] = useState(false);
  const reactionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [currentReaction, setCurrentReaction] = useState<string | null>(null);
  const [reactCount, setReactCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionUsers, setMentionUsers] = useState<UserData[]>([]);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const [showSpecificModal, setShowSpecificModal] = useState(false);
  const [showExcludedModal, setShowExcludedModal] = useState(false);
  const [specificViewers, setSpecificViewers] = useState<string[]>([]);
  const [excludedUsers, setExcludedUsers] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [transformedMediaUrls, setTransformedMediaUrls] = useState<string[]>(
    []
  );
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const shouldOpenEdit = Boolean((location.state as any)?.openEdit);
    if (!shouldOpenEdit || !post || !currentUser?.id) {
      return;
    }

    // Only allow auto-open for post owner.
    if (post.authorId === currentUser.id.toString()) {
      setIsEditing(true);
    }
  }, [location.state, post, currentUser?.id]);

  // Auto-expand comment when navigating from PostCard with expandCommentId
  const expandCommentChain = (commentId: string) => {
    let current = commentsById[commentId];

    while (current?.parentId) {
      toggleExpanded(current.parentId);
      current = commentsById[current.parentId];
    }

    toggleExpanded(commentId);
  };

  useEffect(() => {
    const expandCommentId = location.state?.expandCommentId;
    if (expandCommentId && commentsById[expandCommentId]) {
      expandCommentChain(expandCommentId);

      setTimeout(() => {
        const el = document.getElementById(`comment-${expandCommentId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, [location.state, commentsById, toggleExpanded]);

  useEffect(() => {
    if (!post || !post.media || post.media.length === 0) {
      setTransformedMediaUrls([]);
      setCurrentImageIndex(0);
      return;
    }

    const urls = postApi.transformMediaToS3Urls(
      post.media,
      post.authorId || ""
    );
    setTransformedMediaUrls(urls);
    setCurrentImageIndex((prev) =>
      Math.min(prev, Math.max(0, urls.length - 1))
    );
  }, [post]);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch post
        const postData = await postApi.fetchPostById(postId);
        setPost(postData);

        // Fetch author
        const author = await postApi.fetchUserById(postData.authorId);
        setAuthor(author);

        // Fetch tagged users
        if (postData.taggedUserIds && postData.taggedUserIds.length > 0) {
          const fetchedTaggedUsers = await postApi.fetchUsersByIds(
            postData.taggedUserIds
          );
          setTaggedUsers(fetchedTaggedUsers);
        }

        // Load root comments using new hook (will be called in useEffect)
        loadRootComments(0);

        // Fetch reactions count
        const reactCount = await postApi.fetchPostReactionsCount(postId);
        setReactCount(reactCount);

        // Fetch saved status
        if (currentUser?.id) {
          const isSaved = await postApi.checkPostSaved(
            currentUser.id.toString(),
            postId
          );
          setIsSaved(isSaved);
        }

        console.log("✅ Post detail loaded successfully");
      } catch (err: any) {
        const errorMsg =
          err.response?.data?.message || err.message || "Failed to load post";
        console.error("❌ Error fetching post:", errorMsg, err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, currentUser?.id, loadRootComments]);

  // Fetch user's current reaction
  useEffect(() => {
    const fetchUserReaction = async () => {
      if (!currentUser?.id) return;

      try {
        const reaction = await postApi.fetchUserReaction(
          currentUser.id.toString(),
          postId
        );
        if (reaction) {
          setCurrentReaction(reaction.type);
        } else {
          setCurrentReaction(null);
        }
      } catch (error) {
        console.log("PostModal: Error fetching reaction:", error);
        setCurrentReaction(null);
      }
    };
    fetchUserReaction();
  }, [postId, currentUser]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowMenu(false);
    // Optional: Show toast notification
  };

  const handleEdit = () => {
    if (!post) return;
    setShowMenu(false);
    setIsEditing(true);
  };

  const handleChangePrivacy = async (newPrivacy: string) => {
    if (!post) return;

    try {
      if (!currentUser?.id) {
        alert("Please login to update privacy");
        return;
      }

      const updatedPost = await postApi.updatePostPrivacy(
        currentUser.id.toString(),
        postId,
        newPrivacy
      );

      setPost(updatedPost);
      setShowPrivacyMenu(false);
      setShowMenu(false);
      alert("Privacy updated successfully!");
    } catch (error) {
      console.error("Error updating privacy:", error);
      alert("Failed to update privacy.");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn xóa bài viết này?")) {
      setShowMenu(false);
      return;
    }

    try {
      await postApi.deletePost(postId, (currentUser?.id || 0).toString());

      alert("Xóa bài viết thành công!");
      handleCloseModal(); // Close modal after successful deletion
      // TODO: Refresh post list in parent component
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Không thể xóa bài viết. Bạn chỉ có thể xóa bài viết của mình.");
      setShowMenu(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentInput.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      if (!currentUser?.id) {
        alert("Please login to comment");
        return;
      }

      const newComment = await commentService.createComment(
        "POST",
        postId,
        commentInput,
        currentUser.id
      );

      // Optimistic update: add to root comments using new hook
      createReply(null, newComment);
      setCommentInput("");
    } catch (error: any) {
      console.error("Error submitting comment:", error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit comment";
      console.error("Error details:", {
        status: error?.response?.status,
        data: error?.response?.data,
        message: errorMsg,
      });
      alert(errorMsg);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string, parentId?: string) => {
    if (
      !confirm("Bạn có chắc muốn xóa bình luận này? (Tất cả replies sẽ bị xóa)")
    )
      return;

    try {
      if (!currentUser?.id) {
        alert("Please login to delete comment");
        return;
      }
      await commentService.deleteComment(commentId, currentUser.id);

      // Optimistic update: remove from normalized store (with all descendants)
      deleteComment(commentId, parentId);
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Không thể xóa bình luận");
    }
  };

  // Called by CommentItemNormalized after creating a reply
  const handleReplyCreated = (parentId: string | null, newReply: Comment) => {
    createReply(parentId, newReply);
  };

  const handleCommentInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setCommentInput(value);
    setMentionCursorPos(cursorPos);

    // Check if user is typing a mention
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1) {
      const afterAt = textBeforeCursor.substring(atIndex + 1);
      // Check if there's no space after @
      if (!afterAt.includes(" ")) {
        setShowMentionDropdown(true);

        // Search users if query is not empty
        if (afterAt.length > 0) {
          try {
            const mentionUsers = await postApi.searchUsers(
              currentUser?.id?.toString() || "",
              afterAt
            );
            setMentionUsers(mentionUsers);
          } catch (error) {
            console.error("Error searching users:", error);
          }
        } else {
          setMentionUsers([]);
        }
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  const handleSelectMention = (user: UserData) => {
    const textBeforeCursor = commentInput.substring(0, mentionCursorPos);
    const textAfterCursor = commentInput.substring(mentionCursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    const newValue =
      commentInput.substring(0, atIndex) +
      `@${user.username} ` +
      textAfterCursor;

    setCommentInput(newValue);
    setShowMentionDropdown(false);
    setMentionUsers([]);
  };

  const handleReaction = async (reactionType: string) => {
    if (!currentUser?.id) {
      alert("Please login to react");
      return;
    }

    try {
      const reaction = await postApi.togglePostReaction(
        currentUser.id.toString(),
        postId,
        reactionType
      );

      // If reaction was removed
      if (!reaction) {
        setCurrentReaction(null);
        setReactCount((prev) => Math.max(0, prev - 1));
      } else {
        const wasNewReaction = currentReaction === null;
        setCurrentReaction(reaction.type);
        if (wasNewReaction) {
          setReactCount((prev) => prev + 1);
        }
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  const handleSave = async () => {
    if (!currentUser?.id) {
      alert("Please login to save posts");
      return;
    }

    try {
      await postApi.togglePostSaved(currentUser.id.toString(), postId);

      // Toggle saved state
      setIsSaved(!isSaved);
    } catch (error) {
      console.error("Error toggling save status:", error);
    }
  };

  // Keep hook order stable across loading/error/content states.
  useEffect(() => {
    const video = modalVideoRef.current;

    if (!post || !post.media || post.media.length === 0) {
      if (video) video.pause();
      return;
    }

    const currentMedia = post.media[currentImageIndex];
    const currentUrl = transformedMediaUrls[currentImageIndex] || "";
    const currentIsVideo = postApi.isVideoMedia(currentUrl, currentMedia?.type);

    if (!currentIsVideo || !video) {
      if (video) video.pause();
      return;
    }

    video.muted = true;
    video.playsInline = true;

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => undefined);
    }

    return () => {
      video.pause();
    };
  }, [currentImageIndex, transformedMediaUrls, post]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleCloseModal}
      >
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full shadow-2xl">
          <h2 className="text-xl font-bold text-red-600 mb-4">
            Error Loading Post
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={handleCloseModal}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  const authorDisplay = {
    id: author?.id ?? Number(post.authorId || 0),
    username: author?.username || "unknown",
    avatarUrl: author?.avatarUrl || "https://i.pravatar.cc/150?img=5",
  };

  // Check if current user is the post owner
  const isOwnPost = currentUser?.id.toString() === post.authorId;

  const hasMedia = post.media && post.media.length > 0;
  const totalImages = post?.media?.length || 0;
  const safePostContent = post.content || "";

  const isVideoAtIndex = (index: number) => {
    const media = post.media?.[index];
    const url = transformedMediaUrls[index] || "";
    return postApi.isVideoMedia(url, media?.type);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Close button - outside the modal */}
      <button
        onClick={handleCloseModal}
        className="absolute right-8 top-8 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      <div className="relative bg-white dark:bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] flex overflow-hidden shadow-2xl">
        {/* Left side - Media */}
        <div className="flex-1 bg-black flex items-center justify-center relative group">
          {hasMedia ? (
            <>
              {isVideoAtIndex(currentImageIndex) ? (
                <video
                  ref={modalVideoRef}
                  src={transformedMediaUrls[currentImageIndex] || ""}
                  className="max-h-[90vh] max-w-full object-contain"
                  autoPlay
                  muted
                  playsInline
                  controls
                />
              ) : (
                <img
                  src={transformedMediaUrls[currentImageIndex] || ""}
                  alt="Post content"
                  className="max-h-[90vh] max-w-full object-contain"
                />
              )}
              {/* Navigation arrows - Only show if multiple images */}
              {totalImages > 1 && (
                <>
                  {/* Previous button */}
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={24} />
                  </button>

                  {/* Next button */}
                  <button
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    aria-label="Next image"
                  >
                    <ChevronRight size={24} />
                  </button>

                  {/* Dots indicator */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {post.media!.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCurrentImageIndex(index);
                        }}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentImageIndex
                            ? "bg-blue-500 w-2.5 h-2.5"
                            : "bg-gray-300/70 hover:bg-gray-300"
                        }`}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>

                  {/* Image counter */}
                  <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-3 py-1.5 rounded-full z-10">
                    {currentImageIndex + 1} / {totalImages}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
              <p className="text-4xl font-bold text-gray-400 dark:text-gray-600 px-8 text-center">
                {safePostContent}
              </p>
            </div>
          )}
        </div>

        {/* Right side - Details */}
        <div className="w-100 flex flex-col bg-white dark:bg-gray-900">
          {/* Header */}
          <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={authorDisplay.avatarUrl}
                alt={authorDisplay.username}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="font-semibold text-sm dark:text-white">
                  {authorDisplay.username}
                </p>
                {post.privacy &&
                  (() => {
                    const isOwnPost =
                      currentUser?.id.toString() ===
                      authorDisplay.id.toString();

                    // Hiển thị cho chủ post
                    if (isOwnPost) {
                      return (
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          {post.privacy === "PUBLIC" && (
                            <>
                              <Globe className="w-3 h-3 text-blue-500" />
                              <span className="font-medium">Public</span>
                            </>
                          )}
                          {post.privacy === "FRIENDS" && (
                            <>
                              <Users className="w-3 h-3 text-green-500" />
                              <span className="font-medium">Friends</span>
                            </>
                          )}
                          {post.privacy === "SPECIFIC" && (
                            <>
                              <Users className="w-3 h-3 text-purple-500" />
                              <span className="font-medium">
                                Specific friends
                              </span>
                            </>
                          )}
                          {post.privacy === "EXCEPT" && (
                            <>
                              <Users className="w-3 h-3 text-orange-500" />
                              <span className="font-medium">
                                Friends except
                              </span>
                            </>
                          )}
                          {post.privacy === "ONLY_ME" && (
                            <>
                              <Globe className="w-3 h-3 text-gray-500" />
                              <span className="font-medium">Only me</span>
                            </>
                          )}
                        </p>
                      );
                    }

                    // Hiển thị cho người khác - chỉ Public hoặc Friends
                    return (
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        {post.privacy === "PUBLIC" && (
                          <>
                            <Globe className="w-3 h-3 text-blue-500" />
                            <span className="font-medium">Public</span>
                          </>
                        )}
                        {(post.privacy === "FRIENDS" ||
                          post.privacy === "SPECIFIC" ||
                          post.privacy === "EXCEPT") && (
                          <>
                            <Users className="w-3 h-3 text-green-500" />
                            <span className="font-medium">Friends</span>
                          </>
                        )}
                      </p>
                    );
                  })()}
                {post.location && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {typeof post.location === "string"
                      ? post.location
                      : post.location.name || post.location.address}
                  </p>
                )}
              </div>
            </div>
            {/* More options button with dropdown menu - Only show for post owner */}
            {isOwnPost && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                {/* Dropdown menu */}
                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-20 py-2 border dark:border-gray-700">
                      <button
                        onClick={handleEdit}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 dark:text-white"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setShowPrivacyMenu(!showPrivacyMenu);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 dark:text-white"
                      >
                        <Globe className="w-4 h-4" />
                        Change privacy
                      </button>
                      {showPrivacyMenu && (
                        <div className="px-2 py-1 space-y-1">
                          <button
                            onClick={() => handleChangePrivacy("PUBLIC")}
                            className="w-full px-4 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-white flex items-center gap-2"
                          >
                            <Globe className="w-3 h-3" />
                            Public
                          </button>
                          <button
                            onClick={() => handleChangePrivacy("FRIENDS")}
                            className="w-full px-4 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-white flex items-center gap-2"
                          >
                            <Users className="w-3 h-3" />
                            Friends
                          </button>
                          <button
                            onClick={() => handleChangePrivacy("ONLY_ME")}
                            className="w-full px-4 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-white flex items-center gap-2"
                          >
                            <Globe className="w-3 h-3" />
                            Only me
                          </button>
                          <button
                            onClick={() => {
                              setShowPrivacyMenu(false);
                              setShowSpecificModal(true);
                            }}
                            className="w-full px-4 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-white flex items-center gap-2"
                          >
                            <Users className="w-3 h-3" />
                            Specific friends
                          </button>
                          <button
                            onClick={() => {
                              setShowPrivacyMenu(false);
                              setShowExcludedModal(true);
                            }}
                            className="w-full px-4 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-white flex items-center gap-2"
                          >
                            <Users className="w-3 h-3" />
                            Friends except
                          </button>
                        </div>
                      )}
                      <button
                        onClick={handleDelete}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                      <button
                        onClick={handleCopyLink}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 dark:text-white"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Copy link
                      </button>
                      <div className="border-t dark:border-gray-700 my-1" />
                      <button
                        onClick={() => setShowMenu(false)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Comments Section - Start directly with comments */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Comments section */}
            <div className="space-y-4">
              {rootIds.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  No comments yet
                </p>
              ) : (
                <>
                  {/* DEBUG: Log state snapshot */}
                  {console.log(
                    `📊 PostModal rendering ${rootIds.length} root comments:`,
                    {
                      rootIds,
                      totalComments: Object.keys(commentsById).length,
                      expandedCount: Object.keys(expandedMap).filter(
                        (k) => expandedMap[k]
                      ).length,
                    }
                  )}
                  {rootIds.map((commentId) => (
                    <CommentItemNormalized
                      key={commentId}
                      commentId={commentId}
                      commentsById={commentsById}
                      expandedMap={expandedMap}
                      onToggleExpanded={toggleExpanded}
                      onLoadMore={loadMoreReplies}
                      onDelete={handleDeleteComment}
                      onCreateReply={handleReplyCreated}
                      getDirectChildren={getDirectChildren}
                      hasMoreReplies={hasMoreReplies}
                      loadingMap={loadingMap}
                      postId={postId}
                    />
                  ))}
                  {rootHasMore && (
                    <div className="w-full flex justify-center pt-2">
                      <button
                        onClick={() => loadRootComments(currentPage + 1)}
                        className="px-3 py-1 text-sm text-blue-500 hover:text-blue-600 font-semibold"
                      >
                        See more comments
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Actions bar */}
          <div className="border-t dark:border-gray-800">
            <div className="p-4 flex items-center justify-between">
              <div className="flex gap-4">
                {/* Reaction button with picker */}
                <div
                  className="relative"
                  onMouseEnter={() => {
                    if (reactionsTimeoutRef.current)
                      clearTimeout(reactionsTimeoutRef.current);
                    setShowReactions(true);
                  }}
                  onMouseLeave={() => {
                    reactionsTimeoutRef.current = setTimeout(
                      () => setShowReactions(false),
                      300
                    );
                  }}
                >
                  <button
                    onClick={() => {
                      if (!currentReaction) {
                        handleReaction("LIKE");
                      } else {
                        handleReaction(currentReaction);
                      }
                    }}
                    className="hover:scale-110 transition-transform"
                  >
                    {currentReaction === "LIKE" && (
                      <span className="text-2xl">👍</span>
                    )}
                    {currentReaction === "LOVE" && (
                      <span className="text-2xl">❤️</span>
                    )}
                    {currentReaction === "HAHA" && (
                      <span className="text-2xl">😂</span>
                    )}
                    {currentReaction === "WOW" && (
                      <span className="text-2xl">😮</span>
                    )}
                    {currentReaction === "SAD" && (
                      <span className="text-2xl">😢</span>
                    )}
                    {currentReaction === "ANGRY" && (
                      <span className="text-2xl">😡</span>
                    )}
                    {!currentReaction && (
                      <Heart className="w-6 h-6 dark:text-white" />
                    )}
                  </button>

                  {/* Reaction picker */}
                  {showReactions && (
                    <div className="absolute bottom-full left-0 mb-0 pb-2 bg-white dark:bg-gray-800 rounded-full shadow-2xl border dark:border-gray-700 px-4 py-3 flex gap-2 z-50 animate-in fade-in zoom-in duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReaction("LIKE");
                        }}
                        className="hover:scale-125 transition-transform text-3xl"
                        title="Thích"
                      >
                        👍
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReaction("LOVE");
                        }}
                        className="hover:scale-125 transition-transform text-3xl"
                        title="Yêu thích"
                      >
                        ❤️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReaction("HAHA");
                        }}
                        className="hover:scale-125 transition-transform text-3xl"
                        title="Haha"
                      >
                        😂
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReaction("WOW");
                        }}
                        className="hover:scale-125 transition-transform text-3xl"
                        title="Wow"
                      >
                        😮
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReaction("SAD");
                        }}
                        className="hover:scale-125 transition-transform text-3xl"
                        title="Buồn"
                      >
                        😢
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReaction("ANGRY");
                        }}
                        className="hover:scale-125 transition-transform text-3xl"
                        title="Phẫn nộ"
                      >
                        😡
                      </button>
                    </div>
                  )}
                </div>

                <button className="hover:opacity-70 transition-opacity">
                  <Send className="w-6 h-6 dark:text-white" />
                </button>
              </div>
              <button
                onClick={handleSave}
                className="hover:opacity-70 transition-opacity"
              >
                <Bookmark
                  className="w-6 h-6 dark:text-white"
                  fill={isSaved ? "currentColor" : "none"}
                />
              </button>
            </div>

            <div className="px-4 pb-2">
              <p className="font-semibold text-sm dark:text-white">
                {reactCount} lượt thích
              </p>
            </div>

            {/* Add comment input */}
            <div className="p-4 border-t dark:border-gray-800 relative">
              {/* Mention dropdown */}
              {showMentionDropdown && mentionUsers.length > 0 && (
                <div className="absolute bottom-full left-4 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 max-h-60 overflow-y-auto z-50 w-64">
                  {mentionUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectMention(user)}
                      className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                    >
                      <img
                        src={
                          user.avatarUrl || "https://i.pravatar.cc/150?img=5"
                        }
                        alt={user.username}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="text-sm font-semibold dark:text-white">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          @{user.username}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  {/* Highlighted text background layer */}
                  <div className="absolute inset-0 text-sm pointer-events-none whitespace-pre-wrap wrap-break-word dark:text-white opacity-0">
                    {commentInput
                      .split(/(@[a-zA-Z0-9_]+)/g)
                      .map((part, index) => {
                        if (part.match(/^@[a-zA-Z0-9_]+$/)) {
                          return (
                            <span
                              key={index}
                              className="text-blue-500 font-semibold opacity-100"
                            >
                              {part}
                            </span>
                          );
                        }
                        return (
                          <span key={index} className="opacity-100">
                            {part}
                          </span>
                        );
                      })}
                  </div>

                  {/* Transparent input layer */}
                  <input
                    type="text"
                    value={commentInput}
                    onChange={handleCommentInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                    }}
                    placeholder="Add a comment..."
                    className="relative w-full text-sm outline-none dark:bg-transparent bg-transparent caret-gray-900 dark:caret-white"
                    style={{
                      color: "transparent",
                      textShadow: "0 0 0 #000",
                      WebkitTextFillColor: "transparent",
                    }}
                    disabled={submittingComment}
                  />
                </div>
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentInput.trim() || submittingComment}
                  className="text-blue-500 font-semibold text-sm hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingComment ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Friend Selector Modals */}
      <FriendSelectorModal
        isOpen={showSpecificModal}
        onClose={() => setShowSpecificModal(false)}
        onConfirm={(selected) => {
          setSpecificViewers(selected);
          handleChangePrivacy("SPECIFIC");
        }}
        title="Who can see this?"
        description="Only selected friends will be able to see this post"
        initialSelected={specificViewers}
      />

      <FriendSelectorModal
        isOpen={showExcludedModal}
        onClose={() => setShowExcludedModal(false)}
        onConfirm={(selected) => {
          setExcludedUsers(selected);
          handleChangePrivacy("EXCEPT");
        }}
        title="Hide from"
        description="Selected friends won't be able to see this post"
        initialSelected={excludedUsers}
      />

      {/* Edit Post Modal */}
      {isEditing && post && (
        <EditPostModal
          postId={postId}
          post={post}
          taggedUsers={taggedUsers}
          onClose={() => setIsEditing(false)}
          onSaved={(updatedPost) => {
            setPost(updatedPost as PostData);
            setIsEditing(false);
          }}
        />
      )}
    </div>
  );
}
