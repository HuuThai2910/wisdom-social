/**
 * 📌 PostHeader Component
 *
 * Responsibility:
 * - Display post author avatar and username
 * - Show privacy level (Public/Friends/Specific/Only Me)
 * - Display location if available
 * - Handle owner menu (Edit, Delete, Privacy, Copy link)
 *
 * Why:
 * - Isolates header UI and menu logic from PostModal container
 * - Makes header styling changes independent
 * - Centralizes owner action handlers
 *
 * Props:
 * - post: PostData (contains privacy, location)
 * - author: UserData (avatar, username)
 * - currentUser: UserData | undefined
 * - isOwnPost: boolean
 * - showMenu: boolean, setShowMenu: (bool) => void
 * - showPrivacyMenu: boolean, setShowPrivacyMenu: (bool) => void
 * - showSpecificModal: boolean, setShowSpecificModal: (bool) => void
 * - showExcludedModal: boolean, setShowExcludedModal: (bool) => void
 *
 * Handlers:
 * - onEdit(): Open edit modal
 * - onChangePrivacy(newPrivacy: string): Update post privacy
 * - onDelete(): Delete post
 * - onCopyLink(): Copy post URL
 * - onOpenSpecificModal(): Open specific friends selector
 * - onOpenExcludedModal(): Open friends excluded selector
 *
 * Notes:
 * - Only shows menu for post owner
 * - Displays different privacy info for owner vs others
 */

import React, { useRef } from "react";
import {
  MoreHorizontal,
  Edit2,
  Trash2,
  Link as LinkIcon,
  MapPin,
  Users,
  Globe,
} from "lucide-react";
import type { PostData, UserData } from "../../../types/postType";

interface PostHeaderProps {
  post: PostData;
  author: UserData | null;
  currentUser: { id: string | number; username?: string } | null | undefined;
  isOwnPost: boolean;
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  showPrivacyMenu: boolean;
  setShowPrivacyMenu: (show: boolean) => void;
  showSpecificModal: boolean;
  setShowSpecificModal: (show: boolean) => void;
  showExcludedModal: boolean;
  setShowExcludedModal: (show: boolean) => void;
  onEdit: () => void;
  onChangePrivacy: (newPrivacy: string) => void;
  onDelete: () => void;
  onCopyLink: () => void;
}

const PostHeader: React.FC<PostHeaderProps> = ({
  post,
  author,
  isOwnPost,
  showMenu,
  setShowMenu,
  showPrivacyMenu,
  setShowPrivacyMenu,
  setShowSpecificModal,
  setShowExcludedModal,
  onEdit,
  onChangePrivacy,
  onDelete,
  onCopyLink,
}) => {
  const authorDisplay = {
    id: author?.id ?? Number(post.authorId || 0),
    username: author?.username || "unknown",
    avatarUrl: author?.avatarUrl || "https://i.pravatar.cc/150?img=5",
  };

  return (
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

          {/* Privacy Badge */}
          {post.privacy &&
            (() => {
              if (isOwnPost) {
                // Show full privacy info for owner
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
                        <span className="font-medium">Specific friends</span>
                      </>
                    )}
                    {post.privacy === "EXCEPT" && (
                      <>
                        <Users className="w-3 h-3 text-orange-500" />
                        <span className="font-medium">Friends except</span>
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

              // Show generic privacy for others
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

          {/* Location */}
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

      {/* Menu Button - Only for post owner */}
      {isOwnPost && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-20 py-2 border dark:border-gray-700">
                {/* Edit Button */}
                <button
                  onClick={onEdit}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 dark:text-white"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>

                {/* Privacy Button */}
                <button
                  onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 dark:text-white"
                >
                  <Globe className="w-4 h-4" />
                  Change privacy
                </button>

                {/* Privacy Submenu */}
                {showPrivacyMenu && (
                  <div className="px-2 py-1 space-y-1">
                    <button
                      onClick={() => onChangePrivacy("PUBLIC")}
                      className="w-full px-4 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-white flex items-center gap-2"
                    >
                      <Globe className="w-3 h-3" />
                      Public
                    </button>
                    <button
                      onClick={() => onChangePrivacy("FRIENDS")}
                      className="w-full px-4 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-white flex items-center gap-2"
                    >
                      <Users className="w-3 h-3" />
                      Friends
                    </button>
                    <button
                      onClick={() => onChangePrivacy("ONLY_ME")}
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

                {/* Delete Button */}
                <button
                  onClick={onDelete}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>

                {/* Copy Link Button */}
                <button
                  onClick={onCopyLink}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 dark:text-white"
                >
                  <LinkIcon className="w-4 h-4" />
                  Copy link
                </button>

                <div className="border-t dark:border-gray-700 my-1" />

                {/* Cancel */}
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
  );
};

export default PostHeader;
