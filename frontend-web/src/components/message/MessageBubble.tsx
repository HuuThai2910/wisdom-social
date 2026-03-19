import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    MoreVertical,
    Undo2,
    Copy,
    Pin,
    Star,
    ListChecks,
    Info,
    ChevronRight,
    Trash2,
    Paperclip,
    Play,
    Pause,
} from "lucide-react";
import type { Message } from "../../services/chatService";

/* ─── Custom Audio Player ─────────────────────────────────────────────────── */

function AudioPlayer({ src, isOwn }: { src: string; isOwn: boolean }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Fake waveform bars — seeded by URL so they're consistent per message
    const bars = useMemo(() => {
        let s = src.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 17);
        return Array.from({ length: 30 }, () => {
            s = (Math.imul(s, 1664525) + 1013904223) | 0;
            return 15 + (Math.abs(s) % 70); // 15–85 %
        });
    }, [src]);

    const togglePlay = useCallback(() => {
        const a = audioRef.current;
        if (!a) return;
        if (playing) a.pause();
        else void a.play();
    }, [playing]);

    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const a = audioRef.current;
        if (!a || !a.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
    }, []);

    const progress = duration > 0 ? currentTime / duration : 0;

    const fmt = (s: number) => {
        const m = Math.floor(s / 60);
        return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    };

    return (
        <div className="flex items-center gap-2.5 px-3 py-2.5 w-full min-w-[220px]">
            <audio
                ref={audioRef}
                src={src}
                preload="metadata"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => {
                    setPlaying(false);
                    setCurrentTime(0);
                }}
                onTimeUpdate={() =>
                    setCurrentTime(audioRef.current?.currentTime ?? 0)
                }
                onLoadedMetadata={() =>
                    setDuration(audioRef.current?.duration ?? 0)
                }
            />

            {/* Play / Pause button */}
            <button
                type="button"
                onClick={togglePlay}
                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    isOwn
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-gray-900 hover:bg-gray-700 text-white dark:bg-gray-100 dark:hover:bg-white dark:text-gray-900"
                }`}
            >
                {playing ? (
                    <Pause size={16} fill="currentColor" />
                ) : (
                    <Play size={16} fill="currentColor" />
                )}
            </button>

            {/* Waveform bars */}
            <div
                className="flex-1 flex items-center gap-[2px] h-8 cursor-pointer"
                onClick={handleSeek}
            >
                {bars.map((h, i) => {
                    const played = i / bars.length <= progress;
                    return (
                        <div
                            key={i}
                            className={`rounded-full flex-1 transition-colors ${
                                played
                                    ? isOwn
                                        ? "bg-white"
                                        : "bg-gray-900 dark:bg-gray-100"
                                    : isOwn
                                      ? "bg-white/35"
                                      : "bg-gray-300 dark:bg-gray-500"
                            }`}
                            style={{ height: `${h}%` }}
                        />
                    );
                })}
            </div>

            {/* Time */}
            <span
                className={`text-xs shrink-0 font-mono tabular-nums ${
                    isOwn
                        ? "text-blue-100"
                        : "text-gray-700 dark:text-gray-300"
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
    conversationType?: "DIRECT" | "GROUP";
    defaultAvatarSmallUrl: string;
    onRecall: (messageId: string) => void;
    onMediaLoad?: () => void;
    isFirstInGroup?: boolean;
    isLastInGroup?: boolean;
}

export function MessageBubble({
    message,
    isOwn,
    conversationType,
    defaultAvatarSmallUrl,
    onRecall,
    onMediaLoad,
    isFirstInGroup = true,
    isLastInGroup = true,
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

    const menuItemBase =
        "flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors";

    const timeStr = new Date(message.createdAt).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
    });

    // Tooltip giờ có ngữ cảnh: hôm nay → giờ, hôm qua → "Hôm qua HH:MM", cũ → "D Tháng M, YYYY HH:MM"
    const tooltipTimeStr = (() => {
        const date = new Date(message.createdAt);
        if (!Number.isFinite(date.getTime())) return timeStr;
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

    const fileNameFromUrl =
        message.content?.split("/").pop()?.split("?")[0] ?? "Tệp đính kèm";

    const timeColorInside = message.isRecalled
        ? "text-gray-400 dark:text-gray-500"
        : isOwn
          ? "text-blue-100"
          : "text-gray-500 dark:text-gray-400";

    return (
        <div
            className={`flex items-end gap-1 ${isOwn ? "justify-end" : "justify-start"} group`}
        >
            {/* Avatar (tin nhắn của người khác) */}
            {!isOwn && (
                <img
                    src={message.senderAvatar || defaultAvatarSmallUrl}
                    alt={message.senderName}
                    className="w-8 h-8 rounded-full mr-1 object-cover shrink-0 self-end"
                />
            )}

            {/* Nút "..." — hiện khi hover */}
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
                                onClick={() => setMenuOpen(false)}
                                className={menuItemBase}
                            >
                                <Pin
                                    size={16}
                                    className="text-gray-500 dark:text-gray-400 shrink-0"
                                />
                                <span className="text-gray-800 dark:text-gray-100">
                                    Ghim tin nhắn
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

                            {isOwn && (
                                <>
                                    <div className="my-1.5 border-t border-gray-100 dark:border-gray-700" />
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
                                    <button
                                        onClick={() => setMenuOpen(false)}
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
            )}

            {/* Cột: tên trên + bubble + giờ dưới */}
            <div
                className={`relative flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}
            >
                {/* Tên người gửi — TRÊN bubble, chỉ hiện ở tin đầu group */}
                {!isOwn &&
                    conversationType === "GROUP" &&
                    !message.isRecalled &&
                    isFirstInGroup && (
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 px-1">
                            {message.senderName}
                        </p>
                    )}

                {/* Bubble */}
                <div
                    className={`overflow-hidden rounded-2xl ${
                        message.isRecalled
                            ? "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
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
                                <p className={`px-3 pb-1.5 text-xs text-right ${timeColorInside}`}>
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
                        <AudioPlayer src={message.content} isOwn={isOwn} />
                    ) : message.type === "FILE" ? (
                        <div className="px-4 py-2">
                            <a
                                href={message.content}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm underline"
                            >
                                <Paperclip size={14} className="shrink-0" />
                                <span className="truncate max-w-[180px]">
                                    {fileNameFromUrl}
                                </span>
                            </a>
                        </div>
                    ) : (
                        <p className="px-4 py-2 text-sm">{message.content}</p>
                    )}
                </div>

                {/* Giờ — DƯỚI bubble, ngoài khung, chỉ tin cuối group */}
                {!message.isRecalled && isLastInGroup && (
                    <p
                        className={`text-xs mt-0.5 px-1 text-gray-400 dark:text-gray-500 ${isOwn ? "self-end" : "self-start"}`}
                    >
                        {timeStr}
                    </p>
                )}

                {/* Tooltip giờ bên cạnh — hiện khi hover, chỉ tin KHÔNG phải cuối group */}
                {!isLastInGroup && (
                    <div
                        className={`absolute top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-10 ${
                            isOwn ? "right-full mr-2" : "left-full ml-2"
                        }`}
                    >
                        <span className="text-xs bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300 px-2 py-1 rounded-md shadow-sm border border-gray-100 dark:border-gray-700">
                            {tooltipTimeStr}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
