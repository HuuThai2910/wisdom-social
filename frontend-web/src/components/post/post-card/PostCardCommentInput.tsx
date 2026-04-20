import { useRef, useState } from "react";
import { Smile } from "lucide-react";
import { type EmojiClickData, Theme } from "emoji-picker-react";
import IconModal from "../../icon-modal/IconModal";

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const selectionPos = commentInputRef.current?.selectionStart;
    const safeCursorPos = Math.min(
      Math.max(selectionPos ?? cursorPos, 0),
      commentInput.length
    );
    const nextValue =
      commentInput.slice(0, safeCursorPos) +
      emojiData.emoji +
      commentInput.slice(safeCursorPos);
    const nextCursorPos = safeCursorPos + emojiData.emoji.length;

    onChangeCommentInput(nextValue);
    setCursorPos(nextCursorPos);
    setShowEmojiPicker(false);

    requestAnimationFrame(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
        commentInputRef.current.setSelectionRange(nextCursorPos, nextCursorPos);
      }
    });
  };

  return (
    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-800 flex gap-2 items-center">
      <img
        src={currentUserAvatarUrl}
        alt="Your avatar"
        className="w-8 h-8 rounded-full shrink-0"
      />
      <div className="flex flex-1 gap-2">
        <div className="relative">
          <button
            ref={emojiButtonRef}
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#363636]"
            title="Insert emoji"
            aria-label="Insert emoji"
          >
            <Smile size={20} className="text-gray-500 dark:text-gray-400" />
          </button>

          <IconModal
            open={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
            onEmojiClick={handleEmojiClick}
            theme={
              document.documentElement.classList.contains("dark")
                ? Theme.DARK
                : Theme.LIGHT
            }
            anchorRef={emojiButtonRef}
            containerClassName="absolute bottom-full left-0 mb-2 z-50"
            pickerProps={{
              width: 300,
              height: 350,
            }}
          />
        </div>

        <input
          ref={commentInputRef}
          type="text"
          value={commentInput}
          onChange={(e) => onChangeCommentInput(e.target.value)}
          onClick={(e) => setCursorPos(e.currentTarget.selectionStart || 0)}
          onKeyUp={(e) => setCursorPos(e.currentTarget.selectionStart || 0)}
          onSelect={(e) =>
            setCursorPos(e.currentTarget.selectionStart || commentInput.length)
          }
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
