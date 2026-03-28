import {
    useCallback,
    useMemo,
    useRef,
    useState,
    useEffect,
    type ReactNode,
} from "react";
import {
    Send,
    Phone,
    Video,
    Info,
    ArrowDown,
    Plus,
    X,
    Mic,
    Square,
    Paperclip,
    StickyNote,
    Film,
    Smile,
} from "lucide-react";
import EmojiPicker, { Emoji, EmojiStyle, type EmojiClickData, Theme } from "emoji-picker-react";
import { useChatWindowController } from "../../hooks/useChatWindowController";
import { MessageBubble } from "./MessageBubble";
import { useCall } from "../../hooks/useCall";
import IncomingCallModal from "./IncomingCallModal";
import CallScreen from "./CallScreen";

interface ChatWindowProps {
    conversationId: number;
    userId: number;
    onMarkAsRead?: (conversationId: number) => void;
}

export default function ChatWindow({
    conversationId,
    userId,
    onMarkAsRead,
}: ChatWindowProps) {
    const {
        conversation,
        messages,
        loading,
        loadingMore,
        hasMore,
        sending,
        uploading,
        error,

        displayName,
        displayAvatar,

        messageText,
        setMessageText,

        messagesEndRef,
        messagesContainerRef,

        showScrollToBottomButton,
        pendingNewMessages,

        loadMoreMessages,
        handleScroll,
        handleScrollToBottomClick,
        handleSend,
        handleRecall,
        handleDeleteMessageForMe,
        handleFileUpload,
        appendRealtimeMessage,
        scrollToBottom,
        recallToast,

        isRecording,
        recordingDuration,
        startRecording,
        stopRecording,
        cancelRecording,

        defaultAvatarUrl,
        defaultAvatarSmallUrl,

        isNearBottom,
        isInitialLoad,
        shouldScrollOnMediaLoad,

        readReceipts,
        typingUsers,
        sendTypingSignal,
    } = useChatWindowController({ conversationId, userId, onMarkAsRead });

    const otherMember = useMemo(
        () => conversation?.members?.find((m) => m.userId !== userId),
        [conversation?.members, userId],
    );

    const targetMemberIds = useMemo(
        () =>
            (conversation?.members ?? [])
                .filter((m) => m.userId !== userId)
                .map((m) => m.userId),
        [conversation?.members, userId],
    );

    const {
        incomingCall,
        activeCall,
        localStream,
        remoteStream,
        remoteStreams,
        callDurationText,
        micEnabled,
        cameraEnabled,
        isScreenSharing,
        canToggleCamera,
        canShareScreen,
        startCall,
        acceptIncomingCall,
        rejectIncomingCall,
        endCall,
        toggleMic,
        toggleCamera,
        toggleScreenShare,
    } = useCall({
        conversationId,
        userId,
        targetUserIds: targetMemberIds,
        targetUserId: otherMember?.userId,
        targetName: otherMember?.nickname,
        targetAvatar: otherMember?.avatar,
        onCallMessageSaved: appendRealtimeMessage,
    });

    const callParticipants = useMemo(() => {
        if (!activeCall || conversation?.type !== "GROUP") return [];

        const callMemberIds = new Set<number>(activeCall.remoteUserIds);

        if (!activeCall.isCaller) {
            callMemberIds.add(userId);
        }

        return (conversation.members ?? [])
            .filter((member) => callMemberIds.has(member.userId))
            .map((member) => ({
                userId: member.userId,
                name: member.nickname || member.username,
                avatar: member.avatar,
            }));
    }, [activeCall, conversation?.members, conversation?.type, userId]);

    const [plusMenuOpen, setPlusMenuOpen] = useState(false);
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
    const plusMenuRef = useRef<HTMLDivElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!plusMenuOpen) return;
        function handleOutside(e: MouseEvent) {
            if (
                plusMenuRef.current &&
                !plusMenuRef.current.contains(e.target as Node)
            ) {
                setPlusMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [plusMenuOpen]);

    // Click outside để đóng emoji picker
    useEffect(() => {
        if (!emojiPickerOpen) return;
        function handleOutside(e: MouseEvent) {
            if (
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(e.target as Node)
            ) {
                setEmojiPickerOpen(false);
            }
        }
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [emojiPickerOpen]);

    // Handle emoji click
    const onEmojiClick = useCallback(
        (emojiData: EmojiClickData) => {
            setMessageText((prev) => prev + emojiData.emoji);
            messageInputRef.current?.focus();
        },
        [setMessageText],
    );

    // Refs cho hidden file inputs (Đính kèm file / Chọn GIF)
    const attachInputRef = useRef<HTMLInputElement>(null);
    const gifInputRef = useRef<HTMLInputElement>(null);
    const messageInputRef = useRef<HTMLInputElement>(null);

    const onFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) void handleFileUpload(file);
            e.target.value = ""; // reset để cho phép chọn lại cùng file
        },
        [handleFileUpload],
    );

    // Focus vào input khi component mount hoặc chuyển conversation
    useEffect(() => {
        // Timeout nhỏ để đảm bảo input đã render xong
        const timer = setTimeout(() => {
            messageInputRef.current?.focus();
        }, 100);

        return () => clearTimeout(timer);
    }, [conversationId]);

    // Focus vào input sau khi gửi tin nhắn thành công
    useEffect(() => {
        if (!sending && !uploading) {
            messageInputRef.current?.focus();
        }
    }, [sending, uploading]);

    const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${String(s).padStart(2, "0")}`;
    };

    // ====== Render messages theo nhóm ngày (Zalo-style) ======
    // Yêu cầu:
    // - Nhãn ngày nằm giữa luồng chat
    // - Xuất hiện trước tin nhắn đầu tiên của ngày đó
    // - Nội dung: Hôm nay / Hôm qua / dd/MM / dd/MM/yyyy (nếu khác năm)
    // - Mỗi ngày chỉ hiển thị 1 lần
    //
    // Ghi chú: logic này giả định `messages` được sắp theo thời gian tăng dần
    // (tin cũ -> tin mới) để nhãn ngày hiển thị đúng vị trí.
    const messageItems = useMemo(() => {
        const items: ReactNode[] = [];

        // Chuẩn hoá về "đầu ngày" (00:00) để so sánh hôm nay/hôm qua chính xác.
        const startOfDay = (d: Date) =>
            new Date(d.getFullYear(), d.getMonth(), d.getDate());

        // Format nhãn ngày theo quy tắc sản phẩm.
        const formatDateLabel = (date: Date) => {
            const now = new Date();
            const todayStart = startOfDay(now);
            const dateStart = startOfDay(date);

            const diffDays = Math.round(
                (todayStart.getTime() - dateStart.getTime()) /
                    (1000 * 60 * 60 * 24),
            );

            if (diffDays === 0) return "Hôm nay";
            if (diffDays === 1) return "Hôm qua";

            const dd = String(date.getDate()).padStart(2, "0");
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const yyyy = date.getFullYear();

            if (yyyy !== now.getFullYear()) return `${dd}/${mm}/${yyyy}`;
            return `${dd}/${mm}`;
        };

        // Khoá ngày ổn định để phát hiện "tin nhắn đầu tiên của ngày".
        const getDayKey = (date: Date) =>
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

        let previousDayKey: string | null = null;

        for (let idx = 0; idx < messages.length; idx++) {
            const message = messages[idx];
            const prevMsg = messages[idx - 1];
            const nextMsg = messages[idx + 1];
            const stableMessageKey =
                message.id ||
                `${message.senderId}-${message.createdAt || "unknown"}-${idx}`;

            const createdAt = new Date(message.createdAt);
            const validDate = Number.isFinite(createdAt.getTime());
            const dayKey = validDate ? getDayKey(createdAt) : "invalid-date";

            // Nhãn ngày: chỉ chèn khi "đổi ngày" so với message trước đó.
            if (dayKey !== previousDayKey) {
                items.push(
                    <div
                        key={`date-sep-${stableMessageKey}-${dayKey}`}
                        className="flex justify-center py-2 mt-4 first:mt-0"
                    >
                        <div className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-100 text-xs">
                            {validDate ? formatDateLabel(createdAt) : ""}
                        </div>
                    </div>,
                );
                previousDayKey = dayKey;
            }

            // Tính group: cùng người gửi & cùng ngày → gộp nhóm
            const prevDayKey = prevMsg
                ? getDayKey(new Date(prevMsg.createdAt))
                : null;
            const nextDayKey = nextMsg
                ? getDayKey(new Date(nextMsg.createdAt))
                : null;

            const isFirstInGroup =
                !prevMsg ||
                prevMsg.senderId !== message.senderId ||
                prevDayKey !== dayKey;

            const isLastInGroup =
                !nextMsg ||
                nextMsg.senderId !== message.senderId ||
                nextDayKey !== dayKey;

            // Tin nhắn: dùng MessageBubble để handle recalled state + hover menu.
            const isOwn = message.senderId === userId;

            // Tìm các read receipts có lastMessageId trùng với tin nhắn này
            // Chỉ hiển thị cho tin nhắn KHÔNG bị thu hồi và là tin của mình
            const receiptsForThisMessage = isOwn && !message.isRecalled
                ? readReceipts.filter((r) => r.lastMessageId === message.id)
                : [];

            // // Debug logging
            // if (idx === messages.length - 1) {
            //     console.log("🎯 Last message debug:", {
            //         messageId: message.id,
            //         isOwn,
            //         isRecalled: message.isRecalled,
            //         allReadReceipts: readReceipts,
            //         receiptsForThisMessage,
            //     });
            // }

            items.push(
                <div
                    key={stableMessageKey}
                    className={isFirstInGroup ? "mt-3" : "mt-2"}
                >
                    
                    <MessageBubble
                        message={message}
                        isOwn={isOwn}
                        conversationType={conversation?.type}
                        defaultAvatarSmallUrl={defaultAvatarSmallUrl}
                        onRecall={handleRecall}
                        onRecallCall={(callType) => void startCall(callType)}
                        onDeleteForMe={handleDeleteMessageForMe}
                        onMediaLoad={() => {
                            // Chỉ cuộn xuống cuối khi:
                            // 1. Đang trong giai đoạn initial load (F5/mở chat)
                            // 2. User đang ở gần cuối (đang xem tin mới)
                            // 3. Vừa nhận tin nhắn mới IMAGE/VIDEO (flag được set trong handleNewMessage)
                            // KHÔNG dùng isOwn vì sẽ gây scroll khi load tin cũ từ pagination
                            if (isInitialLoad() || isNearBottom() || shouldScrollOnMediaLoad()) {
                                scrollToBottom("smooth");
                            }
                        }}
                        isFirstInGroup={isFirstInGroup}
                        isLastInGroup={isLastInGroup}
                    />

                    {/* Read Receipt Avatars - hiển thị avatar "đã xem" bên dưới tin nhắn */}
                    {receiptsForThisMessage.length > 0 && (
                        <div className="flex justify-end mt-1 mr-1 gap-1">
                            {receiptsForThisMessage.map((receipt) => {
                                // Lấy thông tin member từ conversation
                                const member = conversation?.members?.find(
                                    (m) => m.userId === receipt.userId,
                                );
                                return (
                                    <img
                                        key={receipt.userId}
                                        src={member?.avatar || defaultAvatarSmallUrl}
                                        alt={member?.nickname || "User"}
                                        title={`Đã xem bởi ${member?.nickname || "User"}`}
                                        className="w-4 h-4 rounded-full object-cover border border-white dark:border-gray-800"
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>,
            );
        }

        return items;
    }, [
        conversation?.type,
        conversation?.members,
        defaultAvatarSmallUrl,
        handleDeleteMessageForMe,
        handleRecall,
        isInitialLoad,
        isNearBottom,
        shouldScrollOnMediaLoad,
        messages,
        readReceipts,
        scrollToBottom,
        userId,
    ]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Đang tải...</p>
            </div>
        );
    }

    if (!conversation) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">
                    {error || "Không tìm thấy cuộc trò chuyện"}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <img
                        src={displayAvatar || defaultAvatarUrl}
                        alt={displayName}
                        className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                        <p className="font-semibold text-sm dark:text-white">
                            {displayName}
                        </p>
                        <p className="text-xs text-gray-500">Active now</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        className="hover:text-gray-600 dark:text-white disabled:opacity-40"
                        onClick={() => void startCall("audio")}
                        disabled={!otherMember}
                        title="Gọi thoại"
                    >
                        <Phone size={20} />
                    </button>
                    <button
                        className="hover:text-gray-600 dark:text-white disabled:opacity-40"
                        onClick={() => void startCall("video")}
                        disabled={!otherMember}
                        title="Gọi video"
                    >
                        <Video size={20} />
                    </button>
                    <button className="hover:text-gray-600 dark:text-white">
                        <Info size={20} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="relative flex-1 min-h-0">
                {error && (
                    <div className="px-4 py-2 text-xs text-red-600 dark:text-red-400 border-b border-gray-200 dark:border-gray-700">
                        {error}
                    </div>
                )}

                {/* Toast thu hồi: hiện 2s rồi tự biến mất */}
                {recallToast && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-gray-800 dark:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg shadow-lg pointer-events-none whitespace-nowrap">
                        {recallToast}
                    </div>
                )}

                <div
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="h-full overflow-y-auto p-4 pb-4 flex flex-col"
                    style={{ overflowAnchor: "auto" }}
                >
                    {/* Loading more indicator (hiện khi kéo lên load tin cũ) */}
                    {loadingMore && (
                        <div
                            className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pt-3 pb-2 flex justify-center"
                            style={{ overflowAnchor: "none" }}
                        >
                            <div className="inline-flex items-center rounded-full bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-700 shadow-sm px-3 py-2">
                                <span className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-200 animate-spin" />
                            </div>
                        </div>
                    )}

                    {messageItems}

                    {/* Typing Indicator - Dummy message bubble khi có người đang gõ */}
                    {typingUsers.size > 0 && (
                        <div className="flex items-end gap-2 mt-3">
                            {/* Avatar của người đang gõ */}
                            {Array.from(typingUsers).map((typingUserId) => {
                                const typingMember = conversation?.members?.find(
                                    (m) => m.userId === typingUserId,
                                );
                                return (
                                    <img
                                        key={typingUserId}
                                        src={typingMember?.avatar || defaultAvatarSmallUrl}
                                        alt={typingMember?.nickname || "User"}
                                        className="w-7 h-7 rounded-full object-cover"
                                    />
                                );
                            })}
                            {/* Bubble với 3 chấm nhấp nháy */}
                            <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl px-3 py-3 max-w-20">
                                <div className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} className="h-1 scroll-mb-6" />
                </div>

                {/* Nút cuộn xuống cuối (Messenger/Zalo style) */}
                {showScrollToBottomButton && (
                    <button
                        type="button"
                        onClick={handleScrollToBottomClick}
                        className="absolute bottom-4 right-4 h-11 w-11 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700"
                        aria-label="Cuộn xuống tin nhắn mới nhất"
                        title="Cuộn xuống tin nhắn mới nhất"
                    >
                        <ArrowDown
                            size={18}
                            className="text-gray-700 dark:text-gray-200"
                        />

                        {pendingNewMessages > 0 && (
                            <span className="absolute -top-1 -left-1 min-w-5 h-5 px-1 rounded-full bg-blue-500 text-white text-[10px] leading-5 text-center">
                                {pendingNewMessages > 99
                                    ? "99+"
                                    : pendingNewMessages}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* Input */}
            <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
                {/* Hidden file inputs */}
                <input
                    ref={attachInputRef}
                    type="file"
                    accept="*/*"
                    className="hidden"
                    onChange={onFileChange}
                />
                <input
                    ref={gifInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={onFileChange}
                />

                {isRecording ? (
                    /* Recording overlay */
                    <div className="flex items-center gap-3 px-2 py-1">
                        {/* Pulsing red dot */}
                        <span className="shrink-0 h-3 w-3 rounded-full bg-red-500 animate-pulse" />

                        {/* Duration */}
                        <span className="text-sm font-mono text-red-500 w-12 shrink-0">
                            {formatDuration(recordingDuration)}
                        </span>

                        {/* Label */}
                        <span className="flex-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                            Đang ghi âm...
                        </span>

                        {/* Cancel */}
                        <button
                            type="button"
                            onClick={cancelRecording}
                            title="Huỷ"
                            className="shrink-0 p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        >
                            <X size={22} />
                        </button>

                        {/* Stop & send */}
                        <button
                            type="button"
                            onClick={stopRecording}
                            title="Dừng và gửi"
                            className="shrink-0 p-1.5 text-white bg-blue-500 hover:bg-blue-600 rounded-full"
                        >
                            <Square size={20} fill="currentColor" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1">
                        {/* Plus / X — mở popup menu */}
                        <div ref={plusMenuRef} className="relative shrink-0">
                            <button
                                type="button"
                                onClick={() => setPlusMenuOpen((v) => !v)}
                                disabled={uploading}
                                className="p-1.5 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full disabled:opacity-50"
                            >
                                {plusMenuOpen ? (
                                    <X size={22} />
                                ) : (
                                    <Plus size={22} />
                                )}
                            </button>

                            {/* Popup menu */}
                            {plusMenuOpen && (
                                <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl py-1.5 w-72 z-40">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPlusMenuOpen(false);
                                            void startRecording();
                                        }}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <Mic
                                            size={20}
                                            className="text-gray-700 dark:text-gray-300 shrink-0"
                                        />
                                        <span className="text-sm text-gray-800 dark:text-gray-100">
                                            Gửi clip âm thanh
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPlusMenuOpen(false);
                                            attachInputRef.current?.click();
                                        }}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <Paperclip
                                            size={20}
                                            className="text-gray-700 dark:text-gray-300 shrink-0"
                                        />
                                        <span className="text-sm text-gray-800 dark:text-gray-100">
                                            Đính kèm file (tối đa 100MB)
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPlusMenuOpen(false)}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 opacity-50 cursor-not-allowed"
                                    >
                                        <StickyNote
                                            size={20}
                                            className="text-gray-700 dark:text-gray-300 shrink-0"
                                        />
                                        <span className="text-sm text-gray-800 dark:text-gray-100">
                                            Chọn nhãn dán
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPlusMenuOpen(false);
                                            gifInputRef.current?.click();
                                        }}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <Film
                                            size={20}
                                            className="text-gray-700 dark:text-gray-300 shrink-0"
                                        />
                                        <span className="text-sm text-gray-800 dark:text-gray-100">
                                            Chọn file GIF / Ảnh / Video
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Input text */}
                        <input
                            ref={messageInputRef}
                            type="text"
                            value={messageText}
                            onChange={(e) => {
                                setMessageText(e.target.value);
                                // Gửi typing signal
                                if (e.target.value.trim()) {
                                    sendTypingSignal(true);
                                } else {
                                    sendTypingSignal(false);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !sending && !uploading) {
                                    sendTypingSignal(false); // Ngừng typing khi gửi
                                    void handleSend();
                                }
                            }}
                            onBlur={() => sendTypingSignal(false)} // Ngừng typing khi blur
                            placeholder={
                                uploading
                                    ? "Đang tải file lên..."
                                    : "Nhập tin nhắn..."
                            }
                            disabled={sending || uploading}
                            className="flex-1 min-w-0 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full focus:outline-none text-sm dark:text-white disabled:opacity-50"
                        />

                        {/* Uploading spinner */}
                        {uploading && (
                            <span className="shrink-0 h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-gray-700 dark:border-t-gray-200 animate-spin" />
                        )}

                        {/* Emoji — luôn hiện (trừ khi đang upload) */}
                        {!uploading && (
                            <div ref={emojiPickerRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setEmojiPickerOpen(!emojiPickerOpen)
                                    }
                                    className={`shrink-0 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full ${
                                        emojiPickerOpen
                                            ? "text-blue-500"
                                            : "text-gray-800 dark:text-gray-200"
                                    }`}
                                >
                                    <Smile size={22} />
                                </button>

                                {/* Emoji Picker Popup */}
                                {emojiPickerOpen && (
                                    <div
                                        ref={emojiPickerRef}
                                        className="absolute bottom-full right-0 mb-2 z-50 emoji-picker-custom"
                                    >
                                        <EmojiPicker
                                            onEmojiClick={onEmojiClick}
                                            theme={
                                                document.documentElement.classList.contains(
                                                    "dark",
                                                )
                                                    ? Theme.DARK
                                                    : Theme.LIGHT
                                            }
                                            width={350}
                                            height={435}
                                            searchPlaceholder="Tìm kiếm biểu tượng cảm xúc"
                                            previewConfig={{ showPreview: false }}
                                            emojiStyle={EmojiStyle.FACEBOOK}
                                            skinTonesDisabled
                                            lazyLoadEmojis
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Thumbs up khi trống, Send khi có text */}
                        {!uploading &&
                            (messageText.trim() ? (
                                <button
                                    type="button"
                                    onClick={() => void handleSend()}
                                    disabled={sending}
                                    className="shrink-0 p-1.5 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full disabled:opacity-50"
                                >
                                    <Send size={22} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => void handleSend("👍")}
                                    disabled={sending}
                                    className="shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full disabled:opacity-50"
                                >
                                    <Emoji unified="1f44d" size={28} emojiStyle={EmojiStyle.APPLE} />
                                </button>
                            ))}
                    </div>
                )}
            </div>

            <IncomingCallModal
                open={Boolean(incomingCall)}
                callerName={
                    conversation?.members?.find(
                        (m) => m.userId === incomingCall?.fromUserId,
                    )?.nickname ||
                    `Người dùng ${incomingCall?.fromUserId ?? ""}`
                }
                callType={incomingCall?.callType || "audio"}
                onAccept={() => void acceptIncomingCall()}
                onReject={rejectIncomingCall}
            />

            <CallScreen
                open={Boolean(activeCall)}
                callType={activeCall?.callType || "audio"}
                remoteName={
                    activeCall?.remoteName ||
                    otherMember?.nickname ||
                    "Người dùng"
                }
                remoteAvatar={activeCall?.remoteAvatar || otherMember?.avatar}
                status={activeCall?.status || "calling"}
                durationText={callDurationText}
                localStream={localStream}
                remoteStream={remoteStream}
                remoteStreams={remoteStreams}
                participants={callParticipants}
                micEnabled={micEnabled}
                cameraEnabled={cameraEnabled}
                isScreenSharing={isScreenSharing}
                canToggleCamera={canToggleCamera}
                canShareScreen={canShareScreen}
                onToggleMic={toggleMic}
                onToggleCamera={toggleCamera}
                onToggleScreenShare={() => void toggleScreenShare()}
                onEndCall={() => void endCall()}
            />
        </div>
    );
}
