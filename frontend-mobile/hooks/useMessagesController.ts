import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import chatService, { isMaxPinLimitError } from "@/services/chatService";
import chatWebsocketService from "@/services/chatWebsocketService";
import chatRuntimeStore from "@/stores/chatRuntimeStore";
import type {
    Conversation,
    ConversationPin,
    ConversationSidebar,
    Message,
} from "@/types/chat";
import { useAppContext } from "@/context/AppContext";
import { useFocusEffect } from "@react-navigation/native";

// Module-level ref: track which conversation is currently open on screen.
// Set by useChatWindowController (via setActiveConversationId) when entering/leaving a chat.
// Mirrors web's selectedConversationIdRef (derived from URL) for unread logic.
const activeConversationIdRef = { current: null as number | null };
type UnlockListener = (conversationId: number) => void;
const unlockListeners = new Set<UnlockListener>();
const refreshingConversationIds = new Set<number>();

const GROUP_SYSTEM_SYNC_TYPES = new Set<Message["type"]>([
    "SYSTEM_CREATE_GROUP",
    "SYSTEM_ADD_MEMBER",
    "SYSTEM_UPDATE_ROLE",
    "SYSTEM_KICK_MEMBER",
    "SYSTEM_BLOCK_MEMBER",
    "SYSTEM_MEMBER_BLOCKED_FROM_JOIN",
    "SYSTEM_LEAVE_GROUP",
    "SYSTEM_DISBAND_GROUP",
    "SYSTEM_UPDATE_SETTING",
    "SYSTEM_REQUIRE_APPROVAL",
    "SYSTEM_JOIN_VIA_LINK",
]);

const PRESERVE_EMPTY_PENDING_REQUEST_TYPES = new Set<Message["type"]>([
    "SYSTEM_ADD_MEMBER",
    "SYSTEM_KICK_MEMBER",
    "SYSTEM_BLOCK_MEMBER",
    "SYSTEM_MEMBER_BLOCKED_FROM_JOIN",
    "SYSTEM_UPDATE_ROLE",
    "SYSTEM_UPDATE_SETTING",
    "SYSTEM_REQUIRE_APPROVAL",
    "SYSTEM_JOIN_VIA_LINK",
]);

const MAX_PINNED_CONVERSATIONS = 4;

function sortWithPinnedConversations(
    conversations: Conversation[],
    pinnedConversations: ConversationPin[],
): Conversation[] {
    const pinnedOrder = new Map(
        pinnedConversations.map((pin, index) => [pin.conversationId, index]),
    );

    return [...conversations].sort((left, right) => {
        const leftPinnedOrder = pinnedOrder.get(left.id);
        const rightPinnedOrder = pinnedOrder.get(right.id);

        if (leftPinnedOrder !== undefined && rightPinnedOrder !== undefined) {
            return leftPinnedOrder - rightPinnedOrder;
        }

        if (leftPinnedOrder !== undefined) return -1;
        if (rightPinnedOrder !== undefined) return 1;

        return 0;
    });
}

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

function mergeConversationDetails(
    preferred: Conversation,
    fallback: Conversation,
): Conversation {
    const preferredClearsPendingRequestsFromSync =
        preferred.lastMessage &&
        PRESERVE_EMPTY_PENDING_REQUEST_TYPES.has(
            preferred.lastMessage.lastMessageType,
        ) &&
        Array.isArray(preferred.pendingRequests) &&
        preferred.pendingRequests.length === 0;

    return {
        ...fallback,
        ...preferred,
        members: preferred.members ?? fallback.members,
        pinnedMessages: preferred.pinnedMessages ?? fallback.pinnedMessages,
        pendingRequests: preferredClearsPendingRequestsFromSync
            ? fallback.pendingRequests ?? preferred.pendingRequests
            : preferred.pendingRequests ?? fallback.pendingRequests,
        lastMessage: preferred.lastMessage ?? fallback.lastMessage,
        unreadCount: Math.max(preferred.unreadCount ?? 0, fallback.unreadCount ?? 0),
    };
}

