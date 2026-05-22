import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import type { User } from "../../types";
import {
  Settings,
  LogOut,
  MessageCircle,
  MapPin,
  MoreHorizontal,
  Info,
  X,
  AtSign,
  User as UserIcon,
  Calendar,
  Users as UsersIcon,
  MessageSquare,
  Phone,
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

export default function ProfileHeader({
  user,
  isOwnProfile = false,
}: ProfileHeaderProps) {
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [postsCount, setPostsCount] = useState(0);
  const [notePlaceholder] = useState(
    () =>
      NOTE_PLACEHOLDERS[Math.floor(Math.random() * NOTE_PLACEHOLDERS.length)],
  );
  const { note, showNoteModal, openNoteModal, closeNoteModal, setNote } =
    useProfileNote(user?.id);

  useEffect(() => {
    if (!user?.id) return;
    getUserPostsWithDetails(user.id)
      .then((posts) => setPostsCount(posts.length))
      .catch(() => setPostsCount(0));
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const avatarSrc =
    buildS3Url(user.avatarUrl) ||
    user.avatarUrl ||
    "https://i.pravatar.cc/150";
  const displayName = user.fullName || user.name || user.username;
  const genderLabel = user.gender ? GENDER_LABELS[user.gender] : null;

  return (
    <div className="bg-white dark:bg-black">
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-3">
        {/* ── Top row: avatar (left) + username + stats (right) ───────── */}
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <button
            onClick={() => setShowAvatarModal(true)}
            className="relative shrink-0 group"
            title="Xem ảnh đại diện"
          >
            <img
              src={avatarSrc}
              alt={user.username}
              className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover border border-gray-200 dark:border-[#363636] group-hover:opacity-90 transition-opacity"
            />
          </button>

          {/* Right column */}
          <div className="flex-1 min-w-0 flex flex-col gap-2.5">
            {/* Username row */}
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-[18px] md:text-[20px] font-bold dark:text-white truncate flex-1">
                {user.username}
              </h1>

              {isOwnProfile && (
                <Link
                  to="/settings"
                  className="shrink-0 p-1.5 -m-1.5 text-gray-900 dark:text-gray-100 hover:opacity-60"
                  title="Cài đặt"
                >
                  <Settings size={22} />
                </Link>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-around md:justify-start md:gap-10 pr-2 md:pr-0">
              <Stat value={postsCount} label="Bài viết" />
              <Stat
                value={
                  typeof user.friendsCount === "number"
                    ? user.friendsCount
                    : user.friendsCount || 0
                }
                label="Bạn bè"
              />
              {isOwnProfile && (
                <Stat
                  value={user.followingCount ?? 0}
                  label="Theo dõi"
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Info block ────────────────────────────────────────────── */}
        <div className="mt-3 space-y-0.5">
          <p className="text-[14px] font-semibold dark:text-white leading-snug">
            {displayName}
          </p>
          {genderLabel && (
            <p className="text-[13px] text-gray-700 dark:text-gray-300">
              {genderLabel}
            </p>
          )}
          {user.birthday && (
            <p className="text-[13px] text-gray-700 dark:text-gray-300">
              {user.birthday}
            </p>
          )}
          {user.bio && (
            <p className="text-[14px] dark:text-gray-200 leading-relaxed">
              {user.bio}
            </p>
          )}
          {isOwnProfile && user.phone && (
            <p className="text-[14px] text-blue-500 dark:text-blue-400">
              {user.phone}
            </p>
          )}
        </div>

        {/* ── Note bubble (own profile or other-has-note) ─────────────── */}
        {(isOwnProfile || note) && (
          <button
            onClick={openNoteModal}
            className="mt-3 inline-flex items-start gap-2 px-3 py-2 bg-blue-50/60 dark:bg-blue-900/20 border border-blue-200/80 dark:border-blue-700/60 rounded-xl rounded-bl-md hover:shadow-sm transition-shadow text-left max-w-[260px]"
            title={isOwnProfile ? "Tạo / sửa ghi chú" : "Xem ghi chú"}
          >
            <div className="min-w-0">
              {note ? (
                <div className="space-y-0.5">
                  {note.content?.trim() && (
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                      {note.content}
                    </p>
                  )}
                  {note.music?.title && (
                    <p className="text-xs text-gray-700 dark:text-gray-200 line-clamp-1">
                      ♪ {note.music.title}
                    </p>
                  )}
                  {note.location?.trim() && (
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="truncate">{note.location.trim()}</span>
                    </p>
                  )}
                  {!note.content?.trim() &&
                    !note.music?.title &&
                    !note.location?.trim() && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Nhấn để cập nhật ghi chú
                      </p>
                    )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {notePlaceholder}
                </p>
              )}
            </div>
          </button>
        )}

        {/* ── Action buttons row ──────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 mt-3.5">
          {isOwnProfile ? (
            <>
              <Link
                to="/edit-profile"
                className="flex-1 inline-flex items-center justify-center h-[34px] px-3 bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] border border-[#dbdbdb] dark:border-[#363636] rounded-lg text-[14px] font-semibold dark:text-white transition-colors"
              >
                Chỉnh sửa hồ sơ
              </Link>
              <Link
                to="/friend-requests"
                className="flex-1 inline-flex items-center justify-center h-[34px] px-3 bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] border border-[#dbdbdb] dark:border-[#363636] rounded-lg text-[14px] font-semibold dark:text-white transition-colors"
              >
                Danh sách bạn bè
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center w-[34px] h-[34px] bg-[#efefef] dark:bg-[#262626] hover:bg-red-50 dark:hover:bg-red-900/30 border border-[#dbdbdb] dark:border-[#363636] text-red-600 dark:text-red-400 rounded-lg transition-colors"
                title="Đăng xuất"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <div className="flex-1 [&>button]:w-full [&>button]:h-[34px] [&>button]:rounded-lg [&>button]:text-[14px] [&>div>button]:h-[34px] [&>div>button]:rounded-lg [&>div>button]:text-[14px]">
                <FriendActions
                  targetUserId={user.id}
                  targetUsername={user.username}
                  size="md"
                  showText={true}
                />
              </div>
              <button className="flex-1 inline-flex items-center justify-center gap-1.5 h-[34px] px-3 bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] border border-[#dbdbdb] dark:border-[#363636] rounded-lg text-[14px] font-semibold dark:text-white transition-colors">
                <MessageCircle size={14} /> Nhắn tin
              </button>
              <button
                onClick={() => setShowInfoModal(true)}
                className="inline-flex items-center justify-center w-[34px] h-[34px] bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] border border-[#dbdbdb] dark:border-[#363636] rounded-lg dark:text-white transition-colors"
                title="Thông tin"
              >
                <Info size={15} />
              </button>
              <div className="[&>button]:!w-[34px] [&>button]:!h-[34px] [&>button]:!p-0 [&>button]:!rounded-lg [&>button>span]:hidden">
                <BlockUnblockButton
                  userId={user.id}
                  username={user.username}
                />
              </div>
              <button
                className="inline-flex items-center justify-center w-[34px] h-[34px] bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] border border-[#dbdbdb] dark:border-[#363636] rounded-lg dark:text-white transition-colors"
                title="Thêm"
              >
                <MoreHorizontal size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Note modal ──────────────────────────────────────────────── */}
      {showNoteModal && (
        <NoteModal
          userId={String(user.id)}
          isOwnProfile={isOwnProfile}
          onClose={closeNoteModal}
          onNoteChange={(updated) => setNote(updated)}
        />
      )}

      {/* ── Friends modal ───────────────────────────────────────────── */}
      {showFriendsModal && (
        <FriendsModal
          userId={user.id}
          onClose={() => setShowFriendsModal(false)}
        />
      )}

      {/* ── Avatar fullscreen modal ─────────────────────────────────── */}
      {showAvatarModal && (
        <div
          className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setShowAvatarModal(false)}
        >
          <button
            onClick={() => setShowAvatarModal(false)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <X size={20} />
          </button>
          <img
            src={avatarSrc}
            alt={user.username}
            className="max-w-[min(420px,90vw)] max-h-[80vh] rounded-full object-cover border-4 border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── Info modal (other user) ─────────────────────────────────── */}
      {showInfoModal && !isOwnProfile && (
        <div
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#262626]">
              <h2 className="text-base font-bold dark:text-white">Thông tin</h2>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex items-center gap-4 px-5 py-5">
              <img
                src={avatarSrc}
                alt={user.username}
                className="w-14 h-14 rounded-full object-cover border border-gray-200 dark:border-[#363636]"
              />
              <div className="min-w-0">
                <p className="font-bold text-base dark:text-white truncate">
                  {displayName}
                </p>
                {user.username && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    @{user.username}
                  </p>
                )}
              </div>
            </div>

            <div className="h-px bg-gray-200 dark:bg-[#262626] mx-5" />

            <div className="px-5 pb-5 pt-2 max-h-[55vh] overflow-y-auto">
              {user.username && (
                <InfoRow
                  icon={<AtSign size={16} />}
                  label="Tên người dùng"
                  value={`@${user.username}`}
                />
              )}
              {displayName && (
                <InfoRow
                  icon={<UserIcon size={16} />}
                  label="Họ và tên"
                  value={displayName}
                />
              )}
              {user.birthday && (
                <InfoRow
                  icon={<Calendar size={16} />}
                  label="Ngày sinh"
                  value={user.birthday}
                />
              )}
              {genderLabel && (
                <InfoRow
                  icon={<UsersIcon size={16} />}
                  label="Giới tính"
                  value={genderLabel}
                />
              )}
              {user.bio && (
                <InfoRow
                  icon={<MessageSquare size={16} />}
                  label="Giới thiệu"
                  value={user.bio}
                />
              )}
              {user.phone && (
                <InfoRow
                  icon={<Phone size={16} />}
                  label="Số điện thoại"
                  value={user.phone}
                />
              )}
              {typeof user.friendsCount === "number" && (
                <InfoRow
                  icon={<UsersIcon size={16} />}
                  label="Bạn bè"
                  value={`${user.friendsCount} người`}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  value,
  label,
  onClick,
}: {
  value: number | string;
  label: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="text-[17px] font-bold dark:text-white leading-tight">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      <span className="text-[13px] text-gray-700 dark:text-gray-300 leading-tight">
        {label}
      </span>
    </>
  );
  return onClick ? (
    <button
      onClick={onClick}
      className="flex flex-col items-center md:items-start hover:opacity-70 transition-opacity"
    >
      {content}
    </button>
  ) : (
    <div className="flex flex-col items-center md:items-start">{content}</div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-[#262626] last:border-0">
      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#262626] flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5">
          {label}
        </p>
        <p className="text-sm dark:text-white break-words">{value}</p>
      </div>
    </div>
  );
}
