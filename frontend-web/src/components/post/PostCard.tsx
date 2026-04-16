import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  Heart,
  MessageCircle,
  Bookmark,
  MoreHorizontal,
  Globe,
  Users,
  Lock,
  Edit2,
  Trash2,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Post, PrivacyType } from "../../types";
import * as postApi from "../../services/postService";
import { buildS3Url } from "../../utils/s3";
import { useCurrentUser } from "./../../hooks/useCurrentUser";
import useVideoAutoplay from "../../hooks/useVideoAutoplay";
import useCommentsNormalized from "../../hooks/useCommentsNormalized";
import { commentService } from "../../services/commentService";
import CommentItemNormalized from "../comment/CommentItemNormalized";
import EditPostModal from "./EditPostModal";
import type { PostData } from "../../types/postType";

interface PostCardProps {
  post: Post;
}

const getPrivacyDisplay = (
  privacy?: PrivacyType,
  isOwnPost: boolean = false
) => {
  // Chủ post thấy đầy đủ thông tin
  if (isOwnPost) {
    switch (privacy) {
      case "PUBLIC":
        return { icon: Globe, text: "Public", color: "text-blue-500" };
      case "FRIENDS":
        return { icon: Users, text: "Friends", color: "text-green-500" };
      case "SPECIFIC":
        return {
          icon: Users,
          text: "Specific friends",
          color: "text-purple-500",
        };
      case "EXCEPT":
        return {
          icon: Users,
          text: "Friends except",
          color: "text-orange-500",
        };
      case "ONLY_ME":
        return { icon: Lock, text: "Only me", color: "text-gray-500" };
      default:
        return { icon: Globe, text: "Public", color: "text-blue-500" };
    }
  }

  // Người khác chỉ thấy Public hoặc Friends
  switch (privacy) {
    case "PUBLIC":
      return { icon: Globe, text: "Public", color: "text-blue-500" };
    case "FRIENDS":
    case "SPECIFIC":
    case "EXCEPT":
      return { icon: Users, text: "Friends", color: "text-green-500" };
    default:
      return { icon: Globe, text: "Public", color: "text-blue-500" };
  }
};