function mergePendingRequestsForSocketUpdate(
    currentRequests: Conversation["pendingRequests"],
    incomingRequests: Conversation["pendingRequests"],
    lastMessageType: Message["type"],
): Conversation["pendingRequests"] {
    if (!incomingRequests) return currentRequests;

    if (
        PRESERVE_EMPTY_PENDING_REQUEST_TYPES.has(lastMessageType) &&
        incomingRequests.length === 0
    ) {
        return currentRequests ?? incomingRequests;
    }

    if (incomingRequests.length === 0) return incomingRequests;

    return [
        ...(currentRequests ?? []).filter(
            (request) =>
                !incomingRequests.some(
                    (nextRequest) => nextRequest.id === request.id,
                ),
        ),
        ...incomingRequests,
    ];
}

function chooseLatestConversation(
    left: Conversation,
    right: Conversation,
): Conversation {
    const leftTime = getConversationSortTime(left);
    const rightTime = getConversationSortTime(right);

    if (rightTime > leftTime) return mergeConversationDetails(right, left);
    if (rightTime < leftTime) return mergeConversationDetails(left, right);

    // If timestamps are equal, preserve the higher unread value to avoid
    // stale runtime patches dropping bold/badge state.
    const leftUnread = left.unreadCount ?? 0;
    const rightUnread = right.unreadCount ?? 0;
    if (rightUnread > leftUnread) return mergeConversationDetails(right, left);
    if (rightUnread < leftUnread) return mergeConversationDetails(left, right);

    return mergeConversationDetails(right, left);
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
    const {
        members: _members,
        pinnedMessages: _pinnedMessages,
        ...sidebarConversation
    } = conversation as Conversation;

    return { ...sidebarConversation };
}

function getProcessedJoinRequestId(
    conversation?: Conversation,
): number | null {
    const value = (
        conversation as (Conversation & { processedJoinRequestId?: unknown }) | undefined
    )?.processedJoinRequestId;
    const requestId = Number(value);
    return Number.isFinite(requestId) ? requestId : null;
}

