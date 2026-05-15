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
import { useAuth } from "../contexts/AuthContext";
import chatRuntimeStore from "../stores/chatRuntimeStore";
import {
    formatConversationTime,
    getConversationDisplayInfo,
    GROUP_SYSTEM_SYNC_TYPES,
    parseOptionalInt,
    resolveReadOnlyNoticeFromConversation,
    resolveReadOnlyNoticeFromLastMessage,
    safeParseMemberIds,
    sortConversationsByLastMessageAt,
} from "../utils/messagesControllerUtils";

const PRESERVE_EMPTY_PENDING_REQUEST_TYPES = new Set<MessageType>([
    "SYSTEM_ADD_MEMBER",
    "SYSTEM_KICK_MEMBER",
    "SYSTEM_UPDATE_ROLE",
    "SYSTEM_UPDATE_SETTING",
    "SYSTEM_REQUIRE_APPROVAL",
    "SYSTEM_JOIN_VIA_LINK",
]);

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
        
        // We need to bypass the early return if the conversation's cached members
        // list indicates the current user has a restricted status, because we must
        // fetch the fresh data to set the conversationReadOnlyNotices properly.
        let hasRestrictedStatus = false;
        if (selectedConv?.members) {
            const me = selectedConv.members.find(
                (m) => Number(m.userId) === Number(currentUserId)
            );
            if (!me) {
                // If the user is not in the cached members list, they might have left/kicked
                // and the backend list API didn't include them. We must fetch detail to know.
                hasRestrictedStatus = true;
            } else if (me.status === "LEFT" || me.status === "KICKED" || me.status === "GROUP_DISBANDED") {
                hasRestrictedStatus = true;
            }
        }

        console.log("[DEBUG_READD] Hydration check", {
            convId,
            hasMembers: selectedConv?.members?.length,
            hasRestrictedStatus,
            me: selectedConv?.members?.find((m) => Number(m.userId) === Number(currentUserId))
        });

        if (!hasRestrictedStatus && selectedConv?.members && selectedConv.members.length > 0) {
            console.log("[DEBUG_READD] Hydration skipped (already has members and no restricted status)");
            return;
        }

        let isCancelled = false;
        console.log("[DEBUG_READD] Fetching conversation detail for hydration", convId);

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
                
                console.log("[DEBUG_READD] Hydration fetched detail", {
                    convId,
                    detailNotice
                });

                setConversationReadOnlyNotices((prev) => {
                    const next = { ...prev };

                    if (detailNotice) {
                        next[convId] = detailNotice;
                        console.log("[DEBUG_READD] Setting conversationReadOnlyNotices during hydration", next);
                        return next;
                    }

                    if (convId in next) {
                        delete next[convId];
                        console.log("[DEBUG_READD] Clearing conversationReadOnlyNotices during hydration", next);
                    }

                    return next;
                });
            })
            .catch((error: unknown) => {
                if (isCancelled) return;
                
                // Nếu fetch detail trả về 403, nghĩa là user đã rời/bị kick khỏi nhóm
                // và backend không cho phép truy cập detail nữa.
                // Chúng ta phải set notice để UI chat window hiện khóa,
                // và ĐẶC BIỆT để sau này khi websocket mở khóa, nó tạo ra sự thay đổi state (từ có lỗi -> null).
                const response =
                    error &&
                    typeof error === "object" &&
                    "response" in error
                        ? (error as {
                              response?: { status?: number; data?: unknown };
                          }).response
                        : undefined;

                if (response?.status === 403) {
                    const data =
                        response.data &&
                        typeof response.data === "object"
                            ? (response.data as Record<string, unknown>)
                            : null;
                    const nestedData =
                        data?.data && typeof data.data === "object"
                            ? (data.data as Record<string, unknown>)
                            : null;
                    const directMessage = typeof data?.message === "string" ? data.message : null;
                    const nestedMessage = typeof nestedData?.message === "string" ? nestedData.message : null;
                    const springMessage = typeof data?.error === "string" ? data.error : null;
                    const finalServerMsg = directMessage || nestedMessage || springMessage;
                    
                    const notice = finalServerMsg || "Bạn không có quyền truy cập hội thoại này.";

                    setConversationReadOnlyNotices((prev) => ({
                        ...prev,
                        [convId]: notice,
                    }));
                }
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
        (
            conversationId: number,
            userId: number,
            preserveEmptyPendingRequests = false,
        ) => {
            const inFlight = refreshingConversationIdsRef.current;
            if (inFlight.has(conversationId)) return;

            inFlight.add(conversationId);
            chatService
                .getConversation(conversationId, userId)
                .then((response) => {
                    const responseData = response.data;
                    if (!response.success || !responseData) return;
                    const previousConversation =
                        chatRuntimeStore.getConversation(conversationId);
                    const nextResponseData =
                        preserveEmptyPendingRequests &&
                        Array.isArray(responseData.pendingRequests) &&
                        responseData.pendingRequests.length === 0
                            ? {
                                  ...responseData,
                                  pendingRequests:
                                      previousConversation?.pendingRequests ??
                                      responseData.pendingRequests,
                              }
                            : responseData;

                    chatRuntimeStore.setConversation(
                        conversationId,
                        nextResponseData,
                    );

                    setConversations((prev) => {
                        const existed = prev.some(
                            (conv) => conv.id === conversationId,
                        );
                        if (!existed) {
                            return sortConversationsByLastMessageAt([
                                nextResponseData,
                                ...prev,
                            ]);
                        }

                        return sortConversationsByLastMessageAt(
                            prev.map((conv) =>
                                conv.id === conversationId
                                    ? {
                                          ...conv,
                                          ...nextResponseData,
                                          lastMessage:
                                              nextResponseData.lastMessage ??
                                              conv.lastMessage,
                                          unreadCount:
                                              conv.unreadCount ??
                                              nextResponseData.unreadCount,
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

    const getProcessedJoinRequestId = useCallback(
        (conversation?: ConversationSnapshot): number | null => {
            const requestId = Number(conversation?.processedJoinRequestId);
            return Number.isFinite(requestId) ? requestId : null;
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
            const processedJoinRequestId =
                getProcessedJoinRequestId(conversationSnapshot);
            if (processedJoinRequestId !== null) {
                chatRuntimeStore.removePendingRequests(conversationId, {
                    requestIds: [processedJoinRequestId],
                });
                setConversations((prevConversations) =>
                    sortConversationsByLastMessageAt(
                        prevConversations.map((conversation) =>
                            conversation.id === conversationId
                                ? {
                                      ...conversation,
                                      pendingRequests:
                                          conversation.pendingRequests?.filter(
                                              (request) =>
                                                  Number(request.id) !==
                                                  processedJoinRequestId,
                                          ) ?? conversation.pendingRequests,
                                  }
                                : conversation,
                        ),
                    ),
                );
                return;
            }

            const isMyMessage = lastMessage.lastSenderId === latestUserId;
            const isViewingThisConversation =
                latestSelectedConversationId === conversationId;

            // BE set read:true chỉ khi thu hồi, read:false cho tin nhắn mới
            const isRecallUpdate = lastMessage.read === true;
            const shouldRefreshSnapshot = GROUP_SYSTEM_SYNC_TYPES.has(
                lastMessage.lastMessageType,
            );
            const shouldForceDetailRefresh =
                lastMessage.lastMessageType === "SYSTEM_UPDATE_ROLE" ||
                lastMessage.lastMessageType === "SYSTEM_UPDATE_SETTING" ||
                lastMessage.lastMessageType === "SYSTEM_REQUIRE_APPROVAL";
            const shouldPreserveEmptyPendingRequests =
                PRESERVE_EMPTY_PENDING_REQUEST_TYPES.has(
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
                    
                console.log("[DEBUG_READD] handleConversationUpdate notice eval", {
                    conversationId,
                    lastMessageType: lastMessage?.lastMessageType,
                    lastMessageContent: lastMessage?.lastMessageContent,
                    isUnlockingMessage,
                    snapshotReadOnlyNotice,
                    messageReadOnlyNotice
                });

                if (isUnlockingMessage) {
                    delete next[conversationId];
                    console.log("[DEBUG_READD] Cleared notice for unlocked message", next);
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
                    const pendingRequests =
                        conversationSnapshot?.pendingRequests &&
                        conversationSnapshot.pendingRequests.length > 0
                            ? [
                                  ...(conv.pendingRequests ?? []).filter(
                                      (request) =>
                                          !conversationSnapshot.pendingRequests?.some(
                                              (nextRequest) =>
                                                  nextRequest.id === request.id,
                                          ),
                                  ),
                                  ...conversationSnapshot.pendingRequests,
                              ]
                            : baseConversation.pendingRequests;

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
                        pendingRequests,
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

            if (
                shouldRefreshSnapshot &&
                (shouldForceDetailRefresh || !conversationSnapshot)
            ) {
                refreshConversationById(
                    conversationId,
                    latestUserId,
                    shouldPreserveEmptyPendingRequests,
                );
            }
        },
        [getProcessedJoinRequestId, refreshConversationById],
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

    const getDisplayInfo = useCallback(
        (conv: Conversation) => {
            return getConversationDisplayInfo(conv, currentUserId);
        },
        [currentUserId],
    );

    const formatTime = useCallback((dateString: string) => {
        // Format thời gian kiểu "now / 5m / 2h / 3d / 27 thg 1".
        // UI dùng format ngắn để giống các app chat phổ biến.
        return formatConversationTime(dateString);
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
