import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    MoreVertical,
    Undo2,
    Copy,
    Pin,
    Reply,
    Star,
    ListChecks,
    Info,
    ChevronRight,
    Trash2,
    Paperclip,
    Play,
    Pause,
    Phone,
    PhoneOff,
    Video,
    VideoOff,
    Mic,
} from "lucide-react";
import type { Message, MessageType } from "../../services/chatService";

/**
 * Kiểm tra xem một chuỗi có chỉ chứa emoji (không có text khác) hay không
 * Regex bao gồm các dải Unicode của emoji phổ biến
 */
function isEmojiOnly(text: string): boolean {
    if (!text) return false;
    // Regex khớp các ký tự emoji và whitespace
    const emojiRegex =
        /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f\s]+$/u;
    // Kiểm tra có ít nhất 1 emoji và không có ký tự text thường
    const hasEmoji = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(
        text,
    );
    return hasEmoji && emojiRegex.test(text.trim());
}

/**
 * Tách tên file từ URL để hiển thị gọn trong các preview system message.
 */
function getFileNameFromUrl(
    url: string | undefined,
    fallback = "tệp đính kèm",
) {
    if (!url) return fallback;
    return url.split("/").pop()?.split("?")[0] ?? fallback;
}

/* ─── Custom Audio Player (UI phát audio tin nhắn thoại) ─────────────────── */

/**
 * AudioPlayer - Component tùy chỉnh để phát audio tin nhắn thoại
 *
 * Giao diện bao gồm:
 * - Nút Play/Pause tròn
 * - Waveform bars (fake, seeded theo URL để nhất quán)
 * - Thời gian hiện tại / tổng thời lượng
 *
 * Tính năng:
 * - Click waveform để seek (tua)
 * - Tự động reset về 0 khi audio kết thúc
 * - Màu sắc thay đổi theo isOwn (tin của mình vs tin người khác)
 */
