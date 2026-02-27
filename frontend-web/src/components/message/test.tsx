import { useState, useEffect, useRef } from "react";
import { Send, Phone, Video, Info, ArrowDown } from "lucide-react";
import chatService, {
    type Message,
    type Conversation,
} from "../../services/chatService";
import websocketService from "../../services/websocket";

interface ChatWindowProps {
    conversationId: number;
    userId: number;
}

export default function ChatWindow({
    conversationId,
    userId,
}: ChatWindowProps) {
    const [messageText, setMessageText] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // UI state: hiển thị nút cuộn xuống cuối khi có tin nhắn mới trong lúc user đang đọc tin cũ
    const [showScrollToBottomButton, setShowScrollToBottomButton] =
        useState(false);
    const [pendingNewMessages, setPendingNewMessages] = useState(0);

    // State cho cursor-based pagination
    const [hasMore, setHasMore] = useState(false); // Còn tin nhắn cũ để load không
    const [loadingMore, setLoadingMore] = useState(false); // Đang load thêm tin nhắn
    const [nextCursor, setNextCursor] = useState<string | null>(null); // Cursor để load tin cũ hơn

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const wasNearBottomRef = useRef(true);
    const initialScrollPendingRef = useRef(false);
    const autoFillPendingRef = useRef(false);
    const loadTokenRef = useRef(0);

    /**
     * Effect: Setup WebSocket để nhận tin nhắn real-time trong conversation
     *
     * LUỒNG HOẠT ĐỘNG:
     * 1. Component ChatWindow mount hoặc conversationId thay đổi
     * 2. Load conversation info và messages hiện có từ API
     * 3. Setup WebSocket:
     *    a. Kiểm tra đã kết nối chưa, nếu chưa -> connect()
     *    b. Subscribe vào topic /topic/conversation/{conversationId}
     * 4. Khi có tin nhắn mới:
     *    a. Backend lưu message vào DB
     *    b. Backend publish MessageCreatedEvent
     *    c. ChatEventListener gửi event qua WebSocket:
     *       { type: "MESSAGE_CREATED", messageResponse: {...} }
     *    d. WebSocketService nhận event, parse và extract messageResponse
     *    e. handleNewMessage được gọi với message object
     *    f. Message được thêm vào state và hiển thị trong chat
     * 5. Khi component unmount hoặc đổi conversation -> unsubscribe
     *
     * KẾT QUẢ: Chat window hiển thị tin nhắn mới ngay lập tức cho tất cả users trong conversation
     */
    useEffect(() => {
        if (conversationId) {
            // Token để chống race condition (click đổi hội thoại nhanh, response cũ về muộn)
            loadTokenRef.current += 1;
            const token = loadTokenRef.current;

            // Reset UI state ngay khi đổi hội thoại
            wasNearBottomRef.current = true;
            setShowScrollToBottomButton(false);
            setPendingNewMessages(0);
            setLoadingMore(false);
            setHasMore(false);
            setNextCursor(null);
            setMessages([]);
            setConversation(null);

            loadConversation(token);
            loadMessages(token);

            // Setup WebSocket subscription cho conversation này
            const setupWebSocket = async () => {
                try {
                    // BƯỚC 1: Đảm bảo WebSocket đã kết nối
                    if (!websocketService.isConnected()) {
                        await websocketService.connect();
                    }

                    // BƯỚC 2: Subscribe conversation để nhận tin nhắn real-time
                    // handleNewMessage sẽ được gọi khi có MessageCreatedEvent
                    // Event đã được parse trong websocketService, chỉ nhận messageResponse
                    websocketService.subscribeToConversation(
                        conversationId,
                        handleNewMessage,
                    );
                } catch (error) {
                    console.error("Failed to setup WebSocket:", error);
                }
            };

            setupWebSocket();
        }

        // CLEANUP: Unsubscribe khi unmount hoặc chuyển conversation khác
        // Tránh nhận tin nhắn từ conversation cũ
        return () => {
            if (conversationId) {
                websocketService.unsubscribeFromConversation(conversationId);
            }
        };
    }, [conversationId]);

    const isNearBottom = (thresholdPx: number = 200) => {
        const container = messagesContainerRef.current;
        if (!container) return true;
        const distanceFromBottom =
            container.scrollHeight -
            container.scrollTop -
            container.clientHeight;
        return distanceFromBottom < thresholdPx;
    };

    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        const container = messagesContainerRef.current;
        if (container) {
            const top = container.scrollHeight;
            // scrollTo ổn định hơn scrollIntoView trong một số layout flex/overflow
            container.scrollTo({ top, behavior });
            return;
        }
        messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    };

    /**
     * Handler xử lý khi nhận tin nhắn mới từ WebSocket
     *
     * ĐƯỢC GỌI KHI: WebSocketService nhận MessageCreatedEvent và extract messageResponse
     *
     * LOGIC:
     * 1. Kiểm tra message đã tồn tại trong danh sách chưa (dựa vào ID)
     * 2. Nếu đã tồn tại -> bỏ qua (tránh duplicate)
     * 3. Nếu chưa tồn tại -> thêm vào cuối danh sách
     * 4. setState trigger re-render để hiển thị tin nhắn mới
     *
     * TẠI SAO CẦN KIỂM TRA DUPLICATE:
     * - User gửi tin nhắn -> API response trả về message
     * - Đồng thời WebSocket cũng broadcast message đó
     * - Nếu không check duplicate sẽ hiển thị 2 lần
     *
     * @param newMessage - Message object đã được extract từ MessageCreatedEvent
     */
    const handleNewMessage = (newMessage: Message) => {
        // Lưu trạng thái "đang ở gần cuối" trước khi append message
        const wasNearBottom = wasNearBottomRef.current;
        const isMyMessage = newMessage.senderId === userId;

        // Chỉ thêm tin nhắn nếu chưa tồn tại (tránh duplicate)
        setMessages((prev) => {
            const exists = prev.some((msg) => msg.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
        });

        // Auto-scroll:
        // - Nếu là tin nhắn của chính mình -> luôn cuộn xuống để không bị "che".
        // - Nếu là tin nhắn người khác -> chỉ cuộn khi user đang ở gần cuối trước đó.
        if (isMyMessage || wasNearBottom) {
            requestAnimationFrame(() => scrollToBottom("smooth"));
            setShowScrollToBottomButton(false);
            setPendingNewMessages(0);
        } else {
            setShowScrollToBottomButton(true);
            setPendingNewMessages((c) => c + 1);
        }
    };

    const loadConversation = async (token: number) => {
        try {
            const conv = await chatService.getConversation(
                conversationId,
                userId,
            );

            if (token !== loadTokenRef.current) return;
            if (conv.success && conv.data) {
                setConversation(conv.data);
            } else {
                setConversation(null); // optional
                console.error(conv.message, conv.errors);
            }
        } catch (error) {
            console.error("Error loading conversation:", error);
        }
    };

    const loadMessages = async (token: number) => {
        try {
            setLoading(true);
            // Load tin nhắn mới nhất (không truyền before)
            const response = await chatService.getMessages(
                conversationId,
                userId,
                null,
                20,
            );

            if (token !== loadTokenRef.current) return;

            // Backend trả về ApiResponse<CursorResponse<Message[]>>
            // - response.success = true/false
            // - response.data có thể null
            const cursorData = response?.success ? response.data : null;
            const list = Array.isArray(cursorData?.data)
                ? cursorData!.data
                : [];

            setMessages(list);
            setNextCursor(cursorData?.nextCursor ?? null);
            setHasMore(Boolean(cursorData?.hasNext));

            // Chỉ scroll xuống cuối sau khi đã load xong data của hội thoại hiện tại
            initialScrollPendingRef.current = true;
        } catch (error) {
            console.error("Error loading messages:", error);
            setMessages([]);
        } finally {
            if (token === loadTokenRef.current) {
                setLoading(false);
            }
        }
    };

    // Sau khi load trang đầu xong và messages đã render -> scroll xuống cuối đúng chuẩn.
    useEffect(() => {
        if (loading) return;
        if (!initialScrollPendingRef.current) return;
        if (messages.length === 0) {
            initialScrollPendingRef.current = false;
            return;
        }

        requestAnimationFrame(() => {
            scrollToBottom("auto");
            wasNearBottomRef.current = true;
            initialScrollPendingRef.current = false;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, messages.length, conversationId]);

    // Nếu trang đầu chưa đủ để tạo scrollbar nhưng backend báo còn dữ liệu (hasMore=true)
    // -> auto load thêm cho đến khi có thể scroll hoặc hết dữ liệu.
    useEffect(() => {
        if (loading) return;
        if (!hasMore) return;
        if (loadingMore) return;
        if (!nextCursor) return;
        if (autoFillPendingRef.current) return;

        const container = messagesContainerRef.current;
        if (!container) return;

        const canScroll = container.scrollHeight > container.clientHeight + 2;
        if (canScroll) return;

        autoFillPendingRef.current = true;
        loadMoreMessages().finally(() => {
            autoFillPendingRef.current = false;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        loading,
        messages.length,
        hasMore,
        loadingMore,
        nextCursor,
        conversationId,
    ]);

    /**
     * Load thêm tin nhắn cũ hơn (khi user scroll lên đầu)
     * Sử dụng cursor từ lần load trước để lấy tin nhắn cũ hơn
     */
    const loadMoreMessages = async () => {
        if (!hasMore || loadingMore || !nextCursor) return;

        const token = loadTokenRef.current;

        try {
            setLoadingMore(true);

            // Lưu chiều cao/scroll hiện tại để tránh bị "nhảy" khi prepend tin nhắn
            const container = messagesContainerRef.current;
            const prevScrollHeight = container?.scrollHeight ?? 0;
            const prevScrollTop = container?.scrollTop ?? 0;

            // Load tin nhắn cũ hơn cursor hiện tại
            const response = await chatService.getMessages(
                conversationId,
                userId,
                nextCursor,
                20,
            );

            if (token !== loadTokenRef.current) return;

            const cursorData = response?.success ? response.data : null;
            const older = Array.isArray(cursorData?.data)
                ? cursorData!.data
                : [];

            // Thêm tin cũ vào ĐẦU danh sách (backend trả về cũ -> mới)
            setMessages((prev) => [...older, ...prev]);
            setNextCursor(cursorData?.nextCursor ?? null);
            setHasMore(Boolean(cursorData?.hasNext));

            // Sau khi prepend, bù lại scrollTop để UI đứng yên tại vị trí cũ
            requestAnimationFrame(() => {
                const current = messagesContainerRef.current;
                if (!current) return;
                const newScrollHeight = current.scrollHeight;
                const delta = newScrollHeight - prevScrollHeight;
                current.scrollTop = prevScrollTop + delta;
            });
        } catch (error) {
            console.error("Error loading more messages:", error);
        } finally {
            if (token === loadTokenRef.current) {
                setLoadingMore(false);
            }
        }
    };

    /**
     * Handler xử lý scroll event để load more khi scroll lên đầu
     */
    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const nearBottom = isNearBottom();
        wasNearBottomRef.current = nearBottom;

        // Chỉ cần user kéo lên (không ở gần cuối) -> hiện nút mũi tên xuống
        if (!nearBottom) {
            if (!showScrollToBottomButton) {
                setShowScrollToBottomButton(true);
            }
        } else {
            if (showScrollToBottomButton) {
                setShowScrollToBottomButton(false);
            }
            if (pendingNewMessages > 0) {
                setPendingNewMessages(0);
            }
        }

        // Nếu scroll gần đến đầu (còn 100px) và còn tin nhắn cũ -> load more
        if (container.scrollTop < 100 && hasMore && !loadingMore) {
            loadMoreMessages();
        }
    };

    const handleScrollToBottomClick = () => {
        scrollToBottom("smooth");
        setShowScrollToBottomButton(false);
        setPendingNewMessages(0);
    };

    const handleSend = async () => {
        if (messageText.trim() && conversationId) {
            try {
                setSending(true);
                await chatService.sendMessage(
                    {
                        content: messageText.trim(),
                        type: "TEXT",
                        conversationId: conversationId,
                    },
                    userId,
                );

                // Không cần add vào list ngay, WebSocket sẽ tự động add
                // setMessages((prev) => [...prev, newMessage]);
                setMessageText("");

                // UX: user vừa gửi tin -> luôn giữ vị trí ở cuối để không bị "che".
                wasNearBottomRef.current = true;
                requestAnimationFrame(() => scrollToBottom("smooth"));
            } catch (error) {
                console.error("Error sending message:", error);
                alert("Không thể gửi tin nhắn. Vui lòng thử lại!");
            } finally {
                setSending(false);
            }
        }
    };

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
                <p className="text-gray-500">Không tìm thấy cuộc trò chuyện</p>
            </div>
        );
    }

    // Get conversation display info
    const displayName =
        conversation.type === "GROUP"
            ? conversation.name
            : conversation.members?.find((m) => m.userId !== userId)
                  ?.nickname || "Unknown";

    const displayAvatar =
        conversation.type === "GROUP"
            ? conversation.imageUrl
            : conversation.members?.find((m) => m.userId !== userId)?.avatar;

    return (
        <div className="flex flex-col h-full w-full flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <img
                        src={displayAvatar || "https://i.pravatar.cc/150"}
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
                <div
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="h-full overflow-y-auto p-4 pb-2 space-y-4"
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
                                onClick={loadMoreMessages}
                                className="text-xs text-blue-500 hover:text-blue-700"
                            >
                                Tải thêm tin nhắn cũ hơn
                            </button>
                        </div>
                    )}

                    {messages.map((message) => {
                        const isOwn = message.senderId === userId;

                        return (
                            <div
                                key={message.id}
                                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                            >
                                {!isOwn && (
                                    <img
                                        src={
                                            message.senderAvatar ||
                                            "https://i.pravatar.cc/40"
                                        }
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
                                    {!isOwn &&
                                        conversation.type === "GROUP" && (
                                            <p className="text-xs font-semibold mb-1 opacity-70">
                                                {message.senderName}
                                            </p>
                                        )}
                                    <p className="text-sm">{message.content}</p>
                                    <p
                                        className={`text-xs mt-1 ${isOwn ? "text-blue-100" : "text-gray-500 dark:text-gray-400"}`}
                                    >
                                        {new Date(
                                            message.createdAt,
                                        ).toLocaleTimeString("vi-VN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
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
                        onKeyPress={(e) =>
                            e.key === "Enter" && !sending && handleSend()
                        }
                        placeholder="Nhập tin nhắn..."
                        disabled={sending}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
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
