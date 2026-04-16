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

function formatBytes(bytes?: number): string {
    if (!bytes || bytes <= 0) return "";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${mb.toFixed(1)} MB`;
}

function getFileBadgeLabel(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "pdf") return "PDF";
    if (ext === "doc" || ext === "docx") return "DOC";
    if (ext === "xls" || ext === "xlsx") return "XLS";
    if (ext === "zip" || ext === "rar" || ext === "7z") return "ZIP";
    return "FILE";
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
    const messageAttachments = Array.isArray(message.attachments)
        ? message.attachments
        : [];
    const imageUrls =
        message.type === "IMAGE"
            ? messageAttachments
                  .map((attachment) => attachment.url)
                  .filter((url): url is string => Boolean(url))
            : [];
    const fileAttachment =
        message.type === "FILE" ? messageAttachments[0] : undefined;
    const resolvedFileName =
        fileAttachment?.fileName ||
        getFileNameFromUrl(fileAttachment?.url, fileNameFromUrl);
    const resolvedFileUrl = fileAttachment?.url || message.content;
    const resolvedFileSize = formatBytes(fileAttachment?.fileSize);

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

    // Metadata cho tin nhắn bên người gửi:
    // - Bubble luôn hiển thị phía trên
    // - Dòng avatar + tên + thời gian nằm dưới bubble để dễ đọc hơn
    const showIncomingMetaRow = !isOwn && !message.isRecalled && isLastInGroup;
    const incomingMetaSpacingClass = isFirstInGroup ? "mt-1.5" : "mt-1";
    const incomingNameWeightClass =
        conversationType === "GROUP" ? "font-semibold" : "font-medium";

    const normalizedReplyContent = (replyPreview?.content ?? "").trim();
    const isReplyPreviewRecalled =
        Boolean(replyPreview) &&
        (normalizedReplyContent.length === 0 ||
            normalizedReplyContent === "Tin nhắn đã được thu hồi");

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
                    {message.type === "SYSTEM_PIN" &&
                        message.replyInfo?.messageId && (
                            <button
                                type="button"
                                onClick={() =>
                                    onJumpToMessage?.(
                                        message.replyInfo!.messageId,
                                    )
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
            {/* Nút "..." — hiện khi hover, căn giữa theo bubble */}
            <div
                ref={menuRef}
                className={`relative z-60 opacity-0 group-hover:opacity-100 transition-opacity self-center ${isOwn ? "order-first" : "order-last"}`}
            >
                <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 mb-4"
                    title="Tùy chọn"
                >
                    <MoreVertical size={16} />
                </button>

                {menuOpen && (
                    <div
                        className={`absolute bottom-full mb-1 ${isOwn ? "right-0" : "left-0"} bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1.5 z-70 w-56`}
                    >
                        {message.isRecalled ? (
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
                        ) : (
                            <>
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
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Cột: bubble + metadata dưới (với tin người gửi) */}
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
                            <p className="text-[10px] font-normal text-gray-400 dark:text-gray-500 px-1 mb-1">
                                {getReplyLabel()}
                            </p>
                        )}

                        <div
                            className={`relative flex flex-col ${
                                isOwn ? "items-end" : "items-start"
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
                                    className="inline-flex items-center gap-2 px-2 py-2 pb-4 rounded-2xl bg-gray-100/75 dark:bg-gray-800/65 text-gray-800 dark:text-gray-100 ring-1 ring-gray-200/40 dark:ring-gray-700/40"
                                >
                                    {/* Thumbnail hoặc icon cho reply message */}
                                    {!isReplyPreviewRecalled &&
                                    replyPreview.type === "IMAGE" ? (
                                        // Thumbnail ảnh - kích thước lớn hơn (48x48)
                                        <img
                                            src={replyPreview.content}
                                            alt="Reply ảnh"
                                            className="w-12 h-12 rounded-sm object-cover shrink-0"
                                        />
                                    ) : !isReplyPreviewRecalled &&
                                      replyPreview.type === "VIDEO" ? (
                                        // Video background với play icon
                                        <div className="w-12 h-12 rounded-sm bg-gray-500 dark:bg-gray-600 flex items-center justify-center shrink-0 relative">
                                            <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center">
                                                <Play
                                                    size={16}
                                                    className="text-white fill-white ml-0.5"
                                                />
                                            </div>
                                        </div>
                                    ) : !isReplyPreviewRecalled &&
                                      replyPreview.type === "AUDIO" ? (
                                        // Icon audio
                                        <div className="w-12 h-12 rounded-sm bg-gray-400/40 flex items-center justify-center shrink-0">
                                            <Mic
                                                size={20}
                                                className="text-gray-700 dark:text-gray-200"
                                            />
                                        </div>
                                    ) : !isReplyPreviewRecalled &&
                                      replyPreview.type ===
                                          "FILE" ? null : !isReplyPreviewRecalled &&
                                      replyPreview.type === // FILE dùng label inline giống UX mẫu, không cần thumbnail lớn
                                          "CALL" ? (
                                        // Icon call
                                        <div className="w-12 h-12 rounded-sm bg-gray-400/40 flex items-center justify-center shrink-0">
                                            <Phone
                                                size={20}
                                                className="text-gray-700 dark:text-gray-200"
                                            />
                                        </div>
                                    ) : null}

                                    {/* Chỉ hiển thị content của tin nhắn được reply */}
                                    <div className="min-w-0 flex-1">
                                        {isReplyPreviewRecalled ? (
                                            <p className="text-xs truncate text-gray-600 dark:text-gray-300">
                                                Tin nhắn đã được thu hồi
                                            </p>
                                        ) : replyPreview.type === "FILE" ? (
                                            <span className="inline-flex items-center gap-1 text-sm italic text-gray-600 dark:text-gray-300">
                                                File đính kèm
                                                <Paperclip size={12} />
                                            </span>
                                        ) : (
                                            <p className="text-xs truncate text-gray-600 dark:text-gray-300">
                                                {replyPreview.type === "IMAGE"
                                                    ? "Hình ảnh"
                                                    : replyPreview.type ===
                                                        "VIDEO"
                                                      ? "Video"
                                                      : replyPreview.type ===
                                                          "AUDIO"
                                                        ? "Tin nhắn thoại"
                                                        : replyPreview.type ===
                                                            "CALL"
                                                          ? "Cuộc gọi"
                                                          : replyPreview.content}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            )}

                            <div
                                className={`w-fit max-w-full overflow-hidden rounded-2xl ${
                                    replyPreview && !message.isRecalled
                                        ? "relative z-10 -mt-3"
                                        : ""
                                } ${
                                    message.isRecalled
                                        ? "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                                        : message.type === "IMAGE"
                                          ? "bg-transparent text-black dark:text-white"
                                          : message.type === "FILE"
                                            ? "bg-transparent text-black dark:text-white"
                                            : isOwn
                                              ? "bg-blue-500 text-white"
                                              : "bg-gray-200 dark:bg-gray-700 text-black dark:text-white"
                                }`}
                            >
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
                                    imageUrls.length > 0 ? (
                                        <div
                                            className={`grid gap-1 w-64 sm:w-72 md:w-76 ${
                                                imageUrls.length === 1
                                                    ? "grid-cols-1"
                                                    : imageUrls.length === 2
                                                      ? "grid-cols-2"
                                                      : "grid-cols-3"
                                            }`}
                                        >
                                            {imageUrls
                                                .slice(0, 6)
                                                .map((url, index, limited) => {
                                                    const remain =
                                                        imageUrls.length -
                                                        limited.length;
                                                    return (
                                                        <button
                                                            key={`${url}-${index}`}
                                                            type="button"
                                                            className={`relative overflow-hidden cursor-zoom-in ${
                                                                imageUrls.length ===
                                                                1
                                                                    ? "h-72 md:h-80 rounded-2xl"
                                                                    : "aspect-square rounded-xl"
                                                            }`}
                                                            onClick={() =>
                                                                window.open(
                                                                    url,
                                                                    "_blank",
                                                                )
                                                            }
                                                        >
                                                            <img
                                                                src={url}
                                                                alt="Hình ảnh"
                                                                className="h-full w-full object-cover"
                                                                onLoad={
                                                                    onMediaLoad
                                                                }
                                                            />
                                                            {remain > 0 &&
                                                                index ===
                                                                    limited.length -
                                                                        1 && (
                                                                    <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white text-lg font-semibold">
                                                                        +
                                                                        {remain}
                                                                    </span>
                                                                )}
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="block w-64 sm:w-72 md:w-76 h-72 md:h-80 cursor-zoom-in"
                                            onClick={() =>
                                                window.open(
                                                    message.content,
                                                    "_blank",
                                                )
                                            }
                                        >
                                            <img
                                                src={message.content}
                                                alt="Hình ảnh"
                                                className="h-full w-full object-cover"
                                                onLoad={onMediaLoad}
                                            />
                                        </button>
                                    )
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
                                    <a
                                        href={resolvedFileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mx-2 my-2 flex items-center gap-3 rounded-2xl border-gray-400 shadow-sm dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-3 py-3"
                                    >
                                        <span className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-semibold">
                                            {getFileBadgeLabel(
                                                resolvedFileName,
                                            )}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm text-gray-900 dark:text-gray-100">
                                                {resolvedFileName}
                                            </span>
                                            {resolvedFileSize && (
                                                <span className="block text-xs text-gray-500 dark:text-gray-400">
                                                    {resolvedFileSize}
                                                </span>
                                            )}
                                        </span>
                                    </a>
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
                                                <span className="block mt-0.5 text-xs text-gray-900 dark:text-gray-100">
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
                        </div>
                    </>
                )}

                {/* Pin indicator - hiển thị khi tin nhắn đã được ghim */}
                {isPinned && (
                    <div className="flex items-center gap-1 mt-1 px-1">
                        <Pin size={12} className="text-blue-500 shrink-0 text-red-500" />
                        <span className="text-xs text-blue-500 font-medium text-red-500">
                            Đã ghim
                        </span>
                    </div>
                )}

                {/* Metadata dưới bubble cho tin người gửi */}
                {showIncomingMetaRow && (
                    <div
                        className={`flex items-center gap-2 px-1 ${incomingMetaSpacingClass}`}
                    >
                        <img
                            src={senderAvatar || defaultAvatarSmallUrl}
                            alt={senderName}
                            className="h-5 w-5 rounded-full object-cover ring-1 ring-gray-200/80 dark:ring-gray-700/80"
                        />
                        <span
                            className={`max-w-36 truncate text-xs ${incomingNameWeightClass} text-gray-600 dark:text-gray-300`}
                        >
                            {senderName}
                        </span>
                        {timeStr && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                {timeStr}
                            </span>
                        )}
                    </div>
                )}

                {/* Giờ dưới bubble cho tin nhắn của mình */}
                {!message.isRecalled && isLastInGroup && isOwn && (
                    <p
                        className={`text-xs mt-0.5 px-1 text-gray-400  dark:text-gray-500 ${isOwn ? "self-end" : "self-start"}`}
                    >
                        {timeStr}
                    </p>
                )}

                {/* Tooltip giờ bên cạnh — hiện khi hover, chỉ tin KHÔNG phải cuối group */}
                {!isLastInGroup && (
                    <div
                        className={`absolute top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-20 ${
                            isOwn ? "right-full mr-10" : "left-full ml-10"
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
