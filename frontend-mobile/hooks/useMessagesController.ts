import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_CHAT_USER_ID } from "@/constants/chat";
import chatService from "@/services/chatService";
import chatWebsocketService from "@/services/chatWebsocketService";
import chatRuntimeStore from "@/stores/chatRuntimeStore";
import type { Conversation, ConversationSidebar } from "@/types/chat";
import { useAppContext } from "@/context/AppContext";

// Module-level ref: track which conversation is currently open on screen.
// Set by useChatWindowController (via setActiveConversationId) when entering/leaving a chat.
// Mirrors web's selectedConversationIdRef (derived from URL) for unread logic.
const activeConversationIdRef = { current: null as number | null };
type UnlockListener = (conversationId: number) => void;
const unlockListeners = new Set<UnlockListener>();

function safeParseMemberIds(content: string): number[] {
    if (!content) return [];
    try {
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((value: any) => {
                if (typeof value === "object" && value !== null && "id" in value) {
                    return Number(value.id);
                }
                return Number(value);
            })
            .filter((value: number) => Number.isFinite(value));
    } catch {
        return [];
    }
}

export function setActiveConversationId(id: number | null): void {
    activeConversationIdRef.current = id;
}

export function onConversationUnlocked(listener: UnlockListener): () => void {
    unlockListeners.add(listener);
    return () => unlockListeners.delete(listener);
}

function emitConversationUnlocked(conversationId: number): void {
    for (const listener of unlockListeners) {
        listener(conversationId);
    }
}

function getConversationSortTime(conversation: Conversation): number {
    const lastMessageTime = conversation.lastMessage?.lastMessageAt
        ? new Date(conversation.lastMessage.lastMessageAt).getTime()
        : 0;
    const updatedAtTime = conversation.updatedAt
        ? new Date(conversation.updatedAt).getTime()
        : 0;

    return Math.max(lastMessageTime, updatedAtTime, 0);
}

function sortConversationsByLatest(
    conversations: Conversation[],
): Conversation[] {
    return [...conversations].sort(
        (a, b) => getConversationSortTime(b) - getConversationSortTime(a),
    );
}

function chooseLatestConversation(
    left: Conversation,
    right: Conversation,
): Conversation {
    const leftTime = getConversationSortTime(left);
    const rightTime = getConversationSortTime(right);

    if (rightTime > leftTime) return right;
    if (rightTime < leftTime) return left;

    // If timestamps are equal, preserve the higher unread value to avoid
    // stale runtime patches dropping bold/badge state.
    const leftUnread = left.unreadCount ?? 0;
    const rightUnread = right.unreadCount ?? 0;
    if (rightUnread > leftUnread) return right;
    if (rightUnread < leftUnread) return left;

    return right;
}

function mergeConversationsByFreshness(
    sources: Conversation[][],
): Conversation[] {
    const byId = new Map<number, Conversation>();

    for (const source of sources) {
        for (const conversation of source) {
            const previous = byId.get(conversation.id);
            if (!previous) {
                byId.set(conversation.id, conversation);
                continue;
            }

            byId.set(
                conversation.id,
                chooseLatestConversation(previous, conversation),
            );
        }
    }

    return sortConversationsByLatest(Array.from(byId.values()));
}

function toConversationFromSidebar(
    conversation: ConversationSidebar,
): Conversation {
    return { ...conversation };
}

