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
import websocketService from "../services/websocket";
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

type LoadMoreOptions = { keepAtBottom?: boolean };

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
}) {
    const { conversationId, userId } = args;

    // ====== UI State (render) ======
    const [messageText, setMessageText] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);

    // ====== Voice recording ======
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(
        null,
    );

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
        async (token: number) => {
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
            if (!hasMore || loadingMore || !nextCursor) return;

            const keepAtBottom = Boolean(options?.keepAtBottom);
            const token = loadTokenRef.current;

            try {
                setLoadingMore(true);

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
                }

                if (!keepAtBottom) {
                    // Prepend tin cũ: giữ nguyên vị trí nhìn bằng cách bù delta scrollHeight.
                    requestAnimationFrame(() => {
                        const current = messagesContainerRef.current;
                        if (!current) return;
                        const delta = current.scrollHeight - prevScrollHeight;
                        current.scrollTop = prevScrollTop + delta;
                    });
                }
            } catch {
                setError("Không thể tải thêm tin nhắn");
            } finally {
                if (token === loadTokenRef.current) {
                    setLoadingMore(false);
                }
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
        (newMessage: Message) => {
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

        loadConversation(token);
        loadMessages(token);

        const setupWebSocket = async () => {
            try {
                if (!websocketService.isConnected()) {
                    await websocketService.connect();
                }
                // Sub theo conversationId để nhận message realtime.
                websocketService.subscribeToConversation(
                    conversationId,
                    handleNewMessage,
                    handleMessageRecalled,
                );
            } catch {
                // no-op
            }
        };

        void setupWebSocket();

        return () => {
            // Cleanup tránh leak: khi đổi conversation hoặc unmount.
            websocketService.unsubscribeFromConversation(conversationId);
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.onstop = null;
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current = null;
            }
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
        };
    }, [
        conversationId,
        handleNewMessage,
        handleMessageRecalled,
        loadConversation,
        loadMessages,
    ]);

    const handleScroll = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const nearBottom = isNearBottom();

        if (!nearBottom) {
            setShowScrollToBottomButton(true);
        } else {
            setShowScrollToBottomButton(false);
            setPendingNewMessages(0);
        }

        if (
            container.scrollTop < LOAD_MORE_TRIGGER_PX &&
            hasMore &&
            !loadingMore
        ) {
            // Chạm gần top => load trang tin nhắn cũ.
            void loadMoreMessages();
        }
    }, [hasMore, isNearBottom, loadMoreMessages, loadingMore]);

    const handleScrollToBottomClick = useCallback(() => {
        scrollToBottom("smooth");
        setShowScrollToBottomButton(false);
        setPendingNewMessages(0);
    }, [scrollToBottom]);

    const handleSend = useCallback(async () => {
        const trimmed = messageText.trim();
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
                        conversationId,
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

    const startRecording = useCallback(async () => {
        if (isRecording) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            const mimeType = MediaRecorder.isTypeSupported(
                "audio/webm;codecs=opus",
            )
                ? "audio/webm;codecs=opus"
                : MediaRecorder.isTypeSupported("audio/webm")
                  ? "audio/webm"
                  : "audio/mp4";
            const recorder = new MediaRecorder(stream, { mimeType });
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop());
                const blob = new Blob(audioChunksRef.current, {
                    type: mimeType,
                });
                if (blob.size === 0) return;
                const ext = mimeType.includes("webm") ? "webm" : "mp4";
                const file = new File([blob], `voice-message.${ext}`, {
                    type: mimeType,
                });
                await handleFileUpload(file);
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
            setRecordingDuration(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration((d) => d + 1);
            }, 1000);
        } catch {
            setRecallToast("Không thể truy cập microphone");
        }
    }, [isRecording, handleFileUpload]);

    const stopRecording = useCallback(() => {
        if (!mediaRecorderRef.current) return;
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setRecordingDuration(0);
    }, []);

    const cancelRecording = useCallback(() => {
        if (!mediaRecorderRef.current) return;
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        mediaRecorderRef.current.onstop = null;
        audioChunksRef.current = [];
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
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
        handleFileUpload,
        scrollToBottom,
        recallToast,

        isRecording,
        recordingDuration,
        startRecording,
        stopRecording,
        cancelRecording,

        defaultAvatarUrl: DEFAULT_AVATAR_URL,
        defaultAvatarSmallUrl: DEFAULT_AVATAR_SMALL_URL,
    };
}
