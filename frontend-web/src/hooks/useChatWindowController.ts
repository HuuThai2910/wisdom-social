import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import chatService, {
    type Conversation,
    type Message,
    type MessageType,
    type SendMessageRequest,
} from "../services/chatService";
import websocketService, { type MessageSeenEvent, type TypingEvent } from "../services/websocket";
import { DEFAULT_AVATAR_SMALL_URL, DEFAULT_AVATAR_URL } from "../constants/ui";

/**
 * Các hằng số điều khiển UX & paging.
 * - PAGE_SIZE: số tin nhắn mỗi lần tải.
 * - NEAR_BOTTOM_THRESHOLD_PX: ngưỡng để coi user đang "gần cuối" (phục vụ auto-scroll).
 * - LOAD_MORE_TRIGGER_PX: khi scrollTop < ngưỡng => tải thêm tin nhắn cũ.
 * - SCROLLABLE_EPSILON_PX: sai số nhỏ để kiểm tra container có thật sự scroll được.
 */
const PAGE_SIZE = 20;
const NEAR_BOTTOM_THRESHOLD_PX = 200;
const LOAD_MORE_TRIGGER_PX = 100;
const SCROLLABLE_EPSILON_PX = 2;
const MARK_AS_READ_DEBOUNCE_MS = 1000; // Debounce 1 giây cho API markAsRead

type LoadMoreOptions = { keepAtBottom?: boolean };

/**
 * Interface cho read receipt - lưu thông tin "đã xem" của mỗi user
 */
export interface ReadReceipt {
    userId: number;
    lastMessageId: string;
    seenAt: string;
}

function getConversationDisplayInfo(
    conversation: Conversation,
    userId: number,
) {
    const displayName =
        conversation.type === "GROUP"
            ? conversation.name
            : conversation.members?.find((m) => m.userId !== userId)
                ?.nickname || "Unknown";

    const displayAvatar =
        conversation.type === "GROUP"
            ? conversation.imageUrl
            : conversation.members?.find((m) => m.userId !== userId)?.avatar;

    return { displayName, displayAvatar };
}

/**
 * useChatWindowController
 * - Controller hook cho ChatWindow: fetch conversation/messages (cursor), websocket realtime.
 * - Quản lý UX scroll: mở chat xuống cuối, load thêm khi kéo lên, auto-scroll có điều kiện.
 * - Có chống race/stale-closure (token/ref) để tránh bug khi đổi hội thoại nhanh.
 *
 * Gợi ý đọc nhanh: xem các comment ngay cạnh từng section/handler (scroll, paging, ws).
 */