export function useMessagesController() {
    const [searchQuery, setSearchQuery] = useState("");
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { currentUser } = useAppContext();
    const currentUserId = Number(currentUser?.id ?? 0);

    const currentUserIdRef = useRef(currentUserId);

    useEffect(() => {
        currentUserIdRef.current = currentUserId;
    }, [currentUserId]);

    const loadConversations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const cachedConversations = chatRuntimeStore.getAllConversations();
            if (cachedConversations.length > 0) {
                setConversations(
                    sortConversationsByLatest(cachedConversations),
                );
            }

            const response = await chatService.getConversations(currentUserId);
            if (response.success && response.data) {
                const sidebarConversations = response.data.map(
                    toConversationFromSidebar,
                );
                const merged = mergeConversationsByFreshness([
                    sidebarConversations,
                    chatRuntimeStore.getAllConversations(),
                ]);

                setConversations(merged);
                merged.forEach((conversation) => {
                    chatRuntimeStore.setConversation(
                        conversation.id,
                        conversation,
                    );
                });
                return;
            }

            setConversations([]);
            setError(response.message || "Khong the tai danh sach hoi thoai");
        } catch {
            setConversations([]);
            setError("Khong the tai danh sach hoi thoai");
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        void loadConversations();
    }, [loadConversations]);

    const handleConversationUpdate = useCallback(
        (
            conversationId: number,
            lastMessage: Conversation["lastMessage"],
            conversationSnapshot?: Conversation,
        ) => {
            if (!lastMessage) return;

            const latestUserId = currentUserIdRef.current;
            const normalizedSenderId = Number(lastMessage.lastSenderId);
            const isMyMessage = Number.isFinite(normalizedSenderId)
                ? normalizedSenderId === latestUserId
                : lastMessage.lastSenderId === latestUserId;
            const readFlagRaw =
                (
                    lastMessage as unknown as {
                        read?: unknown;
                        isRead?: unknown;
                    }
                ).read ??
                (
                    lastMessage as unknown as {
                        read?: unknown;
                        isRead?: unknown;
                    }
                ).isRead;
            const isReadUpdate =
                readFlagRaw === true ||
                readFlagRaw === "true" ||
                readFlagRaw === 1 ||
                readFlagRaw === "1";
            const normalizedLastMessage = {
                ...lastMessage,
                read: isReadUpdate,
            };

            const isUnlockingMessage =
                lastMessage.lastMessageType === "SYSTEM_ADD_MEMBER" &&
                safeParseMemberIds(lastMessage.lastMessageContent ?? "").some(
                    (id: string | number) => Number(id) === Number(latestUserId)
                );

            if (isUnlockingMessage) {
                emitConversationUnlocked(conversationId);
            }

            setConversations((prev) => {
                const exists = prev.some((conv) => conv.id === conversationId);
                if (!exists) {
                    if (conversationSnapshot) {
                        const unreadCountFromSnapshot =
                            conversationSnapshot.unreadCount ?? 0;
                        const nextUnreadCount =
                            isReadUpdate || isMyMessage
                                ? unreadCountFromSnapshot
                                : unreadCountFromSnapshot > 0
                                  ? unreadCountFromSnapshot
                                  : 1;

                        const snapshotWithLastMessage: Conversation = {
                            ...conversationSnapshot,
                            lastMessage:
                                conversationSnapshot.lastMessage ??
                                normalizedLastMessage,
                            unreadCount: nextUnreadCount,
                        };

                        chatRuntimeStore.setConversation(
                            conversationId,
                            snapshotWithLastMessage,
                        );

                        return sortConversationsByLatest([
                            snapshotWithLastMessage,
                            ...prev,
                        ]);
                    }

                    void chatService
                        .getConversation(conversationId, latestUserId)
                        .then((response) => {
                            const conversation = response.data;
                            if (!response.success || !conversation) return;

                            setConversations((innerPrev) => {
                                if (
                                    innerPrev.some(
                                        (conv) => conv.id === conversationId,
                                    )
                                ) {
                                    return innerPrev;
                                }

                                chatRuntimeStore.setConversation(
                                    conversation.id,
                                    conversation,
                                );

                                return sortConversationsByLatest([
                                    conversation,
                                    ...innerPrev,
                                ]);
                            });
                        })
                        .catch(() => undefined);

                    return prev;
                }

                // Kiểm tra xem user có đang mở conversation này không.
                // Giống web: nếu đang xem thì không tăng unreadCount.
                const isViewingThisConversation =
                    activeConversationIdRef.current === conversationId;

                const next = prev.map((conv) => {
                    if (conv.id !== conversationId) return conv;

                    const isGroup = conv.type === "GROUP";
                    const mergedSnapshot =
                        conversationSnapshot &&
                        conversationSnapshot.id === conversationId
                            ? { ...conversationSnapshot }
                            : undefined;

                    // Khi nhận được snapshot từ WebSocket, chúng ta phải giữ nguyên name và imageUrl hiện tại
                    // nếu đó là conversation nhóm và backend đang tự ý map thành tên cá nhân.
                    if (isGroup && mergedSnapshot) {
                        if (
                            mergedSnapshot.name !== undefined &&
                            mergedSnapshot.name !== null &&
                            !mergedSnapshot.name.trim()
                        ) {
                            mergedSnapshot.name = conv.name;
                        }
                        if (
                            mergedSnapshot.imageUrl !== undefined &&
                            mergedSnapshot.imageUrl !== null &&
                            !mergedSnapshot.imageUrl.trim()
                        ) {
                            mergedSnapshot.imageUrl = conv.imageUrl;
                        }
                    }

                    const baseConversation = mergedSnapshot
                        ? { ...conv, ...mergedSnapshot }
                        : conv;

                    let newUnreadCount: number;
                    if (isReadUpdate) {
                        // Thu hồi tin nhắn: giữ nguyên unreadCount hiện tại.
                        newUnreadCount = baseConversation.unreadCount || 0;
                    } else if (!isMyMessage) {
                        // Tin nhắn mới từ người khác:
                        // Đang xem conversation → reset 0; không xem → +1.
                        newUnreadCount = isViewingThisConversation
                            ? 0
                            : (baseConversation.unreadCount || 0) + 1;
                    } else {
                        // Tin nhắn của chính mình: không thay đổi unreadCount.
                        newUnreadCount = baseConversation.unreadCount || 0;
                    }

                    return {
                        ...baseConversation,
                        updatedAt: lastMessage.lastMessageAt,
                        lastMessage: normalizedLastMessage,
                        unreadCount: newUnreadCount,
                    };
                });

                const updatedConversation = next.find(
                    (conv) => conv.id === conversationId,
                );
                if (updatedConversation) {
                    chatRuntimeStore.setConversation(
                        conversationId,
                        updatedConversation,
                    );
                }

                return sortConversationsByLatest(next);
            });
        },
        [],
    );

    useEffect(() => {
        let disposed = false;
        let retryTimeout: ReturnType<typeof setTimeout> | null = null;

        const setup = async () => {
            try {
                if (disposed) return;

                const wasConnected = chatWebsocketService.isConnected();
                if (!wasConnected) {
                    await chatWebsocketService.connect();
                }

                if (disposed) return;

                chatWebsocketService.subscribeToUserConversations(
                    currentUserId,
                    handleConversationUpdate,
                );

                // Re-sync list once after (re)connect to recover events missed while offline.
                if (!wasConnected) {
                    void loadConversations();
                }
            } catch {
                if (!disposed) {
                    retryTimeout = setTimeout(() => {
                        void setup();
                    }, 2000);
                }
            }
        };

        void setup();

        return () => {
            disposed = true;
            if (retryTimeout) {
                clearTimeout(retryTimeout);
            }
            chatWebsocketService.unsubscribeFromUserConversations(
                currentUserId,
            );
        };
    }, [currentUserId, handleConversationUpdate, loadConversations]);

    const filteredConversations = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return conversations;

        return conversations.filter((conversation) => {
            const candidate = [
                conversation.name,
                conversation.lastMessage?.lastMessageContent,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return candidate.includes(query);
        });
    }, [conversations, searchQuery]);

    const clearUnreadCount = useCallback((conversationId: number) => {
        setConversations((prev) =>
            prev.map((conv) =>
                conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv,
            ),
        );

        chatRuntimeStore.patchConversation(conversationId, {
            unreadCount: 0,
        });
    }, []);

    const deleteConversationForMe = useCallback(
        async (conversationId: number) => {
            try {
                await chatService.deleteConversationForMe(
                    conversationId,
                    currentUserId,
                );

                setConversations((prev) =>
                    prev.filter((conv) => conv.id !== conversationId),
                );
            } catch {
                setError("Khong the xoa cuoc tro chuyen");
            }
        },
        [currentUserId],
    );

    return {
        searchQuery,
        setSearchQuery,
        conversations,
        filteredConversations,
        loading,
        error,
        currentUserId,
        clearUnreadCount,
        deleteConversationForMe,
        reload: loadConversations,
    };
}
