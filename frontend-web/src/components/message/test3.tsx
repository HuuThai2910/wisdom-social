import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Search, Edit } from "lucide-react";
import chatService, { type Conversation } from "../services/chatService";
import ChatWindow from "../components/message/ChatWindow";
import websocketService, {
    type LastMessageUpdate,
} from "../services/websocket";

export default function Messages() {
    const [searchQuery, setSearchQuery] = useState("");
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();
    const { conversationId } = useParams<{ conversationId?: string }>();
    const [searchParams] = useSearchParams();

    // Lấy conversationId từ URL params
    const selectedConversationId = conversationId
        ? parseInt(conversationId)
        : null;

    // Lấy userId từ query params(sau này cập nhật phần security thì sẽ lấy từ context)
    const currentUserId = parseInt(searchParams.get("userId") || "1");

    // --- QUAN TRỌNG: CHỐNG "STALE CLOSURE" ---
    // Callback WebSocket sẽ được đăng ký 1 lần cho mỗi currentUserId.
    // Khi người dùng click đổi hội thoại (URL đổi), component re-render nhưng callback cũ
    // có thể vẫn giữ selectedConversationId/currentUserId "cũ" → tính sai unreadCount.
    // Vì vậy ta lưu selectedConversationId/currentUserId vào ref để callback luôn đọc
    // được giá trị MỚI NHẤT mà KHÔNG cần re-subscribe.
    const selectedConversationIdRef = useRef<number | null>(
        selectedConversationId,
    );
    const currentUserIdRef = useRef<number>(currentUserId);

    // Mỗi lần selectedConversationId thay đổi (user mở hội thoại khác) → cập nhật ref
    useEffect(() => {
        selectedConversationIdRef.current = selectedConversationId;
    }, [selectedConversationId]);

    // Mỗi lần currentUserId thay đổi (đổi userId trên URL) → cập nhật ref
    useEffect(() => {
        currentUserIdRef.current = currentUserId;
    }, [currentUserId]);

    useEffect(() => {
        loadConversations();
    }, []);

    // Khi user mở 1 hội thoại: gọi API markAsRead để backend reset unreadCount về 0.
    // Đồng thời reset unreadCount ở FE để UI phản hồi ngay.
    useEffect(() => {
        const markConversationAsRead = async () => {
            if (selectedConversationId) {
                try {
                    // Gọi API để reset unreadCount về 0 trong database
                    await chatService.markAsRead(
                        selectedConversationId,
                        currentUserId,
                    );

                    // Cập nhật state local để reset unreadCount về 0 ngay lập tức
                    setConversations((prevConversations) =>
                        prevConversations.map((conv) =>
                            conv.id === selectedConversationId
                                ? { ...conv, unreadCount: 0 }
                                : conv,
                        ),
                    );
                } catch (error) {
                    console.error("Error marking conversation as read:", error);
                }
            }
        };

        markConversationAsRead();
    }, [selectedConversationId, currentUserId]);

    // Effect: Setup WebSocket để nhận cập nhật sidebar real-time cho tất cả conversation
    useEffect(() => {
        const setupWebSocket = async () => {
            try {
                // BƯỚC 1: Kiểm tra và kết nối WebSocket (nếu chưa thì gọi connect để thiết lập stomp connection)
                // isConnected() kiểm tra client.connected (STOMP handshake hoàn tất)
                if (!websocketService.isConnected()) {
                    await websocketService.connect();
                }

                // BƯỚC 2: Subscribe topic /topic/user/{userId}/conversations
                // handleConversationUpdate sẽ được gọi mỗi khi nhận update từ backend
                // Update đã được parse và extract lastMessage trong websocketService
                websocketService.subscribeToUserConversations(
                    currentUserId,
                    handleConversationUpdate,
                );
            } catch (error) {
                console.error(
                    "Error setting up WebSocket for conversations:",
                    error,
                );
            }
        };

        setupWebSocket();

        // CLEANUP: Hủy subscription khi component unmount
        // Tránh memory leak và nhận message không cần thiết
        return () => {
            websocketService.unsubscribeFromUserConversations(currentUserId);
        };
    }, [currentUserId]);

    const loadConversations = async () => {
        try {
            setLoading(true);
            const convs = await chatService.getConversations(currentUserId);
            if (convs.success && convs.data) {
                console.log(convs.data);
                setConversations(convs.data);
            } else {
                setConversations([]); // optional
                console.error(convs.message, convs.errors);
            }
        } catch (error) {
            console.error("Error loading conversations:", error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handler xử lý khi nhận được conversation update từ WebSocket
     * ĐƯỢC GỌI KHI: Backend gửi ConversationUpdatedEvent qua /topic/user/{userId}/conversations
     * 1. Tìm conversation có ID trùng với conversationId (tham số thứ 1)
     * 2. Cập nhật lastMessage với dữ liệu mới từ lastMessage (tham số thứ 2)
     * 3. Tăng unreadCount nếu tin nhắn mới KHÔNG phải của mình VÀ KHÔNG đang xem conversation đó
     * 4. Nếu đang xem conversation này → set unreadCount = 0 và gọi markAsRead
     * 5. Sắp xếp lại danh sách theo thời gian (mới nhất lên đầu)
     * 6. setState trigger re-render sidebar
     *
     * @param conversationId - ID conversation được cập nhật (từ event.conversationId)
     * @param lastMessage - Thông tin tin nhắn cuối (từ event.lastMessage, KHÔNG chứa conversationId)
     */
    const handleConversationUpdate = useCallback(
        (conversationId: number, lastMessage: LastMessageUpdate) => {
            const latestUserId = currentUserIdRef.current;
            const latestSelectedConversationId =
                selectedConversationIdRef.current;

            const isMyMessage = lastMessage.lastSenderId === latestUserId;
            const isViewingThisConversation =
                latestSelectedConversationId === conversationId;

            // Nếu user đang ĐỨNG TRONG đúng hội thoại này và nhận tin từ NGƯỜI KHÁC
            // → coi như đã đọc ngay: gọi API để backend reset unreadCount về 0
            if (isViewingThisConversation && !isMyMessage) {
                chatService
                    .markAsRead(conversationId, latestUserId)
                    .catch((error) => {
                        console.error(
                            "Error marking conversation as read:",
                            error,
                        );
                    });
            }

            // Cập nhật state theo dạng functional update để luôn dựa trên state mới nhất
            setConversations((prevConversations) => {
                const updatedConversations = prevConversations.map((conv) => {
                    if (conv.id !== conversationId) return conv;

                    let lastName = "";
                    if (conv.type === "GROUP") {
                        lastName = lastMessage.lastSenderName;
                    }

                    // 1) Tin nhắn của chính mình:
                    //    - Không tăng/giảm unreadCount (người gửi không có "tin chưa đọc")
                    // 2) Tin nhắn của người khác:
                    //    - Nếu đang mở hội thoại đó: unreadCount = 0 (đã đọc ngay)
                    //    - Nếu KHÔNG mở: unreadCount = unreadCount + 1
                    let newUnreadCount = conv.unreadCount || 0;
                    if (!isMyMessage) {
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
                    const timeA = a.lastMessage?.lastMessageAt
                        ? new Date(a.lastMessage.lastMessageAt).getTime()
                        : 0;
                    const timeB = b.lastMessage?.lastMessageAt
                        ? new Date(b.lastMessage.lastMessageAt).getTime()
                        : 0;
                    return timeB - timeA;
                });
            });
        },
        [],
    );

    // Handler khi click vào conversation - navigate với URL params
    const handleSelectConversation = (convId: number) => {
        navigate(`/messages/${convId}?userId=${currentUserId}`);
    };

    const filteredConversations = searchQuery
        ? conversations.filter((conv) => {
              const displayName =
                  conv.type === "GROUP"
                      ? conv.name
                      : conv.members?.find((m) => m.userId !== currentUserId)
                            ?.nickname;
              return displayName
                  ?.toLowerCase()
                  .includes(searchQuery.toLowerCase());
          })
        : conversations;

    const getDisplayInfo = (conv: Conversation) => {
        // Nếu conversation là group thì sẽ lấy tên từ name và avatar của conversation
        if (conv.type === "GROUP") {
            return {
                name: conv.name || "Group Chat",
                avatar: conv.imageUrl || "https://i.pravatar.cc/150?img=20",
            };
        }
        // Nếu là conversation là direct thì sẽ name và avatar sẽ được lấy từ user còn lại
        const otherMember = conv.members?.find(
            (m) => m.userId !== currentUserId,
        );
        return {
            name: otherMember?.nickname || "Unknown",
            avatar: otherMember?.avatar || "https://i.pravatar.cc/150",
        };
    };

    const formatTime = (dateString: string) => {
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
    };

    return (
        <div className="w-100% mx-auto px-4 py-4">
            <div className="bg-white dark:bg-black border border-gray-200 dark:border-[#262626] rounded-lg h-[calc(100vh-140px)] flex overflow-hidden shadow-sm">
                {/* Left Sidebar - Chat List */}
                <div className="w-full md:w-96 border-r border-gray-200 dark:border-[#262626] flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-[#262626]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-semibold dark:text-white">
                                    Messages
                                </h2>
                            </div>
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-[#262626] rounded-full">
                                <Edit size={24} className="dark:text-white" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Tìm kiếm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-100 dark:bg-[#262626] rounded-lg outline-none text-sm dark:text-white placeholder-gray-500"
                            />
                            <Search
                                size={16}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                        </div>
                    </div>

                    {/* Chat List */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <p className="text-gray-500">Đang tải...</p>
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                                <p className="text-gray-500">
                                    Không có cuộc trò chuyện nào
                                </p>
                            </div>
                        ) : (
                            filteredConversations.map((conv) => {
                                const displayInfo = getDisplayInfo(conv);
                                const isActive =
                                    selectedConversationId === conv.id;

                                return (
                                    <div
                                        key={conv.id}
                                        onClick={() =>
                                            handleSelectConversation(conv.id)
                                        }
                                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-[#262626] transition-colors ${
                                            isActive
                                                ? "bg-gray-100 dark:bg-[#262626]"
                                                : "hover:bg-gray-50 dark:hover:bg-[#1a1a1a]"
                                        }`}
                                    >
                                        <div className="relative">
                                            <img
                                                src={displayInfo.avatar}
                                                alt={displayInfo.name}
                                                className="w-14 h-14 rounded-full object-cover"
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate dark:text-white">
                                                {displayInfo.name}
                                            </p>
                                            <p
                                                className={`text-sm truncate ${
                                                    conv.unreadCount &&
                                                    conv.unreadCount > 0
                                                        ? "font-semibold dark:text-white"
                                                        : "text-gray-500 dark:text-gray-400"
                                                }`}
                                            >
                                                {conv.lastMessage
                                                    ?.lastMessageContent ? (
                                                    <>
                                                        {(conv.type ===
                                                            "GROUP" ||
                                                            conv.lastMessage
                                                                .lastSenderId ===
                                                                currentUserId) && (
                                                            <>
                                                                <span>
                                                                    {conv
                                                                        .lastMessage
                                                                        .lastSenderId ===
                                                                    currentUserId
                                                                        ? "Bạn"
                                                                        : conv
                                                                              .lastMessage
                                                                              .lastSenderName}
                                                                </span>
                                                                {" : "}
                                                            </>
                                                        )}
                                                        {
                                                            conv.lastMessage
                                                                .lastMessageContent
                                                        }
                                                    </>
                                                ) : (
                                                    "Bắt đầu trò chuyện"
                                                )}
                                            </p>
                                        </div>

                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {conv.lastMessage
                                                    ?.lastMessageContent
                                                    ? formatTime(
                                                          conv.lastMessage
                                                              .lastMessageAt,
                                                      )
                                                    : ""}
                                            </span>
                                            {(conv.unreadCount ?? 0) > 0 && (
                                                <div className="min-w-5 h-5 px-1.5 bg-red-500 rounded-full flex items-center justify-center">
                                                    <span className="text-xs text-white font-semibold">
                                                        {conv.unreadCount! > 99
                                                            ? "99+"
                                                            : conv.unreadCount}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Side - Chat Window or Empty State */}
                <div className="hidden md:flex flex-1 bg-white dark:bg-black">
                    {selectedConversationId ? (
                        <ChatWindow
                            key={selectedConversationId}
                            conversationId={selectedConversationId}
                            userId={currentUserId}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-24 h-24 mx-auto mb-4 border-2 border-black dark:border-white rounded-full flex items-center justify-center">
                                    <svg
                                        width="48"
                                        height="48"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        className="dark:stroke-white"
                                    >
                                        <path
                                            d="M12 21L3 13V3h18v10l-9 8z"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-light mb-2 dark:text-white">
                                    Tin nhắn của bạn
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    Gửi ảnh và tin nhắn riêng tư cho bạn bè hoặc
                                    nhóm.
                                </p>
                                <button className="px-6 py-2 bg-[#0095f6] hover:bg-[#1877f2] text-white rounded-lg text-sm font-semibold">
                                    Gửi tin nhắn
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
