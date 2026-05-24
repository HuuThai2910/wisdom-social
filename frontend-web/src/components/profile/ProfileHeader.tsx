import { Link } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import type { User } from "../../types";
import {
  Settings,
  LogOut,
  QrCode,
  MessageCircle,
  MapPin,
  Plus,
} from "lucide-react";
import { logout } from "../../utils/auth";
import NoteModal from "./note-modal/NoteModal";
import FriendsModal from "./FriendsModal";
import { buildS3Url } from "../../utils/s3";
import BlockUnblockButton from "../friend/BlockUnblockButton";
import FriendActions from "../friend/FriendActions";
import { NOTE_PLACEHOLDERS } from "./note-modal/NoteContentDefault";
import { getUserPostsWithDetails } from "../../services/postService";
import { useProfileNote } from "../../hooks/useProfileNote";
import { useHasActiveStory } from "../../hooks/useHasActiveStory";
import { fetchUserStories } from "../../services/storyService";
import StoryViewerModal from "../story/StoryViewerModal";
import { usePresenceStatus } from "../../hooks/usePresenceStatus";

interface ProfileHeaderProps {
  user: User;
  isOwnProfile?: boolean;
}

const GENDER_LABELS: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  HIDDEN: "Ẩn",
  OTHER: "Khác",
};

