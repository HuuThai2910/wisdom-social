import { useState, useRef, useEffect } from "react";
import {
  ImagePlus,
  X,
  Globe,
  Lock,
  UserCheck,
  Users,
  ArrowLeft,
  Music,
  Settings2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { buildS3Url } from "../utils/s3";
import FriendSelectorModal from "../components/post/FriendSelectorModal";
import {
  stopAudioPreview,
  type MusicMetadata,
} from "../services/musicService";
import StoryCanvas from "../components/story/StoryCanvas";
import StoryMusicPickerModal from "../components/story/StoryMusicPickerModal";
import { useStoryTextManager } from "../hooks/useStoryTextManager";
import { useStoryMusicSticker } from "../hooks/useStoryMusicSticker";

type StoryPrivacy =
  | "PUBLIC"
  | "FRIENDS"
  | "PRIVATE"
  | "SPECIFIC"
  | "FRIENDS_EXCEPT";

const BG_GRADIENTS = [
  "bg-gradient-to-br from-purple-600 via-pink-500 to-red-500",
  "bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400",
  "bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-300",
  "bg-gradient-to-br from-green-600 via-emerald-500 to-teal-400",
  "bg-gradient-to-br from-indigo-600 via-purple-500 to-pink-400",
  "bg-gradient-to-br from-rose-500 via-red-400 to-orange-400",
  "bg-gradient-to-br from-slate-800 via-gray-700 to-zinc-600",
  "bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600",
  "bg-gradient-to-br from-fuchsia-600 via-violet-500 to-indigo-400",
  "bg-gradient-to-br from-teal-600 via-emerald-400 to-lime-400",
];

export default function CreateStory() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const textManager = useStoryTextManager();
  const musicManager = useStoryMusicSticker();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Media state
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>("");
  const [selectedBgIndex, setSelectedBgIndex] = useState(0);

  // Privacy
  const [privacy, setPrivacy] = useState<StoryPrivacy>("PUBLIC");
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const [specificViewers, setSpecificViewers] = useState<string[]>([]);
  const [excludedUsers, setExcludedUsers] = useState<string[]>([]);
  const [showSpecificModal, setShowSpecificModal] = useState(false);
  const [showExcludedModal, setShowExcludedModal] = useState(false);

  // Music
  const [showMusicPicker, setShowMusicPicker] = useState(false);

  // Advanced
  const [allowReplies, setAllowReplies] = useState(true);
  const [allowSharing, setAllowSharing] = useState(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audio cleanup
  useEffect(() => {
    return () => stopAudioPreview();
  }, []);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/") && file.size > 10 * 1024 * 1024) {
      alert("Ảnh không được vượt quá 10MB.");
      return;
    }
    if (file.type.startsWith("video/") && file.size > 100 * 1024 * 1024) {
      alert("Video không được vượt quá 100MB.");
      return;
    }
    setSelectedMedia(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleRemoveMedia = () => {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setSelectedMedia(null);
    setMediaPreviewUrl("");
  };

  const canSubmit =
    !isSubmitting &&
    (textManager.layers.some((l) => l.text.trim()) || selectedMedia !== null || musicManager.sticker !== null);

  const handlePost = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      console.log("Creating story...", {
        layers: textManager.layers,
        selectedMedia,
        privacy,
        music: musicManager.sticker?.music || null,
        musicStyle: musicManager.sticker?.style || null,
        allowReplies,
        allowSharing,
        bgGradient: !selectedMedia ? BG_GRADIENTS[selectedBgIndex] : null,
      });
      await new Promise((r) => setTimeout(r, 1000));
      navigate(-1);
    } catch (error) {
      console.error("Error creating story:", error);
      alert("Không thể tạo tin. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#1a1a1a] z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/40 backdrop-blur-md border-b border-white/5 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Đóng</span>
        </button>

        <h2 className="text-white font-semibold text-sm tracking-wide">
          Tạo tin
        </h2>

        <button
          onClick={handlePost}
          disabled={!canSubmit}
          className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${
            canSubmit
              ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? "Đang chia sẻ..." : "Chia sẻ"}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Canvas Area */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
          <StoryCanvas
            manager={textManager}
            musicManager={musicManager}
            backgroundUrl={mediaPreviewUrl || undefined}
            backgroundType={
              selectedMedia?.type.startsWith("video/") ? "video" : "image"
            }
            gradientClass={!selectedMedia ? BG_GRADIENTS[selectedBgIndex] : undefined}
          />
        </div>

        {/* Right: Settings Sidebar */}
        {showSidebar && (
          <div className="w-[320px] bg-[#0d0d0d] border-l border-white/5 flex flex-col overflow-hidden shrink-0 hidden lg:flex">
            <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarGutter: "stable" }}>
              {/* User Info */}
              <div className="flex items-center gap-3">
                <img
                  src={
                    buildS3Url(currentUser?.avatarUrl || "") ||
                    "https://i.pravatar.cc/150?img=5"
                  }
                  alt={currentUser?.username || "User"}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10"
                />
                <div>
                  <p className="text-white text-sm font-semibold">
                    {currentUser?.fullName || currentUser?.username || "Bạn"}
                  </p>
                  <p className="text-white/40 text-[11px]">
                    @{currentUser?.username}
                  </p>
                </div>
              </div>

              {/* Background */}
              {!selectedMedia && (
                <div>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2.5">
                    Nền
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {BG_GRADIENTS.map((gradient, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedBgIndex(index)}
                        className={`w-8 h-8 rounded-full ${gradient} border-2 transition-all ${
                          selectedBgIndex === index
                            ? "border-blue-400 scale-110 shadow-lg shadow-blue-500/20"
                            : "border-white/10 hover:border-white/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Media */}
              <div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2.5">
                  Ảnh / Video
                </p>
                {selectedMedia ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                      <ImagePlus size={14} className="text-white/40" />
                      <span className="text-white/60 text-xs truncate">
                        {selectedMedia.name}
                      </span>
                    </div>
                    <button
                      onClick={handleRemoveMedia}
                      className="p-2 text-white/40 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-dashed border-white/15 hover:border-white/25 rounded-xl text-white/50 hover:text-white/70 text-xs font-medium transition-all"
                  >
                    <ImagePlus size={14} />
                    Tải lên ảnh hoặc video
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-white/5" />

              {/* Music */}
              <div>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Music size={11} /> Âm nhạc
                </p>
                {musicManager.sticker ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-end gap-[1px] h-3 shrink-0">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="w-[2px] bg-purple-400 rounded-full"
                            style={{
                              animation: `musicBar${i} 0.${4 + i}s ease-in-out infinite alternate`,
                            }}
                          />
                        ))}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-gray-900 truncate">
                          {musicManager.sticker.music.title}
                        </p>
                        <p className="text-[9px] text-gray-400 truncate">
                          {musicManager.sticker.music.artist}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        musicManager.removeSticker();
                        stopAudioPreview();
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowMusicPicker(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 hover:border-purple-400 rounded-xl text-gray-500 hover:text-purple-600 text-xs font-medium transition-all"
                  >
                    <Music size={14} />
                    Thêm nhạc vào story
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-white/5" />

              {/* Privacy */}
              <div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2.5">
                  Quyền riêng tư
                </p>
                <div className="space-y-1.5">
                  {/* PUBLIC */}
                  <button
                    onClick={() => setPrivacy("PUBLIC")}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                      privacy === "PUBLIC"
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Globe
                        size={15}
                        className={
                          privacy === "PUBLIC"
                            ? "text-blue-400"
                            : "text-white/40"
                        }
                      />
                      <span
                        className={`text-xs font-medium ${
                          privacy === "PUBLIC"
                            ? "text-blue-400"
                            : "text-white/70"
                        }`}
                      >
                        Công khai
                      </span>
                    </div>
                    <div
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        privacy === "PUBLIC"
                          ? "border-blue-400"
                          : "border-white/20"
                      }`}
                    >
                      {privacy === "PUBLIC" && (
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                      )}
                    </div>
                  </button>

                  {/* FRIENDS */}
                  <button
                    onClick={() => setPrivacy("FRIENDS")}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                      privacy === "FRIENDS"
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <UserCheck
                        size={15}
                        className={
                          privacy === "FRIENDS"
                            ? "text-blue-400"
                            : "text-white/40"
                        }
                      />
                      <span
                        className={`text-xs font-medium ${
                          privacy === "FRIENDS"
                            ? "text-blue-400"
                            : "text-white/70"
                        }`}
                      >
                        Bạn bè
                      </span>
                    </div>
                    <div
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        privacy === "FRIENDS"
                          ? "border-blue-400"
                          : "border-white/20"
                      }`}
                    >
                      {privacy === "FRIENDS" && (
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                      )}
                    </div>
                  </button>

                  {/* More options */}
                  <button
                    onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
                    className="text-[10px] text-blue-400/70 hover:text-blue-400 px-1 py-1 font-medium transition-colors"
                  >
                    {showPrivacyMenu ? "Thu gọn ▲" : "Tùy chọn khác ▼"}
                  </button>

                  {showPrivacyMenu && (
                    <div className="space-y-1 pt-0.5 pl-3 border-l border-white/5 ml-1">
                      <button
                        onClick={() => {
                          setPrivacy("PRIVATE");
                          setShowPrivacyMenu(false);
                        }}
                        className="flex items-center gap-2 text-[11px] text-white/50 py-1.5 hover:text-blue-400 transition-colors"
                      >
                        <Lock size={13} /> Chỉ mình tôi
                      </button>
                      <button
                        onClick={() => {
                          setPrivacy("SPECIFIC");
                          setShowSpecificModal(true);
                        }}
                        className="flex items-center gap-2 text-[11px] text-white/50 py-1.5 hover:text-blue-400 transition-colors"
                      >
                        <Users size={13} /> Bạn bè cụ thể...
                      </button>
                      <button
                        onClick={() => {
                          setPrivacy("FRIENDS_EXCEPT");
                          setShowExcludedModal(true);
                        }}
                        className="flex items-center gap-2 text-[11px] text-white/50 py-1.5 hover:text-blue-400 transition-colors"
                      >
                        <UserCheck size={13} /> Bạn bè ngoại trừ...
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/5" />

              {/* Advanced Settings */}
              <div>
                <button
                  onClick={() =>
                    setShowAdvancedSettings(!showAdvancedSettings)
                  }
                  className="w-full flex items-center justify-between py-2 transition-colors"
                >
                  <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-wider">
                    <Settings2 size={12} />
                    Cài đặt nâng cao
                  </div>
                  <span
                    className={`text-white/30 text-[10px] transition-transform ${
                      showAdvancedSettings ? "rotate-180" : ""
                    }`}
                  >
                    ▼
                  </span>
                </button>
                {showAdvancedSettings && (
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60">
                        Cho phép reply story
                      </span>
                      <button
                        onClick={() => setAllowReplies(!allowReplies)}
                        className={`relative w-9 h-5 rounded-full transition-colors ${
                          allowReplies
                            ? "bg-blue-500"
                            : "bg-white/10"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                            allowReplies
                              ? "translate-x-4"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60">
                        Cho phép chia sẻ
                      </span>
                      <button
                        onClick={() => setAllowSharing(!allowSharing)}
                        className={`relative w-9 h-5 rounded-full transition-colors ${
                          allowSharing
                            ? "bg-blue-500"
                            : "bg-white/10"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                            allowSharing
                              ? "translate-x-4"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleMediaSelect}
      />

      {/* Friend Selector Modals */}
      <FriendSelectorModal
        isOpen={showSpecificModal}
        onClose={() => setShowSpecificModal(false)}
        onConfirm={(selected) => setSpecificViewers(selected)}
        title="Ai có thể xem tin này?"
        description="Chỉ những người bạn được chọn mới có thể xem"
        initialSelected={specificViewers}
      />
      <FriendSelectorModal
        isOpen={showExcludedModal}
        onClose={() => setShowExcludedModal(false)}
        onConfirm={(selected) => setExcludedUsers(selected)}
        title="Ẩn với"
        description="Những người bạn được chọn sẽ không thể xem"
        initialSelected={excludedUsers}
      />

      {/* Music Picker Modal */}
      <StoryMusicPickerModal
        isOpen={showMusicPicker}
        onClose={() => setShowMusicPicker(false)}
        onSelect={(music) => {
          musicManager.addSticker(music);
          setShowMusicPicker(false);
        }}
      />
    </div>
  );
}
