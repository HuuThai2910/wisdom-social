/**
 * 📌 CommentInput Component
 *
 * Responsibility:
 * - Render comment input field with mention support
 * - Handle user search for mentions
 * - Display mention suggestions dropdown
 * - Handle comment submission
 * - Support @mention formatting
 *
 * Why:
 * - Isolates input UI and mention logic from comment tree
 * - Mention autocomplete is complex, keep it separate
 * - Makes comment input independently reusable
 *
 * Props:
 * - commentInput: string
 * - submittingComment: boolean
 * - showMentionDropdown: boolean
 * - mentionUsers: UserData[]
 * - onCommentChange: (e: ChangeEvent) => void
 * - onSelectMention: (user: UserData) => void
 * - onSubmitComment: () => void
 *
 * Side Effects:
 * - onCommentChange handles:
 *   - Mention detection (@)
 *   - User search based on mention query
 *   - Mention dropdown visibility
 *
 * Notes:
 * - Mentions highlighted in blue
 * - Dropdown shows matching users
 * - Submit on Enter (without Shift)
 * - Disabled while submitting
 */

import React from "react";
import type { UserData } from "../../../../types/postType";

interface CommentInputProps {
  commentInput: string;
  submittingComment: boolean;
  showMentionDropdown: boolean;
  mentionUsers: UserData[];
  onCommentChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectMention: (user: UserData) => void;
  onSubmitComment: () => void;
}

const CommentInput: React.FC<CommentInputProps> = ({
  commentInput,
  submittingComment,
  showMentionDropdown,
  mentionUsers,
  onCommentChange,
  onSelectMention,
  onSubmitComment,
}) => {
  return (
    <div className="p-4 border-t dark:border-gray-800 relative">
      {/* Mention Dropdown Suggestions */}
      {showMentionDropdown && mentionUsers.length > 0 && (
        <div className="absolute bottom-full left-4 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 max-h-60 overflow-y-auto z-50 w-64">
          {mentionUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelectMention(user)}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
            >
              <img
                src={user.avatarUrl || "https://i.pravatar.cc/150?img=5"}
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

      {/* Input Container */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          {/* Mention Highlight Background (for styling mentions in blue) */}
          <div className="absolute inset-0 text-sm pointer-events-none whitespace-pre-wrap wrap-break-word dark:text-white opacity-0">
            {commentInput.split(/(@[a-zA-Z0-9_]+)/g).map((part, index) => {
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

          {/* Transparent Input (text shows through as transparent, background shows mentions) */}
          <input
            type="text"
            value={commentInput}
            onChange={onCommentChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmitComment();
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

        {/* Submit Button */}
        <button
          onClick={onSubmitComment}
          disabled={!commentInput.trim() || submittingComment}
          className="text-blue-500 font-semibold text-sm hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submittingComment ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
};

export default CommentInput;