export default function PostCard({ post }: PostCardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const isOwnPost = currentUser?.id === post.user.id;
  const privacyDisplay = getPrivacyDisplay(post.privacy, isOwnPost);

  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const [showReactions, setShowReactions] = useState(false);
  const [currentReaction, setCurrentReaction] = useState<string | null>(null);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Comments state
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showFullCommentsPreview, setShowFullCommentsPreview] = useState(false);
  const [recentCommentIds, setRecentCommentIds] = useState<string[]>([]);
  const fullCommentsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState<any[]>([]);
  const [displayPost, setDisplayPost] = useState(post);

  // Sync displayPost when original post changes
  useEffect(() => {
    setDisplayPost(post);
  }, [post]);

  // Reset image index when images change
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [displayPost.images?.length]);
  useEffect(() => {
    if (
      isEditing &&
      (post as any).taggedUserIds &&
      (post as any).taggedUserIds.length > 0
    ) {
      const fetchTaggedUsers = async () => {
        try {
          const taggedUsersResponses = await Promise.all(
            (post as any).taggedUserIds.map((userId: string) =>
              postApi.fetchUserById(userId).catch(() => null)
            )
          );
          const filteredUsers = taggedUsersResponses.filter(
            (user) => user !== null
          );
          setTaggedUsers(filteredUsers);
        } catch (error) {
          console.error("Error fetching tagged users:", error);
        }
      };
      fetchTaggedUsers();
    }
  }, [isEditing, post]);

  const {
    commentsById,
    rootIds,
    expandedMap,
    loadingMap,
    totalCount,
    createReply,
    getDirectChildren,
    loadRootComments,
  } = useCommentsNormalized({
    targetType: "POST",
    targetId: post.id,
  });

  // Use totalCount from hook, fallback to post count
  const commentsCount =
    totalCount ||
    (Array.isArray((post as any).comments)
      ? (post as any).comments.length
      : Number((post as any).comments || 0));

  const totalImages = displayPost.images?.length || 0;
  const currentMedia = displayPost.media?.[currentImageIndex];
  const currentMediaUrl = displayPost.images[currentImageIndex] || "";
  const isCurrentMediaVideo = postApi.isVideoMedia(
    currentMediaUrl,
    currentMedia?.type
  );
  const currentMediaDuration =
    typeof currentMedia?.duration === "number" ? currentMedia.duration : null;
  const videoInstanceId = `${displayPost.id}-${currentImageIndex}`;

  const { containerRef, videoRef } = useVideoAutoplay({
    videoId: videoInstanceId,
    enabled: isCurrentMediaVideo,
    focusRatio: 0.7,
    maxPlaySeconds: 15,
  });

  // Fetch user's current reaction, total reaction count, and saved status
  useEffect(() => {
    const fetchReactionData = async () => {
      if (!currentUser?.id) return;

      try {
        // Fetch user's reaction
        const userReaction = await postApi.fetchUserReaction(
          String(currentUser.id),
          post.id
        );
        if (userReaction) {
          setCurrentReaction(userReaction.type);
          setIsLiked(true);
        } else {
          setCurrentReaction(null);
          setIsLiked(false);
        }

        // Fetch total reaction count
        const reactionsCount = await postApi.fetchPostReactionsCount(post.id);
        setLikesCount(reactionsCount);

        // Fetch saved status
        const isSaved = await postApi.checkPostSaved(
          String(currentUser.id),
          post.id
        );
        setIsSaved(isSaved);
      } catch (error) {
        console.debug("Error fetching reaction data for post:", post.id);
      }
    };

    fetchReactionData();
  }, [currentUser, post.id]);

  // Load first page of comments
  useEffect(() => {
    loadRootComments(0);
  }, [post.id, loadRootComments]);

  // Reset showFullCommentsPreview state when post changes
  useEffect(() => {
    setShowFullCommentsPreview(false);
    if (fullCommentsTimeoutRef.current) {
      clearTimeout(fullCommentsTimeoutRef.current);
      fullCommentsTimeoutRef.current = null;
    }
  }, [post.id]);

  // Refetch when window gains focus (user returns from detail page)
  useEffect(() => {
    const handleFocus = () => {
      if (!currentUser?.id) return;

      // Refetch reaction data when returning to this page
      const fetchReactionData = async () => {
        try {
          const userReaction = await postApi.fetchUserReaction(
            String(currentUser.id),
            post.id
          );
          if (userReaction) {
            setCurrentReaction(userReaction.type);
            setIsLiked(true);
          } else {
            setCurrentReaction(null);
            setIsLiked(false);
          }

          const reactionsCount = await postApi.fetchPostReactionsCount(post.id);
          setLikesCount(reactionsCount);

          // Refetch saved status
          const isSaved = await postApi.checkPostSaved(
            String(currentUser.id),
            post.id
          );
          setIsSaved(isSaved);
        } catch (error) {
          console.debug("Error refetching reaction data");
        }
      };

      fetchReactionData();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [currentUser, post.id]);

  const handleMouseEnter = () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      setHideTimeout(null);
    }
    setShowReactions(true);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowReactions(false);
    }, 300); // Delay 300ms trước khi ẩn
    setHideTimeout(timeout);
  };

  const handleReaction = async (reactionType: string) => {
    try {
      if (!currentUser?.id) {
        alert("Please login to react");
        return;
      }

      const reaction = await postApi.togglePostReaction(
        String(currentUser.id),
        post.id,
        reactionType
      );

      // If clicking the same reaction, remove it
      if (!reaction) {
        setCurrentReaction(null);
        setIsLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      } else {
        // If had no reaction before, increment count
        if (!currentReaction) {
          setLikesCount((prev) => prev + 1);
        }
        setCurrentReaction(reaction.type);
        setIsLiked(true);
      }
      setShowReactions(false);
    } catch (error) {
      console.error("Error reacting to post:", error);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (currentReaction) {
      // Remove reaction
      handleReaction(currentReaction);
    } else {
      // Add like
      handleReaction("LIKE");
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser?.id) {
      alert("Please login to save posts");
      return;
    }

    try {
      await postApi.togglePostSaved(String(currentUser.id), post.id);

      // Toggle saved state
      setIsSaved(!isSaved);
    } catch (error) {
      console.error("Error toggling save status:", error);
    }
  };

  const handleComment = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/post/${post.id}`, { state: { from: location.pathname } });
  };

  const handleCopyLink = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(postUrl);
    setShowMenu(false);
    alert("Link copied to clipboard!");
  };

  const handleEdit = () => {
    setShowMenu(false);
    setIsEditing(true);
  };

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn xóa bài viết này?")) {
      setShowMenu(false);
      return;
    }

    try {
      if (!currentUser?.id) {
        alert("Please login to delete posts");
        return;
      }

      await postApi.deletePost(post.id, String(currentUser.id));
      alert("Xóa bài viết thành công!");
      setShowMenu(false);
      // Refresh page to update post list
      window.location.reload();
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Không thể xóa bài viết. Bạn chỉ có thể xóa bài viết của mình.");
      setShowMenu(false);
    }
  };

  const handleChangePrivacy = async (newPrivacy: string) => {
    try {
      if (!currentUser?.id) {
        alert("Please login to update privacy");
        return;
      }

      await postApi.updatePostPrivacy(currentUser.id, post.id, newPrivacy);

      setShowPrivacyMenu(false);
      setShowMenu(false);
      alert("Privacy updated successfully!");
    } catch (error) {
      console.error("Error updating privacy:", error);
      alert("Failed to update privacy.");
    }
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

  const handleSubmitComment = async () => {
    if (!commentInput.trim() || !currentUser?.id) return;

    setSubmittingComment(true);
    try {
      const newComment = await commentService.createComment(
        "POST",
        post.id,
        commentInput,
        currentUser.id
      );

      // Add comment to local state
      createReply(null, newComment);
      setCommentInput("");

      // Track recently created comment and show preview temporarily
      setRecentCommentIds((prev) => [newComment.id, ...prev]);

      // Show full comments preview temporarily when posting new comment
      // Clear previous timeout first
      if (fullCommentsTimeoutRef.current) {
        clearTimeout(fullCommentsTimeoutRef.current);
      }

      setShowFullCommentsPreview(true);
      // Set timeout to collapse after 5 seconds
      fullCommentsTimeoutRef.current = setTimeout(() => {
        setShowFullCommentsPreview(false);
        setRecentCommentIds([]);
      }, 5000);
    } catch (error: any) {
      console.error("Error submitting comment:", error);
      alert(error?.response?.data?.message || "Failed to submit comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (fullCommentsTimeoutRef.current) {
        clearTimeout(fullCommentsTimeoutRef.current);
      }
    };
  }, []);

  return (
    <article className="bg-white dark:bg-black border-b border-gray-200 dark:border-[#262626] mb-5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5">
        <Link
          to={`/profile/${post.user.username}`}
          className="flex items-center gap-3"
        >
          <img
            src={post.user.avatarUrl}
            alt={post.user.username}
            className="w-8 h-8 rounded-full object-cover"
          />
          <div>
            <p className="text-sm font-semibold dark:text-white">
              {post.user.username}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <privacyDisplay.icon
                  size={12}
                  className={`${privacyDisplay.color}`}
                />
                <span
                  className={`text-[10px] ${privacyDisplay.color} font-medium`}
                >
                  {privacyDisplay.text}
                </span>
              </div>
              {(displayPost as any).location && (
                <div className="flex items-center gap-0.5 text-gray-500 dark:text-gray-400">
                  <span className="text-[10px]">•</span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span className="text-[10px]">
                    {typeof (displayPost as any).location === "string"
                      ? (displayPost as any).location
                      : (displayPost as any).location?.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Link>
        {/* More options button - Only show for post owner */}
        {isOwnPost && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-900 dark:text-white hover:text-gray-500 dark:hover:text-gray-400"
            >
              <MoreHorizontal size={24} />
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
                        <Lock className="w-3 h-3" />
                        Only me
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
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Caption - Before Image Carousel */}
      {displayPost.caption || (displayPost as any).content ? (
        <div className="px-4 py-2 w-full overflow-x-hidden">
          <div
            className="text-sm leading-relaxed w-full"
            style={{ wordWrap: "break-word", overflowWrap: "break-word" }}
          >
            <span className="text-gray-900 dark:text-white">
              {displayPost.caption || (displayPost as any).content}
            </span>
          </div>
        </div>
      ) : (
        ""
      )}

      {/* Image Carousel */}
      {totalImages > 0 && (
        <div className="relative w-full group">
          {isCurrentMediaVideo ? (
            <Link
              to={`/post/${displayPost.id}`}
              state={{ from: location.pathname }}
              className="block w-full h-125 bg-black"
            >
              <div ref={containerRef} className="relative w-full h-full">
                <video
                  ref={videoRef}
                  src={currentMediaUrl}
                  className="w-full h-full object-contain cursor-pointer"
                  muted
                  playsInline
                  preload="metadata"
                  controls
                />
                {currentMediaDuration !== null && currentMediaDuration > 0 && (
                  <div className="absolute top-3 left-3 bg-black/65 text-white text-xs px-2 py-1 rounded-full z-10">
                    {postApi.formatMediaDuration(currentMediaDuration)}
                  </div>
                )}
              </div>
            </Link>
          ) : (
            <Link
              to={`/post/${displayPost.id}`}
              state={{ from: location.pathname }}
              className="block w-full h-125 bg-black"
            >
              <img
                src={displayPost.images[currentImageIndex] || ""}
                alt={displayPost.caption}
                className="w-full h-full object-contain cursor-pointer"
              />
            </Link>
          )}

          {/* Navigation arrows - Only show if multiple images */}
          {totalImages > 1 && (
            <>
              {/* Previous button */}
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Previous image"
              >
                <ChevronLeft size={20} />
              </button>

              {/* Next button */}
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Next image"
              >
                <ChevronRight size={20} />
              </button>

              {/* Dots indicator */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {displayPost.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentImageIndex(index);
                    }}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      index === currentImageIndex
                        ? "bg-blue-500 w-2 h-2"
                        : "bg-gray-300/70 hover:bg-gray-300"
                    }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>

              {/* Image counter */}
              <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                {currentImageIndex + 1} / {totalImages}
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4">
        <div className="flex items-center justify-between pt-1 pb-2">
          <div className="flex items-center gap-4">
            {/* Reaction button with picker */}
            <div
              className="relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={handleLike}
                className="hover:opacity-50 transition-opacity"
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
                  <Heart
                    size={27}
                    fill={isLiked ? "currentColor" : "none"}
                    strokeWidth={1.8}
                    className={isLiked ? "text-red-500" : ""}
                  />
                )}
              </button>

              {/* Reaction picker */}
              {showReactions && (
                <div
                  className="absolute bottom-full left-0 mb-1 bg-white dark:bg-gray-800 rounded-full shadow-2xl border dark:border-gray-700 px-4 py-3 flex gap-2 z-50"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleReaction("LIKE");
                    }}
                    className="hover:scale-125 transition-transform text-3xl"
                    title="Like"
                  >
                    👍
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleReaction("LOVE");
                    }}
                    className="hover:scale-125 transition-transform text-3xl"
                    title="Love"
                  >
                    ❤️
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
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
                      e.preventDefault();
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
                      e.preventDefault();
                      e.stopPropagation();
                      handleReaction("SAD");
                    }}
                    className="hover:scale-125 transition-transform text-3xl"
                    title="Sad"
                  >
                    😢
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleReaction("ANGRY");
                    }}
                    className="hover:scale-125 transition-transform text-3xl"
                    title="Angry"
                  >
                    😡
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleComment}
              className="hover:opacity-50 transition-opacity"
            >
              <MessageCircle size={27} strokeWidth={1.8} />
            </button>
            <button className="hover:opacity-50 transition-opacity">
              <svg
                width="27"
                height="27"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
          <button
            onClick={handleSave}
            className={`hover:opacity-50 transition-opacity ${
              isSaved ? "" : ""
            }`}
          >
            <Bookmark
              size={26}
              fill={isSaved ? "currentColor" : "none"}
              strokeWidth={1.8}
            />
          </button>
        </div>

        {/* Likes */}
        <button className="text-sm font-semibold mb-2 hover:opacity-50 block dark:text-white">
          {likesCount.toLocaleString()} likes
        </button>

        {/* Comments Section */}
        <div className="mt-3 space-y-2">
          {/* See more comments button */}
          {rootIds.length > 1 && (
            <button
              onClick={() =>
                navigate(`/post/${post.id}`, {
                  state: { from: location.pathname },
                })
              }
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-400 dark:hover:text-gray-300 font-semibold ml-4"
            >
              View all {commentsCount} comments
            </button>
          )}

          {(() => {
            const visibleCommentIds = showFullCommentsPreview
              ? Array.from(
                  new Set([
                    ...recentCommentIds,
                    ...rootIds
                      .filter((id) => !recentCommentIds.includes(id))
                      .slice(0, 1),
                  ])
                )
              : rootIds.slice(0, 1);
            return visibleCommentIds.map((commentId) => {
              return (
                <CommentItemNormalized
                  key={commentId}
                  commentId={commentId}
                  commentsById={commentsById}
                  expandedMap={expandedMap}
                  onToggleExpanded={(cId: string) => {
                    navigate(`/post/${post.id}`, {
                      state: {
                        from: location.pathname,
                        expandCommentId: cId,
                      },
                    });
                  }}
                  onLoadMore={(cId: string) => {
                    navigate(`/post/${post.id}`, {
                      state: {
                        from: location.pathname,
                        expandCommentId: cId,
                      },
                    });
                  }}
                  onDelete={() => {
                    navigate(`/post/${post.id}`, {
                      state: { from: location.pathname },
                    });
                  }}
                  onCreateReply={() => {
                    // Show full comments preview when user replies, auto-collapse after 5 seconds
                    if (fullCommentsTimeoutRef.current) {
                      clearTimeout(fullCommentsTimeoutRef.current);
                    }
                    setShowFullCommentsPreview(true);
                    fullCommentsTimeoutRef.current = setTimeout(() => {
                      setShowFullCommentsPreview(false);
                      setRecentCommentIds([]);
                    }, 5000);
                  }}
                  getDirectChildren={(cId) => {
                    const c = getDirectChildren(cId);
                    return c.slice(0, 1);
                  }}
                  hasMoreReplies={{}}
                  loadingMap={loadingMap}
                  postId={post.id}
                  level={0}
                />
              );
            });
          })()}
        </div>

        {/* Comment Input */}
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-800 flex gap-2 items-center">
          <img
            src={currentUser?.avatarUrl || "https://i.pravatar.cc/150?img=5"}
            alt="Your avatar"
            className="w-8 h-8 rounded-full shrink-0"
          />
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
              placeholder="Write a comment..."
              className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-full outline-none focus:border-blue-500 dark:text-white"
              disabled={submittingComment}
            />
            <button
              onClick={handleSubmitComment}
              disabled={!commentInput.trim() || submittingComment}
              className="px-3 py-2 text-sm text-blue-500 font-semibold hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submittingComment ? "..." : "Post"}
            </button>
          </div>
        </div>

        {/* Time */}
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-3">
          {post.createdAt}
        </p>
      </div>

      {/* Edit Post Modal */}
      {isEditing && (
        <>
          {console.log(
            "🖼️ [DEBUG] Rendering EditPostModal with displayPost:",
            displayPost
          )}
          {console.log(
            "📍 [DEBUG] displayPost.location being passed:",
            (displayPost as any).location
          )}
          <EditPostModal
            postId={post.id}
            post={displayPost as unknown as PostData}
            taggedUsers={taggedUsers}
            onClose={() => setIsEditing(false)}
            onSaved={(updatedPost: any) => {
              // Update local display post with new data from API
              // Note: database uses 'content', not 'caption'

              console.log(
                "🔍 [DEBUG] onSaved received updatedPost:",
                updatedPost
              );
              console.log("📸 [DEBUG] images field:", updatedPost.images);
              console.log("📺 [DEBUG] media field:", updatedPost.media);
              console.log("📋 [DEBUG] mediaList field:", updatedPost.mediaList);
              console.log("📍 [DEBUG] location field:", updatedPost.location);

              // Map API response to full S3 URLs
              // API returns full URLs in 'images' or partial URLs in 'media' array
              let newImages: string[] = [];

              if (updatedPost.images && Array.isArray(updatedPost.images)) {
                // Already full URLs
                newImages = updatedPost.images;
              } else if (
                updatedPost.media &&
                Array.isArray(updatedPost.media)
              ) {
                // Media array with objects containing 'url' field
                // URL might be partial (e.g., "posts/.../image.jpg") or full (http...)
                newImages = updatedPost.media.map((m: any) => {
                  const url = m.url || "";
                  // If URL starts with http, it's already full; otherwise build it
                  return url.startsWith("http") ? url : buildS3Url(url);
                });
              } else if (
                updatedPost.mediaList &&
                Array.isArray(updatedPost.mediaList)
              ) {
                // Handle mediaList format
                newImages = updatedPost.mediaList.map((m: any) => {
                  const url = typeof m === "string" ? m : m.url || "";
                  return url.startsWith("http") ? url : buildS3Url(url);
                });
              }

              // Fallback to existing images if API returns empty
              if (newImages.length === 0) {
                newImages = (displayPost as any).images || [];
              }

              console.log("✅ [DEBUG] newImages after mapping:", newImages);
              console.log(
                "📊 [DEBUG] displayPost.images before update:",
                (displayPost as any).images
              );

              setDisplayPost({
                ...displayPost,
                caption: updatedPost.content || updatedPost.caption,
                content: updatedPost.content,
                privacy: updatedPost.privacy,
                location: updatedPost.location,
                images: newImages,
                media:
                  updatedPost.media ||
                  updatedPost.mediaList ||
                  (displayPost as any).media,
              } as any);

              console.log(
                "🔄 [DEBUG] displayPost state will update with newImages:",
                newImages
              );

              // Reset image index when images might have changed
              setCurrentImageIndex(0);
              setIsEditing(false);
            }}
          />
        </>
      )}
    </article>
  );
}