function AudioPlayer({ src, isOwn }: { src: string; isOwn: boolean }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Tạo waveform bars giả - seeded theo URL để mỗi tin nhắn có cùng 1 waveform
    // (không decode thật audio vì tốn CPU, fake này đủ dùng cho UI)
    const bars = useMemo(() => {
        // Hash URL thành số seed
        let s = src
            .split("")
            .reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 17);
        // Tạo 30 cột với chiều cao random 15-85%
        return Array.from({ length: 30 }, () => {
            s = (Math.imul(s, 1664525) + 1013904223) | 0; // LCG random
            return 15 + (Math.abs(s) % 70); // 15–85 %
        });
    }, [src]);

    // Toggle play/pause
    const togglePlay = useCallback(() => {
        const a = audioRef.current;
        if (!a) return;
        if (playing) a.pause();
        else void a.play();
    }, [playing]);

    // Xử lý seek - click vào waveform để tua đến vị trí đó
    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const a = audioRef.current;
        if (!a || !a.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        // Tính % vị trí click → tua audio đến % đó
        a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
    }, []);

    // Phần trăm đã phát (để tô màu waveform bars)
    const progress = duration > 0 ? currentTime / duration : 0;

    // Format thời gian: "M:SS"
    const fmt = (s: number) => {
        const m = Math.floor(s / 60);
        return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    };

    return (
        <div className="flex items-center gap-2.5 px-3 py-2.5 w-full min-w-55">
            {/* Audio element ẩn - điều khiển qua ref */}
            <audio
                ref={audioRef}
                src={src}
                preload="metadata"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => {
                    setPlaying(false);
                    setCurrentTime(0); // Reset về đầu khi kết thúc
                }}
                onTimeUpdate={() =>
                    setCurrentTime(audioRef.current?.currentTime ?? 0)
                }
                onLoadedMetadata={() =>
                    setDuration(audioRef.current?.duration ?? 0)
                }
            />

            {/* Nút Play / Pause tròn */}
            <button
                type="button"
                onClick={togglePlay}
                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    isOwn
                        ? "bg-white/20 hover:bg-white/30 text-white" // Tin của mình: trắng mờ trên nền xanh
                        : "bg-gray-900 hover:bg-gray-700 text-white dark:bg-gray-100 dark:hover:bg-white dark:text-gray-900" // Tin người khác: đen (light) / trắng (dark)
                }`}
            >
                {playing ? (
                    <Pause size={16} fill="currentColor" />
                ) : (
                    <Play size={16} fill="currentColor" />
                )}
            </button>

            {/* Waveform bars - click để seek */}
            <div
                className="flex-1 flex items-center gap-0.5 h-8 cursor-pointer"
                onClick={handleSeek}
            >
                {bars.map((h, i) => {
                    // Cột này đã phát chưa (dựa vào progress)
                    const played = i / bars.length <= progress;
                    return (
                        <div
                            key={i}
                            className={`rounded-full flex-1 transition-colors ${
                                played
                                    ? isOwn
                                        ? "bg-white" // Đã phát - tin của mình: trắng
                                        : "bg-gray-900 dark:bg-gray-100" // Đã phát - tin người khác: đen/trắng
                                    : isOwn
                                      ? "bg-white/35" // Chưa phát - tin của mình: trắng mờ
                                      : "bg-gray-300 dark:bg-gray-500" // Chưa phát - tin người khác: xám
                            }`}
                            style={{ height: `${h}%` }}
                        />
                    );
                })}
            </div>

            {/* Hiển thị thời gian: currentTime nếu đang phát, duration nếu chưa phát */}
            <span
                className={`text-xs shrink-0 font-mono tabular-nums ${
                    isOwn ? "text-blue-100" : "text-gray-700 dark:text-gray-300"
                }`}
            >
                {currentTime > 0 ? fmt(currentTime) : fmt(duration)}
            </span>
        </div>
    );
}

/* ─── MessageBubble ────────────────────────────────────────────────────────── */

export interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    senderName: string;
    senderAvatar?: string;
    replyPreview?: {
        messageId: string;
        senderId?: number;
        senderName: string;
        content: string;
        type?: MessageType;
    } | null;
    conversationType?: "DIRECT" | "GROUP";
    defaultAvatarSmallUrl: string;
    isPinned?: boolean;
    onPin: (messageId: string) => void;
    onUnpin: (messageId: string) => void;
    onReply: (message: Message) => void;
    onJumpToMessage?: (messageId: string) => void;
    onRecall: (messageId: string) => void;
    onRecallCall?: (callType: "audio" | "video") => void;
    onDeleteForMe: (messageId: string) => void;
    onMediaLoad?: () => void;
    isFirstInGroup?: boolean;
    isLastInGroup?: boolean;
    currentUserId: number;
}

export function MessageBubble({
    message,
    isOwn,
    senderName,
    senderAvatar,
    replyPreview,
    conversationType,
    defaultAvatarSmallUrl,
    isPinned = false,
    onPin,
    onUnpin,
    onReply,
    onJumpToMessage,
    onRecall,
    onRecallCall,
    onDeleteForMe,
    onMediaLoad,
    isFirstInGroup = true,
    isLastInGroup = true,
    currentUserId,
}: MessageBubbleProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        function handleOutside(e: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [menuOpen]);

    const handleCopy = useCallback(() => {
        if (message.content) navigator.clipboard.writeText(message.content);
        setMenuOpen(false);
    }, [message.content]);

    const handleRecallClick = useCallback(() => {
        onRecall(message.id);
        setMenuOpen(false);
    }, [message.id, onRecall]);

    const handlePinClick = useCallback(() => {
        if (isPinned) {
            onUnpin(message.id);
        } else {
            onPin(message.id);
        }
        setMenuOpen(false);
    }, [message.id, onPin, onUnpin, isPinned]);

    const handleReplyClick = useCallback(() => {
        onReply(message);
        setMenuOpen(false);
    }, [message, onReply]);

    const handleDeleteForMeClick = useCallback(() => {
        onDeleteForMe(message.id);
        setMenuOpen(false);
    }, [message.id, onDeleteForMe]);

    // Tính toán text hiển thị phần reply theo logic Facebook Messenger
    const getReplyLabel = useCallback(() => {
        if (!replyPreview) return "";
        const repliedMessageSenderId = replyPreview.senderId;
        const currentMessageSenderId = message.senderId;
        if (currentMessageSenderId === repliedMessageSenderId) {
            if (currentUserId === currentMessageSenderId) {
                return "Bạn đã trả lời chính mình";
            } else {
                return `${senderName} đã trả lời chính mình`;
            }
        } else {
            if (currentUserId === currentMessageSenderId) {
                return `Bạn đã trả lời tin nhắn của ${replyPreview.senderName}`;
            } else if (currentUserId === repliedMessageSenderId) {
                return `${senderName} đã trả lời tin nhắn của bạn`;
            } else {
                return `${senderName} đã trả lời tin nhắn của ${replyPreview.senderName}`;
            }
        }
    }, [replyPreview, message.senderId, currentUserId, senderName]);

    const menuItemBase =
        "flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors";
    // Tính toán text hiển thị phần reply theo logic Facebook Messenger
    // Nhận diện các tin nhắn hệ thống liên quan đến ghim/bỏ ghim.
    // Các tin này sẽ render ở giữa đoạn chat (không lệch trái/phải như bubble thường).
    const isPinSystemMessage =
        message.type === "SYSTEM_PIN" || message.type === "SYSTEM_UPIN";

    const messageDate = new Date(message.createdAt);
    const validMessageDate = Number.isFinite(messageDate.getTime());
    const timeStr = validMessageDate
        ? messageDate.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
          })
        : "";

    // Tooltip giờ có ngữ cảnh: hôm nay → giờ, hôm qua → "Hôm qua HH:MM", cũ → "D Tháng M, YYYY HH:MM"
    const tooltipTimeStr = (() => {
        const date = new Date(message.createdAt);
        if (!Number.isFinite(date.getTime())) return "";
        const now = new Date();
        const diffDays = Math.round(
            (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
                Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) /
                86400000,
        );
        if (diffDays === 0) return timeStr;
        if (diffDays === 1) return `Hôm qua ${timeStr}`;
        const d = date.getDate();
        const m = date.getMonth() + 1;
        const y = date.getFullYear();
        return y === now.getFullYear()
            ? `${d} Tháng ${m}, ${timeStr}`
            : `${d} Tháng ${m}, ${y} ${timeStr}`;
    })();

    const fileNameFromUrl = getFileNameFromUrl(message.content, "Tệp đính kèm");

    // Chuẩn hoá nội dung preview cho tin hệ thống ghim,
    // giúp hiện kiểu: "Bạn ghim 1 tin nhắn file meals.zip" giống mẫu UI mong muốn.
    const pinnedTargetPreview = useMemo(() => {
        if (!message.replyInfo) return "1 tin nhắn";

        if (message.replyInfo.type === "IMAGE") {
            return "1 tin nhắn ảnh";
        }
        if (message.replyInfo.type === "VIDEO") {
            return "1 tin nhắn video";
        }
        if (message.replyInfo.type === "AUDIO") {
            return "1 tin nhắn thoại";
        }
        if (message.replyInfo.type === "FILE") {
            return `file ${getFileNameFromUrl(message.replyInfo.content)}`;
        }

        const raw = (message.replyInfo.content || "").trim();
        if (!raw) return "1 tin nhắn";
        return `"${raw}"`;
    }, [message.replyInfo]);

    const callMeta = useMemo(() => {
        if (message.type !== "CALL") return null;

        const formatDuration = (seconds: number) => {
            const total = Math.max(0, seconds);
            if (total < 60) return `${total} giây`;
            const minutes = Math.floor(total / 60);
            const remain = total % 60;
            if (!remain) return `${minutes} phút`;
            return `${minutes} phút ${remain} giây`;
        };

        try {
            const parsed = JSON.parse(message.content) as {
                callType?: "audio" | "video";
                status?:
                    | "calling"
                    | "ringing"
                    | "accepted"
                    | "rejected"
                    | "ended";
                durationSeconds?: number;
            };

            const callType: "audio" | "video" =
                parsed.callType === "video" ? "video" : "audio";
            const duration = Math.max(0, Number(parsed.durationSeconds ?? 0));
            const status = parsed.status;
            const isMissed =
                duration === 0 &&
                (status === "rejected" ||
                    status === "ringing" ||
                    status === "calling" ||
                    status === "ended");

            const baseLabel =
                callType === "video" ? "cuộc gọi video" : "cuộc gọi thoại";

            return {
                callType,
                isMissed,
                title: isMissed
                    ? `Đã bỏ lỡ ${baseLabel}`
                    : callType === "video"
                      ? "Cuộc gọi video"
                      : "Cuộc gọi thoại",
                subtitle: isMissed ? timeStr : formatDuration(duration),
            };
        } catch {
            const inferredType: "audio" | "video" = message.content
                .toLowerCase()
                .includes("video")
                ? "video"
                : "audio";
            return {
                callType: inferredType,
                isMissed: false,
                title:
                    inferredType === "video"
                        ? "Cuộc gọi video"
                        : "Cuộc gọi thoại",
                subtitle: timeStr,
            };
        }
    }, [message.content, message.type, timeStr]);

    const timeColorInside = message.isRecalled
        ? "text-gray-400 dark:text-gray-500"
        : isOwn
          ? "text-blue-100"
          : "text-gray-500 dark:text-gray-400";

    // Quy tắc hiển thị tên người gửi trong group:
    // - Chỉ hiện cho tin nhắn của người khác
    // - Chỉ hiện ở tin đầu của group
    // - Hiển thị bên TRÁI bubble (không nằm phía trên như trước)
    const showSenderLabelAtLeft =
        !isOwn &&
        conversationType === "GROUP" &&
        !message.isRecalled &&
        isFirstInGroup;

    // Render riêng cho tin hệ thống ghim/bỏ ghim:
    // - Canh giữa toàn bộ đoạn chat
    // - Có icon ghim
    // - Có nút "Xem" để nhảy đến tin gốc (nếu có replyInfo.messageId)
    if (isPinSystemMessage) {
        const actorLabel = isOwn ? "Bạn" : senderName;
        const actionLabel = message.type === "SYSTEM_UPIN" ? "bỏ ghim" : "ghim";

        return (
            <div className="w-full flex justify-center">
                <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200">
                    <Pin size={12} className="shrink-0" />
                    <span className="truncate">
                        {actorLabel} {actionLabel} {pinnedTargetPreview}
                    </span>
                    {message.replyInfo?.messageId && (
                        <button
                            type="button"
                            onClick={() =>
                                onJumpToMessage?.(message.replyInfo!.messageId)
                            }
                            className="shrink-0 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
                        >
                            Xem
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`flex items-end gap-1 overflow-visible ${isOwn ? "justify-end" : "justify-start"} group`}
        >
            {/* Avatar (tin nhắn của người khác) */}
            {!isOwn && (
                <img
                    src={senderAvatar || defaultAvatarSmallUrl}
                    alt={senderName}
                    className="w-8 h-8 rounded-full mr-1 object-cover shrink-0 self-end"
                />
            )}

            {/*
                            Tên người gửi đặt ở bên trái bubble theo yêu cầu UI mới.
                            Label này đứng cùng hàng với bubble, không render ở phía trên.
                        */}
            {showSenderLabelAtLeft && (
                <span className="max-w-28 truncate self-end mb-1 mr-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {senderName}
                </span>
            )}

            {/* Nút "..." — hiện khi hover, căn giữa theo bubble */}
            {!message.isRecalled && (
                <div
                    ref={menuRef}
                    className={`relative opacity-0 group-hover:opacity-100 transition-opacity self-center ${isOwn ? "order-first" : "order-last"}`}
                >
                    <button
                        onClick={() => setMenuOpen((v) => !v)}
                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                        title="Tùy chọn"
                    >
                        <MoreVertical size={16} />
                    </button>

                    {menuOpen && (
                        <div
                            className={`absolute bottom-full mb-1 ${isOwn ? "right-0" : "left-0"} bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl py-1.5 z-30 w-56`}
                        >
                            <button
                                onClick={handleCopy}
                                className={menuItemBase}
                            >
                                <Copy
                                    size={16}
                                    className="text-gray-500 dark:text-gray-400 shrink-0"
                                />
                                <span className="text-gray-800 dark:text-gray-100">
                                    Copy tin nhắn
                                </span>
                            </button>
                            <button
                                onClick={handlePinClick}
                                className={menuItemBase}
                            >
                                <Pin
                                    size={16}
                                    className="text-gray-500 dark:text-gray-400 shrink-0"
                                />
                                <span className="text-gray-800 dark:text-gray-100">
                                    {isPinned ? "Bỏ ghim" : "Ghim tin nhắn"}
                                </span>
                            </button>
                            <button
                                onClick={handleReplyClick}
                                className={menuItemBase}
                            >
                                <Reply
                                    size={16}
                                    className="text-gray-500 dark:text-gray-400 shrink-0"
                                />
                                <span className="text-gray-800 dark:text-gray-100">
                                    Trả lời
                                </span>
                            </button>
                            <button
                                onClick={() => setMenuOpen(false)}
                                className={menuItemBase}
                            >
                                <Star
                                    size={16}
                                    className="text-gray-500 dark:text-gray-400 shrink-0"
                                />
                                <span className="text-gray-800 dark:text-gray-100">
                                    Đánh dấu tin nhắn
                                </span>
                            </button>
                            <button
                                onClick={() => setMenuOpen(false)}
                                className={menuItemBase}
                            >
                                <ListChecks
                                    size={16}
                                    className="text-gray-500 dark:text-gray-400 shrink-0"
                                />
                                <span className="text-gray-800 dark:text-gray-100">
                                    Chọn nhiều tin nhắn
                                </span>
                            </button>
                            <button
                                onClick={() => setMenuOpen(false)}
                                className={menuItemBase}
                            >
                                <Info
                                    size={16}
                                    className="text-gray-500 dark:text-gray-400 shrink-0"
                                />
                                <span className="text-gray-800 dark:text-gray-100">
                                    Xem chi tiết
                                </span>
                            </button>
                            <button
                                onClick={() => setMenuOpen(false)}
                                className={`${menuItemBase} justify-between`}
                            >
                                <span className="flex items-center gap-3">
                                    <ChevronRight
                                        size={16}
                                        className="text-gray-500 dark:text-gray-400 shrink-0"
                                    />
                                    <span className="text-gray-800 dark:text-gray-100">
                                        Tuỳ chọn khác
                                    </span>
                                </span>
                                <ChevronRight
                                    size={14}
                                    className="text-gray-400"
                                />
                            </button>

                            {/* Separator + Danger zone */}
                            <div className="my-1.5 border-t border-gray-100 dark:border-gray-700" />

                            {/* Thu hồi - chỉ hiện cho tin nhắn của mình */}
                            {isOwn && (
                                <button
                                    onClick={handleRecallClick}
                                    className={menuItemBase}
                                >
                                    <Undo2
                                        size={16}
                                        className="text-red-500 shrink-0"
                                    />
                                    <span className="text-red-500">
                                        Thu hồi
                                    </span>
                                </button>
                            )}

                            {/* Xóa ở phía tôi - hiện cho TẤT CẢ tin nhắn */}
                            <button
                                onClick={handleDeleteForMeClick}
                                className={menuItemBase}
                            >
                                <Trash2
                                    size={16}
                                    className="text-red-500 shrink-0"
                                />
                                <span className="text-red-500">
                                    Xóa chỉ ở phía tôi
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Cột: tên trên + bubble + giờ dưới */}
            <div
                className={`relative flex flex-col max-w-[70%] overflow-visible ${isOwn ? "items-end" : "items-start"}`}
            >
                {/* Bubble hoặc Emoji-only */}
                {message.type === "TEXT" &&
                !message.isRecalled &&
                isEmojiOnly(message.content) ? (
                    // Emoji-only: không có background, text lớn
                    <p className="text-4xl leading-tight px-1">
                        {message.content}
                    </p>
                ) : (
                    // Bubble bình thường với background
                    <>
                        {/* Label 'Đã trả lời' ở ngoài bubble */}
                        {!!replyPreview && !message.isRecalled && (
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 px-1 mb-1">
                                {getReplyLabel()}
                            </p>
                        )}

                        <div
                            className={`overflow-hidden rounded-2xl ${
                                message.isRecalled
                                    ? "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                                    : isOwn
                                      ? "bg-blue-500 text-white"
                                      : "bg-gray-200 dark:bg-gray-700 text-black dark:text-white"
                            }`}
                        >
                            {!!replyPreview && !message.isRecalled && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onJumpToMessage?.(
                                            replyPreview.messageId,
                                        )
                                    }
                                    className={`w-full flex items-center gap-2 px-2 py-2 border-l-2 ${
                                        isOwn
                                            ? "border-blue-100 bg-blue-600/40"
                                            : "border-gray-300 dark:border-gray-600 bg-white/10 dark:bg-black/20"
                                    }`}
                                >
                                    {/* Thumbnail hoặc icon cho reply message */}
                                    {replyPreview.type === "IMAGE" ? (
                                        // Thumbnail ảnh - kích thước lớn hơn (48x48)
                                        <img
                                            src={replyPreview.content}
                                            alt="Reply ảnh"
                                            className="w-12 h-12 rounded object-cover shrink-0"
                                        />
                                    ) : replyPreview.type === "VIDEO" ? (
                                        // Video background với play icon
                                        <div className="w-12 h-12 rounded bg-gray-500 dark:bg-gray-600 flex items-center justify-center shrink-0 relative">
                                            <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center">
                                                <Play
                                                    size={16}
                                                    className="text-white fill-white ml-0.5"
                                                />
                                            </div>
                                        </div>
                                    ) : replyPreview.type === "AUDIO" ? (
                                        // Icon audio
                                        <div className="w-12 h-12 rounded bg-gray-400/40 flex items-center justify-center shrink-0">
                                            <Mic
                                                size={20}
                                                className="text-gray-700 dark:text-gray-200"
                                            />
                                        </div>
                                    ) : replyPreview.type === "FILE" ? (
                                        // Icon file
                                        <div className="w-12 h-12 rounded bg-gray-400/40 flex items-center justify-center shrink-0">
                                            <Paperclip
                                                size={20}
                                                className="text-gray-700 dark:text-gray-200"
                                            />
                                        </div>
                                    ) : replyPreview.type === "CALL" ? (
                                        // Icon call
                                        <div className="w-12 h-12 rounded bg-gray-400/40 flex items-center justify-center shrink-0">
                                            <Phone
                                                size={20}
                                                className="text-gray-700 dark:text-gray-200"
                                            />
                                        </div>
                                    ) : null}

                                    {/* Tên + content */}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold opacity-90">
                                            {getReplyLabel()}
                                        </p>
                                        <p className="text-xs truncate opacity-85">
                                            {replyPreview.type === "IMAGE"
                                                ? "Hình ảnh"
                                                : replyPreview.type === "VIDEO"
                                                  ? "Video"
                                                  : replyPreview.type ===
                                                      "AUDIO"
                                                    ? "Tin nhắn thoại"
                                                    : replyPreview.type ===
                                                        "FILE"
                                                      ? "Tệp đính kèm"
                                                      : replyPreview.type ===
                                                          "CALL"
                                                        ? "Cuộc gọi"
                                                        : replyPreview.content}
                                        </p>
                                    </div>
                                </button>
                            )}

                            {message.isRecalled ? (
                                <>
                                    <p className="px-4 py-2 text-sm italic text-gray-400 dark:text-gray-500">
                                        Tin nhắn đã được thu hồi
                                    </p>
                                    {isLastInGroup && (
                                        <p
                                            className={`px-3 pb-1.5 text-xs text-right ${timeColorInside}`}
                                        >
                                            {timeStr}
                                        </p>
                                    )}
                                </>
                            ) : message.type === "IMAGE" ? (
                                <img
                                    src={message.content}
                                    alt="Hình ảnh"
                                    className="max-w-full block cursor-pointer"
                                    onClick={() =>
                                        window.open(message.content, "_blank")
                                    }
                                    onLoad={onMediaLoad}
                                />
                            ) : message.type === "VIDEO" ? (
                                <video
                                    src={message.content}
                                    controls
                                    className="max-w-full block"
                                    onLoadedData={onMediaLoad}
                                />
                            ) : message.type === "AUDIO" ? (
                                <AudioPlayer
                                    src={message.content}
                                    isOwn={isOwn}
                                />
                            ) : message.type === "FILE" ? (
                                <div className="px-4 py-2">
                                    <a
                                        href={message.content}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm underline"
                                    >
                                        <Paperclip
                                            size={14}
                                            className="shrink-0"
                                        />
                                        <span className="truncate max-w-45">
                                            {fileNameFromUrl}
                                        </span>
                                    </a>
                                </div>
                            ) : message.type === "CALL" ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        callMeta &&
                                        onRecallCall?.(callMeta.callType)
                                    }
                                    className="w-full px-3 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                    title="Gọi lại"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-9 h-9 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center shrink-0">
                                            {callMeta?.isMissed ? (
                                                callMeta.callType ===
                                                "video" ? (
                                                    <VideoOff
                                                        size={18}
                                                        className="text-gray-900 dark:text-gray-100"
                                                    />
                                                ) : (
                                                    <PhoneOff
                                                        size={18}
                                                        className="text-gray-900 dark:text-gray-100"
                                                    />
                                                )
                                            ) : callMeta?.callType ===
                                              "video" ? (
                                                <Video
                                                    size={18}
                                                    className="text-gray-900 dark:text-gray-100"
                                                />
                                            ) : (
                                                <Phone
                                                    size={18}
                                                    className="text-gray-900 dark:text-gray-100"
                                                />
                                            )}
                                        </span>

                                        <span className="min-w-0">
                                            <span className="block text-sm leading-5 font-semibold text-gray-900 dark:text-gray-100 wrap-break-word">
                                                {callMeta?.title}
                                            </span>
                                            <span className="block mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                                {callMeta?.subtitle}
                                            </span>
                                        </span>
                                    </div>

                                    <span className="mt-2 block rounded-xl bg-gray-200 dark:bg-gray-700 py-1.5 text-center text-base font-semibold text-gray-900 dark:text-gray-100">
                                        Gọi lại
                                    </span>
                                </button>
                            ) : (
                                <p className="px-4 py-2 text-sm">
                                    {message.content}
                                </p>
                            )}
                        </div>
                    </>
                )}

                {/* Pin indicator - hiển thị khi tin nhắn đã được ghim */}
                {isPinned && (
                    <div className="flex items-center gap-1 mt-1 px-1">
                        <Pin size={12} className="text-blue-500 shrink-0" />
                        <span className="text-xs text-blue-500 font-medium">
                            Đã ghim
                        </span>
                    </div>
                )}

                {/* Giờ — DƯỚI bubble, ngoài khung, chỉ tin cuối group */}
                {!message.isRecalled && isLastInGroup && (
                    <p
                        className={`text-xs mt-0.5 px-1 text-gray-400  dark:text-gray-500 ${isOwn ? "self-end" : "self-start"}`}
                    >
                        {timeStr}
                    </p>
                )}

                {/* Tooltip giờ bên cạnh — hiện khi hover, chỉ tin KHÔNG phải cuối group */}
                {!isLastInGroup && (
                    <div
                        className={`absolute top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50 ${
                            isOwn ? "right-full mr-2" : "left-full ml-2" 
                        }`}
                    >
                        <span className="text-xs bg-gray-800 dark:bg-gray-900 text-white px-2 py-1 rounded-md shadow-lg">
                            {tooltipTimeStr}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