export function useChatWindowController(args: {
    conversationId: number;
    userId: number;
    onMarkAsRead?: (conversationId: number) => void; // Callback để clear unreadCount ở sidebar
}) {
    const { conversationId, userId, onMarkAsRead } = args;

    // ====== UI State (render) ======
    const [messageText, setMessageText] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);

    // ====== Ghi âm tin nhắn thoại (Voice recording) ======
    // isRecording: true nếu đang ghi âm, dùng để hiện overlay ghi âm trong UI
    const [isRecording, setIsRecording] = useState(false);
    // recordingDuration: thời lượng ghi âm tính bằng giây, hiện dạng MM:SS
    const [recordingDuration, setRecordingDuration] = useState(0);
    // mediaRecorderRef: ref đến MediaRecorder instance đang hoạt động
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    // audioChunksRef: mảng các Blob chứa dữ liệu audio từ ondataavailable
    const audioChunksRef = useRef<Blob[]>([]);
    // recordingTimerRef: interval timer để tăng recordingDuration mỗi giây
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(
        null,
    );

    // ====== Read Receipt (Đánh dấu đã đọc) ======
    // readReceipts: danh sách thông tin "đã xem" của các members (trừ user hiện tại)
    const [readReceipts, setReadReceipts] = useState<ReadReceipt[]>([]);
    // markAsReadTimeoutRef: debounce timer cho API markAsRead
    const markAsReadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ====== Typing Indicator (Đang soạn tin nhắn) ======
    // typingUsers: Map<userId, timeoutId> - Track users đang gõ và timeout để auto-clear
    const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
    // typingTimeouts: Map để lưu timeout ID cho mỗi user, tự động xóa sau 10s nếu không có update
    const typingTimeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
    // isTypingSent: Track xem đã gửi signal isTyping=true chưa (tránh spam)
    const isTypingSentRef = useRef(false);
    // typingTimeoutRef: Timeout để gửi isTyping=false sau 10s không gõ
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // scrollPositionBeforeTypingRef: Lưu vị trí scroll trước khi scroll vì typing indicator
    const scrollPositionBeforeTypingRef = useRef<number | null>(null);
    // messagesLengthWhenTypingRef: Số tin nhắn khi typing indicator xuất hiện (để detect tin mới)
    const messagesLengthWhenTypingRef = useRef<number>(0);
    // shouldScrollOnMediaLoadRef: Flag để force scroll khi media của tin nhắn mới load xong
    // Set true khi nhận tin nhắn mới (của mình hoặc khi đang ở cuối), reset sau 2s
    const shouldScrollOnMediaLoadRef = useRef(false);
    // shouldScrollOnMediaLoadTimerRef: Timer để reset shouldScrollOnMediaLoadRef
    const shouldScrollOnMediaLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [error, setError] = useState<string | null>(null);

    // Toast ngắn cho lỗi thu hồi (tự biến mất sau 2 giây)
    const [recallToast, setRecallToast] = useState<string | null>(null);
    const recallToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );

    // Tự động xoá toast sau 2s, dọn timer cũ nếu toast xuất hiện lại sớm
    useEffect(() => {
        if (!recallToast) return;
        if (recallToastTimerRef.current)
            clearTimeout(recallToastTimerRef.current);
        recallToastTimerRef.current = setTimeout(() => {
            setRecallToast(null);
            recallToastTimerRef.current = null;
        }, 2000);
        return () => {
            if (recallToastTimerRef.current)
                clearTimeout(recallToastTimerRef.current);
        };
    }, [recallToast]);

    // UX: nút xuống cuối + số tin mới chưa xem khi user không ở near-bottom.
    const [showScrollToBottomButton, setShowScrollToBottomButton] =
        useState(false);
    const [pendingNewMessages, setPendingNewMessages] = useState(0);

    // ====== Cursor pagination ======
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);

    // Refs: DOM anchors cho scroll.
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // userIdRef dùng cho websocket callback (tránh stale closure nếu userId thay đổi).
    const userIdRef = useRef(userId);

    // autoFillPendingRef: chặn việc auto-fill gọi liên tiếp (tránh spam loadMore).
    const autoFillPendingRef = useRef(false);

    // loadTokenRef: token tăng dần để bỏ qua kết quả API của request "cũ".
    const loadTokenRef = useRef(0);

    // scrollOnNextRenderRef: cờ yêu cầu scroll xuống cuối sau khi render xong.
    const scrollOnNextRenderRef = useRef<ScrollBehavior | null>(null);

    // initialLoadRef: cờ đánh dấu đang trong giai đoạn load ban đầu (F5/mở chat).
    // Trong giai đoạn này, luôn scroll xuống cuối khi media load (bất kể vị trí hiện tại).
    // Reset khi user scroll lên.
    const initialLoadRef = useRef(true);

    // lastScrollTopRef: track scroll position để phát hiện user scroll lên
    const lastScrollTopRef = useRef(0);

    // loadMoreRequestedRef: ngăn gọi API duplicate khi scroll
    const loadMoreRequestedRef = useRef(false);

    useEffect(() => {
        // Đồng bộ ref mỗi khi userId thay đổi.
        userIdRef.current = userId;
    }, [userId]);

    const isNearBottom = useCallback(
        (thresholdPx = NEAR_BOTTOM_THRESHOLD_PX) => {
            const container = messagesContainerRef.current;
            if (!container) return true;
            // distanceFromBottom càng nhỏ => càng gần đáy.
            const distanceFromBottom =
                container.scrollHeight -
                container.scrollTop -
                container.clientHeight;
            return distanceFromBottom < thresholdPx;
        },
        [],
    );

    const scrollToBottom = useCallback(
        (behavior: ScrollBehavior = "smooth") => {
            const container = messagesContainerRef.current;
            if (container) {
                // Ưu tiên scroll container (ổn định hơn scrollIntoView nếu layout phức tạp).
                container.scrollTo({ top: container.scrollHeight, behavior });
                return;
            }
            messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
        },
        [],
    );

    // Thực thi scroll *sau render* để tránh trường hợp:
    // - setMessages vừa chạy nhưng DOM chưa update scrollHeight
    // - hoặc đang prepend (loadingMore) gây nhảy position.
    useLayoutEffect(() => {
        const behavior = scrollOnNextRenderRef.current;
        if (!behavior) return;
        if (loadingMore) return;

        scrollOnNextRenderRef.current = null;
        requestAnimationFrame(() => {
            scrollToBottom(behavior);
            if (behavior === "auto") {
                setTimeout(() => scrollToBottom("auto"), 50);
            }
        });
    }, [loadingMore, messages.length, scrollToBottom]);

    const loadConversation = useCallback(
        async (token: number) => {
            try {
                // Tải metadata của hội thoại (tên, members, avatar, ...).
                const conv = await chatService.getConversation(
                    conversationId,
                    userId,
                );

                if (token !== loadTokenRef.current) return;
                if (conv.success && conv.data) {
                    setConversation(conv.data);

                    console.log("🔍 DEBUG - Conversation data:", {
                        conversationId,
                        userId,
                        members: conv.data.members,
                    });

                    // Khôi phục readReceipts từ conversation members
                    // Parse lastReadMessageId từ các members (trừ chính mình)
                    const initialReceipts: ReadReceipt[] = (conv.data.members || [])
                        .filter((m) => {
                            const shouldInclude = m.userId !== userId && m.lastReadMessageId;
                            console.log(`🔍 Member ${m.userId}: userId=${m.userId}, lastReadMessageId=${m.lastReadMessageId}, shouldInclude=${shouldInclude}`);
                            return shouldInclude;
                        })
                        .map((m) => ({
                            userId: m.userId,
                            lastMessageId: m.lastReadMessageId!,
                            seenAt: new Date().toISOString(), // Backend không lưu seenAt, dùng giá trị mặc định
                        }));

                    console.log("📚 Khôi phục readReceipts từ conversation:", initialReceipts);
                    setReadReceipts(initialReceipts);
                } else {
                    setConversation(null);
                    setError(conv.message || "Không thể tải cuộc trò chuyện");
                }
            } catch {
                if (token !== loadTokenRef.current) return;
                setConversation(null);
                setError("Không thể tải cuộc trò chuyện");
            }
        },
        [conversationId, userId],
    );

    const loadMessages = useCallback(
        async (token: number, markAsReadFn?: (lastMessageId: string) => void) => {
            try {
                setError(null);
                setLoading(true);

                // Initial load: lấy trang tin nhắn mới nhất (theo backend cursor API).
                const response = await chatService.getMessages(
                    conversationId,
                    userId,
                    null,
                    PAGE_SIZE,
                );

                if (token !== loadTokenRef.current) return;

                const cursorData = response?.success ? response.data : null;
                const list = Array.isArray(cursorData?.data)
                    ? cursorData!.data
                    : [];
                console.log(list.at(-1));

                setMessages(list);
                setNextCursor(cursorData?.nextCursor ?? null);
                setHasMore(Boolean(cursorData?.hasNext));

                // Khi mở chat, ưu tiên nhảy xuống tin mới nhất.
                scrollOnNextRenderRef.current = "auto";

                // Đánh dấu đã đọc tin nhắn mới nhất khi mở chat
                const lastMessage = list.at(-1);
                if (lastMessage && markAsReadFn) {
                    markAsReadFn(lastMessage.id);
                }
            } catch {
                if (token !== loadTokenRef.current) return;
                setMessages([]);
                setError("Không thể tải tin nhắn");
            } finally {
                if (token === loadTokenRef.current) {
                    setLoading(false);
                }
            }
        },
        [conversationId, userId],
    );

    const loadMoreMessages = useCallback(
        async (options?: LoadMoreOptions) => {
            // Guard: ngăn gọi API duplicate
            if (!hasMore || loadingMore || !nextCursor) return;
            if (loadMoreRequestedRef.current) return;

            loadMoreRequestedRef.current = true;
            const keepAtBottom = Boolean(options?.keepAtBottom);
            const token = loadTokenRef.current;

            try {
                setLoadingMore(true);

                // Lưu scroll position trước khi load
                const container = messagesContainerRef.current;
                const prevScrollHeight = container?.scrollHeight ?? 0;
                const prevScrollTop = container?.scrollTop ?? 0;

                // Load trang cũ hơn (before=nextCursor).
                const response = await chatService.getMessages(
                    conversationId,
                    userId,
                    nextCursor,
                    PAGE_SIZE,
                );

                if (token !== loadTokenRef.current) return;

                const cursorData = response?.success ? response.data : null;
                const older = Array.isArray(cursorData?.data)
                    ? cursorData!.data
                    : [];

                setMessages((prev) => [...older, ...prev]);
                setNextCursor(cursorData?.nextCursor ?? null);
                setHasMore(Boolean(cursorData?.hasNext));

                if (keepAtBottom) {
                    // Auto-fill: luôn giữ user ở cuối để không mất ngữ cảnh.
                    scrollOnNextRenderRef.current = "auto";
                    setShowScrollToBottomButton(false);
                    setPendingNewMessages(0);
                } else {
                    // Prepend tin cũ: giữ nguyên vị trí nhìn
                    // Dùng nhiều lần adjustment để handle images load sau
                    const adjustScroll = () => {
                        const current = messagesContainerRef.current;
                        if (!current) return;
                        const delta = current.scrollHeight - prevScrollHeight;
                        if (delta > 0) {
                            current.scrollTop = prevScrollTop + delta;
                            // Cập nhật lastScrollTopRef để không bị detect là scroll up
                            lastScrollTopRef.current = current.scrollTop;
                        }
                    };

                    // Chạy adjustment nhiều lần để handle async image loading
                    requestAnimationFrame(adjustScroll);
                    setTimeout(adjustScroll, 100);
                    setTimeout(adjustScroll, 300);
                }
            } catch {
                setError("Không thể tải thêm tin nhắn");
            } finally {
                if (token === loadTokenRef.current) {
                    setLoadingMore(false);
                }
                // Reset guard sau khi hoàn thành (delay để tránh trigger lại ngay)
                setTimeout(() => {
                    loadMoreRequestedRef.current = false;
                }, 500);
            }
        },
        [conversationId, hasMore, loadingMore, nextCursor, userId],
    );

    useEffect(() => {
        // Auto-fill chỉ chạy khi:
        // - đã load xong initial (loading=false)
        // - backend nói còn hasMore
        // - container chưa scrollable (ít tin quá)
        // Mục tiêu: tránh tình trạng UI không scroll được nhưng user vẫn muốn xem "gần đây".
        if (loading) return;
        if (!hasMore || loadingMore || !nextCursor) return;
        if (autoFillPendingRef.current) return;

        const container = messagesContainerRef.current;
        if (!container) return;

        const canScroll =
            container.scrollHeight >
            container.clientHeight + SCROLLABLE_EPSILON_PX;
        if (canScroll) return;

        autoFillPendingRef.current = true;
        loadMoreMessages({ keepAtBottom: true }).finally(() => {
            autoFillPendingRef.current = false;
        });
    }, [
        hasMore,
        loadMoreMessages,
        loading,
        loadingMore,
        messages.length,
        nextCursor,
    ]);

    const handleNewMessage = useCallback(
        (newMessage: Message, markAsReadFn?: (lastMessageId: string) => void) => {
            const isMyMessage =
                Number(newMessage.senderId) === Number(userIdRef.current);
            const currentlyNearBottom = isNearBottom();

            setMessages((prev) => {
                if (prev.some((m) => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
            });

            if (isMyMessage || currentlyNearBottom) {
                // Người gửi: luôn cuộn xuống cuối bất kể đang ở đâu
                // Người nhận: cuộn nếu đang ở gần cuối
                scrollOnNextRenderRef.current = "smooth";
                setShowScrollToBottomButton(false);
                setPendingNewMessages(0);

                // Set flag để force scroll khi media load xong (cho IMAGE/VIDEO)
                // Cần làm này vì khi scroll xuống cuối, media chưa load → chiều cao chưa đúng
                // Sau khi media load xong, chiều cao tăng → scroll position bị đẩy lên
                // isNearBottom() sẽ trả về false → không scroll
                if (newMessage.type === "IMAGE" || newMessage.type === "VIDEO") {
                    // Clear timer cũ nếu có
                    if (shouldScrollOnMediaLoadTimerRef.current) {
                        clearTimeout(shouldScrollOnMediaLoadTimerRef.current);
                    }
                    shouldScrollOnMediaLoadRef.current = true;
                    // Reset flag sau 3s (đủ thời gian cho media load)
                    shouldScrollOnMediaLoadTimerRef.current = setTimeout(() => {
                        shouldScrollOnMediaLoadRef.current = false;
                    }, 3000);
                }

                // Đánh dấu đã đọc tin nhắn mới nếu user đang ở gần cuối (đang đọc)
                // Không đánh dấu nếu là tin nhắn của chính mình (đã được backend xử lý)
                if (!isMyMessage && markAsReadFn) {
                    markAsReadFn(newMessage.id);
                }
            } else {
                // Người nhận không ở cuối: chỉ hiện nút + đếm tin chưa xem
                setShowScrollToBottomButton(true);
                setPendingNewMessages((c) => c + 1);
            }
        },
        [isNearBottom],
    );
    // Nhận socket MESSAGE_RECALLED: set isRecalled=true cho tin nhắn đó
    const handleMessageRecalled = useCallback((messageId: string) => {
        setMessages((prev) =>
            prev.map((m) =>
                m.id === messageId ? { ...m, isRecalled: true } : m,
            ),
        );
    }, []);

    // Gọi API thu hồi tin nhắn (chỉ người gửi, trong 24h)
    const handleRecall = useCallback(
        async (messageId: string) => {
            // Kiểm tra 24h ở FE trước để tránh round-trip không cần thiết
            const msg = messages.find((m) => m.id === messageId);
            if (msg) {
                const elapsed = Date.now() - new Date(msg.createdAt).getTime();
                if (elapsed > 24 * 60 * 60 * 1000) {
                    setRecallToast(
                        "Chỉ có thể thu hồi tin nhắn trong vòng 24 giờ",
                    );
                    return;
                }
            }
            try {
                await chatService.recallMessage(messageId, userId);
            } catch {
                setRecallToast("Không thể thu hồi tin nhắn");
            }
        },
        [messages, userId],
    );

    // Xóa tin nhắn ở phía tôi (chỉ local, không ảnh hưởng người khác)
    const handleDeleteMessageForMe = useCallback(
        async (messageId: string) => {
            try {
                await chatService.deleteMessageForMe(messageId, userId);
                // API 200 OK → xóa tin nhắn khỏi local state
                setMessages((prev) => prev.filter((m) => m.id !== messageId));
            } catch {
                setRecallToast("Không thể xóa tin nhắn");
            }
        },
        [userId],
    );

    // Xóa cuộc trò chuyện ở phía tôi (xóa lịch sử chat)
    const handleDeleteConversationForMe = useCallback(async () => {
        try {
            await chatService.deleteConversationForMe(conversationId, userId);
            // API 200 OK → xóa toàn bộ tin nhắn khỏi local state
            setMessages([]);
            setHasMore(false);
            setNextCursor(null);
        } catch {
            setRecallToast("Không thể xóa cuộc trò chuyện");
        }
    }, [conversationId, userId]);

    /**
     * markAsRead - Đánh dấu đã đọc tin nhắn (với debounce)
     *
     * @param lastMessageId - ID của tin nhắn mới nhất mà user đang nhìn thấy
     *
     * Flow:
     * 1. Debounce 1 giây để tránh spam API khi nhiều tin nhắn liên tiếp
     * 2. Gọi API PUT /conversations/{id}/read?lastMessageId=xxx
     * 3. Nếu thành công, gọi callback onMarkAsRead để clear unreadCount ở sidebar
     */
    const markAsRead = useCallback(
        (lastMessageId: string) => {
            console.log("📖 markAsRead called with messageId:", lastMessageId);

            // Clear timeout cũ nếu có
            if (markAsReadTimeoutRef.current) {
                clearTimeout(markAsReadTimeoutRef.current);
                console.log("⏱️  Cleared previous debounce timer");
            }

            // Debounce: chỉ gọi API sau khoảng thời gian delay
            markAsReadTimeoutRef.current = setTimeout(async () => {
                console.log("🚀 Calling markAsRead API...", {
                    conversationId,
                    userId,
                    lastMessageId,
                });

                try {
                    await chatService.markAsRead(conversationId, userId, lastMessageId);
                    console.log("✅ markAsRead API success");
                    // Gọi callback để clear unreadCount ở sidebar
                    onMarkAsRead?.(conversationId);
                } catch (err) {
                    console.error("❌ Failed to mark as read:", err);
                }
            }, MARK_AS_READ_DEBOUNCE_MS);
        },
        [conversationId, userId, onMarkAsRead],
    );

    /**
     * handleMessageSeen - Xử lý khi nhận được event "Người khác đã xem"
     *
     * @param event - MessageSeenEvent từ WebSocket
     *
     * Flow:
     * 1. Trích xuất payload từ messageSeenResponse
     * 2. Kiểm tra event có thuộc conversation đang mở không
     * 3. Bỏ qua nếu event là của chính user hiện tại (vì user đã biết mình đã xem)
     * 4. Cập nhật readReceipts: di chuyển avatar của user trong event xuống tin nhắn mới
     */
    const handleMessageSeen = useCallback(
        (event: MessageSeenEvent) => {
            console.log("📨 Received MESSAGE_SEEN event:", event);

            // Trích xuất payload từ messageSeenResponse
            const { conversationId: eventConvId, userId: eventUserId, lastMessageId, seenAt } = event.messageSeenResponse;

            console.log("📨 Parsed payload:", { eventConvId, eventUserId, lastMessageId, seenAt });
            console.log("📨 Current state:", { currentConvId: conversationId, currentUserId: userId });

            // Bỏ qua nếu không phải conversation đang mở
            if (Number(eventConvId) !== Number(conversationId)) {
                console.log("❌ Event không thuộc conversation đang mở");
                return;
            }
            // Bỏ qua event của chính mình
            if (Number(eventUserId) === Number(userId)) {
                console.log("❌ Event của chính mình, bỏ qua");
                return;
            }

            console.log("✅ Cập nhật readReceipts cho user:", eventUserId);

            setReadReceipts((prev) => {
                // Tìm xem user này đã có trong readReceipts chưa
                const existingIndex = prev.findIndex((r) => r.userId === Number(eventUserId));

                const newReceipt: ReadReceipt = {
                    userId: Number(eventUserId),
                    lastMessageId: lastMessageId,
                    seenAt: seenAt,
                };

                if (existingIndex >= 0) {
                    // Update vị trí đã xem
                    const updated = [...prev];
                    updated[existingIndex] = newReceipt;
                    console.log("📝 Updated readReceipts:", updated);
                    return updated;
                } else {
                    // Thêm mới
                    const newList = [...prev, newReceipt];
                    console.log("📝 Added new readReceipt:", newList);
                    return newList;
                }
            });
        },
        [conversationId, userId],
    );

    /**
     * handleTyping - Xử lý khi nhận được event "Đang gõ tin nhắn"
     *
     * @param event - TypingEvent từ WebSocket
     *
     * Flow:
     * 1. Trích xuất payload từ typingResponse
     * 2. Kiểm tra event có thuộc conversation đang mở không
     * 3. Bỏ qua nếu event là của chính user hiện tại
     * 4. Nếu isTyping=true: Thêm userId vào typingUsers Set và set timeout 10s để auto-clear
     * 5. Nếu isTyping=false: Xóa userId khỏi typingUsers Set và clear timeout
     */
    const handleTyping = useCallback(
        (event: TypingEvent) => {
            console.log("⌨️ Received TYPING event from WebSocket:", event);

            const { conversationId: eventConvId, userId: eventUserId, isTyping } = event.typingResponse;

            // Bỏ qua nếu không phải conversation đang mở
            if (Number(eventConvId) !== Number(conversationId)) return;
            // Bỏ qua event của chính mình
            if (Number(eventUserId) === Number(userId)) return;

            console.log("⌨️ TYPING event:", { eventUserId, isTyping });

            if (isTyping) {
                // Clear timeout cũ nếu có
                const existingTimeout = typingTimeoutsRef.current.get(Number(eventUserId));
                if (existingTimeout) {
                    clearTimeout(existingTimeout);
                }

                // Thêm user vào Set đang gõ
                setTypingUsers((prev) => new Set(prev).add(Number(eventUserId)));

                // Set timeout 10s để auto-clear (phòng trường hợp user rớt mạng)
                const timeoutId = setTimeout(() => {
                    setTypingUsers((prev) => {
                        const next = new Set(prev);
                        next.delete(Number(eventUserId));
                        return next;
                    });
                    typingTimeoutsRef.current.delete(Number(eventUserId));
                }, 10000);

                typingTimeoutsRef.current.set(Number(eventUserId), timeoutId);
            } else {
                // Clear timeout
                const existingTimeout = typingTimeoutsRef.current.get(Number(eventUserId));
                if (existingTimeout) {
                    clearTimeout(existingTimeout);
                    typingTimeoutsRef.current.delete(Number(eventUserId));
                }

                // Xóa user khỏi Set
                setTypingUsers((prev) => {
                    const next = new Set(prev);
                    next.delete(Number(eventUserId));
                    return next;
                });
            }
        },
        [conversationId, userId],
    );

    /**
     * sendTypingSignal - Gửi signal "đang gõ" lên backend
     *
     * @param isTyping - true nếu đang gõ, false nếu ngừng gõ
     *
     * Logic chống SPAM:
     * - Chỉ gửi isTyping=true MỘT LẦN khi bắt đầu gõ
     * - Không gửi lại khi đang gõ liên tục
     * - Gửi isTyping=false khi: Enter/Input rỗng/Blur/10s không gõ
     */
    const sendTypingSignal = useCallback(
        (isTyping: boolean) => {
            console.log("⌨️ sendTypingSignal called:", { conversationId, userId, isTyping, alreadySent: isTypingSentRef.current });

            if (!conversationId || !userId) {
                console.warn("⌨️ Missing conversationId or userId, skipping typing signal");
                return;
            }

            if (isTyping) {
                // Chỉ gửi nếu chưa gửi trước đó
                if (!isTypingSentRef.current) {
                    websocketService.sendTypingSignal(conversationId, userId, true);
                    isTypingSentRef.current = true;
                    console.log("⌨️ Sent typing=true");
                }

                // Clear timeout cũ
                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                }

                // Set timeout 10s để tự động gử false
                typingTimeoutRef.current = setTimeout(() => {
                    websocketService.sendTypingSignal(conversationId, userId, false);
                    isTypingSentRef.current = false;
                    console.log("⌨️ Sent typing=false (10s timeout)");
                }, 10000);
            } else {
                // Clear timeout
                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = null;
                }

                // Gửi signal false (chỉ nếu đã gửi true trước đó)
                if (isTypingSentRef.current) {
                    websocketService.sendTypingSignal(conversationId, userId, false);
                    isTypingSentRef.current = false;
                    console.log("⌨️ Sent typing=false");
                }
            }
        },
        [conversationId, userId],
    );

    /**
     * useEffect: Xử lý scroll khi typing indicator hiện/mất
     *
     * Logic:
     * 1. Khi có người đang gõ (typingUsers.size > 0) và user đang ở cuối (isNearBottom):
     *    - Lưu vị trí scroll hiện tại
     *    - Scroll xuống để thấy typing indicator
     *
     * 2. Khi không còn ai gõ (typingUsers.size = 0):
     *    - Nếu KHÔNG có tin nhắn mới → restore về vị trí cũ
     *    - Nếu CÓ tin nhắn mới → giữ nguyên ở cuối (handleNewMessage đã xử lý)
     */
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        if (typingUsers.size > 0) {
            // Có người đang gõ
            if (scrollPositionBeforeTypingRef.current === null && isNearBottom()) {
                // Lần đầu có typing indicator và user ở cuối
                // Lưu vị trí scroll và số messages hiện tại
                scrollPositionBeforeTypingRef.current = container.scrollTop;
                messagesLengthWhenTypingRef.current = messages.length;

                // Scroll xuống để thấy typing indicator (sau khi DOM update)
                requestAnimationFrame(() => {
                    scrollToBottom("smooth");
                });
            }
        } else {
            // Không còn ai gõ
            if (scrollPositionBeforeTypingRef.current !== null) {
                // Kiểm tra có tin nhắn mới không
                const hasNewMessages = messages.length > messagesLengthWhenTypingRef.current;

                if (!hasNewMessages) {
                    // Không có tin mới → restore vị trí scroll cũ
                    container.scrollTop = scrollPositionBeforeTypingRef.current;
                }

                // Reset refs
                scrollPositionBeforeTypingRef.current = null;
                messagesLengthWhenTypingRef.current = 0;
            }
        }
    }, [typingUsers.size, messages.length, isNearBottom, scrollToBottom]);

    useEffect(() => {
        // Mỗi lần đổi conversationId:
        // - tăng token để invalidate request cũ
        // - reset state liên quan
        // - fetch lại conversation + messages
        // - subscribe websocket theo conversation mới
        loadTokenRef.current += 1;
        const token = loadTokenRef.current;

        setLoading(true);
        setError(null);
        setSending(false);
        setMessageText("");
        setMessages([]);
        setConversation(null);
        setShowScrollToBottomButton(false);
        setPendingNewMessages(0);
        setLoadingMore(false);
        setHasMore(false);
        setNextCursor(null);
        setReadReceipts([]); // Reset read receipts khi đổi conversation
        setTypingUsers(new Set()); // Reset typing users khi đổi conversation
        isTypingSentRef.current = false; // Reset typing sent flag khi đổi conversation
        scrollPositionBeforeTypingRef.current = null; // Reset typing scroll position
        messagesLengthWhenTypingRef.current = 0; // Reset messages count for typing
        // Reset media scroll flag và timer khi đổi conversation
        if (shouldScrollOnMediaLoadTimerRef.current) {
            clearTimeout(shouldScrollOnMediaLoadTimerRef.current);
            shouldScrollOnMediaLoadTimerRef.current = null;
        }
        shouldScrollOnMediaLoadRef.current = false;

        // Đánh dấu đang trong giai đoạn initial load để luôn scroll xuống cuối khi media load
        initialLoadRef.current = true;
        // Reset scroll position tracking
        lastScrollTopRef.current = 0;
        // Reset load more guard
        loadMoreRequestedRef.current = false;

        loadConversation(token);
        // Truyền markAsRead vào loadMessages để đánh dấu đã đọc khi mở chat
        loadMessages(token, markAsRead);

        const setupWebSocket = async () => {
            try {
                if (!websocketService.isConnected()) {
                    await websocketService.connect();
                }
                // Sub theo conversationId để nhận message realtime.
                // Wrap callback để truyền markAsRead vào handleNewMessage
                // Truyền handleMessageSeen để nhận MESSAGE_SEEN event
                // Truyền handleTyping để nhận TYPING event
                websocketService.subscribeToConversation(
                    conversationId,
                    (message) => handleNewMessage(message, markAsRead),
                    handleMessageRecalled,
                    handleMessageSeen, // Nhận MESSAGE_SEEN event từ topic conversation
                    handleTyping, // Nhận TYPING event từ topic conversation
                );
            } catch {
                // no-op
            }
        };

        void setupWebSocket();

        return () => {
            // Cleanup tránh leak: khi đổi conversation hoặc unmount.
            websocketService.unsubscribeFromConversation(conversationId);

            // Cleanup markAsRead debounce timer
            if (markAsReadTimeoutRef.current) {
                clearTimeout(markAsReadTimeoutRef.current);
                markAsReadTimeoutRef.current = null;
            }

            // Cleanup typing signal timer
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }

            // Cleanup all typing user timeouts
            typingTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
            typingTimeoutsRef.current.clear();

            // Cleanup recording: dừng MediaRecorder nếu đang ghi, tránh leak stream
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.onstop = null; // Tắt callback để không upload
                mediaRecorderRef.current.stop(); // Dừng recording
                mediaRecorderRef.current = null;
            }

            // Cleanup timer: dừng interval đếm giây ghi âm
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
        };
    }, [
        conversationId,
        userId,
        handleNewMessage,
        handleMessageRecalled,
        handleMessageSeen,
        handleTyping,
        loadConversation,
        loadMessages,
        markAsRead,
    ]);

    const handleScroll = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const currentScrollTop = container.scrollTop;
        const isScrollingUp = currentScrollTop < lastScrollTopRef.current;
        lastScrollTopRef.current = currentScrollTop;

        // Ngay khi user scroll LÊN → thoát khỏi giai đoạn initial load
        // Đây là cách phát hiện user chủ động muốn xem tin cũ
        if (isScrollingUp && initialLoadRef.current) {
            initialLoadRef.current = false;
        }

        const nearBottom = isNearBottom();

        if (!nearBottom) {
            setShowScrollToBottomButton(true);
        } else {
            setShowScrollToBottomButton(false);
            setPendingNewMessages(0);

            // Khi user scroll xuống gần cuối và có typing indicator đang hiện
            // → scroll xuống cuối để hiện typing indicator
            // Chỉ scroll nếu chưa ở vị trí cuối tuyệt đối (tránh loop)
            if (typingUsers.size > 0) {
                const distanceFromBottom =
                    container.scrollHeight - container.scrollTop - container.clientHeight;
                if (distanceFromBottom > 5) {
                    requestAnimationFrame(() => {
                        scrollToBottom("smooth");
                    });
                }
            }
        }

        if (
            container.scrollTop < LOAD_MORE_TRIGGER_PX &&
            hasMore &&
            !loadingMore
        ) {
            // Chạm gần top => load trang tin nhắn cũ.
            void loadMoreMessages();
        }
    }, [hasMore, isNearBottom, loadMoreMessages, loadingMore, scrollToBottom, typingUsers.size]);

    const handleScrollToBottomClick = useCallback(() => {
        scrollToBottom("smooth");
        setShowScrollToBottomButton(false);
        setPendingNewMessages(0);
    }, [scrollToBottom]);

    const handleSend = useCallback(async (textOverride?: string) => {
        const trimmed = (textOverride ?? messageText).trim();
        if (!trimmed) return;

        try {
            setSending(true);
            setError(null);

            await chatService.sendMessage(
                { content: trimmed, type: "TEXT", conversationId },
                userId,
            );

            setMessageText("");
            // Sau khi send, thường server sẽ broadcast lại qua WS; dù vậy ta vẫn chủ động scroll.
            scrollOnNextRenderRef.current = "smooth";
        } catch {
            setError("Không thể gửi tin nhắn");
        } finally {
            setSending(false);
        }
    }, [conversationId, messageText, userId]);

    // Upload file/image/video/audio: presign → S3 PUT → sendMessage với objectKey
    const handleFileUpload = useCallback(
        async (file: File) => {
            // Tự động xác định loại từ MIME type của file
            let type: MessageType;
            if (file.type.startsWith("image/")) type = "IMAGE";
            else if (file.type.startsWith("video/")) type = "VIDEO";
            else if (file.type.startsWith("audio/")) type = "AUDIO";
            else type = "FILE";

            setUploading(true);
            try {
                // Bước 1: Xin presigned URL
                const { presignedUrl, objectKey } =
                    await chatService.getPresignedUrl(
                        "CONVERSATION",
                        String(conversationId), // Convert number sang string
                        type,
                        file.name,
                        file.type,
                    );
                // Bước 2: Upload thẳng lên S3
                await chatService.uploadToS3(presignedUrl, file);
                // Bước 3: Gửi tin nhắn với objectKey làm content (BE tự ghép domain khi trả về)
                const request: SendMessageRequest = {
                    content: objectKey,
                    type,
                    conversationId,
                };
                await chatService.sendMessage(request, userId);
                scrollOnNextRenderRef.current = "smooth";
            } catch (err) {
                const axiosMsg = (
                    err as { response?: { data?: { message?: string } } }
                )?.response?.data?.message;
                setRecallToast(
                    axiosMsg ?? "Không thể gửi file. Vui lòng thử lại.",
                );
            } finally {
                setUploading(false);
            }
        },
        [conversationId, userId],
    );

    /**
     * startRecording - Bắt đầu ghi âm tin nhắn thoại
     *
     * Flow:
     * 1. Yêu cầu quyền microphone qua getUserMedia
     * 2. Chọn MIME type audio tốt nhất (ưu tiên: webm+opus → webm → mp4)
     * 3. Tạo MediaRecorder instance, reset audioChunksRef
     * 4. Đăng ký ondataavailable: đẩy Blob vào audioChunksRef
     * 5. Đăng ký onstop: ghép Blob thành File, gọi handleFileUpload (presign → S3 → sendMessage)
     * 6. Start recording + bật timer đếm giây
     * 7. Nếu lỗi microphone → hiện toast cảnh báo
     */
    const startRecording = useCallback(async () => {
        if (isRecording) return; // Đang ghi rồi thì bỏ qua
        try {
            // Bước 1: Yêu cầu quyền truy cập microphone
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            // Bước 2: Chọn MIME type tốt nhất theo thứ tự ưu tiên
            // - audio/webm;codecs=opus: chất lượng tốt, size nhỏ (Chrome/Edge)
            // - audio/webm: fallback cho webm không có opus
            // - audio/mp4: fallback cho Safari iOS
            const mimeType = MediaRecorder.isTypeSupported(
                "audio/webm;codecs=opus",
            )
                ? "audio/webm;codecs=opus"
                : MediaRecorder.isTypeSupported("audio/webm")
                  ? "audio/webm"
                  : "audio/mp4";

            // Bước 3: Tạo MediaRecorder và reset mảng chunks
            const recorder = new MediaRecorder(stream, { mimeType });
            audioChunksRef.current = [];

            // Bước 4: Đăng ký callback ondataavailable - nhận dữ liệu audio từng đoạn
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            // Bước 5: Đăng ký callback onstop - khi dừng ghi, ghép Blob → File → upload
            recorder.onstop = async () => {
                // Tắt stream (tắt đèn mic trên browser)
                stream.getTracks().forEach((t) => t.stop());

                // Ghép tất cả chunks thành 1 Blob
                const blob = new Blob(audioChunksRef.current, {
                    type: mimeType,
                });
                if (blob.size === 0) return; // Không có dữ liệu thì bỏ qua

                // Chuyển Blob thành File object với tên file và extension phù hợp
                const ext = mimeType.includes("webm") ? "webm" : "mp4";
                const file = new File([blob], `voice-message.${ext}`, {
                    type: mimeType,
                });

                // Upload file lên S3 và gửi tin nhắn qua WebSocket
                await handleFileUpload(file);
            };

            // Bước 6: Lưu ref, start recording, bật UI + timer
            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
            setRecordingDuration(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration((d) => d + 1);
            }, 1000);
        } catch {
            // Bước 7: Báo lỗi nếu không truy cập được microphone (user từ chối hoặc thiết bị không có mic)
            setRecallToast("Không thể truy cập microphone");
        }
    }, [isRecording, handleFileUpload]);

    /**
     * stopRecording - Dừng ghi âm và GỬI tin nhắn
     *
     * Khi user bấm nút "Dừng & Gửi":
     * 1. Dừng timer đếm giây
     * 2. Gọi recorder.stop() → trigger callback onstop (đã đăng ký trong startRecording)
     *    → onstop sẽ tự động ghép Blob, tạo File, upload → gửi tin nhắn
     * 3. Reset state UI về trạng thái không ghi
     */
    const stopRecording = useCallback(() => {
        if (!mediaRecorderRef.current) return; // Chưa ghi thì bỏ qua

        // Dừng timer
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }

        // Dừng recorder → trigger onstop → upload + send
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;

        // Reset UI
        setIsRecording(false);
        setRecordingDuration(0);
    }, []);

    /**
     * cancelRecording - Huỷ ghi âm KHÔNG gửi tin nhắn
     *
     * Khi user bấm nút "Huỷ" (X):
     * 1. Tắt callback onstop để KHÔNG upload/send
     * 2. Xoá dữ liệu audio đã ghi (audioChunksRef)
     * 3. Dừng recorder + timer
     * 4. Reset UI về trạng thái không ghi
     *
     * Khác với stopRecording: cancel sẽ xoá audio, stop sẽ gửi audio.
     */
    const cancelRecording = useCallback(() => {
        if (!mediaRecorderRef.current) return; // Chưa ghi thì bỏ qua

        // Dừng timer
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }

        // Tắt callback onstop để KHÔNG upload khi stop
        mediaRecorderRef.current.onstop = null;

        // Xoá dữ liệu audio đã ghi
        audioChunksRef.current = [];

        // Dừng recorder
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;

        // Reset UI
        setIsRecording(false);
        setRecordingDuration(0);
    }, []);

    const displayInfo = useMemo(() => {
        if (!conversation) {
            return { displayName: "", displayAvatar: null as string | null };
        }
        // Memo hoá để tránh tính lại tên/avatar mỗi render không cần thiết.
        return getConversationDisplayInfo(conversation, userId);
    }, [conversation, userId]);

    return {
        conversation,
        messages,
        loading,
        loadingMore,
        hasMore,
        sending,
        uploading,
        error,

        displayName: displayInfo.displayName,
        displayAvatar: displayInfo.displayAvatar,

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
        handleDeleteConversationForMe,
        handleFileUpload,
        appendRealtimeMessage: handleNewMessage,
        scrollToBottom,
        recallToast,

        // === Voice recording state & actions (Ghi âm tin nhắn thoại) ===
        isRecording, // true nếu đang ghi âm
        recordingDuration, // Thời lượng ghi âm (giây)
        startRecording, // Bắt đầu ghi âm
        stopRecording, // Dừng ghi âm và GỬI tin nhắn
        cancelRecording, // Huỷ ghi âm KHÔNG gửi

        defaultAvatarUrl: DEFAULT_AVATAR_URL,
        defaultAvatarSmallUrl: DEFAULT_AVATAR_SMALL_URL,

        // Hàm kiểm tra user có đang ở gần cuối container không (dùng cho onMediaLoad)
        isNearBottom,

        // Hàm kiểm tra đang trong giai đoạn initial load (F5/mở chat)
        // Trong giai đoạn này, luôn scroll xuống cuối khi media load
        isInitialLoad: () => initialLoadRef.current,

        // Hàm kiểm tra có cần scroll khi media load xong không
        // Set true khi nhận tin nhắn mới (của mình hoặc khi đang ở cuối) với type IMAGE/VIDEO
        // Reset sau 3s hoặc khi đổi conversation
        shouldScrollOnMediaLoad: () => shouldScrollOnMediaLoadRef.current,

        // === Read Receipt (Đánh dấu đã đọc) ===
        // readReceipts: danh sách thông tin "đã xem" của các members (trừ user hiện tại)
        // Mỗi phần tử: { userId, lastMessageId, seenAt }
        // FE dùng để hiển thị avatar "đã xem" bên dưới tin nhắn làm mốc
        readReceipts,

        // === Typing Indicator (Đang soạn tin nhắn) ===
        // typingUsers: Set<userId> - Danh sách user đang gõ tin nhắn (trừ user hiện tại)
        // FE dùng để hiển thị "dummy message bubble" nhấp nháy
        typingUsers,
        // sendTypingSignal: Gửi signal đang gõ/ngừng gõ lên backend
        // Gọi khi: onChange input (isTyping=true), onBlur/Enter/Empty (isTyping=false)
        sendTypingSignal,
    };
}
