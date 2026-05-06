import { useState, useRef, useEffect } from "react";
import {
  X,
  ImagePlus,
  MapPin,
  Users,
  Globe,
  Lock,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Play,
  Plus,
} from "lucide-react";
import * as postApi from "../../services/postService";
import { useAuth } from "../../contexts/AuthContext";
import { buildS3Url } from "../../utils/s3";
import FriendSelectorModal from "./FriendSelectorModal";

interface MediaItem {
  url: string;
  type?: string;
  order?: number;
}

interface UserData {
  id: number;
  username: string;
  name: string;
  avatarUrl?: string;
}

interface PostData {
  id: string;
  authorId?: string;
  content?: string;
  caption?: string;
  privacy?: string;
  media?: MediaItem[];
  images?: string[];
  mediaList?: MediaItem[];
  location?:
    | string
    | { name: string; address?: string; latitude?: number; longitude?: number };
  taggedUserIds?: string[];
  allowComments?: boolean;
  allowShares?: boolean;
}

interface EditPostModalProps {
  postId: string;
  post: PostData;
  taggedUsers: UserData[];
  onClose: () => void;
  onSaved: (updatedPost: PostData) => void;
}

const PRIVACY_OPTIONS = [
  { value: "PUBLIC", label: "Public", Icon: Globe, desc: "Anyone can see" },
  {
    value: "FRIENDS",
    label: "Friends",
    Icon: Users,
    desc: "Your friends only",
  },
  { value: "ONLY_ME", label: "Only me", Icon: Lock, desc: "Just you" },
  {
    value: "SPECIFIC",
    label: "Specific",
    Icon: UserCheck,
    desc: "Choose people",
  },
  {
    value: "EXCEPT",
    label: "Except...",
    Icon: Users,
    desc: "Friends except...",
  },
];