const stripHtml = (text: string | undefined | null): string => {
  if (!text) return "";
  try {
    const doc = new DOMParser().parseFromString(text, "text/html");
    return doc.body.textContent || "";
  } catch (e) {
    return text.replace(/<(?:[^>=]|='[^']*'|="[^"]*"|=[^'"][^\s>]*)*>/g, "");
  }
};

export default function ProfileHeader({
  user,
  isOwnProfile = false,
}: ProfileHeaderProps) {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [postsCount, setPostsCount] = useState(0);
  const [notePlaceholder] = useState(
    () =>
      NOTE_PLACEHOLDERS[Math.floor(Math.random() * NOTE_PLACEHOLDERS.length)]
  );
  const { note, showNoteModal, openNoteModal, closeNoteModal, setNote } =
    useProfileNote(user?.id);
  const profileUserId = Number(user?.id);
  const presenceByUserId = usePresenceStatus([profileUserId]);
  const isUserOnline = Boolean(
    Number.isFinite(profileUserId) && presenceByUserId[profileUserId]?.online
  );

  //
  useEffect(() => {
    if (!user?.id) return;

    getUserPostsWithDetails(user.id)
      .then((posts) => {
        setPostsCount(posts.length);
      })
      .catch(() => setPostsCount(0));
  }, [user?.id]);

  // Check if user has an active story
  const {
    hasStory: hasActiveStory,
    hasUnviewed: hasUnviewedStory,
    refresh: refreshActiveStory,
  } = useHasActiveStory(user?.id);

  const [activeStories, setActiveStories] = useState<any[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const handleAvatarClick = async () => {
    if (!hasActiveStory || !user?.id) return;
    try {
      const data = (await fetchUserStories(String(user.id))) as any;
      const items = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      if (items.length > 0) {
        setActiveStories(items);
        setIsViewerOpen(true);
      }
    } catch (err) {
      console.error("Error fetching user stories for header:", err);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const handleCloseViewer = useCallback(() => {
    setIsViewerOpen(false);
  }, []);

  return (
    <div className="bg-white dark:bg-black px-6 md:px-8 py-8 md:py-12">
      <div className="max-w-6xl mx-auto">
        {/* Main Profile Card - Web-appropriate sizing */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-8 border border-gray-200 dark:border-[#262626]">
          {/* Settings button - top right */}
          {isOwnProfile && (
            <div className="absolute top-8 right-8">
              <div className="relative">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  <Settings size={24} />
                </button>

                {showSettingsMenu && (
                  <div>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowSettingsMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#262626] rounded-lg shadow-lg overflow-hidden z-50">
                      <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#363636] dark:text-gray-200 transition-colors text-sm border-b border-gray-200 dark:border-[#363636]">
                        <QrCode size={18} />
                        QR code
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#363636] text-red-600 dark:text-red-400 transition-colors text-sm font-medium"
                      >
                        <LogOut size={18} />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top section: Avatar + User Info */}
          <div className="flex gap-8 md:gap-10">
            {/* Avatar Column */}
            <div className="flex flex-col items-center shrink-0">
              {(isOwnProfile || note) && (
                <button
                  onClick={openNoteModal}
                  className="mb-3 w-42 max-w-full bg-white dark:bg-gray-800 border border-blue-200/80 dark:border-blue-700/60 rounded-2xl rounded-bl-md px-3.5 py-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
                  title={isOwnProfile ? "Create or edit note" : "View note"}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0">
                      {note ? (
                        <div className="space-y-0.5 mt-0.5">
                          {note.content?.trim() && (
                            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 wrap-break-word">
                              {stripHtml(note.content)}
                            </p>
                          )}

                          {note.music?.title && (
                            <p className="text-xs text-gray-700 dark:text-gray-200 line-clamp-1">
                              {note.music.title}
                            </p>
                          )}

                          {note.music?.artist && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                              {note.music.artist}
                            </p>
                          )}

                          {note.location?.trim() && (
                            <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                              <span className="truncate">
                                {note.location.trim()}
                              </span>
                            </p>
                          )}

                          {!note.content?.trim() &&
                            !note.music?.title &&
                            !note.music?.artist &&
                            !note.location?.trim() && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Tap to update your note
                              </p>
                            )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {notePlaceholder}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )}
              <div
                className={`relative mb-2 select-none ${
                  hasActiveStory
                    ? "cursor-pointer hover:scale-[1.02] active:scale-98 transition-all duration-200"
                    : ""
                }`}
                onClick={handleAvatarClick}
                title={hasActiveStory ? "Xem tin" : undefined}
              >
                <div
                  className={`${
                    hasActiveStory
                      ? `p-[3px] rounded-full ${
                          hasUnviewedStory
                            ? `bg-gradient-to-tr ${
                                isOwnProfile
                                  ? "from-green-400 to-emerald-500"
                                  : "from-blue-400 to-indigo-500"
                              }`
                            : "bg-gray-300 dark:bg-zinc-700"
                        }`
                      : ""
                  }`}
                >
                  <img
                    src={
                      buildS3Url(user.avatarUrl) ||
                      user.avatarUrl ||
                      "https://i.pravatar.cc/150"
                    }
                    alt={user.username}
                    className={`w-32 h-32 rounded-full object-cover ${
                      hasActiveStory
                        ? "border-4 border-white dark:border-[#1a1a1a]"
                        : "border-4 border-gray-200 dark:border-[#363636]"
                    }`}
                  />
                </div>
                {isUserOnline && (
                  <div
                    className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full border-3 border-white dark:border-[#1a1a1a]"
                    title="Đang hoạt động"
                  />
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-5">
                <h1 className="text-xl font-normal dark:text-white">
                  {user.username}
                </h1>
                {isOwnProfile ? (
                  <>
                    <Link
                      to="/"
                      className="px-4 py-1.75 bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] rounded-lg text-sm font-semibold dark:text-white"
                    >
                      Edit profile
                    </Link>
                    <Link
                      to="/settings"
                      className="px-4 py-1.75 bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] rounded-lg text-sm font-semibold dark:text-white"
                    >
                      View archive
                    </Link>
                    <div className="relative">
                      <button
                        onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                        className="p-2 text-gray-900 dark:text-gray-200 hover:text-gray-500 dark:hover:text-gray-400"
                      >
                        <Settings size={24} />
                      </button>

                      {/* Settings Dropdown Menu */}
                      {showSettingsMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowSettingsMenu(false)}
                          />
                          <div className="absolute right-0 top-full mt-2 w-66.5 bg-white dark:bg-[#262626] rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] overflow-hidden z-50">
                            {/* QR Code Button */}
                            <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] dark:text-white transition-colors">
                              <QrCode size={18} />
                              <span className="text-[14px]">QR code</span>
                            </button>

                            <div className="h-px bg-gray-200 dark:bg-[#363636]" />

                            {/* Log Out Button */}
                            <button
                              onClick={handleLogout}
                              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] text-red-600 dark:text-red-400 transition-colors"
                            >
                              <LogOut size={18} />
                              <span className="text-[14px] font-semibold">
                                Log out
                              </span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <FriendActions
                      targetUserId={user.id}
                      targetUsername={user.username}
                      size="md"
                    />
                    <button className="px-6 py-1.75 bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] rounded-lg text-sm font-semibold dark:text-white">
                      Message
                    </button>
                    <BlockUnblockButton
                      userId={user.id}
                      username={user.username}
                    />
                  </>
                )}
              </div>

              {/* Right column: Info + Stats */}
              <div className="flex-1 min-w-0">
                {/* Name and username */}
                <div className="mb-4">
                  <h1 className="text-2xl font-bold dark:text-white">
                    {stripHtml(user.fullName || user.username)}
                  </h1>
                  {user.username && (
                    <p className="text-gray-600 dark:text-gray-400 text-base">
                      @{user.username}
                    </p>
                  )}
                </div>

                {/* Bio */}
                {user.bio && (
                  <p className="text-base dark:text-gray-300 mb-4 leading-relaxed">
                    {stripHtml(user.bio)}
                  </p>
                )}

                {/* Birthday & Gender */}
                <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600 dark:text-gray-400">
                  {user.birthday && (
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>{user.birthday}</span>
                    </div>
                  )}
                  {user.gender && (
                    <div className="flex items-center gap-2">
                      <span>👥</span>
                      <span>{GENDER_LABELS[user.gender] || "Ẩn"}</span>
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-8 mb-6 pb-6 border-b border-gray-200 dark:border-[#262626]">
                  <div>
                    <p className="text-2xl font-bold dark:text-white">
                      {postsCount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Bài viết
                    </p>
                  </div>
                  <button
                    onClick={() => setShowFriendsModal(true)}
                    className="text-left hover:opacity-70 transition-opacity"
                  >
                    <p className="text-2xl font-bold dark:text-white">
                      {typeof user.friendsCount === "number"
                        ? user.friendsCount.toLocaleString()
                        : user.friendsCount || 0}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Bạn bè
                    </p>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 flex-wrap">
                  {isOwnProfile ? (
                    <>
                      <Link
                        to="/edit-profile"
                        className="flex-1 min-w-35 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-center"
                      >
                        ✎ Chỉnh sửa hồ sơ
                      </Link>
                      <Link
                        to="/settings"
                        className="px-6 py-3 bg-gray-200 dark:bg-[#262626] hover:bg-gray-300 dark:hover:bg-[#363636] dark:text-white rounded-lg font-semibold transition-colors"
                      >
                        Cài đặt
                      </Link>
                    </>
                  ) : (
                    <>
                      <FriendActions
                        targetUserId={user.id}
                        targetUsername={user.username}
                        size="md"
                      />
                      <button className="flex-1 min-w-35 px-6 py-3 bg-gray-200 dark:bg-[#262626] hover:bg-gray-300 dark:hover:bg-[#363636] dark:text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                        <MessageCircle size={18} />
                        Nhắn tin
                      </button>
                      <BlockUnblockButton
                        userId={user.id}
                        username={user.username}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Story Highlights Section - Full width */}
          {isOwnProfile && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[#262626]">
              <div className="flex gap-5 overflow-x-auto pb-2">
                {/* Create New Story Highlight Button */}
                <Link
                  to="/create-story"
                  className="flex flex-col items-center gap-2 shrink-0 group"
                >
                  <div className="w-[72px] h-[72px] rounded-full border-2 border-dashed border-gray-300 dark:border-[#363636] flex items-center justify-center group-hover:border-blue-400 dark:group-hover:border-blue-500 transition-colors bg-gray-50 dark:bg-[#1a1a1a] group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10">
                    <Plus
                      size={28}
                      strokeWidth={1.5}
                      className="text-gray-400 group-hover:text-blue-500 transition-colors"
                    />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium group-hover:text-blue-500 transition-colors">
                    Mới
                  </span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Note modal */}
      {showNoteModal && (
        <NoteModal
          userId={String(user.id)}
          isOwnProfile={isOwnProfile}
          onClose={closeNoteModal}
          onNoteChange={(updated) => setNote(updated)}
        />
      )}

      {/* Friends modal */}
      {showFriendsModal && (
        <FriendsModal
          userId={user.id}
          onClose={() => setShowFriendsModal(false)}
        />
      )}

      {isViewerOpen && activeStories.length > 0 && (
        <StoryViewerModal
          isOpen={isViewerOpen}
          onClose={handleCloseViewer}
          groups={[
            {
              userId: String(user.id),
              username: user.username,
              userAvatar: user.avatarUrl,
              stories: activeStories,
            },
          ]}
          initialGroupIdx={0}
          initialStoryIdx={0}
          onStoryViewed={refreshActiveStory}
        />
      )}
    </div>
  );
}
