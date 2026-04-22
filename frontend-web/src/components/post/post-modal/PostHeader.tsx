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

import React from "react";
import { MapPin, Users, Globe } from "lucide-react";
import type { PostData, UserData } from "../../../types/postType";
import PostHeaderMenu from "../PostHeaderMenu";

interface PostHeaderProps {
  post: PostData;
  author: UserData | null;
  currentUser: { id: string | number; username?: string } | null | undefined;
  isOwnPost: boolean;
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  showPrivacyMenu: boolean;
  setShowPrivacyMenu: (show: boolean) => void;
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

      <PostHeaderMenu
        isOwnPost={isOwnPost}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
        showPrivacyMenu={showPrivacyMenu}
        setShowPrivacyMenu={setShowPrivacyMenu}
        onEdit={onEdit}
        onChangePrivacy={onChangePrivacy}
        onDelete={onDelete}
        onCopyLink={onCopyLink}
      />
    </div>
  );
};

export default PostHeader;
