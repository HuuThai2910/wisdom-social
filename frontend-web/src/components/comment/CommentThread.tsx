import { useEffect, useState } from "react";
import useComments from "../../hooks/useComments";
import { commentService } from "../../services/commentService";
import { useAuth } from "../../contexts/AuthContext";
import CommentItem from "./CommentItem";

interface CommentThreadProps {
  postId: string;
}

export default function CommentThread({ postId }: CommentThreadProps) {
  const { currentUser } = useAuth();
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Use comment tree hook with NEW methods
  const {
    comments,
    loadRootComments,
    loadMoreReplies,
    insertNewReply,
    removeComment,
    currentPage,
    hasMore,
  } = useComments({
    targetType: "POST",
    targetId: postId,
  });

  // Load initial comments on mount
  useEffect(() => {
    loadRootComments(0);
  }, [postId, loadRootComments]);

  const handleSubmitComment = async () => {
    if (!commentInput.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      if (!currentUser?.id) {
        alert("Please login to comment");
        return;
      }

      // Create comment
      const newComment = await commentService.createComment(
        "POST",
        postId,
        commentInput,
        currentUser.id
      );

      // FIXED: Use insertNewReply instead of reload
      insertNewReply(null, newComment);
      setCommentInput("");
    } catch (error: any) {
      console.error("Error submitting comment:", error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit comment";
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

      // FIXED: Use removeComment instead of reload
      removeComment(commentId, parentId ?? null);
    } catch (error: any) {
      console.error("Error deleting comment:", error);
      alert("Không thể xóa bình luận");
    }
  };

  // NEW: Called by CommentItem after creating reply
  const handleReplyCreated = (parentId: string, newReply: any) => {
    insertNewReply(parentId, newReply);
  };

  return (
    <div className="space-y-4">
      {/* Comment Input */}
      {currentUser && (
        <div className="flex gap-2 p-4 border-b dark:border-gray-800">
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
            placeholder="Add a comment..."
            className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-900 dark:text-white outline-none focus:border-blue-500"
            disabled={submittingComment}
          />
          <button
            onClick={handleSubmitComment}
            disabled={!commentInput.trim() || submittingComment}
            className="px-4 py-2 text-sm text-blue-500 font-semibold hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submittingComment ? "..." : "Post"}
          </button>
        </div>
      )}

      {/* Comments List */}
      {comments.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          No comments yet
        </p>
      ) : (
        <>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onDelete={handleDeleteComment}
              onLoadMoreReplies={loadMoreReplies}
              onReplyCreated={handleReplyCreated}
              postId={postId}
            />
          ))}
          {hasMore && (
            <button
              onClick={() => loadRootComments(currentPage + 1)}
              className="w-full py-2 text-sm text-blue-500 hover:text-blue-600 font-semibold"
            >
              Xem thêm bình luận
            </button>
          )}
        </>
      )}
    </div>
  );
}