export default function EditPostModal({
  postId,
  post,
  taggedUsers: initialTaggedUsers,
  onClose,
  onSaved,
}: EditPostModalProps) {
  const { currentUser } = useAuth();

  // Edit state — pre-filled from post
  const [editContent, setEditContent] = useState(
    post.caption || post.content || ""
  );
  const [editPrivacy, setEditPrivacy] = useState(post.privacy || "PUBLIC");
  const [editLocation, setEditLocation] = useState(
    typeof post.location === "string"
      ? post.location
      : post.location?.name || ""
  );
  const [editExistingMedia, setEditExistingMedia] = useState<MediaItem[]>(
    (post.media || post.images || post.mediaList || []).map((item: any) => ({
      url: typeof item === "string" ? item : item.url,
      type: item.type,
      order: item.order,
    }))
  );
  const [newImages, setNewImages] = useState<File[]>([]);
  const [editTaggedUsers, setEditTaggedUsers] = useState<UserData[]>(
    initialTaggedUsers || []
  );
  const [showTagModal, setShowTagModal] = useState(false);
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const [editAllowComments, setEditAllowComments] = useState(
    post.allowComments !== false
  );
  const [editAllowShares, setEditAllowShares] = useState(
    post.allowShares !== false
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // ── Dirty-check: compare current state against the original post values ──
  const originalLocation =
    typeof post.location === "string"
      ? post.location
      : post.location?.name || "";
  const originalMediaCount = (post.media || post.mediaList || []).length;
  const originalTaggedIds = initialTaggedUsers
    .map((u) => u.id)
    .sort()
    .join(",");

  // Refs for DOM behaviors
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const privacyMenuRef = useRef<HTMLDivElement>(null);

  // Textarea auto-height effect
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.max(80, textareaRef.current.scrollHeight) + "px";
    }
  }, [editContent]);

  // Privacy menu click-outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        privacyMenuRef.current &&
        !privacyMenuRef.current.contains(event.target as Node)
      ) {
        setShowPrivacyMenu(false);
      }
    };

    if (showPrivacyMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPrivacyMenu]);

  // Sync form fields when post prop changes
  useEffect(() => {
    console.log("🔄 [DEBUG] EditPostModal sync effect triggered");
    console.log("📍 [DEBUG] post.location from prop:", post.location);
    console.log("🎬 [DEBUG] post.id:", post.id);

    const syncedContent = post.caption || post.content || "";
    const syncedPrivacy = post.privacy || "PUBLIC";
    const syncedLocation =
      typeof post.location === "string"
        ? post.location
        : post.location?.name || "";

    console.log("✅ [DEBUG] syncedLocation value:", syncedLocation);
    console.log("📊 [DEBUG] post object keys:", Object.keys(post));

    setEditContent(syncedContent);
    setEditPrivacy(syncedPrivacy);
    setEditLocation(syncedLocation);
    setEditAllowComments(post.allowComments !== false);
    setEditAllowShares(post.allowShares !== false);
    setEditExistingMedia(
      (post.media || post.images || post.mediaList || []).map((item: any) => ({
        url: typeof item === "string" ? item : item.url,
        type: item.type,
        order: item.order,
      }))
    );
  }, [
    post.id,
    post.caption,
    post.content,
    post.privacy,
    post.location,
    post.media,
    post.images,
    post.mediaList,
    post.allowComments,
    post.allowShares,
  ]);

  // Debug: Log when editLocation state changes
  useEffect(() => {
    console.log("🎯 [DEBUG] editLocation state changed to:", editLocation);
  }, [editLocation]);

  const isDirty =
    editContent !== (post.caption || post.content || "") ||
    editPrivacy !== (post.privacy || "PUBLIC") ||
    editLocation !== originalLocation ||
    editAllowComments !== (post.allowComments !== false) ||
    editAllowShares !== (post.allowShares !== false) ||
    newImages.length > 0 ||
    editExistingMedia.length !== originalMediaCount ||
    editTaggedUsers
      .map((u) => u.id)
      .sort()
      .join(",") !== originalTaggedIds;

  const hasAnyMedia = editExistingMedia.length > 0 || newImages.length > 0;
  const canSave = isDirty && (editContent.trim().length > 0 || hasAnyMedia);

  const handleClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const resolveMediaUrl = (rawUrl: string) => {
    if (!rawUrl) return "";

    // Already absolute URL from backend/CDN
    if (/^https?:\/\//i.test(rawUrl)) {
      return rawUrl;
    }

    // Already a key/path in bucket
    if (rawUrl.includes("/")) {
      return buildS3Url(rawUrl) || rawUrl;
    }

    // Filename only -> compose with author's post folder
    if (post.authorId) {
      const key = `posts/${post.authorId}/images/${rawUrl}`;
      return buildS3Url(key) || rawUrl;
    }

    return buildS3Url(rawUrl) || rawUrl;
  };

  // Image viewer state — combines existing + new file previews
  const allImages: {
    url: string;
    isNew: boolean;
    idx: number;
    isVideo: boolean;
  }[] = [
    ...editExistingMedia.map((m, i) => ({
      url: resolveMediaUrl(m.url),
      isNew: false,
      idx: i,
      isVideo: postApi.isVideoMedia(m.url, m.type),
    })),
    ...newImages.map((f, i) => ({
      url: URL.createObjectURL(f),
      isNew: true,
      idx: i,
      isVideo: f.type.startsWith("video/"),
    })),
  ];
  const [viewIdx, setViewIdx] = useState(0);
  const safeViewIdx = Math.min(viewIdx, Math.max(0, allImages.length - 1));

  const removeImage = (isNew: boolean, idx: number) => {
    if (isNew) {
      setNewImages((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setEditExistingMedia((prev) => prev.filter((_, i) => i !== idx));
    }
    setViewIdx(0);
  };

  const handleSave = async () => {
    if (!canSave || !currentUser?.id) return;
    try {
      setIsUpdating(true);
      const postData = {
        content: editContent.trim(),
        privacy: editPrivacy,
        location: editLocation || null,
        taggedUserIds: editTaggedUsers.map((u) => u.id.toString()),
        existingMediaUrls: editExistingMedia.map((m) => m.url),
        allowComments: editAllowComments,
        allowShares: editAllowShares,
      };

      console.log("📤 Saving post with data:", {
        postId,
        userId: currentUser.id,
        postData,
        newImagesCount: newImages.length,
      });

      const updatedPost = await postApi.updatePost(
        currentUser.id,
        postId,
        postData,
        newImages
      );

      console.log("✅ Post saved successfully:", updatedPost);
      onSaved(updatedPost);
      onClose();
    } catch (error: any) {
      console.error("❌ Error updating post:", error);
      console.error(
        "Full error response:",
        JSON.stringify(error?.response?.data, null, 2)
      );
      console.error(
        "Error message:",
        error?.response?.data?.message || error?.message
      );
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update post";
      alert(errorMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  const selectedPrivacyOption =
    PRIVACY_OPTIONS.find((o) => o.value === editPrivacy) || PRIVACY_OPTIONS[0];

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-60 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute right-8 top-8 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      <div
        className="relative bg-white dark:bg-gray-900 rounded-xl max-w-5xl w-full max-h-[92vh] flex overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── LEFT: image panel ── */}
        <div className="w-[55%] bg-black flex flex-col">
          {/* Image viewer with fixed height */}
          <div className="flex-1 relative flex items-center justify-center min-h-0 group bg-black">
            {allImages.length > 0 ? (
              <>
                <div className="w-full h-150 flex items-center justify-center bg-black overflow-hidden">
                  {allImages[safeViewIdx].isVideo ? (
                    <video
                      src={allImages[safeViewIdx].url}
                      className="w-full h-full object-contain"
                      controls
                    />
                  ) : (
                    <img
                      src={allImages[safeViewIdx].url}
                      alt="Post"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                {/* Remove current image */}
                <button
                  onClick={() =>
                    removeImage(
                      allImages[safeViewIdx].isNew,
                      allImages[safeViewIdx].idx
                    )
                  }
                  className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
                  title="Remove this photo"
                >
                  <X className="w-4 h-4" />
                </button>
                {/* Navigation */}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setViewIdx((p) =>
                          p === 0 ? allImages.length - 1 : p - 1
                        )
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() =>
                        setViewIdx((p) =>
                          p === allImages.length - 1 ? 0 : p + 1
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight size={20} />
                    </button>
                    {/* Dot indicators */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                      {allImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setViewIdx(i)}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            i === safeViewIdx
                              ? "bg-white"
                              : "bg-white/40 hover:bg-white/70"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <ImagePlus className="w-16 h-16" />
                  <p className="text-sm">No photos</p>
                </div>
              </div>
            )}
          </div>

          {/* Thumbnail strip with fixed 1:1 aspect */}
          {allImages.length > 0 && (
            <div className="px-2 py-3 border-t border-gray-700 flex gap-2 overflow-x-auto bg-gray-950">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setViewIdx(idx)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    idx === safeViewIdx
                      ? "border-blue-500 ring-2 ring-blue-400"
                      : "border-gray-600 hover:border-gray-400"
                  }`}
                >
                  {img.isVideo ? (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">
                      <Play size={16} />
                    </div>
                  ) : (
                    <img
                      src={img.url}
                      alt={`Thumbnail ${idx}`}
                      className="w-full h-full object-contain"
                    />
                  )}
                </button>
              ))}
              {/* Add media tile */}
              <label className="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-900 transition-colors text-gray-400 hover:text-gray-300">
                <Plus size={20} />
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) {
                      setNewImages((prev) => [...prev, ...files]);
                      setViewIdx(allImages.length);
                    }
                  }}
                />
              </label>
            </div>
          )}

          {/* Add photos button (when no media) */}
          {allImages.length === 0 && (
            <label className="flex items-center justify-center gap-2 py-3 border-t border-gray-700 cursor-pointer hover:bg-gray-800 transition-colors text-gray-300 text-sm shrink-0">
              <ImagePlus className="w-4 h-4" />
              <span>Add media</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length) {
                    setNewImages((prev) => [...prev, ...files]);
                    setViewIdx(allImages.length);
                  }
                }}
              />
            </label>
          )}
        </div>

        {/* ── RIGHT: edit form ── */}
        <div className="w-[45%] flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 shrink-0">
            <button
              onClick={handleClose}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Cancel
            </button>
            <h2 className="text-sm font-semibold dark:text-white">Edit post</h2>
            <button
              onClick={handleSave}
              disabled={isUpdating || !canSave}
              className="text-sm font-semibold text-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Saving..." : "Save"}
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Caption */}
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={5}
              placeholder="What's on your mind?"
              className="w-full p-3 text-sm border dark:border-gray-700 rounded-lg resize-none dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            {/* Privacy */}
            <div className="relative z-50">
              <button
                onClick={() => setShowPrivacyMenu((p) => !p)}
                className="w-full flex items-center gap-2 px-3 py-2 border dark:border-gray-700 rounded-lg text-sm dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <selectedPrivacyOption.Icon className="w-4 h-4 text-gray-500" />
                <span>{selectedPrivacyOption.label}</span>
              </button>
              {showPrivacyMenu && (
                <div
                  className="fixed mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-2xl overflow-auto max-h-64 min-w-200px"
                  style={{
                    zIndex: 9999,
                  }}
                >
                  {PRIVACY_OPTIONS.map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      onClick={() => {
                        setEditPrivacy(value);
                        setShowPrivacyMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white ${
                        editPrivacy === value
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-500"
                          : ""
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="Add location..."
                className="flex-1 px-3 py-2 text-sm border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {editLocation && (
                <button
                  onClick={() => setEditLocation("")}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Tag people */}
            <div className="space-y-2">
              <button
                onClick={() => setShowTagModal(true)}
                className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600"
              >
                <Users className="w-4 h-4" />
                {editTaggedUsers.length > 0
                  ? `Tagged ${editTaggedUsers.length} ${
                      editTaggedUsers.length === 1 ? "person" : "people"
                    }`
                  : "Tag friends"}
              </button>

              {/* Tagged chips */}
              {editTaggedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {editTaggedUsers.map((user) => (
                    <span
                      key={user.id}
                      className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs"
                    >
                      @{user.username}
                      <button
                        onClick={() =>
                          setEditTaggedUsers((prev) =>
                            prev.filter((u) => u.id !== user.id)
                          )
                        }
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Interaction Settings */}
            <div className="border-t dark:border-gray-700 pt-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Interaction settings
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Allow commenting
                </span>
                <button
                  onClick={() => setEditAllowComments(!editAllowComments)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    editAllowComments
                      ? "bg-[#0095f6]"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      editAllowComments ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Allow sharing
                </span>
                <button
                  onClick={() => setEditAllowShares(!editAllowShares)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    editAllowShares
                      ? "bg-[#0095f6]"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      editAllowShares ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Discard-changes confirmation dialog ── */}
      {showDiscardConfirm && (
        <div
          className="absolute inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-[320px] overflow-hidden">
            <div className="px-6 pt-6 pb-4 text-center">
              <h3 className="text-base font-semibold dark:text-white mb-2">
                Discard changes?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You have unsaved changes. If you leave now, your edits will be
                lost.
              </p>
            </div>
            <div className="border-t dark:border-gray-700 flex">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="flex-1 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Keep editing
              </button>
              <div className="w-px bg-gray-200 dark:bg-gray-700" />
              <button
                onClick={onClose}
                className="flex-1 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friend Selector Modal for Tagging */}
      <FriendSelectorModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        onConfirm={(_usernames, selectedFriends) => {
          // Convert Friend[] back to UserData[] for EditPostModal state
          const convertedUsers: UserData[] = selectedFriends.map((f) => ({
            id: Number(f.id),
            username: f.username,
            name: f.fullName,
            avatarUrl: f.avatar,
          }));
          setEditTaggedUsers(convertedUsers);
        }}
        title="Tag friends"
        description="Search for friends to tag in your post"
        initialSelected={editTaggedUsers.map((u) => u.username)}
      />
    </div>
  );
}