export function useMessagesController() {
    const [searchQuery, setSearchQuery] = useState("");
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [pinnedConversations, setPinnedConversations] = useState<
        ConversationPin[]
    >([]);
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

            const [response, pins] = await Promise.all([
                chatService.getConversations(currentUserId),
                chatService.fetchPinnedConversations(),
            ]);
            setPinnedConversations(pins);
            if (response.success && response.data) {
                const sidebarConversations = response.data.map(
                    toConversationFromSidebar,
                );
                const merged = mergeConversationsByFreshness([
                    sidebarConversations,
                    chatRuntimeStore.getAllConversations(),
                ]);

                setConversations(sortWithPinnedConversations(merged, pins));
                merged.forEach((conversation) => {
                    chatRuntimeStore.setConversation(
                        conversation.id,
                        conversation,
                    );
                });
                return;
            }

            setConversations([]);
            setError(response.message || "Không thể tải danh sách hội thoại");
        } catch {
            setConversations([]);
            setError("Không thể tải danh sách hội thoại");
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        void loadConversations();
    }, [loadConversations]);

    const fetchPinnedConversations = useCallback(async () => {
        const pins = await chatService.fetchPinnedConversations();
        setPinnedConversations(pins);
        setConversations((prev) => sortWithPinnedConversations(prev, pins));
        return pins;
    }, []);

    const [onPinLimitReachedRef] = useState<{ current: ((conversationId: number) => void) | null }>({ current: null });

    const registerPinLimitCallback = useCallback(
        (cb: ((conversationId: number) => void) | null) => {
            onPinLimitReachedRef.current = cb;
        },
        [onPinLimitReachedRef],
    );

    const showMaxPinLimitAlert = useCallback(
        (conversationId: number) => {
            if (onPinLimitReachedRef.current) {
                onPinLimitReachedRef.current(conversationId);
            } else {
                Alert.alert(
                    "Thông báo",
                    `Bạn chỉ được ghim tối đa ${MAX_PINNED_CONVERSATIONS} cuộc hội thoại. Hãy bỏ ghim 1 cuộc hội thoại trước.`,
                );
            }
        },
        [onPinLimitReachedRef],
    );

    const pinConversation = useCallback(
        async (conversationId: number) => {
            const conversation = conversations.find(
                (item) => item.id === conversationId,
            );
            if (!conversation) return false;

            if (
                pinnedConversations.length >= MAX_PINNED_CONVERSATIONS &&
                !pinnedConversations.some(
                    (pin) => pin.conversationId === conversationId,
                )
            ) {
                showMaxPinLimitAlert(conversationId);
                return false;
            }

            const previousPins = pinnedConversations;
            const nextPins: ConversationPin[] = [
                {
                    conversationId,
                    pinnedAt: new Date().toISOString(),
                    conversation,
                },
                ...previousPins.filter(
                    (pin) => pin.conversationId !== conversationId,
                ),
            ];

            setPinnedConversations(nextPins);
            setConversations((prev) =>
                sortWithPinnedConversations(prev, nextPins),
            );

            try {
                const savedPin =
                    await chatService.pinConversation(conversationId);
                setPinnedConversations((currentPins) => {
                    const syncedPins = [
                        savedPin,
                        ...currentPins.filter(
                            (pin) => pin.conversationId !== conversationId,
                        ),
                    ];
                    setConversations((prev) =>
                        sortWithPinnedConversations(prev, syncedPins),
                    );
                    return syncedPins;
                });
                return true;
            } catch (error) {
                setPinnedConversations(previousPins);
                setConversations((prev) =>
                    sortWithPinnedConversations(prev, previousPins),
                );
                if (isMaxPinLimitError(error)) {
                    showMaxPinLimitAlert(conversationId);
                } else {
                    setError("Không thể ghim cuộc trò chuyện");
                }
                return false;
            }
        },
        [conversations, pinnedConversations, showMaxPinLimitAlert],
    );

    const unpinConversation = useCallback(
        async (conversationId: number) => {
            const previousPins = pinnedConversations;
            const nextPins = previousPins.filter(
                (pin) => pin.conversationId !== conversationId,
            );

            setPinnedConversations(nextPins);
            setConversations((prev) =>
                sortWithPinnedConversations(prev, nextPins),
            );

            try {
                await chatService.unpinConversation(conversationId);
                return true;
            } catch {
                setPinnedConversations(previousPins);
                setConversations((prev) =>
                    sortWithPinnedConversations(prev, previousPins),
                );
                setError("Không thể bỏ ghim cuộc trò chuyện");
                return false;
            }
        },
        [pinnedConversations],
    );

    const replacePinnedConversation = useCallback(
        async (conversationIdToUnpin: number, conversationIdToPin: number) => {
            if (conversationIdToUnpin === conversationIdToPin) return true;

            const conversation = conversations.find(
                (conv) => conv.id === conversationIdToPin,
            );
            if (!conversation) return false;

            const previousPins = pinnedConversations;
            const optimisticPin: ConversationPin = {
                conversationId: conversationIdToPin,
                pinnedAt: new Date().toISOString(),
                conversation,
            };
            const nextPins = [
                optimisticPin,
                ...previousPins.filter(
                    (pin) =>
                        pin.conversationId !== conversationIdToUnpin &&
                        pin.conversationId !== conversationIdToPin,
                ),
            ];

            setPinnedConversations(nextPins);
            setConversations((prev) =>
                sortWithPinnedConversations(prev, nextPins),
            );

            try {
                await chatService.unpinConversation(conversationIdToUnpin);
                const savedPin =
                    await chatService.pinConversation(conversationIdToPin);
                const syncedPins = [
                    savedPin,
                    ...nextPins.filter(
                        (pin) => pin.conversationId !== conversationIdToPin,
                    ),
                ];
                setPinnedConversations(syncedPins);
                setConversations((prev) =>
                    sortWithPinnedConversations(prev, syncedPins),
                );
                return true;
            } catch (error) {
                const pins = await chatService
                    .fetchPinnedConversations()
                    .catch(() => previousPins);
                setPinnedConversations(pins);
                setConversations((prev) =>
                    sortWithPinnedConversations(prev, pins),
                );
                if (isMaxPinLimitError(error)) {
                    showMaxPinLimitAlert(conversationIdToPin);
                }
                return false;
            }
        },
        [
            conversations,
            pinnedConversations,
            showMaxPinLimitAlert,
        ],
    );

    useEffect(() => {
        return chatRuntimeStore.subscribeConversationChanges(
            (updatedConversation) => {
                setConversations((prev) => {
                    const exists = prev.some(
                        (conversation) =>
                            conversation.id === updatedConversation.id,
                    );

                    if (!exists) {
                        return sortConversationsByLatest([
                            updatedConversation,
                            ...prev,
                        ]);
                    }

                    return sortConversationsByLatest(
                        prev.map((conversation) =>
                            conversation.id === updatedConversation.id
                                ? {
                                      ...conversation,
                                      ...updatedConversation,
                                      members:
                                          updatedConversation.members ??
                                          conversation.members,
                                      pinnedMessages:
                                          updatedConversation.pinnedMessages ??
                                          conversation.pinnedMessages,
                                      pendingRequests:
                                          updatedConversation.pendingRequests ??
                                          conversation.pendingRequests,
                                      lastMessage:
                                          updatedConversation.lastMessage ??
                                          conversation.lastMessage,
                                  }
                                : conversation,
                        ),
                    );
                });
            },
        );
    }, []);

    const refreshConversationById = useCallback(
        (
            conversationId: number,
            userId: number,
            memberSnapshotVersion?: number,
            preserveEmptyPendingRequests = false,
        ) => {
            if (!conversationId || !userId) return;

            if (refreshingConversationIds.has(conversationId)) return;

            refreshingConversationIds.add(conversationId);
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

                    const runtimeConversation = chatRuntimeStore.setConversation(
                        conversationId,
                        nextResponseData,
                        { memberSnapshotVersion },
                    );

                    setConversations((prev) => {
                        const exists = prev.some(
                            (conversation) =>
                                conversation.id === conversationId,
                        );

                        const nextConversation = exists
                            ? undefined
                            : runtimeConversation;

                        const next = exists
                            ? prev.map((conversation) =>
                                  conversation.id === conversationId
                                      ? mergeConversationDetails(
                                            runtimeConversation,
                                            conversation,
                                        )
                                      : conversation,
                              )
                            : [nextConversation!, ...prev];

                        return sortConversationsByLatest(next);
                    });
                })
                .catch(() => undefined)
                .finally(() => {
                    refreshingConversationIds.delete(conversationId);
                });
        },
        [],
    );

    const handleConversationUpdate = useCallback(
        (
            conversationId: number,
            lastMessage: Conversation["lastMessage"],
            conversationSnapshot?: Conversation,
        ) => {
            if (!lastMessage) return;

            const latestUserId = currentUserIdRef.current;
            const processedJoinRequestId =
                getProcessedJoinRequestId(conversationSnapshot);
            if (processedJoinRequestId !== null) {
                chatRuntimeStore.removePendingRequests(conversationId, {
                    requestIds: [processedJoinRequestId],
                });
                setConversations((prev) =>
                    sortConversationsByLatest(
                        prev.map((conversation) =>
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
            const shouldRefreshSnapshot = GROUP_SYSTEM_SYNC_TYPES.has(
                normalizedLastMessage.lastMessageType,
            );
            const shouldForceDetailRefresh =
                normalizedLastMessage.lastMessageType === "SYSTEM_UPDATE_ROLE";
            const shouldPreserveEmptyPendingRequests =
                PRESERVE_EMPTY_PENDING_REQUEST_TYPES.has(
                    normalizedLastMessage.lastMessageType,
                );
            const memberSnapshotVersion = shouldRefreshSnapshot
                ? chatRuntimeStore.markMembersChanging(conversationId)
                : undefined;

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

                        const runtimeConversation = chatRuntimeStore.setConversation(
                            conversationId,
                            snapshotWithLastMessage,
                            memberSnapshotVersion !== undefined
                                ? { memberSnapshotVersion }
                                : undefined,
                        );

                        return sortConversationsByLatest([
                            runtimeConversation,
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

                                const runtimeConversation =
                                    chatRuntimeStore.setConversation(
                                        conversation.id,
                                        conversation,
                                    );

                                return sortConversationsByLatest([
                                    runtimeConversation,
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
                    const pendingRequests =
                        mergedSnapshot &&
                        "pendingRequests" in mergedSnapshot
                            ? mergePendingRequestsForSocketUpdate(
                                  conv.pendingRequests,
                                  mergedSnapshot.pendingRequests,
                                  normalizedLastMessage.lastMessageType,
                              )
                            : baseConversation.pendingRequests;

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
                        pendingRequests,
                        updatedAt: lastMessage.lastMessageAt,
                        lastMessage: normalizedLastMessage,
                        unreadCount: newUnreadCount,
                    };
                });

                const updatedConversation = next.find(
                    (conv) => conv.id === conversationId,
                );
                let runtimeConversation: Conversation | null = null;
                if (updatedConversation) {
                    runtimeConversation = chatRuntimeStore.setConversation(
                        conversationId,
                        updatedConversation,
                        conversationSnapshot &&
                            memberSnapshotVersion !== undefined
                            ? { memberSnapshotVersion }
                            : undefined,
                    );
                }

                if (!runtimeConversation) {
                    return sortConversationsByLatest(next);
                }

                return sortConversationsByLatest(
                    next.map((conv) =>
                        conv.id === conversationId
                            ? mergeConversationDetails(
                                  runtimeConversation!,
                                  conv,
                              )
                            : conv,
                    ),
                );
            });

            if (
                shouldRefreshSnapshot &&
                (shouldForceDetailRefresh ||
                    !conversationSnapshot ||
                    !conversationSnapshot.members)
            ) {
                refreshConversationById(
                    conversationId,
                    latestUserId,
                    memberSnapshotVersion,
                    shouldPreserveEmptyPendingRequests,
                );
            }
        },
        [refreshConversationById],
    );

    useFocusEffect(
        useCallback(() => {
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

                    // Re-sync when the screen regains focus so stack screens
                    // don't keep stale members/roles after child screens update.
                    void loadConversations();
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
                    handleConversationUpdate,
                );
            };
        }, [currentUserId, handleConversationUpdate, loadConversations]),
    );

    const filteredConversations = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const source = sortWithPinnedConversations(
            conversations,
            pinnedConversations,
        );
        if (!query) return source;

        return source.filter((conversation) => {
            const candidate = [
                conversation.name,
                conversation.lastMessage?.lastMessageContent,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return candidate.includes(query);
        });
    }, [conversations, pinnedConversations, searchQuery]);

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
            setError("Không thể xóa cuộc trò chuyện");
            }
        },
        [currentUserId],
    );

    const hideConversationForMe = useCallback(
        async (conversationId: number) => {
            try {
                await chatService.hideConversationForMe(
                    conversationId,
                    currentUserId,
                );

                setConversations((prev) =>
                    prev.filter((conv) => conv.id !== conversationId),
                );
            } catch {
                setError("Không thể ẩn cuộc trò chuyện");
            }
        },
        [currentUserId],
    );

    return {
        searchQuery,
        setSearchQuery,
        conversations,
        pinnedConversations,
        isPinLimitReached:
            pinnedConversations.length >= MAX_PINNED_CONVERSATIONS,
        filteredConversations,
        loading,
        error,
        currentUserId,
        clearUnreadCount,
        pinConversation,
        unpinConversation,
        replacePinnedConversation,
        fetchPinnedConversations,
        deleteConversationForMe,
        hideConversationForMe,
        reload: loadConversations,
        registerPinLimitCallback,
        maxPinnedConversations: MAX_PINNED_CONVERSATIONS,
    };
}
