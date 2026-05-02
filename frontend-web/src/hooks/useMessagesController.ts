import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import chatService, {
    type Conversation,
    type MessageType,
} from "../services/chatService";
import websocketService, {
    type ConversationSnapshot,
    type LastMessageUpdate,
} from "../services/websocket";
import { DEFAULT_AVATAR_URL, DEFAULT_GROUP_AVATAR_URL } from "../constants/ui";
import { useAuth } from "../contexts/AuthContext";
import chatRuntimeStore from "../stores/chatRuntimeStore";

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

function sortConversationsByLastMessageAt(
    conversationList: Conversation[],
): Conversation[] {
    return [...conversationList].sort((a, b) => {
        const timeA = a.lastMessage?.lastMessageAt
            ? new Date(a.lastMessage.lastMessageAt).getTime()
            : a.updatedAt
              ? new Date(a.updatedAt).getTime()
              : 0;
        const timeB = b.lastMessage?.lastMessageAt
            ? new Date(b.lastMessage.lastMessageAt).getTime()
            : b.updatedAt
              ? new Date(b.updatedAt).getTime()
              : 0;
        return timeB - timeA;
    });
}

const GROUP_SYSTEM_SYNC_TYPES = new Set<MessageType>([
    "SYSTEM_CREATE_GROUP",
    "SYSTEM_ADD_MEMBER",
    "SYSTEM_UPDATE_ROLE",
    "SYSTEM_KICK_MEMBER",
    "SYSTEM_LEAVE_GROUP",
    "SYSTEM_DISBAND_GROUP",
]);

function safeParseMemberIds(content: string): number[] {
    if (!content) return [];

    try {
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value));
    } catch {
        return [];
    }
}

function resolveReadOnlyNoticeFromConversation(
    conversation: Conversation | ConversationSnapshot | undefined,
    currentUserId: number,
): string | null {
    if (!conversation || conversation.type !== "GROUP") return null;

    const currentMember = (conversation.members ?? []).find(
        (member) => Number(member.userId) === Number(currentUserId),
    );
    if (!currentMember) return null;

    if (currentMember.status === "KICKED") {
        return "Bạn đã bị xóa khỏi nhóm.";
    }
    if (currentMember.status === "LEFT") {
        return "Bạn đã rời khỏi nhóm.";
    }
    if (currentMember.status === "GROUP_DISBANDED") {
        return "Nhóm đã bị giải tán.";
    }

    return null;
}

