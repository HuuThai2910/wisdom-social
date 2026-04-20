interface PostCardCommentInputProps {
  currentUserAvatarUrl: string;
  commentInput: string;
  submittingComment: boolean;
  onChangeCommentInput: (value: string) => void;
  onSubmitComment: () => void;
}

export default function PostCardCommentInput({
  currentUserAvatarUrl,
  commentInput,
  submittingComment,
  onChangeCommentInput,
  onSubmitComment,
}: PostCardCommentInputProps) {
  return (
    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-800 flex gap-2 items-center">
      <img
        src={currentUserAvatarUrl}
        alt="Your avatar"
        className="w-8 h-8 rounded-full shrink-0"
      />
      <div className="flex flex-1 gap-2">
        <input
          type="text"
          value={commentInput}
          onChange={(e) => onChangeCommentInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmitComment();
            }
          }}
          placeholder="Write a comment..."
          className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-full outline-none focus:border-blue-500 dark:text-white"
          disabled={submittingComment}
        />
        <button
          onClick={onSubmitComment}
          disabled={!commentInput.trim() || submittingComment}
          className="px-3 py-2 text-sm text-blue-500 font-semibold hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submittingComment ? "..." : "Post"}
        </button>
      </div>
    </div>
  );
}
