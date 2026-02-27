import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import chatService, { type Conversation } from "../services/chatService";
import websocketService, {
    type LastMessageUpdate,
} from "../services/websocket";
import { DEFAULT_AVATAR_URL, DEFAULT_GROUP_AVATAR_URL } from "../constants/ui";

/**
 * parseOptionalInt
 * - Nhận vào string (thường lấy từ URL params) và convert sang number.
 * - Trả về null nếu value rỗng/undefined hoặc không phải số hợp lệ.
 */
function parseOptionalInt(value: string | undefined): number | null {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

/**
 * parseIntWithFallback
 * - Nhận vào string (thường lấy từ query params) và convert sang number.
 * - Nếu không hợp lệ thì dùng fallback.
 *
 * Ghi chú: app hiện đang dùng userId từ query (?userId=...).
 * Nếu về sau chuyển sang auth thật, phần này sẽ đổi sang lấy từ context/auth store.
 */
function parseIntWithFallback(value: string | null, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * useMessagesController
 * - Controller hook cho trang Messages: fetch list hội thoại + search/filter + điều hướng.
 * - Đồng bộ lastMessage/unreadCount realtime qua WebSocket.
 * - Mark-as-read khi user mở hội thoại.
 *
 * Gợi ý đọc nhanh: xem các section `// ======` trong thân hook.
 * Ví dụ dùng (rút gọn):
 * ```tsx
 * const { filteredConversations, handleSelectConversation } = useMessagesController();
 * ```
 */
export function useMessagesController() {
    // ====== UI State (render) ======
    const [searchQuery, setSearchQuery] = useState("");
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ====== Routing / URL ======
    // navigate: chuyển route khi user chọn hội thoại
    const navigate = useNavigate();
    const { conversationId } = useParams<{ conversationId?: string }>();
    const [searchParams] = useSearchParams();

    // selectedConversationId: param trong URL (có thể null nếu chưa chọn)
    const selectedConversationId = parseOptionalInt(conversationId);

    // currentUserId: lấy từ query (?userId=...). Nếu thiếu/không hợp lệ => fallback.
    const currentUserId = parseIntWithFallback(searchParams.get("userId"), 1);

    // ====== Refs chống stale-closure (đặc biệt cho websocket callbacks) ======
    // Lý do: callback subscribe có thể chạy sau nhiều render; dùng ref để đọc giá trị mới nhất.
    const selectedConversationIdRef = useRef<number | null>(
        selectedConversationId,
    );
    const currentUserIdRef = useRef<number>(currentUserId);

    useEffect(() => {
        // Đồng bộ ref mỗi khi URL param đổi.
        selectedConversationIdRef.current = selectedConversationId;
    }, [selectedConversationId]);

    useEffect(() => {
        // Đồng bộ ref mỗi khi userId đổi.
        currentUserIdRef.current = currentUserId;
    }, [currentUserId]);

    // ====== Data loading: danh sách hội thoại ======
    const loadConversations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const convs = await chatService.getConversations(currentUserId);
            if (convs.success && convs.data) {
                // API trả về ok: set list hội thoại.
                setConversations(convs.data);
            } else {
                setConversations([]);
                setError(convs.message || "Không thể tải danh sách hội thoại");
            }
        } catch {
            // Network/exception: cố gắng fail-safe với list rỗng + thông báo.
            setConversations([]);
            setError("Không thể tải danh sách hội thoại");
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        // Reload lại list khi userId thay đổi.
        void loadConversations();
    }, [loadConversations]);

    // ====== Mark-as-read khi user mở hội thoại ======
    useEffect(() => {
        const convId = selectedConversationId;
        if (convId == null) return;

        // Khi user "đang mở" conversation => đánh dấu đã đọc.
        // Làm đồng thời 2 việc:
        // - Backend: reset unreadCount và/hoặc set read flags.
        // - Frontend: update ngay list để UI phản hồi tức thì.

        const markConversationAsRead = async () => {
            try {
                await chatService.markAsRead(convId, currentUserId);

                // Optimistic update: UI phản hồi ngay không cần chờ websocket.
                setConversations((prev) =>
                    prev.map((conv) =>
                        conv.id === convId ? { ...conv, unreadCount: 0 } : conv,
                    ),
                );
            } catch (e) {
                // Không block UI; log để debug.
                console.error("Error marking conversation as read:", e);
            }
        };

        void markConversationAsRead();
    }, [currentUserId, selectedConversationId]);

    const handleConversationUpdate = useCallback(
        (conversationId: number, lastMessage: LastMessageUpdate) => {
            // Callback này chạy khi có event từ websocket:
            // - Update lastMessage
            // - Tính lại unreadCount
            // - Sort list theo thời gian mới nhất
            const latestUserId = currentUserIdRef.current;
            const latestSelectedConversationId =
                selectedConversationIdRef.current;

            const isMyMessage = lastMessage.lastSenderId === latestUserId;
            const isViewingThisConversation =
                latestSelectedConversationId === conversationId;

            if (isViewingThisConversation && !isMyMessage) {
                // Nếu đang xem conversation này và message đến từ người khác,
                // ta markAsRead ngay để backend giữ unreadCount = 0.
                chatService
                    .markAsRead(conversationId, latestUserId)
                    .catch((e) =>
                        console.error("Error marking conversation as read:", e),
                    );
            }

            setConversations((prevConversations) => {
                // Dùng functional setState để đảm bảo luôn dựa vào state mới nhất.
                const updatedConversations = prevConversations.map((conv) => {
                    if (conv.id !== conversationId) return conv;

                    let lastName = "";
                    if (conv.type === "GROUP") {
                        lastName = lastMessage.lastSenderName;
                    }

                    let newUnreadCount = conv.unreadCount || 0;
                    if (!isMyMessage) {
                        // Chỉ tăng unread nếu message không phải của mình.
                        // Đang xem thì reset 0, không xem thì +1.
                        newUnreadCount = isViewingThisConversation
                            ? 0
                            : (conv.unreadCount || 0) + 1;
                    }

                    return {
                        ...conv,
                        lastMessage: {
                            lastMessageContent: lastMessage.lastMessageContent,
                            lastMessageType: lastMessage.lastMessageType,
                            lastSenderId: lastMessage.lastSenderId,
                            lastSenderName:
                                lastMessage.lastSenderId !== latestUserId
                                    ? lastName
                                    : "Bạn",
                            lastMessageAt: lastMessage.lastMessageAt,
                            read: lastMessage.read,
                        },
                        unreadCount: newUnreadCount,
                    };
                });

                return updatedConversations.sort((a, b) => {
                    // Giữ hội thoại có tin nhắn mới nhất ở trên cùng.
                    const lastMessageAtA = a.lastMessage?.lastMessageAt;
                    const lastMessageAtB = b.lastMessage?.lastMessageAt;

                    const timeA = lastMessageAtA
                        ? new Date(lastMessageAtA).getTime()
                        : 0;
                    const timeB = lastMessageAtB
                        ? new Date(lastMessageAtB).getTime()
                        : 0;
                    return timeB - timeA;
                });
            });
        },
        [],
    );

    // ====== WebSocket: subscribe updates cho list hội thoại ======
    useEffect(() => {
        const setupWebSocket = async () => {
            try {
                if (!websocketService.isConnected()) {
                    await websocketService.connect();
                }
                websocketService.subscribeToUserConversations(
                    currentUserId,
                    handleConversationUpdate,
                );
            } catch (e) {
                console.error(
                    "Error setting up WebSocket for conversations:",
                    e,
                );
            }
        };

        void setupWebSocket();

        return () => {
            // Cleanup để tránh leak subscribe khi userId đổi/unmount.
            websocketService.unsubscribeFromUserConversations(currentUserId);
        };
    }, [currentUserId, handleConversationUpdate]);

    const handleSelectConversation = useCallback(
        (convId: number) => {
            // Chuyển route để ChatWindow load theo conversationId mới.
            // userId vẫn giữ qua query param.
            navigate(`/messages/${convId}?userId=${currentUserId}`);
        },
        [currentUserId, navigate],
    );

    const filteredConversations = useMemo(() => {
        // Filter theo searchQuery trên displayName.
        const trimmed = searchQuery.trim().toLowerCase();
        if (!trimmed) return conversations;
        return conversations.filter((conv) => {
            const displayName =
                conv.type === "GROUP"
                    ? conv.name
                    : conv.members?.find((m) => m.userId !== currentUserId)
                          ?.nickname;
            return displayName?.toLowerCase().includes(trimmed);
        });
    }, [conversations, currentUserId, searchQuery]);

    const getDisplayInfo = useCallback(
        (conv: Conversation) => {
            // Chuẩn hoá dữ liệu hiển thị (tên + avatar) để UI khỏi phải xử lý nhiều.
            if (conv.type === "GROUP") {
                return {
                    name: conv.name || "Group Chat",
                    avatar: conv.imageUrl || DEFAULT_GROUP_AVATAR_URL,
                };
            }

            const otherMember = conv.members?.find(
                (m) => m.userId !== currentUserId,
            );
            return {
                name: otherMember?.nickname || "Unknown",
                avatar: otherMember?.avatar || DEFAULT_AVATAR_URL,
            };
        },
        [currentUserId],
    );

    const formatTime = useCallback((dateString: string) => {
        // Format thời gian kiểu "now / 5m / 2h / 3d / 27 thg 1".
        // UI dùng format ngắn để giống các app chat phổ biến.
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor(
            (now.getTime() - date.getTime()) / (1000 * 60 * 60),
        );

        if (diffInHours < 1) {
            const diffInMinutes = Math.floor(
                (now.getTime() - date.getTime()) / (1000 * 60),
            );
            return diffInMinutes < 1 ? "now" : `${diffInMinutes}m`;
        }
        if (diffInHours < 24) return `${diffInHours}h`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d`;

        return date.toLocaleDateString("vi-VN", {
            month: "short",
            day: "numeric",
        });
    }, []);

    return {
        searchQuery,
        setSearchQuery,
        loading,
        error,

        selectedConversationId,
        currentUserId,

        filteredConversations,
        handleSelectConversation,
        getDisplayInfo,
        formatTime,

        reload: loadConversations,
    };
}
