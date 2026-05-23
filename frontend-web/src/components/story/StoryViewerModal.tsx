import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, MoreHorizontal, Trash2, Lock, Settings, Globe, Users } from "lucide-react";
import { buildS3Url } from "../../utils/s3";
import { viewStory, deleteStory, updateStoryPrivacy, updateStorySettings } from "../../services/storyService";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { musicFeedManager } from "../../services/MusicFeedManager";
import StoryOptionsBottomSheet from "./StoryOptionsBottomSheet";

export interface StoryGroup {
  userId: string;
  username: string;
  userAvatar: string;
  stories: any[];
}

interface StoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: StoryGroup[];
  initialGroupIdx?: number;
  initialStoryIdx?: number;
  onStoryViewed?: (storyId: string) => void;
  onGroupChanged?: (groupIdx: number) => void;
}

export default function StoryViewerModal({
  isOpen,
  onClose,
  groups,
  initialGroupIdx = 0,
  initialStoryIdx = 0,
  onStoryViewed,
  onGroupChanged,
}: StoryViewerModalProps) {
  // Use groups directly — parent is responsible for keeping them stable
  const [groupIdx, setGroupIdx] = useState(initialGroupIdx);
  const [storyIdx, setStoryIdx] = useState(initialStoryIdx);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clamp indices to valid range
  const safeGroupIdx = Math.max(0, Math.min(groupIdx, groups.length - 1));
  const activeGroup = groups[safeGroupIdx];
  const safeStoryIdx = activeGroup ? Math.max(0, Math.min(storyIdx, activeGroup.stories.length - 1)) : 0;
  const activeStory = activeGroup?.stories[safeStoryIdx];
  const currentUser = useCurrentUser();
  const isMyStory = currentUser && activeGroup && String(currentUser.id) === String(activeGroup.userId);

  // Sync state when modal is opened (reset to initial indices)
  useEffect(() => {
    if (isOpen) {
      setGroupIdx(initialGroupIdx);
      setStoryIdx(initialStoryIdx);
      setProgress(0);
      setIsFinished(false);
    }
  }, [isOpen]);

  const [showOptions, setShowOptions] = useState(false);
  const [showPrivacyOptions, setShowPrivacyOptions] = useState(false);
  const [showSettingsOptions, setShowSettingsOptions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDelete = async () => {
    if (!activeStory) return;
    if (window.confirm("Bạn có chắc chắn muốn xóa tin này không?")) {
      setIsDeleting(true);
      try {
        await deleteStory(activeStory.id);

        // After deleting, advance to next story or close
        const group = groups[groupIdx];
        if (group) {
          const remainingStories = group.stories.filter((s) => s.id !== activeStory.id);
          if (remainingStories.length === 0) {
            // No more stories in this group
            if (groupIdx < groups.length - 1) {
              setGroupIdx((prev) => prev + 1);
              setStoryIdx(0);
            } else {
              // Last group — close modal
              handleClose();
              return;
            }
          } else if (storyIdx >= remainingStories.length) {
            // Was the last story in group, go to next group
            if (groupIdx < groups.length - 1) {
              setGroupIdx((prev) => prev + 1);
              setStoryIdx(0);
            } else {
              handleClose();
              return;
            }
          }
        }

        setShowOptions(false);
        setIsPaused(false);
        setProgress(0);
      } catch (err) {
        alert("Xóa tin thất bại!");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleUpdatePrivacy = async (newPrivacy: string) => {
    if (!activeStory) return;
    setIsUpdating(true);
    try {
      await updateStoryPrivacy(activeStory.id, newPrivacy);
      // Mutate the story object directly so UI reflects change
      activeStory.privacy = newPrivacy;

      setShowPrivacyOptions(false);
      setShowOptions(false);
      setIsPaused(false);
    } catch (err) {
      alert("Cập nhật quyền riêng tư thất bại!");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateSettings = async (settings: { allowReplies?: boolean; allowReactions?: boolean; allowSharing?: boolean }) => {
    if (!activeStory) return;
    setIsUpdating(true);
    try {
      await updateStorySettings(activeStory.id, settings);
      // Mutate the story object directly so UI reflects change
      Object.assign(activeStory, settings);

      setShowSettingsOptions(false);
      setShowOptions(false);
      setIsPaused(false);
    } catch (err) {
      alert("Cập nhật cài đặt thất bại!");
    } finally {
      setIsUpdating(false);
    }
  };

  // Record view on story active
  useEffect(() => {
    if (isOpen && activeStory && currentUser && !activeStory.isViewed && !isFinished) {
      viewStory(activeStory.id).then(() => {
        activeStory.isViewed = true;
        onStoryViewed?.(activeStory.id);
      });
    }
  }, [isOpen, activeStory, currentUser, onStoryViewed, isFinished]);

  // Suspend any playing feed/post music when Story Modal is open
  useEffect(() => {
    if (isOpen) {
      musicFeedManager.setSuspended(true);
    }
    return () => {
      musicFeedManager.setSuspended(false);
    };
  }, [isOpen]);

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setIsFinished(false);
    setProgress(0);
    onClose();
  };

  const handleNext = useCallback(() => {
    const group = groups[groupIdx];
    if (!group) return;

    if (storyIdx < group.stories.length - 1) {
      setStoryIdx((prev) => prev + 1);
      setProgress(0);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((prev) => prev + 1);
      setStoryIdx(0);
      setProgress(0);
    } else {
      setIsFinished(true);
    }
  }, [groupIdx, storyIdx, groups]);

  const handleNextRef = useRef(handleNext);
  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  const handlePrev = useCallback(() => {
    if (isFinished) {
      setIsFinished(false);
      setProgress(0);
      return;
    }
    if (storyIdx > 0) {
      setStoryIdx((prev) => prev - 1);
      setProgress(0);
    } else if (groupIdx > 0) {
      const prevGroup = groups[groupIdx - 1];
      setGroupIdx((prev) => prev - 1);
      setStoryIdx(prevGroup ? prevGroup.stories.length - 1 : 0);
      setProgress(0);
    } else {
      setProgress(0);
    }
  }, [groupIdx, storyIdx, groups, isFinished]);

  // Audio (music) player effect
  useEffect(() => {
    if (!isOpen || !activeStory || isFinished) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      return;
    }

    setProgress(0);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

    let activeAudio: HTMLAudioElement | null = null;

    if (activeStory.music && activeStory.music.audioUrl) {
      const resolvedUrl = buildS3Url(activeStory.music.audioUrl) || activeStory.music.audioUrl;
      activeAudio = new Audio(resolvedUrl);
      activeAudio.volume = 0.8;
      activeAudio.loop = true;
      audioRef.current = activeAudio;

      if (!isPaused) {
        activeAudio.play().catch((err) => console.log("Audio play blocked:", err));
      }
    }

    return () => {
      if (activeAudio) {
        activeAudio.pause();
        activeAudio.src = "";
      }
      if (audioRef.current === activeAudio) {
        audioRef.current = null;
      }
    };
  }, [isOpen, groupIdx, storyIdx, isFinished]);

  // Progress Timer Effect (only for non-video stories)
  const progressRef = useRef(0);
  useEffect(() => {
    if (!isOpen || isPaused || !activeStory || isFinished) return;

    const isVideoStory = activeStory.media?.type?.toUpperCase() === "VIDEO";
    if (isVideoStory) return; // Handled by inline video element events

    const duration = 5000;
    const step = 50;
    const increment = (step / duration) * 100;
    progressRef.current = 0;

    const intervalId = setInterval(() => {
      progressRef.current += increment;
      if (progressRef.current >= 100) {
        clearInterval(intervalId);
        setProgress(100);
        // Defer handleNext to avoid calling setProgress(0) while timer is still in-flight
        setTimeout(() => handleNextRef.current(), 0);
      } else {
        setProgress(progressRef.current);
      }
    }, step);

    return () => {
      clearInterval(intervalId);
    };
  }, [isOpen, groupIdx, storyIdx, isPaused, isFinished]);

  // Pause / Resume Effect
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (isPaused) {
      video?.pause();
      audio?.pause();
    } else {
      video?.play().catch(() => {});
      audio?.play().catch(() => {});
    }
  }, [isPaused]);

  if (!isOpen || groups.length === 0) return null;
  if (!isFinished && (!activeStory || !activeGroup)) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const parseStoryContent = (story: any) => {
    if (!story) return { cleanText: "", bgClass: "bg-gradient-to-br from-purple-600 via-pink-500 to-red-500" };
    const text = story.text || "";
    let cleanText = text;
    let bgClass = "bg-gradient-to-br from-purple-600 via-pink-500 to-red-500";

    const bgMatch = text.match(/\[bg:(.*?)\]/);
    if (bgMatch) {
      bgClass = bgMatch[1];
      cleanText = text.replace(/\[bg:(.*?)\]/, "").trim();
    }

    return { cleanText, bgClass };
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Vừa xong";
      if (diffMins < 60) return `${diffMins} phút trước`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} ngày trước`;
    } catch {
      return "";
    }
  };

  const touchStartTimeRef = useRef<number>(0);

  const handleTouchStart = () => {
    touchStartTimeRef.current = Date.now();
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    const duration = Date.now() - touchStartTimeRef.current;
    if (duration < 250) {
      const touch = e.changedTouches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      if (x < rect.width * 0.3) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  const handleMouseDown = () => {
    touchStartTimeRef.current = Date.now();
    setIsPaused(true);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsPaused(false);
    const duration = Date.now() - touchStartTimeRef.current;
    if (duration < 250) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < rect.width * 0.3) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  const renderStoryContent = (story: any) => {
    if (!story) return null;
    const { cleanText, bgClass } = parseStoryContent(story);
    const mediaUrl = story.media?.url ? (buildS3Url(story.media.url) || story.media.url) : null;

    if (mediaUrl) {
      const isVideo = story.media?.type?.toUpperCase() === "VIDEO";
      if (isVideo) {
        return (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="w-full h-full object-cover"
            playsInline
            autoPlay={!isPaused}
            muted={story.music?.muteOriginal ?? false}
            onTimeUpdate={(e) => {
              const video = e.currentTarget;
              if (video.duration) {
                setProgress((video.currentTime / video.duration) * 100);
              }
            }}
            onEnded={handleNext}
          />
        );
      } else {
        return (
          <img
            src={mediaUrl}
            alt="Story content"
            className="w-full h-full object-cover"
            draggable={false}
          />
        );
      }
    }

    return (
      <div className={`w-full h-full ${bgClass} flex items-center justify-center p-8 text-center`}>
        <span className="text-white text-xl font-bold whitespace-pre-wrap leading-relaxed drop-shadow-md">
          {cleanText}
        </span>
      </div>
    );
  };

  const { cleanText } = activeStory ? parseStoryContent(activeStory) : { cleanText: "" };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center select-none">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 md:top-6 md:right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all duration-200 z-50 cursor-pointer"
        title="Đóng"
      >
        <X size={20} />
      </button>

      {/* Desktop Left navigation arrow */}
      {isFinished || groupIdx > 0 || storyIdx > 0 ? (
        <button
          onClick={handlePrev}
          className="hidden md:flex absolute left-8 lg:left-16 text-white/50 hover:text-white bg-white/5 hover:bg-white/15 p-4 rounded-full transition-all duration-200 hover:scale-105 z-50 cursor-pointer"
        >
          <ChevronLeft size={28} />
        </button>
      ) : null}

      {/* Main Story Container */}
      <div
        className="relative w-full h-full max-h-[85vh] md:max-h-[90vh] max-w-[420px] aspect-[9/16] md:rounded-2xl overflow-hidden bg-zinc-950 flex flex-col justify-between shadow-2xl ring-1 ring-white/10"
        onMouseDown={isFinished || showOptions ? undefined : handleMouseDown}
        onMouseUp={isFinished || showOptions ? undefined : handleMouseUp}
        onTouchStart={isFinished || showOptions ? undefined : handleTouchStart}
        onTouchEnd={isFinished || showOptions ? undefined : handleTouchEnd}
      >
        {isFinished ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 text-white relative">
            {/* Animated glowing checkmark background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)] pointer-events-none" />
            
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-6 scale-95 animate-bounce animate-duration-3000" style={{ animationDuration: '3s' }}>
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-2">
              Bạn đã xem hết tất cả tin
            </h3>
            <p className="text-xs text-white/50 max-w-[240px] leading-relaxed mb-8">
              Hãy quay lại sau để cập nhật những khoảnh khắc mới nhất từ bạn bè.
            </p>
            
            <div className="flex flex-col gap-3 w-full max-w-[200px] z-10">
              <button
                onClick={handleClose}
                className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 active:scale-98 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setGroupIdx(0);
                  setStoryIdx(0);
                  setProgress(0);
                  setIsFinished(false);
                }}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 active:scale-98 text-white/80 rounded-xl text-xs font-semibold border border-white/10 transition-all cursor-pointer"
              >
                Xem lại từ đầu
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Top progress indicators and Header */}
            <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent z-40">
              {/* Progress bars */}
              <div className="flex gap-1 mb-3">
                {activeGroup?.stories?.map((_, i) => {
                  let widthPercent = 0;
                  if (i < storyIdx) widthPercent = 100;
                  else if (i === storyIdx) widthPercent = progress;
                  return (
                    <div
                      key={i}
                      className="flex-1 h-[2.5px] bg-white/30 rounded-full overflow-hidden"
                    >
                      <div
                        className="h-full bg-white transition-all duration-[50ms] ease-linear"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* User details */}
              <div className="flex items-center justify-between w-full pr-1">
                <div className="flex items-center gap-2.5">
                  {activeGroup && (
                    <img
                      src={
                        buildS3Url(activeGroup.userAvatar) ||
                        activeGroup.userAvatar ||
                        "https://i.pravatar.cc/150"
                      }
                      alt={activeGroup.username}
                      className="w-9 h-9 rounded-full object-cover border border-white/20"
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="text-white text-xs font-bold leading-tight">
                      {activeGroup?.username}
                    </span>
                    <span className="text-white/50 text-[10px] leading-tight mt-0.5">
                      {activeStory?.createdAt ? formatTimeAgo(activeStory.createdAt) : ""}
                    </span>
                  </div>
                </div>

                {/* 3-dots menu for own stories */}
                {isMyStory && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPaused(true);
                      setShowOptions(true);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-all duration-200 cursor-pointer z-50 flex items-center justify-center"
                    title="Tùy chọn tin"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Main content body */}
            <div className="flex-1 w-full h-full">
              {renderStoryContent(activeStory)}
            </div>

            {/* Floating Music Sticker Overlay */}
            {activeStory?.music && activeStory?.music?.title && (
              <div className="absolute top-20 left-4 right-4 bg-black/40 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 flex items-center gap-2.5 pointer-events-none animate-pulse">
                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-white/10 relative">
                  <img
                    src={activeStory.music.thumbnail || "https://i.pravatar.cc/150?u=music"}
                    alt={activeStory.music.title}
                    className="w-full h-full object-cover animate-spin"
                    style={{ animationDuration: '6s' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <span className="text-white text-[10px]">🎵</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate leading-tight">
                    {activeStory.music.title}
                  </p>
                  <p className="text-white/60 text-[10px] truncate leading-tight mt-0.5">
                    {activeStory.music.artist}
                  </p>
                </div>
                <div className="flex items-end gap-0.5 h-3">
                  <div className="w-0.5 bg-blue-400 rounded-full animate-bounce h-2" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }} />
                  <div className="w-0.5 bg-blue-400 rounded-full animate-bounce h-3" style={{ animationDelay: '0.3s', animationDuration: '0.4s' }} />
                  <div className="w-0.5 bg-blue-400 rounded-full animate-bounce h-1.5" style={{ animationDelay: '0s', animationDuration: '0.5s' }} />
                  <div className="w-0.5 bg-blue-400 rounded-full animate-bounce h-2.5" style={{ animationDelay: '0.2s', animationDuration: '0.7s' }} />
                </div>
              </div>
            )}

            {/* Text Overlay for media stories */}
            {activeStory?.media?.url && cleanText && (
              <div className="absolute inset-x-4 bottom-8 bg-black/45 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/10 text-center pointer-events-none z-30">
                <p className="text-white text-xs font-medium whitespace-pre-wrap leading-snug drop-shadow-sm">
                  {cleanText}
                </p>
              </div>
            )}
          </>
        )}
        {/* Premium Options Menu Bottom Sheet */}
        <StoryOptionsBottomSheet
          isOpen={showOptions}
          onClose={() => {
            setShowOptions(false);
            setIsPaused(false);
          }}
          activeStory={activeStory}
          isDeleting={isDeleting}
          isUpdating={isUpdating}
          onDelete={handleDelete}
          onUpdatePrivacy={handleUpdatePrivacy}
          onUpdateSettings={handleUpdateSettings}
        />
      </div>

      {/* Desktop Right navigation arrow */}
      {!isFinished && activeGroup && (groupIdx < groups.length - 1 || storyIdx < activeGroup.stories.length - 1) ? (
        <button
          onClick={handleNext}
          className="hidden md:flex absolute right-8 lg:right-16 text-white/50 hover:text-white bg-white/5 hover:bg-white/15 p-4 rounded-full transition-all duration-200 hover:scale-105 z-50 cursor-pointer"
        >
          <ChevronRight size={28} />
        </button>
      ) : null}
    </div>
  );
}