function resolveReadOnlyNoticeFromLastMessage(
    lastMessage: LastMessageUpdate,
    currentUserId: number,
): string | null {
    if (lastMessage.lastMessageType === "SYSTEM_DISBAND_GROUP") {
        return "Nhóm đã bị giải tán.";
    }

    if (lastMessage.lastMessageType === "SYSTEM_LEAVE_GROUP") {
        if (Number(lastMessage.lastSenderId) === Number(currentUserId)) {
            return "Bạn đã rời khỏi nhóm.";
        }
        return null;
    }

    if (lastMessage.lastMessageType === "SYSTEM_KICK_MEMBER") {
        const targetIds = safeParseMemberIds(lastMessage.lastMessageContent);
        if (targetIds.some((id) => Number(id) === Number(currentUserId))) {
            return "Bạn đã bị xóa khỏi nhóm.";
        }
    }

    return null;
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
    const [conversationReadOnlyNotices, setConversationReadOnlyNotices] =
        useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ====== Routing / URL ======
    // navigate: chuyển route khi user chọn hội thoại
    const navigate = useNavigate();
    const { conversationId } = useParams<{ conversationId?: string }>();

    // selectedConversationId: param trong URL (có thể null nếu chưa chọn)
    const selectedConversationId = parseOptionalInt(conversationId);

    // currentUserId: lấy từ AuthContext (security integration)
    const { currentUser } = useAuth();
    const currentUserId = currentUser?.id ?? 0;

    // ====== Refs chống stale-closure (đặc biệt cho websocket callbacks) ======
    // Lý do: callback subscribe có thể chạy sau nhiều render; dùng ref để đọc giá trị mới nhất.
    const selectedConversationIdRef = useRef<number | null>(
        selectedConversationId,
    );
    const currentUserIdRef = useRef<number>(currentUserId);
    const refreshingConversationIdsRef = useRef<Set<number>>(new Set());

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
            if (convs.success) {
                const conversationData = Array.isArray(convs.data)
                    ? convs.data
                    : [];
                // API trả về ok: set list hội thoại.
                setConversations(conversationData);
                setConversationReadOnlyNotices(() => {
                    const next: Record<number, string> = {};
                    for (const conv of conversationData) {
                        const notice = resolveReadOnlyNoticeFromConversation(
                            conv,
                            currentUserId,
                        );
                        if (notice) {
                            next[conv.id] = notice;
                        }
                    }
                    return next;
                });
            } else {
                setConversations([]);
                setConversationReadOnlyNotices({});
                setError(convs.message || "Không thể tải danh sách hội thoại");
            }
        } catch {
            // Network/exception: cố gắng fail-safe với list rỗng + thông báo.
            setConversations([]);
            setConversationReadOnlyNotices({});
            setError("Không thể tải danh sách hội thoại");
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        // Reload lại list khi userId thay đổi.
        void loadConversations();
    }, [loadConversations]);

    useEffect(() => {
        for (const conv of conversations) {
            chatRuntimeStore.setConversation(conv.id, conv);
        }
    }, [conversations]);

    // ====== Clear unreadCount khi user mở hội thoại ======
    // Optimistic update: UI phản hồi ngay, API thực tế được gọi từ ChatWindow (có lastMessageId)
    useEffect(() => {
        const convId = selectedConversationId;
        if (convId == null) return;

        // Clear unreadCount ngay khi mở conversation
        // API markAsRead sẽ được gọi từ useChatWindowController (có lastMessageId đầy đủ)
        setConversations((prev) =>
            prev.map((conv) =>
                conv.id === convId ? { ...conv, unreadCount: 0 } : conv,
            ),
        );
    }, [selectedConversationId]);

    // Hydrate chi tiết hội thoại sau khi chọn item từ sidebar response mới
    // (GET /conversations đã tối ưu và không còn members/pinnedMessages).
    useEffect(() => {
        const convId = selectedConversationId;
        if (convId == null || !currentUserId) return;

        const selectedConv = conversations.find((conv) => conv.id === convId);
        if (selectedConv?.members && selectedConv.members.length > 0) {
            return;
        }

        let isCancelled = false;

        chatService
            .getConversation(convId, currentUserId)
            .then((response) => {
                if (isCancelled || !response.success || !response.data) return;

                const detailConversation = response.data;

                setConversations((prev) =>
                    sortConversationsByLastMessageAt(
                        prev.map((conv) =>
                            conv.id === convId
                                ? {
                                      ...conv,
                                      ...detailConversation,
                                      lastMessage:
                                          detailConversation.lastMessage ??
                                          conv.lastMessage,
                                      unreadCount:
                                          conv.unreadCount ??
                                          detailConversation.unreadCount,
                                  }
                                : conv,
                        ),
                    ),
                );

                chatRuntimeStore.setConversation(convId, detailConversation);

                const detailNotice = resolveReadOnlyNoticeFromConversation(
                    detailConversation,
                    currentUserId,
                );

                setConversationReadOnlyNotices((prev) => {
                    const next = { ...prev };

                    if (detailNotice) {
                        next[convId] = detailNotice;
                        return next;
                    }

                    if (convId in next) {
                        delete next[convId];
                    }

                    return next;
                });
            })
            .catch(() => {
                // Ignore: ChatWindow vẫn có thể tự load chi tiết hội thoại.
            });

        return () => {
            isCancelled = true;
        };
    }, [conversations, currentUserId, selectedConversationId]);

    /**
     * clearUnreadCount - Callback để ChatWindow gọi khi đánh dấu đã đọc
     * Dùng để clear unreadCount trên sidebar sau khi API markAsRead thành công
     */
    const clearUnreadCount = useCallback((conversationId: number) => {
        setConversations((prev) =>
            prev.map((conv) =>
                conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv,
            ),
        );
    }, []);

    const refreshConversationById = useCallback(
        (conversationId: number, userId: number) => {
            const inFlight = refreshingConversationIdsRef.current;
            if (inFlight.has(conversationId)) return;

            inFlight.add(conversationId);
            chatService
                .getConversation(conversationId, userId)
                .then((response) => {
                    const responseData = response.data;
                    if (!response.success || !responseData) return;

                    setConversations((prev) => {
                        const existed = prev.some(
                            (conv) => conv.id === conversationId,
                        );
                        if (!existed) {
                            return sortConversationsByLastMessageAt([
                                responseData,
                                ...prev,
                            ]);
                        }

                        return sortConversationsByLastMessageAt(
                            prev.map((conv) =>
                                conv.id === conversationId
                                    ? {
                                          ...conv,
                                          ...responseData,
                                          lastMessage:
                                              responseData.lastMessage ??
                                              conv.lastMessage,
                                          unreadCount:
                                              conv.unreadCount ??
                                              responseData.unreadCount,
                                      }
                                    : conv,
                            ),
                        );
                    });
                })
                .catch((error) =>
                    console.error("Error refreshing conversation:", error),
                )
                .finally(() => {
                    inFlight.delete(conversationId);
                });
        },
        [],
    );

    const handleConversationUpdate = useCallback(
        (
            conversationId: number,
            lastMessage: LastMessageUpdate,
            conversationSnapshot?: ConversationSnapshot,
        ) => {
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

            // BE set read:true chỉ khi thu hồi, read:false cho tin nhắn mới
            const isRecallUpdate = lastMessage.read === true;
            const shouldRefreshSnapshot = GROUP_SYSTEM_SYNC_TYPES.has(
                lastMessage.lastMessageType,
            );
            const snapshotReadOnlyNotice =
                resolveReadOnlyNoticeFromConversation(
                    conversationSnapshot,
                    latestUserId,
                );
            const messageReadOnlyNotice = resolveReadOnlyNoticeFromLastMessage(
                lastMessage,
                latestUserId,
            );

            setConversationReadOnlyNotices((prev) => {
                const next = { ...prev };
                const isUnlockingMessage =
                    lastMessage.lastMessageType === "SYSTEM_ADD_MEMBER" &&
                    safeParseMemberIds(lastMessage.lastMessageContent).some(
                        (id) => Number(id) === Number(latestUserId),
                    );

                if (isUnlockingMessage) {
                    delete next[conversationId];
                    return next;
                }

                const resolvedNotice =
                    snapshotReadOnlyNotice ?? messageReadOnlyNotice;

                if (resolvedNotice) {
                    next[conversationId] = resolvedNotice;
                    return next;
                }

                if (conversationSnapshot) {
                    const currentMember = (
                        conversationSnapshot.members ?? []
                    ).find(
                        (member) =>
                            Number(member.userId) === Number(latestUserId),
                    );

                    if (
                        !currentMember ||
                        !currentMember.status ||
                        currentMember.status === "ACTIVE"
                    ) {
                        delete next[conversationId];
                    }
                }

                return next;
            });

            // Lưu ý: markAsRead API được gọi từ useChatWindowController (có lastMessageId đầy đủ)
            // Ở đây chỉ cập nhật unreadCount local

            setConversations((prevConversations) => {
                // Kiểm tra xem conversation có tồn tại trong list không
                const conversationExists = prevConversations.some(
                    (conv) => conv.id === conversationId,
                );

                // Nếu conversation KHÔNG tồn tại (đã bị xóa bởi delete-for-me)
                // → Fetch lại từ API và thêm vào list
                if (!conversationExists) {
                    if (conversationSnapshot) {
                        const snapshotWithLastMessage: Conversation = {
                            ...conversationSnapshot,
                            lastMessage: conversationSnapshot.lastMessage ?? {
                                lastMessageContent:
                                    lastMessage.lastMessageContent,
                                lastMessageType: lastMessage.lastMessageType,
                                lastSenderId: lastMessage.lastSenderId,
                                lastSenderName: lastMessage.lastSenderName,
                                lastMessageAt: lastMessage.lastMessageAt,
                                read: lastMessage.read,
                            },
                        };

                        const unreadCountFromSnapshot =
                            snapshotWithLastMessage.unreadCount ?? 0;
                        const nextUnreadCount =
                            isRecallUpdate ||
                            isMyMessage ||
                            isViewingThisConversation
                                ? unreadCountFromSnapshot
                                : unreadCountFromSnapshot > 0
                                  ? unreadCountFromSnapshot
                                  : 1;

                        return sortConversationsByLastMessageAt([
                            {
                                ...snapshotWithLastMessage,
                                unreadCount: nextUnreadCount,
                            },
                            ...prevConversations,
                        ]);
                    }

                    chatService
                        .getConversation(conversationId, latestUserId)
                        .then((response) => {
                            if (response.success && response.data) {
                                const newConv = response.data;
                                setConversations((prev) => {
                                    // Kiểm tra lại lần nữa để tránh duplicate
                                    if (
                                        prev.some(
                                            (conv) =>
                                                conv.id === conversationId,
                                        )
                                    ) {
                                        return prev;
                                    }

                                    // Thêm conversation vào đầu list và sort
                                    return sortConversationsByLastMessageAt([
                                        newConv,
                                        ...prev,
                                    ]);
                                });
                            }
                        })
                        .catch((e) =>
                            console.error("Error fetching conversation:", e),
                        );

                    // Return list hiện tại, conversation sẽ được thêm vào khi API trả về
                    return prevConversations;
                }

                // Conversation tồn tại → update như cũ
                const updatedConversations = prevConversations.map((conv) => {
                    if (conv.id !== conversationId) return conv;

                    const baseConversation =
                        conversationSnapshot &&
                        conversationSnapshot.id === conversationId
                            ? { ...conv, ...conversationSnapshot }
                            : conv;

                    let lastName = "";
                    if (baseConversation.type === "GROUP") {
                        lastName = lastMessage.lastSenderName;
                    }

                    let newUnreadCount: number;
                    if (isRecallUpdate) {
                        // Thu hồi: giữ nguyên unreadCount hiện tại.
                        // - Nếu đang có unread (> 0) → giữ bold, không tăng
                        // - Nếu không có unread (= 0) → không bold, không tăng
                        newUnreadCount = baseConversation.unreadCount || 0;
                    } else if (!isMyMessage) {
                        // Tin nhắn mới từ người khác:
                        // Đang xem thì reset 0, không xem thì +1.
                        newUnreadCount = isViewingThisConversation
                            ? 0
                            : (baseConversation.unreadCount || 0) + 1;
                    } else {
                        // Tin nhắn mới của chính mình: không thay đổi unreadCount
                        newUnreadCount = baseConversation.unreadCount || 0;
                    }

                    return {
                        ...baseConversation,
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

                return sortConversationsByLastMessageAt(updatedConversations);
            });

            if (shouldRefreshSnapshot && !conversationSnapshot) {
                refreshConversationById(conversationId, latestUserId);
            }
        },
        [refreshConversationById],
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
            const selectedConv = conversations.find(
                (conv) => conv.id === convId,
            );
            if (selectedConv) {
                chatRuntimeStore.setConversation(convId, selectedConv);
            }
            // Chuyển route để ChatWindow load theo conversationId mới.
            navigate(`/messages/${convId}`);
        },
        [conversations, navigate],
    );

    const clearSelectedConversation = useCallback(() => {
        navigate(`/messages`);
    }, [navigate]);

    const filteredConversations = useMemo(() => {
        // Filter theo searchQuery trên displayName.
        const trimmed = searchQuery.trim().toLowerCase();
        if (!trimmed) return conversations;
        return conversations.filter((conv) => {
            const displayName =
                conv.name?.trim() ||
                (conv.type === "GROUP" ? "Nhóm chat" : "Người dùng");

            return displayName?.toLowerCase().includes(trimmed);
        });
    }, [conversations, searchQuery]);

    const getDisplayInfo = useCallback((conv: Conversation) => {
        const resolvedName =
            conv.name?.trim() ||
            (conv.type === "GROUP" ? "Nhóm chat" : "Người dùng");
        const resolvedAvatar = conv.imageUrl?.trim() || null;

        const fallbackAvatarUrl =
            conv.type === "GROUP"
                ? DEFAULT_GROUP_AVATAR_URL
                : DEFAULT_AVATAR_URL;

        return {
            name: resolvedName,
            avatar: resolvedAvatar,
            fallbackAvatar: fallbackAvatarUrl,
            compositeAvatars: [],
            hasCompositeAvatar: false,
        };
    }, []);

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

    // Xóa cuộc trò chuyện ở phía tôi (xóa khỏi danh sách sidebar)
    const handleDeleteConversationForMe = useCallback(
        async (conversationId: number) => {
            try {
                await chatService.deleteConversationForMe(
                    conversationId,
                    currentUserId,
                );
                // API 200 OK → xóa conversation khỏi local state
                setConversations((prev) =>
                    prev.filter((conv) => conv.id !== conversationId),
                );
                setConversationReadOnlyNotices((prev) => {
                    if (!(conversationId in prev)) return prev;
                    const next = { ...prev };
                    delete next[conversationId];
                    return next;
                });

                // Nếu đang xem conversation này → navigate về trang messages (không chọn conversation nào)
                if (selectedConversationId === conversationId) {
                    navigate(`/messages`);
                }
            } catch {
                console.error("Không thể xóa cuộc trò chuyện");
            }
        },
        [currentUserId, navigate, selectedConversationId],
    );

    const selectedConversationReadOnlyNotice =
        selectedConversationId != null
            ? (conversationReadOnlyNotices[selectedConversationId] ?? null)
            : null;

    return {
        searchQuery,
        setSearchQuery,
        loading,
        error,

        selectedConversationId,
        currentUserId,
        conversations,

        filteredConversations,
        handleSelectConversation,
        clearSelectedConversation,
        handleDeleteConversationForMe,
        getDisplayInfo,
        formatTime,
        clearUnreadCount,
        selectedConversationReadOnlyNotice,

        reload: loadConversations,
    };
}
