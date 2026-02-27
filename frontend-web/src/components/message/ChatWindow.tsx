import { useMemo, type ReactNode } from "react";
import { Send, Phone, Video, Info, ArrowDown } from "lucide-react";
import { useChatWindowController } from "../../hooks/useChatWindowController";

interface ChatWindowProps {
    conversationId: number;
    userId: number;
}

export default function ChatWindow({
    conversationId,
    userId,
}: ChatWindowProps) {
    const {
        conversation,
        messages,
        loading,
        loadingMore,
        hasMore,
        sending,
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

        defaultAvatarUrl,
        defaultAvatarSmallUrl,
    } = useChatWindowController({ conversationId, userId });

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

        for (const message of messages) {
            const createdAt = new Date(message.createdAt);
            const validDate = Number.isFinite(createdAt.getTime());
            const dayKey = validDate ? getDayKey(createdAt) : "invalid-date";

            // Nhãn ngày: chỉ chèn khi "đổi ngày" so với message trước đó.
            // => đảm bảo 1 ngày chỉ có 1 nhãn, và nhãn xuất hiện trước tin đầu tiên của ngày.
            if (dayKey !== previousDayKey) {
                items.push(
                    <div
                        key={`date-sep-${message.id}-${dayKey}`}
                        className="flex justify-center py-2"
                    >
                        <div className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-100 text-xs">
                            {validDate ? formatDateLabel(createdAt) : ""}
                        </div>
                    </div>,
                );
                previousDayKey = dayKey;
            }

            // Tin nhắn bình thường (giữ nguyên UI cũ), chỉ khác là được xen kẽ với nhãn ngày.
            const isOwn = message.senderId === userId;
            items.push(
                <div
                    key={message.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                    {!isOwn && (
                        <img
                            src={message.senderAvatar || defaultAvatarSmallUrl}
                            alt={message.senderName}
                            className="w-8 h-8 rounded-full mr-2 object-cover"
                        />
                    )}
                    <div
                        className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                            isOwn
                                ? "bg-blue-500 text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-black dark:text-white"
                        }`}
                    >
                        {!isOwn && conversation?.type === "GROUP" && (
                            <p className="text-xs font-semibold mb-1 opacity-70">
                                {message.senderName}
                            </p>
                        )}
                        <p className="text-sm">{message.content}</p>
                        <p
                            className={`text-xs mt-1 ${
                                isOwn
                                    ? "text-blue-100"
                                    : "text-gray-500 dark:text-gray-400"
                            }`}
                        >
                            {new Date(message.createdAt).toLocaleTimeString(
                                "vi-VN",
                                {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                },
                            )}
                        </p>
                    </div>
                </div>,
            );
        }

        return items;
    }, [conversation?.type, defaultAvatarSmallUrl, messages, userId]);

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
                    <button className="hover:text-gray-600 dark:text-white">
                        <Phone size={20} />
                    </button>
                    <button className="hover:text-gray-600 dark:text-white">
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
                <div
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="h-full overflow-y-auto p-4 pb-4 space-y-4"
                >
                    {/* Loading more indicator (hiện khi kéo lên load tin cũ) */}
                    {loadingMore && (
                        <div className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pt-3 pb-2 flex justify-center">
                            <div className="inline-flex items-center rounded-full bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-700 shadow-sm px-3 py-2">
                                <span className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-200 animate-spin" />
                            </div>
                        </div>
                    )}

                    {/* Load more button (tuỳ chọn, vẫn giữ để user bấm nếu muốn) */}
                    {hasMore && !loadingMore && (
                        <div className="text-center py-2">
                            <button
                                onClick={() => loadMoreMessages()}
                                className="text-xs text-blue-500 hover:text-blue-700"
                            >
                                Tải thêm tin nhắn cũ hơn
                            </button>
                        </div>
                    )}

                    {messageItems}
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
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) =>
                            e.key === "Enter" && !sending && void handleSend()
                        }
                        placeholder="Nhập tin nhắn..."
                        disabled={sending}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white disabled:opacity-50"
                    />
                    <button
                        onClick={() => void handleSend()}
                        disabled={!messageText.trim() || sending}
                        className="text-blue-500 font-semibold disabled:text-blue-300"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
