import { UserAvatar } from "@/components";
import { colors, spacing } from "@/constants";
import { useChatWindowController } from "@/hooks/useChatWindowController";
import type { LocalUploadFile, Message } from "@/types/chat";
import { formatRelativeTime } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import { Audio, type AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    type GestureResponderEvent,
    Image,
    KeyboardAvoidingView,
    type LayoutChangeEvent,
    Linking,
    Modal,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MENU_WIDTH = 232;
const MENU_HORIZONTAL_MARGIN = 12;
const MENU_VERTICAL_MARGIN = 16;
const MENU_ESTIMATED_HEIGHT = 390;

const LOAD_OLDER_TRIGGER_PX = 64;
const LOAD_NEWER_TRIGGER_PX = 96;
const STICKY_BOTTOM_THRESHOLD_PX = 16;
const SHOW_SCROLL_BUTTON_THRESHOLD_PX = 160;
const RIGHT_SCROLL_CUE_TRIGGER_PX = 120;
const RIGHT_SCROLL_CUE_HIDE_MS = 1400;
const RIGHT_SCROLL_CUE_HEIGHT = 60;
const RIGHT_SCROLL_CUE_MARGIN = 8;
const JUMP_SCROLL_LOCK_MS = 1500;
const JUMP_AUTO_PAGING_SUPPRESS_MS = 2600;
const QUICK_EMOJIS = [
    "😀",
    "😂",
    "😍",
    "🥰",
    "😘",
    "😊",
    "😉",
    "😎",
    "😭",
    "😡",
    "😮",
    "🤔",
    "🙏",
    "👍",
    "👎",
    "👏",
    "🔥",
    "💯",
    "🎉",
    "❤️",
    "💙",
    "💚",
    "💛",
    "🧡",
    "💜",
    "🤍",
    "🤎",
    "💔",
    "✨",
    "🌟",
    "😴",
    "🤯",
    "😅",
    "😇",
    "🤗",
    "😋",
    "🙌",
    "👌",
    "🤝",
    "🎵",
];

type ContextMenuState = {
    messageId: string;
    top: number;
    left: number;
};

type ReplyComposerState = {
    id: string;
    senderName: string;
    content: string;
};

type MediaViewerState = {
    type: "IMAGE" | "VIDEO";
    url: string;
};

type AudioProgress = {
    positionMillis: number;
    durationMillis: number;
};

type PinnedBannerItem = {
    messageId: string;
    pinnedAt: string;
    senderName: string;
    preview: string;
    thumbUrl?: string;
};

type PinSystemRunRenderMeta = {
    runKey: string;
    runLength: number;
    shouldRenderCollapsedButton: boolean;
    shouldHideMessage: boolean;
};

const contextActions = [
    { key: "copy", label: "Copy tin nhan", icon: "copy-outline" },
    { key: "pin", label: "Ghim tin nhan", icon: "pin-outline" },
    { key: "reply", label: "Tra loi", icon: "return-up-back-outline" },
    { key: "divider-1", divider: true },
    {
        key: "save",
        label: "Danh dau tin nhan",
        icon: "bookmark-outline",
    },
    { key: "divider-2", divider: true },
    {
        key: "select-many",
        label: "Chon nhieu tin nhan",
        icon: "list-outline",
    },
    {
        key: "details",
        label: "Xem chi tiet",
        icon: "information-circle-outline",
    },
    {
        key: "more",
        label: "Tuy chon khac",
        icon: "ellipsis-horizontal-outline",
        hasArrow: true,
    },
    { key: "divider-3", divider: true },
    {
        key: "unsend",
        label: "Thu hoi",
        icon: "arrow-undo-outline",
        destructive: true,
    },
    {
        key: "delete-mine",
        label: "Xoa chi o phia toi",
        icon: "trash-outline",
        destructive: true,
    },
] as const;

function formatDurationMillis(value: number): string {
    const totalSeconds = Math.max(0, Math.floor(value / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatFileSize(value?: number): string {
    if (!value || value <= 0) return "--";
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) {
        return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function resolveMediaUrl(value?: string): string {
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    return value;
}

function isLikelyStoragePathOrUrl(value?: string): boolean {
    if (!value) return false;
    const normalized = value.trim();
    if (!normalized) return false;
    if (/^https?:\/\//i.test(normalized)) return true;
    return /\.(png|jpg|jpeg|gif|webp|bmp|mp4|mov|mkv|avi|mp3|wav|m4a|pdf|doc|docx|xls|xlsx|zip|rar)$/i.test(
        normalized,
    );
}

function resolveAttachmentUrls(message: Message): string[] {
    const attachmentUrls = Array.isArray(message.attachments)
        ? message.attachments
              .map((attachment) => resolveMediaUrl(attachment.url))
              .filter(Boolean)
        : [];

    if (attachmentUrls.length > 0) return attachmentUrls;
    if (isLikelyStoragePathOrUrl(message.content)) {
        const fallback = resolveMediaUrl(message.content);
        return fallback ? [fallback] : [];
    }

    return [];
}

function formatMessageTime(value?: string): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function isEmojiOnlyText(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (/[A-Za-z0-9]/.test(trimmed)) return false;

    const compact = trimmed.replace(/\s+/g, "");
    return compact.length <= 10;
}

function formatReplyLabel(args: {
    currentUserId: number;
    messageSenderId: number;
    messageSenderName: string;
    replySenderId?: number;
    replySenderName: string;
}): string {
    const {
        currentUserId,
        messageSenderId,
        messageSenderName,
        replySenderId,
        replySenderName,
    } = args;

    const senderLabel =
        messageSenderId === currentUserId ? "Ban" : messageSenderName;

    if (typeof replySenderId !== "number") {
        return `${senderLabel} da tra loi mot tin nhan`;
    }

    const repliedLabel =
        replySenderId === currentUserId ? "ban" : replySenderName;
    return `${senderLabel} da tra loi ${repliedLabel}`;
}

function getFileBadgeLabel(fileName?: string): string {
    const ext = fileName?.split(".").pop()?.trim().toUpperCase() ?? "FILE";
    if (!ext) return "FILE";
    return ext.slice(0, 4);
}

function resolvePinSystemPreview(message: Message): string {
    const source =
        message.replyInfo?.content ||
        message.content ||
        message.attachments?.[0]?.fileName ||
        "tin nhan";

    const preview = source.trim();
    if (!preview) return "tin nhan";
    return preview.length > 50 ? `${preview.slice(0, 50)}...` : preview;
}

function parseCallMeta(message: Message): {
    icon: "call-outline" | "call" | "videocam-outline" | "close-circle-outline";
    iconColor: string;
    title: string;
    subtitle: string;
} | null {
    if (message.type !== "CALL") return null;

    let payload: Record<string, unknown> = {};
    if (message.content) {
        try {
            payload = JSON.parse(message.content) as Record<string, unknown>;
        } catch {
            payload = {};
        }
    }

    const kind = String(
        payload.callType ?? payload.type ?? "audio",
    ).toLowerCase();
    const status = String(
        payload.status ?? payload.result ?? "ended",
    ).toLowerCase();
    const durationSeconds = Number(
        payload.durationSeconds ?? payload.duration ?? 0,
    );

    const isVideo = kind.includes("video");
    const isMissed = status.includes("miss") || status.includes("reject");
    const subtitle =
        durationSeconds > 0
            ? `Thoi luong ${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, "0")}`
            : formatMessageTime(message.createdAt) || "Cuoc goi";

    return {
        icon: isMissed
            ? "close-circle-outline"
            : isVideo
              ? "videocam-outline"
              : "call-outline",
        iconColor: isMissed ? "#EF4444" : "#10B981",
        title: isVideo ? "Cuoc goi video" : "Cuoc goi thoai",
        subtitle,
    };
}

function isPinSystemMessageType(type?: Message["type"]): boolean {
    return type === "SYSTEM_PIN" || type === "SYSTEM_UPIN";
}

function buildReplyPreview(message: Message): string {
    if (message.isRecalled) return "Tin nhan da duoc thu hoi";
    if (message.type === "IMAGE") return "[Hinh anh]";
    if (message.type === "VIDEO") return "[Video]";
    if (message.type === "AUDIO") return "[Tin nhan thoai]";
    if (message.type === "FILE") return "[Tep dinh kem]";
    if (message.type === "CALL") return "[Cuoc goi]";
    return message.content || "Tin nhan";
}

function normalizeSearchText(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function inferReplyPreviewType(
    replyInfo?: Message["replyInfo"],
): Message["type"] | null {
    if (!replyInfo) return null;
    if (replyInfo.type) return replyInfo.type;

    const rawContent = (replyInfo.content ?? "").trim();
    const normalizedContent = normalizeSearchText(rawContent);
    if (!normalizedContent) return null;

    if (
        normalizedContent === "[hinh anh]" ||
        normalizedContent === "hinh anh" ||
        normalizedContent === "[anh]" ||
        normalizedContent === "anh"
    ) {
        return "IMAGE";
    }

    if (normalizedContent === "[video]" || normalizedContent === "video") {
        return "VIDEO";
    }

    if (
        normalizedContent === "[tin nhan thoai]" ||
        normalizedContent === "tin nhan thoai" ||
        normalizedContent === "[audio]" ||
        normalizedContent === "audio"
    ) {
        return "AUDIO";
    }

    if (
        normalizedContent === "[tep dinh kem]" ||
        normalizedContent === "tep dinh kem" ||
        normalizedContent === "[file dinh kem]" ||
        normalizedContent === "file dinh kem" ||
        normalizedContent === "[file]" ||
        normalizedContent === "file"
    ) {
        return "FILE";
    }

    if (
        normalizedContent === "[cuoc goi]" ||
        normalizedContent === "cuoc goi" ||
        normalizedContent === "[call]" ||
        normalizedContent === "call"
    ) {
        return "CALL";
    }

    if (/\.(png|jpg|jpeg|gif|webp|bmp)(\?|$)/i.test(rawContent)) {
        return "IMAGE";
    }
    if (/\.(mp4|mov|mkv|avi)(\?|$)/i.test(rawContent)) return "VIDEO";
    if (/\.(mp3|wav|m4a|aac|webm)(\?|$)/i.test(rawContent)) {
        return "AUDIO";
    }

    return null;
}

function buildAudioWaveBars(seedSource: string, count = 30): number[] {
    let seed = seedSource
        .split("")
        .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 17);

    return Array.from({ length: count }, () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
        return 15 + (Math.abs(seed) % 70);
    });
}

export default function MessagesConversationScreen() {
    const { conversationId: conversationIdParam } = useLocalSearchParams<{
        conversationId?: string;
    }>();
    const conversationId = Number(conversationIdParam ?? 0);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const {
        currentUserId,
        messageText,
        setMessageText,
        conversation,
        membersById,
        messages,
        pinnedMessages,
        readReceipts,
        typingUsers,
        loading,
        loadingMore,
        loadingNewer,
        hasMoreOlder,
        hasMoreNewer,
        isHistoricalMode,
        sending,
        uploading,
        uploadProgressPercent,
        uploadProgressLabel,
        uploadFailedFileNames,
        error,
        handleSend,
        handleSendMixedMedia,
        handleRecall,
        handleDeleteForMe,
        handlePinMessage,
        handleUnpinMessage,
        sendTypingSignal,
        loadOlderMessages,
        loadNewerMessages,
        handleJumpToMessage,
        resetToPresent,
    } = useChatWindowController({
        conversationId: Number.isFinite(conversationId) ? conversationId : 0,
    });

    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(
        null,
    );
    const [replyToMessage, setReplyToMessage] =
        useState<ReplyComposerState | null>(null);
    const [mediaViewer, setMediaViewer] = useState<MediaViewerState | null>(
        null,
    );
    const [highlightedMessageId, setHighlightedMessageId] = useState<
        string | null
    >(null);
    const [showScrollToBottomButton, setShowScrollToBottomButton] =
        useState(false);
    const [pendingNewMessages, setPendingNewMessages] = useState(0);
    const [jumpRequestToken, setJumpRequestToken] = useState(0);
    const [showPinnedList, setShowPinnedList] = useState(false);
    const [expandedPinSystemRuns, setExpandedPinSystemRuns] = useState<
        Record<string, boolean>
    >({});
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
    const [showRightScrollCue, setShowRightScrollCue] = useState(false);
    const [rightScrollCueBaseTop, setRightScrollCueBaseTop] = useState(0);
    const [inputSelection, setInputSelection] = useState({
        start: 0,
        end: 0,
    });

    const listRef = useRef<FlatList<Message>>(null);
    const messageInputRef = useRef<TextInput>(null);
    const latestMessageIdRef = useRef("");
    const isAtBottomRef = useRef(true);
    const stickToBottomRef = useRef(true);
    const didInitialAutoScrollRef = useRef(false);
    const listLayoutRef = useRef({ y: 0, height: 0 });
    const scrollMetricsRef = useRef({
        contentHeight: 0,
        layoutHeight: 0,
        offsetY: 0,
    });
    const rightScrollCueVisibleRef = useRef(false);
    const forceBottomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const jumpScrollLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const pendingJumpMessageIdRef = useRef<string | null>(null);
    const jumpScrollLockRef = useRef(false);
    const autoPagingSuppressedUntilRef = useRef(0);
    const autoPagingSuppressLogAtRef = useRef(0);
    const typingAutoScrollTimeoutRef = useRef<ReturnType<
        typeof setTimeout
    > | null>(null);
    const rightScrollCueHideTimerRef = useRef<ReturnType<
        typeof setTimeout
    > | null>(null);
    const rightScrollCueOpacity = useRef(new Animated.Value(0)).current;
    const rightScrollCueTranslateY = useRef(new Animated.Value(0)).current;
    const audioPlayPulse = useRef(new Animated.Value(1)).current;
    const audioIconFade = useRef(new Animated.Value(1)).current;
    const audioPressScale = useRef(new Animated.Value(1)).current;
    const audioSeekScale = useRef(new Animated.Value(1)).current;
    const [activeSeekAudioKey, setActiveSeekAudioKey] = useState<string | null>(
        null,
    );
    const [activePressAudioKey, setActivePressAudioKey] = useState<
        string | null
    >(null);
    const audioWaveBarsCacheRef = useRef<Record<string, number[]>>({});

    const [audioLoadingKey, setAudioLoadingKey] = useState<string | null>(null);
    const [playingAudioKey, setPlayingAudioKey] = useState<string | null>(null);
    const [audioProgressMap, setAudioProgressMap] = useState<
        Record<string, AudioProgress>
    >({});
    const [audioTrackWidthMap, setAudioTrackWidthMap] = useState<
        Record<string, number>
    >({});

    const activeAudioRef = useRef<Audio.Sound | null>(null);
    const activeAudioKeyRef = useRef<string | null>(null);
    const audioSeekThrottleRef = useRef<Record<string, number>>({});
    const audioBoundaryStateRef = useRef<
        Record<string, "start" | "end" | null>
    >({});
    const activeRecordingRef = useRef<Audio.Recording | null>(null);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(
        null,
    );

    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);

    const otherUser = useMemo(() => {
        const members = Object.values(membersById);
        return (
            members.find((member) => member.userId !== currentUserId) ||
            members[0] ||
            null
        );
    }, [currentUserId, membersById]);

    const activityText = useMemo(() => {
        if (!conversation?.updatedAt) return "Dang hoat dong";
        return `Hoat dong ${formatRelativeTime(conversation.updatedAt)} truoc`;
    }, [conversation?.updatedAt]);

    const typingParticipantIds = useMemo(
        () =>
            Array.from(typingUsers).filter(
                (userId) => userId !== currentUserId,
            ),
        [currentUserId, typingUsers],
    );

    const typingDotAnimations = useRef([
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
    ]).current;

    useEffect(() => {
        if (typingParticipantIds.length === 0) {
            typingDotAnimations.forEach((value) => value.setValue(0));
            return;
        }

        const loops = typingDotAnimations.map((value, index) => {
            const cycle = Animated.sequence([
                Animated.delay(index * 120),
                Animated.timing(value, {
                    toValue: 1,
                    duration: 260,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(value, {
                    toValue: 0,
                    duration: 320,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.delay(180),
            ]);

            const loop = Animated.loop(cycle);
            loop.start();
            return loop;
        });

        return () => {
            loops.forEach((loop) => loop.stop());
            typingDotAnimations.forEach((value) => value.setValue(0));
        };
    }, [typingDotAnimations, typingParticipantIds.length]);

    const selectedMessagePinned = useMemo(() => {
        if (!contextMenu) return false;
        return pinnedMessages.some(
            (pin) => pin.messageId === contextMenu.messageId,
        );
    }, [contextMenu, pinnedMessages]);

    const scheduleReleaseJumpScrollLock = useCallback((delayMs = 0) => {
        if (jumpScrollLockTimerRef.current) {
            clearTimeout(jumpScrollLockTimerRef.current);
            jumpScrollLockTimerRef.current = null;
        }

        if (delayMs <= 0) {
            jumpScrollLockRef.current = false;
            return;
        }

        jumpScrollLockTimerRef.current = setTimeout(() => {
            jumpScrollLockRef.current = false;
            jumpScrollLockTimerRef.current = null;
        }, delayMs);
    }, []);

    const focusAndHighlightMessage = useCallback(
        (messageId: string): boolean => {
            const index = messages.findIndex(
                (message) => message.id === messageId,
            );
            if (index < 0) return false;

            const tryScroll = (attempt: number) => {
                requestAnimationFrame(() => {
                    try {
                        listRef.current?.scrollToIndex({
                            index,
                            animated: true,
                            viewPosition: 0.5,
                        });
                    } catch {
                        const fallbackOffset = Math.max(index * 92 - 140, 0);
                        listRef.current?.scrollToOffset({
                            offset: fallbackOffset,
                            animated: true,
                        });

                        if (attempt < 4) {
                            setTimeout(() => {
                                tryScroll(attempt + 1);
                            }, 120);
                        }
                    }
                });
            };

            tryScroll(0);
            setHighlightedMessageId(messageId);
            setTimeout(() => {
                setHighlightedMessageId((prev) =>
                    prev === messageId ? null : prev,
                );
            }, 1400);

            return true;
        },
        [messages],
    );

    const requestJumpToMessage = useCallback(
        async (messageId: string) => {
            pendingJumpMessageIdRef.current = messageId;
            jumpScrollLockRef.current = true;
            scheduleReleaseJumpScrollLock(JUMP_SCROLL_LOCK_MS);
            autoPagingSuppressedUntilRef.current =
                Date.now() + JUMP_AUTO_PAGING_SUPPRESS_MS;

            latestMessageIdRef.current = "";
            stickToBottomRef.current = false;
            isAtBottomRef.current = false;
            setShowScrollToBottomButton(true);
            setPendingNewMessages(0);

            const ok = await handleJumpToMessage(messageId);
            if (!ok) {
                pendingJumpMessageIdRef.current = null;
                scheduleReleaseJumpScrollLock(0);
                autoPagingSuppressedUntilRef.current = 0;
                return;
            }

            console.log("[JUMP_DEBUG][screen] requestJumpToMessage:loaded", {
                conversationId,
                messageId,
            });
            setJumpRequestToken((token) => token + 1);
        },
        [
            conversationId,
            handleJumpToMessage,
            messages.length,
            scheduleReleaseJumpScrollLock,
        ],
    );

    useEffect(() => {
        const pendingId = pendingJumpMessageIdRef.current;
        if (!pendingId) return;

        const focused = focusAndHighlightMessage(pendingId);
        if (!focused) return;

        pendingJumpMessageIdRef.current = null;
        scheduleReleaseJumpScrollLock(700);
    }, [
        focusAndHighlightMessage,
        jumpRequestToken,
        messages.length,
        scheduleReleaseJumpScrollLock,
    ]);

    const pinnedBannerItems = useMemo<PinnedBannerItem[]>(() => {
        const previewText = (message: Message) => {
            if (message.isRecalled) return "Tin nhan da duoc thu hoi";
            if (message.type === "IMAGE") return "[Hinh anh]";
            if (message.type === "VIDEO") return "[Video]";
            if (message.type === "AUDIO") return "[Tin nhan thoai]";
            if (message.type === "FILE") return "[Tep dinh kem]";
            if (message.type === "CALL") return "[Cuoc goi]";
            return message.content?.trim() || "Tin nhan";
        };

        return pinnedMessages.slice(0, 3).map((pin) => {
            const matchedMessage = messages.find(
                (message) => message.id === pin.messageId,
            );
            const sender = matchedMessage
                ? membersById[matchedMessage.senderId]
                : undefined;

            const senderName =
                sender?.nickname || sender?.username || "Nguoi dung";
            const thumbUrl =
                matchedMessage?.type === "IMAGE"
                    ? resolveAttachmentUrls(matchedMessage)[0]
                    : undefined;

            return {
                messageId: pin.messageId,
                pinnedAt: pin.pinnedAt,
                senderName,
                preview: matchedMessage
                    ? previewText(matchedMessage)
                    : "Tin nhan da ghim",
                thumbUrl,
            };
        });
    }, [membersById, messages, pinnedMessages]);

    const primaryPinnedItem = pinnedBannerItems[0];
    const canExpandPinnedList = pinnedBannerItems.length > 1;

    const pinSystemRunMetaByIndex = useMemo(() => {
        const meta = new Map<number, PinSystemRunRenderMeta>();

        for (let cursor = 0; cursor < messages.length; ) {
            const current = messages[cursor];
            if (!isPinSystemMessageType(current.type)) {
                cursor += 1;
                continue;
            }

            const runStart = cursor;
            while (
                cursor < messages.length &&
                isPinSystemMessageType(messages[cursor].type)
            ) {
                cursor += 1;
            }

            const runEnd = cursor - 1;
            const runLength = runEnd - runStart + 1;
            const runKey = messages[runStart]?.id || `pin-run-${runStart}`;

            if (runLength < 3) {
                for (let index = runStart; index <= runEnd; index += 1) {
                    meta.set(index, {
                        runKey,
                        runLength,
                        shouldRenderCollapsedButton: false,
                        shouldHideMessage: false,
                    });
                }
                continue;
            }

            const expanded = Boolean(expandedPinSystemRuns[runKey]);
            for (let index = runStart; index <= runEnd; index += 1) {
                meta.set(index, {
                    runKey,
                    runLength,
                    shouldRenderCollapsedButton:
                        !expanded && index === runStart,
                    shouldHideMessage: !expanded && index !== runStart,
                });
            }
        }

        return meta;
    }, [expandedPinSystemRuns, messages]);

    const handleExpandPinSystemRun = useCallback((runKey: string) => {
        setExpandedPinSystemRuns((prev) => ({
            ...prev,
            [runKey]: true,
        }));
    }, []);

    useEffect(() => {
        if (!canExpandPinnedList && showPinnedList) {
            setShowPinnedList(false);
        }
    }, [canExpandPinnedList, showPinnedList]);

    const handleOpenPinnedMessage = useCallback(
        (messageId: string) => {
            void requestJumpToMessage(messageId);
            setShowPinnedList(false);
        },
        [requestJumpToMessage],
    );

    const handleAudioStatusUpdate = useCallback(
        (audioKey: string, status: AVPlaybackStatus) => {
            if (!status.isLoaded) {
                if (activeAudioKeyRef.current === audioKey) {
                    setPlayingAudioKey(null);
                }
                return;
            }

            setAudioProgressMap((prev) => ({
                ...prev,
                [audioKey]: {
                    positionMillis: status.positionMillis ?? 0,
                    durationMillis: status.durationMillis ?? 0,
                },
            }));

            if (status.isPlaying) {
                setPlayingAudioKey(audioKey);
            } else if (activeAudioKeyRef.current === audioKey) {
                setPlayingAudioKey(null);
            }

            if (status.didJustFinish) {
                setPlayingAudioKey(null);
            }
        },
        [],
    );

    const stopAndUnloadAudio = useCallback(async () => {
        const active = activeAudioRef.current;
        if (!active) return;

        try {
            await active.stopAsync();
        } catch {
            // ignore stop failures
        }

        try {
            await active.unloadAsync();
        } catch {
            // ignore unload failures
        }

        activeAudioRef.current = null;
        activeAudioKeyRef.current = null;
        setPlayingAudioKey(null);
        setAudioLoadingKey(null);
    }, []);

    const seekAudioToRatio = useCallback(
        async (audioKey: string, audioUrl: string, ratio: number) => {
            let sound = activeAudioRef.current;

            if (!sound || activeAudioKeyRef.current !== audioKey) {
                await stopAndUnloadAudio();
                const created = await Audio.Sound.createAsync(
                    { uri: audioUrl },
                    { shouldPlay: false },
                    (status) => handleAudioStatusUpdate(audioKey, status),
                );
                sound = created.sound;
                activeAudioRef.current = sound;
                activeAudioKeyRef.current = audioKey;
            }

            const status = await sound.getStatusAsync();
            if (!status.isLoaded) return;

            const durationMillis =
                status.durationMillis ??
                audioProgressMap[audioKey]?.durationMillis ??
                0;
            const nextPosition = Math.round(
                Math.max(0, Math.min(1, ratio)) * durationMillis,
            );

            await sound.setPositionAsync(nextPosition);
            setAudioProgressMap((prev) => ({
                ...prev,
                [audioKey]: {
                    positionMillis: nextPosition,
                    durationMillis,
                },
            }));
        },
        [audioProgressMap, handleAudioStatusUpdate, stopAndUnloadAudio],
    );

    const seekAudioByLocation = useCallback(
        (
            audioKey: string,
            audioUrl: string,
            locationX: number,
            shouldThrottle: boolean,
        ) => {
            const trackWidth = Math.max(audioTrackWidthMap[audioKey] ?? 0, 1);
            const ratio = locationX / trackWidth;
            const clampedRatio = Math.min(1, Math.max(0, ratio));

            const nextBoundary =
                clampedRatio <= 0.02
                    ? "start"
                    : clampedRatio >= 0.98
                      ? "end"
                      : null;
            const previousBoundary =
                audioBoundaryStateRef.current[audioKey] ?? null;

            if (nextBoundary !== previousBoundary) {
                audioBoundaryStateRef.current[audioKey] = nextBoundary;
                if (nextBoundary) {
                    void Haptics.selectionAsync();
                }
            }

            if (shouldThrottle) {
                const now = Date.now();
                const last = audioSeekThrottleRef.current[audioKey] ?? 0;
                if (now - last < 120) return;
                audioSeekThrottleRef.current[audioKey] = now;
            }

            void seekAudioToRatio(audioKey, audioUrl, clampedRatio);
        },
        [audioTrackWidthMap, seekAudioToRatio],
    );

    const handleSeekInteractionStart = useCallback(
        (audioKey: string) => {
            setActiveSeekAudioKey(audioKey);
            audioSeekScale.stopAnimation();
            Animated.spring(audioSeekScale, {
                toValue: 1.07,
                speed: 28,
                bounciness: 5,
                useNativeDriver: true,
            }).start();
        },
        [audioSeekScale],
    );

    const handleSeekInteractionEnd = useCallback(() => {
        audioSeekScale.stopAnimation();
        Animated.timing(audioSeekScale, {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start(() => {
            setActiveSeekAudioKey(null);
        });
    }, [audioSeekScale]);

    const handleAudioPressIn = useCallback(
        (audioKey: string) => {
            setActivePressAudioKey(audioKey);
            audioPressScale.stopAnimation();
            Animated.timing(audioPressScale, {
                toValue: 0.92,
                duration: 90,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }).start();
        },
        [audioPressScale],
    );

    const handleAudioPressOut = useCallback(() => {
        audioPressScale.stopAnimation();
        Animated.timing(audioPressScale, {
            toValue: 1,
            duration: 130,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start(() => {
            setActivePressAudioKey(null);
        });
    }, [audioPressScale]);

    const seekAudioByDelta = useCallback(
        async (audioKey: string, audioUrl: string, deltaMillis: number) => {
            let shouldClearLoading = false;

            try {
                let sound = activeAudioRef.current;

                if (!sound || activeAudioKeyRef.current !== audioKey) {
                    shouldClearLoading = true;
                    setAudioLoadingKey(audioKey);
                    await stopAndUnloadAudio();

                    const { sound: createdSound } =
                        await Audio.Sound.createAsync(
                            { uri: audioUrl },
                            { shouldPlay: false },
                            (status) =>
                                handleAudioStatusUpdate(audioKey, status),
                        );

                    sound = createdSound;
                    activeAudioRef.current = createdSound;
                    activeAudioKeyRef.current = audioKey;
                }

                const status = await sound.getStatusAsync();
                if (!status.isLoaded) return;

                const durationMillis =
                    status.durationMillis ??
                    audioProgressMap[audioKey]?.durationMillis ??
                    0;
                const currentPosition =
                    status.positionMillis ??
                    audioProgressMap[audioKey]?.positionMillis ??
                    0;
                const maxPosition = Math.max(durationMillis, 0);
                const unclampedNext = currentPosition + deltaMillis;
                const nextPosition =
                    maxPosition > 0
                        ? Math.min(maxPosition, Math.max(0, unclampedNext))
                        : Math.max(0, unclampedNext);

                await sound.setPositionAsync(nextPosition);

                setAudioProgressMap((prev) => ({
                    ...prev,
                    [audioKey]: {
                        positionMillis: nextPosition,
                        durationMillis,
                    },
                }));
            } catch {
                Alert.alert("Thong bao", "Khong the tua nhanh tin nhan");
            } finally {
                if (shouldClearLoading) {
                    setAudioLoadingKey(null);
                }
            }
        },
        [audioProgressMap, handleAudioStatusUpdate, stopAndUnloadAudio],
    );

    const toggleAudioPlayback = useCallback(
        async (audioKey: string, audioUrl: string) => {
            try {
                setAudioLoadingKey(audioKey);

                if (
                    activeAudioRef.current &&
                    activeAudioKeyRef.current === audioKey
                ) {
                    const status =
                        await activeAudioRef.current.getStatusAsync();

                    handleAudioStatusUpdate(audioKey, status);

                    if (status.isLoaded && status.isPlaying) {
                        await activeAudioRef.current.pauseAsync();
                        setPlayingAudioKey(null);
                        return;
                    }

                    if (status.isLoaded) {
                        await activeAudioRef.current.playAsync();
                        setPlayingAudioKey(audioKey);
                    }

                    return;
                }

                await stopAndUnloadAudio();

                const { sound } = await Audio.Sound.createAsync(
                    { uri: audioUrl },
                    { shouldPlay: true },
                    (status) => handleAudioStatusUpdate(audioKey, status),
                );

                activeAudioRef.current = sound;
                activeAudioKeyRef.current = audioKey;
                setPlayingAudioKey(audioKey);
            } catch {
                const isWebm = /\.webm($|\?)/i.test(audioUrl);
                if (isWebm) {
                    Alert.alert(
                        "Thong bao",
                        "Thiet bi khong ho tro phat webm trong app. Ban co muon mo trinh duyet de nghe khong?",
                        [
                            {
                                text: "Huy",
                                style: "cancel",
                            },
                            {
                                text: "Mo",
                                onPress: () => {
                                    void Linking.openURL(audioUrl);
                                },
                            },
                        ],
                    );
                } else {
                    Alert.alert("Thong bao", "Khong the phat tep am thanh");
                }
            } finally {
                setAudioLoadingKey(null);
            }
        },
        [handleAudioStatusUpdate, stopAndUnloadAudio],
    );

    useEffect(() => {
        if (!playingAudioKey) {
            audioPlayPulse.setValue(1);
            return;
        }

        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(audioPlayPulse, {
                    toValue: 1.09,
                    duration: 340,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(audioPlayPulse, {
                    toValue: 1,
                    duration: 360,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ]),
        );

        loop.start();

        return () => {
            loop.stop();
            audioPlayPulse.setValue(1);
        };
    }, [audioPlayPulse, playingAudioKey]);

    useEffect(() => {
        if (!audioLoadingKey && !playingAudioKey) {
            audioIconFade.setValue(1);
            return;
        }

        audioIconFade.setValue(0.45);
        Animated.timing(audioIconFade, {
            toValue: 1,
            duration: 170,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start();
    }, [audioIconFade, audioLoadingKey, playingAudioKey]);

    const getAudioWaveBars = useCallback((seedSource: string): number[] => {
        const cache = audioWaveBarsCacheRef.current;
        const cached = cache[seedSource];
        if (cached) return cached;

        const next = buildAudioWaveBars(seedSource);
        cache[seedSource] = next;

        const keys = Object.keys(cache);
        if (keys.length > 400) {
            delete cache[keys[0]];
        }

        return next;
    }, []);

    const combinedAudioIconScale = useMemo(
        () => Animated.multiply(audioPlayPulse, audioPressScale),
        [audioPlayPulse, audioPressScale],
    );

    useEffect(() => {
        return () => {
            void stopAndUnloadAudio();

            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }

            const activeRecording = activeRecordingRef.current;
            activeRecordingRef.current = null;
            if (activeRecording) {
                void activeRecording
                    .stopAndUnloadAsync()
                    .catch(() => undefined);
            }

            void Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            }).catch(() => undefined);
        };
    }, [stopAndUnloadAudio]);

    const closeMediaViewer = useCallback(() => {
        setMediaViewer(null);
    }, []);

    const scrollToConversationBottom = useCallback((animated = true) => {
        requestAnimationFrame(() => {
            listRef.current?.scrollToEnd({ animated });
        });
    }, []);

    const updateRightScrollCuePosition = useCallback(() => {
        const { contentHeight, layoutHeight, offsetY } =
            scrollMetricsRef.current;
        const { height: listHeight } = listLayoutRef.current;
        const maxScrollable = Math.max(contentHeight - layoutHeight, 0);
        const ratio =
            maxScrollable > 0
                ? Math.min(Math.max(offsetY / maxScrollable, 0), 1)
                : 0;
        const cueTravel = Math.max(
            listHeight - RIGHT_SCROLL_CUE_HEIGHT - RIGHT_SCROLL_CUE_MARGIN * 2,
            0,
        );
        const nextTranslateY = ratio * cueTravel;
        rightScrollCueTranslateY.setValue(nextTranslateY);
    }, [rightScrollCueTranslateY]);

    const forceScrollToBottom = useCallback(
        (animated = false) => {
            if (forceBottomTimeoutRef.current) {
                clearTimeout(forceBottomTimeoutRef.current);
                forceBottomTimeoutRef.current = null;
            }

            scrollMetricsRef.current.offsetY = Math.max(
                scrollMetricsRef.current.contentHeight -
                    scrollMetricsRef.current.layoutHeight,
                0,
            );
            updateRightScrollCuePosition();

            scrollToConversationBottom(animated);
            forceBottomTimeoutRef.current = setTimeout(() => {
                scrollMetricsRef.current.offsetY = Math.max(
                    scrollMetricsRef.current.contentHeight -
                        scrollMetricsRef.current.layoutHeight,
                    0,
                );
                updateRightScrollCuePosition();
                listRef.current?.scrollToEnd({ animated: false });
                forceBottomTimeoutRef.current = null;
            }, 70);
        },
        [scrollToConversationBottom, updateRightScrollCuePosition],
    );

    const hideRightScrollCue = useCallback(() => {
        if (rightScrollCueHideTimerRef.current) {
            clearTimeout(rightScrollCueHideTimerRef.current);
            rightScrollCueHideTimerRef.current = null;
        }

        if (!rightScrollCueVisibleRef.current) {
            setShowRightScrollCue(false);
            rightScrollCueOpacity.setValue(0);
            return;
        }

        Animated.timing(rightScrollCueOpacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
        }).start(() => {
            rightScrollCueVisibleRef.current = false;
            setShowRightScrollCue(false);
        });
    }, [rightScrollCueOpacity]);

    const showRightScrollCueTemporarily = useCallback(() => {
        if (rightScrollCueHideTimerRef.current) {
            clearTimeout(rightScrollCueHideTimerRef.current);
            rightScrollCueHideTimerRef.current = null;
        }

        updateRightScrollCuePosition();

        if (!rightScrollCueVisibleRef.current) {
            rightScrollCueVisibleRef.current = true;
            setShowRightScrollCue(true);

            rightScrollCueOpacity.stopAnimation();
            rightScrollCueOpacity.setValue(0);
            Animated.timing(rightScrollCueOpacity, {
                toValue: 1,
                duration: 110,
                useNativeDriver: true,
            }).start();
        }

        rightScrollCueHideTimerRef.current = setTimeout(() => {
            hideRightScrollCue();
        }, RIGHT_SCROLL_CUE_HIDE_MS);
    }, [
        hideRightScrollCue,
        rightScrollCueOpacity,
        updateRightScrollCuePosition,
    ]);

    const handleListLayout = useCallback(
        (event: LayoutChangeEvent) => {
            const { y, height } = event.nativeEvent.layout;
            listLayoutRef.current = { y, height };
            scrollMetricsRef.current.layoutHeight = height;
            const nextBaseTop = y + RIGHT_SCROLL_CUE_MARGIN;

            setRightScrollCueBaseTop((prev) =>
                Math.abs(prev - nextBaseTop) < 1 ? prev : nextBaseTop,
            );

            if (stickToBottomRef.current) {
                scrollMetricsRef.current.offsetY = Math.max(
                    scrollMetricsRef.current.contentHeight - height,
                    0,
                );
            }

            updateRightScrollCuePosition();
        },
        [updateRightScrollCuePosition],
    );

    const handleContentSizeChange = useCallback(
        (_width: number, height: number) => {
            scrollMetricsRef.current.contentHeight = height;

            if (jumpScrollLockRef.current) {
                updateRightScrollCuePosition();
                return;
            }

            if (isHistoricalMode) {
                updateRightScrollCuePosition();
                return;
            }

            const shouldKeepTypingVisible =
                typingParticipantIds.length > 0 &&
                (stickToBottomRef.current || isAtBottomRef.current);

            if (!stickToBottomRef.current && !shouldKeepTypingVisible) {
                updateRightScrollCuePosition();
                return;
            }

            requestAnimationFrame(() => {
                forceScrollToBottom(false);
            });
        },
        [
            conversationId,
            forceScrollToBottom,
            isHistoricalMode,
            typingParticipantIds.length,
            updateRightScrollCuePosition,
        ],
    );

    useEffect(() => {
        latestMessageIdRef.current = "";
        isAtBottomRef.current = true;
        stickToBottomRef.current = true;
        didInitialAutoScrollRef.current = false;
        setShowScrollToBottomButton(false);
        setPendingNewMessages(0);
        rightScrollCueVisibleRef.current = false;
        rightScrollCueTranslateY.setValue(0);
        setShowRightScrollCue(false);
        autoPagingSuppressedUntilRef.current = 0;
        autoPagingSuppressLogAtRef.current = 0;
        pendingJumpMessageIdRef.current = null;
        jumpScrollLockRef.current = false;
        scheduleReleaseJumpScrollLock(0);
        hideRightScrollCue();
    }, [
        conversationId,
        hideRightScrollCue,
        rightScrollCueTranslateY,
        scheduleReleaseJumpScrollLock,
    ]);

    useEffect(() => {
        if (loading) return;
        if (messages.length === 0) return;
        if (didInitialAutoScrollRef.current) return;
        if (jumpScrollLockRef.current) return;

        didInitialAutoScrollRef.current = true;
        stickToBottomRef.current = true;
        isAtBottomRef.current = true;
        forceScrollToBottom(false);
    }, [forceScrollToBottom, loading, messages.length]);

    useEffect(() => {
        const newestMessage = messages.at(-1);
        if (!newestMessage) return;

        if (jumpScrollLockRef.current) {
            latestMessageIdRef.current = newestMessage.id;
            return;
        }

        if (isHistoricalMode) {
            if (latestMessageIdRef.current === newestMessage.id) {
                return;
            }

            const previousLatestMessageId = latestMessageIdRef.current;
            latestMessageIdRef.current = newestMessage.id;
            setShowScrollToBottomButton(true);

            if (!previousLatestMessageId) {
                return;
            }

            if (newestMessage.senderId !== currentUserId) {
                setPendingNewMessages((prev) => Math.min(prev + 1, 99));
            }
            return;
        }

        if (latestMessageIdRef.current === newestMessage.id) return;
        latestMessageIdRef.current = newestMessage.id;

        const shouldAutoScroll =
            newestMessage.senderId === currentUserId || isAtBottomRef.current;

        if (shouldAutoScroll) {
            stickToBottomRef.current = true;
            forceScrollToBottom(false);
            setShowScrollToBottomButton(false);
            setPendingNewMessages(0);
            return;
        }

        setShowScrollToBottomButton(true);
        if (newestMessage.senderId !== currentUserId) {
            setPendingNewMessages((prev) => Math.min(prev + 1, 99));
        }
    }, [
        conversationId,
        currentUserId,
        forceScrollToBottom,
        isHistoricalMode,
        messages,
    ]);

    useEffect(() => {
        if (typingParticipantIds.length === 0) return;
        if (jumpScrollLockRef.current) return;
        if (isHistoricalMode) return;

        if (typingAutoScrollTimeoutRef.current) {
            clearTimeout(typingAutoScrollTimeoutRef.current);
            typingAutoScrollTimeoutRef.current = null;
        }

        const shouldKeepTypingVisible =
            stickToBottomRef.current || isAtBottomRef.current;

        if (!shouldKeepTypingVisible) return;

        requestAnimationFrame(() => {
            forceScrollToBottom(false);
            setShowScrollToBottomButton(false);
            setPendingNewMessages(0);

            // Pass 2: xử lý trường hợp footer typing render trễ một nhịp.
            typingAutoScrollTimeoutRef.current = setTimeout(() => {
                forceScrollToBottom(false);
            }, 140);
        });
    }, [
        conversationId,
        forceScrollToBottom,
        isHistoricalMode,
        typingParticipantIds.length,
    ]);

    const handleListScrollBeginDrag = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            autoPagingSuppressedUntilRef.current = 0;
            const distanceFromBottom =
                event.nativeEvent.contentSize.height -
                (event.nativeEvent.layoutMeasurement.height +
                    event.nativeEvent.contentOffset.y);

            if (distanceFromBottom > RIGHT_SCROLL_CUE_TRIGGER_PX) {
                showRightScrollCueTemporarily();
            }

            if (distanceFromBottom > SHOW_SCROLL_BUTTON_THRESHOLD_PX) {
                stickToBottomRef.current = false;
                setShowScrollToBottomButton(true);
            }
        },
        [showRightScrollCueTemporarily],
    );

    const onSend = async () => {
        setEmojiPickerOpen(false);
        sendTypingSignal(false);
        const sent = await handleSend(replyToMessage?.id);
        if (sent) {
            setReplyToMessage(null);
            scrollToConversationBottom(true);
            setShowScrollToBottomButton(false);
            setPendingNewMessages(0);
        }
    };

    const onPickMediaAndSend = async () => {
        try {
            const permission =
                await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert(
                    "Thong bao",
                    "Can cap quyen thu vien anh de gui tep",
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsMultipleSelection: true,
                quality: 1,
                selectionLimit: 20,
            });

            if (result.canceled || result.assets.length === 0) return;

            const files: LocalUploadFile[] = result.assets.map(
                (asset, index) => {
                    const fileName =
                        asset.fileName ||
                        asset.uri.split("/").pop() ||
                        `upload-${Date.now()}-${index}`;
                    const mimeType =
                        asset.mimeType ||
                        (asset.type === "video" ? "video/mp4" : "image/jpeg");

                    return {
                        uri: asset.uri,
                        fileName,
                        mimeType,
                        fileSize: asset.fileSize ?? 1,
                    };
                },
            );

            const sent = await handleSendMixedMedia(
                files,
                undefined,
                replyToMessage?.id,
            );
            if (sent) {
                setReplyToMessage(null);
                scrollToConversationBottom(true);
            }
        } catch {
            Alert.alert("Thong bao", "Khong the chon tep vao luc nay");
        }
    };

    const onPickDocumentAndSend = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                multiple: true,
                type: "*/*",
                copyToCacheDirectory: true,
            });

            if (
                result.canceled ||
                !result.assets ||
                result.assets.length === 0
            ) {
                return;
            }

            const files: LocalUploadFile[] = result.assets.map(
                (asset, index) => ({
                    uri: asset.uri,
                    fileName: asset.name || `document-${Date.now()}-${index}`,
                    mimeType: asset.mimeType || "application/octet-stream",
                    fileSize: asset.size ?? 1,
                }),
            );

            const sent = await handleSendMixedMedia(
                files,
                undefined,
                replyToMessage?.id,
            );
            if (sent) {
                setReplyToMessage(null);
                scrollToConversationBottom(true);
            }
        } catch {
            Alert.alert("Thong bao", "Khong the chon tep vao luc nay");
        }
    };

    const stopRecordingTimer = useCallback(() => {
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
    }, []);

    const finalizeRecording = useCallback(
        async (shouldSend: boolean) => {
            const recording = activeRecordingRef.current;
            if (!recording) return false;

            activeRecordingRef.current = null;
            stopRecordingTimer();
            setIsRecordingVoice(false);

            try {
                await recording.stopAndUnloadAsync();
            } catch {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                }).catch(() => undefined);
                setRecordingSeconds(0);
                return false;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            }).catch(() => undefined);

            if (!shouldSend) {
                setRecordingSeconds(0);
                return false;
            }

            const uri = recording.getURI();
            if (!uri) {
                setRecordingSeconds(0);
                return false;
            }

            const recordedFile: LocalUploadFile = {
                uri,
                fileName: `voice-${Date.now()}.m4a`,
                mimeType: "audio/m4a",
                fileSize: 1,
            };

            const sent = await handleSendMixedMedia(
                [recordedFile],
                undefined,
                replyToMessage?.id,
            );

            setRecordingSeconds(0);

            if (!sent) {
                Alert.alert("Thong bao", "Khong the gui tin nhan thoai");
                return false;
            }

            setReplyToMessage(null);
            scrollToConversationBottom(true);
            return true;
        },
        [
            handleSendMixedMedia,
            replyToMessage?.id,
            scrollToConversationBottom,
            stopRecordingTimer,
        ],
    );

    const onStartRecording = useCallback(async () => {
        if (uploading || sending || isRecordingVoice) return;

        try {
            setEmojiPickerOpen(false);
            const permission = await Audio.requestPermissionsAsync();
            if (!permission.granted) {
                Alert.alert("Thong bao", "Can cap quyen microphone de ghi am");
                return;
            }

            sendTypingSignal(false);

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const recording = new Audio.Recording();
            await recording.prepareToRecordAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY,
            );
            await recording.startAsync();

            activeRecordingRef.current = recording;
            setRecordingSeconds(0);
            setIsRecordingVoice(true);

            recordingTimerRef.current = setInterval(() => {
                setRecordingSeconds((prev) => prev + 1);
            }, 1000);
        } catch {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            }).catch(() => undefined);
            Alert.alert("Thong bao", "Khong the bat dau ghi am luc nay");
        }
    }, [isRecordingVoice, sending, sendTypingSignal, uploading]);

    const onStopRecordingAndSend = useCallback(async () => {
        if (!isRecordingVoice) return;
        await finalizeRecording(true);
    }, [finalizeRecording, isRecordingVoice]);

    const onCancelRecording = useCallback(async () => {
        if (!isRecordingVoice) return;
        await finalizeRecording(false);
    }, [finalizeRecording, isRecordingVoice]);

    const onToggleEmojiPicker = useCallback(() => {
        if (uploading || sending || isRecordingVoice) return;
        setEmojiPickerOpen((prev) => !prev);
    }, [isRecordingVoice, sending, uploading]);

    const onPickEmoji = useCallback(
        (emoji: string) => {
            const baseText = messageText;
            const start = Math.max(
                0,
                Math.min(inputSelection.start, baseText.length),
            );
            const end = Math.max(
                0,
                Math.min(inputSelection.end, baseText.length),
            );
            const nextText =
                baseText.slice(0, start) + emoji + baseText.slice(end);
            const nextCaret = start + emoji.length;

            setMessageText(nextText);
            sendTypingSignal(Boolean(nextText.trim()));
            setEmojiPickerOpen(false);
            setInputSelection({ start: nextCaret, end: nextCaret });

            requestAnimationFrame(() => {
                messageInputRef.current?.focus();
            });
        },
        [
            inputSelection.end,
            inputSelection.start,
            messageText,
            sendTypingSignal,
            setMessageText,
        ],
    );

    const hasTypedText = messageText.trim().length > 0;

    const closeContextMenu = () => setContextMenu(null);

    const handleMessageLongPress = (
        event: GestureResponderEvent,
        messageId: string,
        mine: boolean,
    ) => {
        const { width, height } = Dimensions.get("window");
        const x = event.nativeEvent.pageX;
        const y = event.nativeEvent.pageY;
        const rawLeft = mine ? x - MENU_WIDTH + 34 : x - 18;
        const left = Math.min(
            Math.max(MENU_HORIZONTAL_MARGIN, rawLeft),
            width - MENU_WIDTH - MENU_HORIZONTAL_MARGIN,
        );
        const minTop = insets.top + MENU_VERTICAL_MARGIN;
        const top = Math.min(
            Math.max(minTop, y - 220),
            height - MENU_ESTIMATED_HEIGHT - MENU_VERTICAL_MARGIN,
        );

        setContextMenu({ messageId, top, left });
    };

    const handleContextAction = (actionKey: string) => {
        if (!contextMenu) return;
        if (actionKey === "copy") {
            Alert.alert("Thông báo", "Đã chọn Copy tin nhắn.");
        }

        if (actionKey === "unsend") {
            void handleRecall(contextMenu.messageId);
        }

        if (actionKey === "delete-mine") {
            void handleDeleteForMe(contextMenu.messageId);
        }

        if (actionKey === "pin") {
            if (selectedMessagePinned) {
                void handleUnpinMessage(contextMenu.messageId);
            } else {
                void handlePinMessage(contextMenu.messageId);
            }
        }

        if (actionKey === "reply") {
            const targetMessage = messages.find(
                (message) => message.id === contextMenu.messageId,
            );

            if (targetMessage) {
                const senderName =
                    membersById[targetMessage.senderId]?.nickname ||
                    membersById[targetMessage.senderId]?.username ||
                    "Nguoi dung";

                setReplyToMessage({
                    id: targetMessage.id,
                    senderName,
                    content: buildReplyPreview(targetMessage),
                });
            }
        }

        closeContextMenu();
    };

    const handleListScroll = (
        event: NativeSyntheticEvent<NativeScrollEvent>,
    ) => {
        const now = Date.now();
        const isAutoPagingSuppressed =
            jumpScrollLockRef.current ||
            now < autoPagingSuppressedUntilRef.current;

        scrollMetricsRef.current = {
            contentHeight: event.nativeEvent.contentSize.height,
            layoutHeight: event.nativeEvent.layoutMeasurement.height,
            offsetY: event.nativeEvent.contentOffset.y,
        };
        updateRightScrollCuePosition();

        if (event.nativeEvent.contentOffset.y <= LOAD_OLDER_TRIGGER_PX) {
            if (!isAutoPagingSuppressed) {
                void loadOlderMessages();
            } else if (now - autoPagingSuppressLogAtRef.current > 700) {
                autoPagingSuppressLogAtRef.current = now;
            }
        }

        const distanceFromBottom =
            event.nativeEvent.contentSize.height -
            (event.nativeEvent.layoutMeasurement.height +
                event.nativeEvent.contentOffset.y);

        const isAtBottomStrict =
            distanceFromBottom <= STICKY_BOTTOM_THRESHOLD_PX;
        const shouldShowScrollButton =
            isHistoricalMode ||
            distanceFromBottom > SHOW_SCROLL_BUTTON_THRESHOLD_PX;

        isAtBottomRef.current = isAtBottomStrict;

        if (isAtBottomStrict) {
            stickToBottomRef.current = true;
        } else {
            stickToBottomRef.current = false;
        }

        if (isAtBottomStrict) {
            hideRightScrollCue();
        }

        if (distanceFromBottom > RIGHT_SCROLL_CUE_TRIGGER_PX) {
            showRightScrollCueTemporarily();
        }

        if (!shouldShowScrollButton) {
            setShowScrollToBottomButton(false);
            setPendingNewMessages(0);
        } else {
            setShowScrollToBottomButton(true);
        }

        if (
            distanceFromBottom <= LOAD_NEWER_TRIGGER_PX &&
            isHistoricalMode &&
            hasMoreNewer
        ) {
            if (!isAutoPagingSuppressed) {
                void loadNewerMessages();
            } else if (now - autoPagingSuppressLogAtRef.current > 700) {
                autoPagingSuppressLogAtRef.current = now;
            }
        }
    };

    const handleScrollToIndexFailed = (info: {
        index: number;
        highestMeasuredFrameIndex: number;
        averageItemLength: number;
    }) => {
        const fallbackOffset = Math.max(
            info.index * Math.max(info.averageItemLength, 72) - 120,
            0,
        );

        listRef.current?.scrollToOffset({
            offset: fallbackOffset,
            animated: true,
        });

        setTimeout(() => {
            listRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.5,
            });
        }, 180);
    };

    const handleScrollToBottomClick = useCallback(async () => {
        if (isHistoricalMode) {
            await resetToPresent();
        }

        autoPagingSuppressedUntilRef.current = 0;
        pendingJumpMessageIdRef.current = null;
        scheduleReleaseJumpScrollLock(0);
        stickToBottomRef.current = true;
        forceScrollToBottom(false);
        isAtBottomRef.current = true;
        setShowScrollToBottomButton(false);
        setPendingNewMessages(0);
        hideRightScrollCue();
    }, [
        forceScrollToBottom,
        hideRightScrollCue,
        isHistoricalMode,
        resetToPresent,
        scheduleReleaseJumpScrollLock,
    ]);

    useEffect(() => {
        return () => {
            if (forceBottomTimeoutRef.current) {
                clearTimeout(forceBottomTimeoutRef.current);
                forceBottomTimeoutRef.current = null;
            }

            if (jumpScrollLockTimerRef.current) {
                clearTimeout(jumpScrollLockTimerRef.current);
                jumpScrollLockTimerRef.current = null;
            }

            if (typingAutoScrollTimeoutRef.current) {
                clearTimeout(typingAutoScrollTimeoutRef.current);
                typingAutoScrollTimeoutRef.current = null;
            }

            if (rightScrollCueHideTimerRef.current) {
                clearTimeout(rightScrollCueHideTimerRef.current);
                rightScrollCueHideTimerRef.current = null;
            }
        };
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={styles.header}>
                    <Pressable
                        style={styles.headerBackBtn}
                        onPress={() => router.back()}
                        hitSlop={8}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={24}
                            color={colors.text}
                        />
                    </Pressable>

                    <View style={styles.headerIdentity}>
                        <UserAvatar
                            uri={otherUser?.avatar}
                            name={otherUser?.username ?? "?"}
                            size={40}
                        />
                        <View style={styles.headerMeta}>
                            <Text style={styles.headerName} numberOfLines={1}>
                                {otherUser?.nickname ??
                                    otherUser?.username ??
                                    "Conversation"}
                            </Text>
                            <Text style={styles.headerStatus} numberOfLines={1}>
                                {activityText}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.headerActions}>
                        <Pressable style={styles.headerActionBtn} hitSlop={8}>
                            <Ionicons
                                name="sparkles-outline"
                                size={22}
                                color={colors.text}
                            />
                        </Pressable>
                        <Pressable style={styles.headerActionBtn} hitSlop={8}>
                            <Ionicons
                                name="call-outline"
                                size={22}
                                color={colors.text}
                            />
                        </Pressable>
                        <Pressable style={styles.headerActionBtn} hitSlop={8}>
                            <Ionicons
                                name="videocam-outline"
                                size={22}
                                color={colors.text}
                            />
                        </Pressable>
                    </View>
                </View>

                {pinnedBannerItems.length > 0 ? (
                    <View style={styles.pinnedBannerWrap}>
                        <View style={styles.pinnedBannerHeaderRow}>
                            <Ionicons
                                name="pin-outline"
                                size={14}
                                color="#4B5563"
                            />

                            {primaryPinnedItem &&
                            (!showPinnedList || !canExpandPinnedList) ? (
                                <Pressable
                                    style={styles.pinnedPrimaryPressable}
                                    onPress={() =>
                                        handleOpenPinnedMessage(
                                            primaryPinnedItem.messageId,
                                        )
                                    }
                                >
                                    {primaryPinnedItem.thumbUrl ? (
                                        <Image
                                            source={{
                                                uri: primaryPinnedItem.thumbUrl,
                                            }}
                                            style={styles.pinnedThumb}
                                        />
                                    ) : (
                                        <View
                                            style={
                                                styles.pinnedThumbPlaceholder
                                            }
                                        />
                                    )}

                                    <View style={styles.pinnedPrimaryTextWrap}>
                                        <Text
                                            style={styles.pinnedSenderText}
                                            numberOfLines={1}
                                        >
                                            {primaryPinnedItem.senderName}
                                        </Text>
                                        <Text
                                            style={styles.pinnedPreviewText}
                                            numberOfLines={1}
                                        >
                                            {primaryPinnedItem.preview}
                                        </Text>
                                    </View>
                                </Pressable>
                            ) : (
                                <Text style={styles.pinnedCountText}>
                                    {`Tin nhan da ghim (${pinnedBannerItems.length})`}
                                </Text>
                            )}

                            {canExpandPinnedList ? (
                                <Pressable
                                    style={styles.pinnedToggleBtn}
                                    onPress={() =>
                                        setShowPinnedList((prev) => !prev)
                                    }
                                >
                                    <Ionicons
                                        name={
                                            showPinnedList
                                                ? "chevron-up"
                                                : "chevron-down"
                                        }
                                        size={16}
                                        color="#4B5563"
                                    />
                                </Pressable>
                            ) : null}

                            {!canExpandPinnedList && primaryPinnedItem ? (
                                <Pressable
                                    style={styles.pinnedUnpinBtn}
                                    hitSlop={8}
                                    onPress={() =>
                                        void handleUnpinMessage(
                                            primaryPinnedItem.messageId,
                                        )
                                    }
                                >
                                    <Ionicons
                                        name="close"
                                        size={14}
                                        color="#DC2626"
                                    />
                                </Pressable>
                            ) : null}
                        </View>

                        {showPinnedList && canExpandPinnedList ? (
                            <View style={styles.pinnedListWrap}>
                                {pinnedBannerItems.map((pinItem) => (
                                    <View
                                        key={`${pinItem.messageId}-${pinItem.pinnedAt}`}
                                        style={styles.pinnedListItemRow}
                                    >
                                        <Pressable
                                            style={
                                                styles.pinnedListMainPressable
                                            }
                                            onPress={() =>
                                                handleOpenPinnedMessage(
                                                    pinItem.messageId,
                                                )
                                            }
                                        >
                                            {pinItem.thumbUrl ? (
                                                <Image
                                                    source={{
                                                        uri: pinItem.thumbUrl,
                                                    }}
                                                    style={styles.pinnedThumb}
                                                />
                                            ) : (
                                                <View
                                                    style={
                                                        styles.pinnedThumbPlaceholder
                                                    }
                                                />
                                            )}

                                            <View
                                                style={
                                                    styles.pinnedPrimaryTextWrap
                                                }
                                            >
                                                <Text
                                                    style={
                                                        styles.pinnedSenderText
                                                    }
                                                    numberOfLines={1}
                                                >
                                                    {pinItem.senderName}
                                                </Text>
                                                <Text
                                                    style={
                                                        styles.pinnedPreviewText
                                                    }
                                                    numberOfLines={1}
                                                >
                                                    {pinItem.preview}
                                                </Text>
                                            </View>
                                        </Pressable>

                                        <Pressable
                                            style={styles.pinnedUnpinBtn}
                                            hitSlop={8}
                                            onPress={() =>
                                                void handleUnpinMessage(
                                                    pinItem.messageId,
                                                )
                                            }
                                        >
                                            <Ionicons
                                                name="close"
                                                size={14}
                                                color="#DC2626"
                                            />
                                        </Pressable>
                                    </View>
                                ))}
                            </View>
                        ) : null}
                    </View>
                ) : null}

                <FlatList
                    ref={listRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                    showsVerticalScrollIndicator={false}
                    onLayout={handleListLayout}
                    onScrollBeginDrag={handleListScrollBeginDrag}
                    onScroll={handleListScroll}
                    onContentSizeChange={handleContentSizeChange}
                    scrollEventThrottle={16}
                    onScrollToIndexFailed={handleScrollToIndexFailed}
                    renderItem={({ item, index }) => {
                        const mine = item.senderId === currentUserId;
                        const sender = membersById[item.senderId];
                        const senderDisplayName =
                            sender?.nickname ||
                            sender?.username ||
                            "Nguoi dung";

                        let previousMessage: Message | undefined;
                        for (let cursor = index - 1; cursor >= 0; cursor--) {
                            const candidate = messages[cursor];
                            if (isPinSystemMessageType(candidate.type)) {
                                continue;
                            }
                            previousMessage = candidate;
                            break;
                        }

                        let nextMessage: Message | undefined;
                        for (
                            let cursor = index + 1;
                            cursor < messages.length;
                            cursor++
                        ) {
                            const candidate = messages[cursor];
                            if (isPinSystemMessageType(candidate.type)) {
                                continue;
                            }
                            nextMessage = candidate;
                            break;
                        }
                        const isFirstInGroup =
                            !previousMessage ||
                            previousMessage.senderId !== item.senderId;
                        const isLastInGroup =
                            !nextMessage ||
                            nextMessage.senderId !== item.senderId;
                        const isConsecutiveRecalledInGroup =
                            !isFirstInGroup &&
                            item.isRecalled &&
                            Boolean(previousMessage?.isRecalled) &&
                            previousMessage?.senderId === item.senderId;
                        const showSenderLabel =
                            !mine &&
                            conversation?.type === "GROUP" &&
                            isFirstInGroup &&
                            !item.isRecalled;
                        const showAvatar = !mine && isLastInGroup;
                        const messageTime = formatMessageTime(item.createdAt);
                        const receiptsForThisMessage =
                            mine && !item.isRecalled
                                ? readReceipts.filter(
                                      (receipt) =>
                                          receipt.lastMessageId === item.id &&
                                          receipt.userId !== currentUserId,
                                  )
                                : [];

                        const imageUrls =
                            item.type === "IMAGE"
                                ? resolveAttachmentUrls(item)
                                : [];
                        const videoUrls =
                            item.type === "VIDEO"
                                ? resolveAttachmentUrls(item)
                                : [];
                        const audioUrls =
                            item.type === "AUDIO"
                                ? resolveAttachmentUrls(item)
                                : [];
                        const callMeta = parseCallMeta(item);

                        const rawFileAttachments =
                            item.type === "FILE"
                                ? Array.isArray(item.attachments) &&
                                  item.attachments.length > 0
                                    ? item.attachments
                                    : isLikelyStoragePathOrUrl(item.content)
                                      ? [
                                            {
                                                url: item.content ?? "",
                                                fileName:
                                                    (item.content ?? "")
                                                        .split("/")
                                                        .pop() ||
                                                    "Tep dinh kem",
                                            },
                                        ]
                                      : []
                                : [];

                        const fileAttachments = rawFileAttachments.map(
                            (attachment) => ({
                                ...attachment,
                                resolvedUrl:
                                    resolveMediaUrl(attachment.url) ||
                                    attachment.url,
                            }),
                        );

                        const replySenderName =
                            typeof item.replyInfo?.senderId === "number"
                                ? membersById[item.replyInfo.senderId]
                                      ?.nickname ||
                                  membersById[item.replyInfo.senderId]
                                      ?.username ||
                                  "Nguoi dung"
                                : "Nguoi dung";

                        const replyPreviewType = inferReplyPreviewType(
                            item.replyInfo,
                        );
                        const replyPreviewContent =
                            item.replyInfo?.content?.trim() ?? "";
                        const normalizedReplyPreviewContent =
                            normalizeSearchText(replyPreviewContent);
                        const isReplyPreviewRecalled =
                            normalizedReplyPreviewContent.includes("thu hoi") ||
                            normalizedReplyPreviewContent.includes(
                                "da bi go bo",
                            ) ||
                            normalizedReplyPreviewContent.includes(
                                "da duoc go bo",
                            );
                        const replyPreviewImageUrl =
                            replyPreviewType === "IMAGE" &&
                            isLikelyStoragePathOrUrl(replyPreviewContent)
                                ? resolveMediaUrl(replyPreviewContent)
                                : "";
                        const hasReplyLeadingVisual =
                            !isReplyPreviewRecalled &&
                            (replyPreviewType === "IMAGE" ||
                                replyPreviewType === "VIDEO" ||
                                replyPreviewType === "AUDIO" ||
                                replyPreviewType === "CALL");
                        const replyPreviewText = isReplyPreviewRecalled
                            ? "Tin nhan da duoc thu hoi"
                            : replyPreviewType === "IMAGE"
                              ? "Hinh anh"
                              : replyPreviewType === "VIDEO"
                                ? "Video"
                                : replyPreviewType === "AUDIO"
                                  ? "Tin nhan thoai"
                                  : replyPreviewType === "FILE"
                                    ? "File dinh kem"
                                    : replyPreviewType === "CALL"
                                      ? "Cuoc goi"
                                      : replyPreviewContent || "Tin nhan";

                        const trimmedContent = item.content?.trim() ?? "";
                        const messageIsEmojiOnly =
                            item.type === "TEXT" &&
                            !item.isRecalled &&
                            isEmojiOnlyText(trimmedContent);

                        const shouldShowFallbackText =
                            !item.isRecalled &&
                            item.type !== "IMAGE" &&
                            item.type !== "FILE" &&
                            item.type !== "VIDEO" &&
                            item.type !== "AUDIO" &&
                            item.type !== "CALL" &&
                            item.type !== "SYSTEM_PIN" &&
                            item.type !== "SYSTEM_UPIN";

                        const shouldShowAttachmentCaption =
                            !item.isRecalled &&
                            (item.type === "IMAGE" ||
                                item.type === "FILE" ||
                                item.type === "VIDEO" ||
                                item.type === "AUDIO") &&
                            trimmedContent.length > 0 &&
                            !isLikelyStoragePathOrUrl(trimmedContent);

                        const isRichCardMessage =
                            !item.isRecalled &&
                            (item.type === "IMAGE" ||
                                item.type === "FILE" ||
                                item.type === "VIDEO" ||
                                item.type === "AUDIO" ||
                                item.type === "CALL");
                        const hasReplyPreview =
                            Boolean(item.replyInfo) && !item.isRecalled;
                        const shouldOverlayReplyWithBubble =
                            hasReplyPreview && !isRichCardMessage;
                        const replySenderId = item.replyInfo?.senderId;
                        const replyMessageId = item.replyInfo?.messageId ?? "";

                        const bubbleGroupShape = !isRichCardMessage
                            ? mine
                                ? isFirstInGroup
                                    ? isLastInGroup
                                        ? styles.bubbleMineSingle
                                        : styles.bubbleMineFirst
                                    : isLastInGroup
                                      ? styles.bubbleMineLast
                                      : styles.bubbleMineMiddle
                                : isFirstInGroup
                                  ? isLastInGroup
                                      ? styles.bubbleOtherSingle
                                      : styles.bubbleOtherFirst
                                  : isLastInGroup
                                    ? styles.bubbleOtherLast
                                    : styles.bubbleOtherMiddle
                            : null;

                        const isPinSystemMessage = isPinSystemMessageType(
                            item.type,
                        );
                        if (isPinSystemMessage) {
                            const pinRunMeta =
                                pinSystemRunMetaByIndex.get(index);
                            if (pinRunMeta?.shouldHideMessage) {
                                return null;
                            }

                            if (pinRunMeta?.shouldRenderCollapsedButton) {
                                return (
                                    <View style={styles.systemMessageRow}>
                                        <Pressable
                                            style={styles.systemCollapsedBtn}
                                            onPress={() =>
                                                handleExpandPinSystemRun(
                                                    pinRunMeta.runKey,
                                                )
                                            }
                                        >
                                            <Ionicons
                                                name="pin-outline"
                                                size={13}
                                                color="#2563EB"
                                            />
                                            <Text
                                                style={
                                                    styles.systemCollapsedBtnText
                                                }
                                            >
                                                {`Xem cap nhat truoc (${pinRunMeta.runLength})`}
                                            </Text>
                                        </Pressable>
                                    </View>
                                );
                            }

                            const actorLabel = mine ? "Ban" : senderDisplayName;
                            const actionLabel =
                                item.type === "SYSTEM_UPIN"
                                    ? "bo ghim"
                                    : "ghim";

                            return (
                                <View style={styles.systemMessageRow}>
                                    <View style={styles.systemMessageBadge}>
                                        <Ionicons
                                            name="pin-outline"
                                            size={12}
                                            color="#4B5563"
                                        />
                                        <Text
                                            numberOfLines={1}
                                            style={styles.systemMessageText}
                                        >
                                            {`${actorLabel} ${actionLabel} ${resolvePinSystemPreview(item)}`}
                                        </Text>
                                    </View>
                                </View>
                            );
                        }

                        return (
                            <View style={styles.messageItemWrap}>
                                <View
                                    style={[
                                        styles.row,
                                        isFirstInGroup
                                            ? styles.rowGroupStart
                                            : styles.rowGrouped,
                                        hasReplyPreview &&
                                            !isFirstInGroup &&
                                            styles.rowGroupedWithReply,
                                        isConsecutiveRecalledInGroup &&
                                            styles.rowGroupedRecalled,
                                        mine ? styles.rowMine : styles.rowOther,
                                    ]}
                                >
                                    {!mine ? (
                                        showAvatar ? (
                                            <UserAvatar
                                                uri={sender?.avatar}
                                                name={sender?.username ?? "?"}
                                                size={30}
                                            />
                                        ) : (
                                            <View style={styles.avatarSpacer} />
                                        )
                                    ) : null}

                                    <View
                                        style={[
                                            styles.messageColumn,
                                            mine
                                                ? styles.messageColumnMine
                                                : styles.messageColumnOther,
                                        ]}
                                    >
                                        {showSenderLabel ? (
                                            <Text
                                                style={styles.groupSenderLabel}
                                                numberOfLines={1}
                                            >
                                                {senderDisplayName}
                                            </Text>
                                        ) : null}

                                        {hasReplyPreview ? (
                                            <View
                                                style={[
                                                    styles.replyRelationRow,
                                                    mine &&
                                                        styles.replyRelationRowMine,
                                                ]}
                                            >
                                                <Ionicons
                                                    name="arrow-undo"
                                                    size={12}
                                                    color="#6B7280"
                                                />
                                                <Text
                                                    style={[
                                                        styles.replyRelationLabel,
                                                        mine &&
                                                            styles.replyRelationLabelMine,
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {formatReplyLabel({
                                                        currentUserId,
                                                        messageSenderId:
                                                            item.senderId,
                                                        messageSenderName:
                                                            senderDisplayName,
                                                        replySenderId,
                                                        replySenderName,
                                                    })}
                                                </Text>
                                            </View>
                                        ) : null}

                                        <Pressable
                                            delayLongPress={500}
                                            onLongPress={(event) =>
                                                handleMessageLongPress(
                                                    event,
                                                    item.id,
                                                    mine,
                                                )
                                            }
                                        >
                                            {messageIsEmojiOnly ? (
                                                <Text
                                                    style={styles.emojiOnlyText}
                                                >
                                                    {trimmedContent}
                                                </Text>
                                            ) : (
                                                <>
                                                    {hasReplyPreview ? (
                                                        <Pressable
                                                            style={[
                                                                styles.replyPreview,
                                                                styles.replyPreviewOverlay,
                                                                mine &&
                                                                    styles.replyPreviewMine,
                                                                mine
                                                                    ? styles.replyPreviewConnectedMine
                                                                    : styles.replyPreviewConnectedOther,
                                                            ]}
                                                            onPress={() => {
                                                                if (
                                                                    !replyMessageId
                                                                )
                                                                    return;
                                                                void requestJumpToMessage(
                                                                    replyMessageId,
                                                                );
                                                            }}
                                                        >
                                                            <View
                                                                style={
                                                                    styles.replyPreviewBody
                                                                }
                                                            >
                                                                {replyPreviewImageUrl ? (
                                                                    <Image
                                                                        source={{
                                                                            uri: replyPreviewImageUrl,
                                                                        }}
                                                                        style={
                                                                            styles.replyPreviewThumb
                                                                        }
                                                                    />
                                                                ) : replyPreviewType ===
                                                                      "IMAGE" &&
                                                                  !isReplyPreviewRecalled ? (
                                                                    <View
                                                                        style={[
                                                                            styles.replyPreviewIconBox,
                                                                            mine &&
                                                                                styles.replyPreviewIconBoxMine,
                                                                        ]}
                                                                    >
                                                                        <Ionicons
                                                                            name="image-outline"
                                                                            size={
                                                                                18
                                                                            }
                                                                            color="#111827"
                                                                        />
                                                                    </View>
                                                                ) : replyPreviewType ===
                                                                      "VIDEO" &&
                                                                  !isReplyPreviewRecalled ? (
                                                                    <View
                                                                        style={[
                                                                            styles.replyPreviewIconBox,
                                                                            mine &&
                                                                                styles.replyPreviewIconBoxMine,
                                                                        ]}
                                                                    >
                                                                        <Ionicons
                                                                            name="play"
                                                                            size={
                                                                                18
                                                                            }
                                                                            color="#111827"
                                                                        />
                                                                    </View>
                                                                ) : replyPreviewType ===
                                                                      "AUDIO" &&
                                                                  !isReplyPreviewRecalled ? (
                                                                    <View
                                                                        style={[
                                                                            styles.replyPreviewIconBox,
                                                                            mine &&
                                                                                styles.replyPreviewIconBoxMine,
                                                                        ]}
                                                                    >
                                                                        <Ionicons
                                                                            name="mic"
                                                                            size={
                                                                                18
                                                                            }
                                                                            color="#111827"
                                                                        />
                                                                    </View>
                                                                ) : replyPreviewType ===
                                                                      "CALL" &&
                                                                  !isReplyPreviewRecalled ? (
                                                                    <View
                                                                        style={[
                                                                            styles.replyPreviewIconBox,
                                                                            mine &&
                                                                                styles.replyPreviewIconBoxMine,
                                                                        ]}
                                                                    >
                                                                        <Ionicons
                                                                            name="call"
                                                                            size={
                                                                                17
                                                                            }
                                                                            color="#111827"
                                                                        />
                                                                    </View>
                                                                ) : null}

                                                                <View
                                                                    style={[
                                                                        styles.replyPreviewTextWrap,
                                                                        !hasReplyLeadingVisual &&
                                                                            styles.replyPreviewTextWrapNoLead,
                                                                    ]}
                                                                >
                                                                    {replyPreviewType ===
                                                                        "FILE" &&
                                                                    !isReplyPreviewRecalled ? (
                                                                        <View
                                                                            style={
                                                                                styles.replyFileInline
                                                                            }
                                                                        >
                                                                            <Text
                                                                                numberOfLines={
                                                                                    1
                                                                                }
                                                                                style={[
                                                                                    styles.replyContentOnly,
                                                                                    mine &&
                                                                                        styles.replyContentOnlyMine,
                                                                                ]}
                                                                            >
                                                                                {
                                                                                    replyPreviewText
                                                                                }
                                                                            </Text>
                                                                            <Ionicons
                                                                                name="attach-outline"
                                                                                size={
                                                                                    13
                                                                                }
                                                                                color="#6B7280"
                                                                            />
                                                                        </View>
                                                                    ) : (
                                                                        <Text
                                                                            numberOfLines={
                                                                                1
                                                                            }
                                                                            style={[
                                                                                styles.replyContentOnly,
                                                                                mine &&
                                                                                    styles.replyContentOnlyMine,
                                                                            ]}
                                                                        >
                                                                            {
                                                                                replyPreviewText
                                                                            }
                                                                        </Text>
                                                                    )}
                                                                </View>
                                                            </View>
                                                        </Pressable>
                                                    ) : null}

                                                    <View
                                                        style={[
                                                            styles.bubble,
                                                            mine
                                                                ? styles.bubbleAlignMine
                                                                : styles.bubbleAlignOther,
                                                            highlightedMessageId ===
                                                                item.id &&
                                                                styles.highlightedBubble,
                                                            item.isRecalled
                                                                ? styles.bubbleRecalled
                                                                : isRichCardMessage
                                                                  ? styles.bubblePlain
                                                                  : mine
                                                                    ? styles.bubbleMine
                                                                    : styles.bubbleOther,
                                                            bubbleGroupShape,
                                                            shouldOverlayReplyWithBubble &&
                                                                styles.bubbleWithReply,
                                                            shouldOverlayReplyWithBubble &&
                                                                (mine
                                                                    ? styles.bubbleWithReplyMine
                                                                    : styles.bubbleWithReplyOther),
                                                            !mine &&
                                                                !isRichCardMessage &&
                                                                styles.cardShadow,
                                                        ]}
                                                    >
                                                        <View
                                                            style={
                                                                styles.bubbleMainContent
                                                            }
                                                        >
                                                            {item.isRecalled ? (
                                                                <Text
                                                                    style={[
                                                                        styles.messageText,
                                                                        mine &&
                                                                            styles.messageTextMine,
                                                                        styles.recalledText,
                                                                    ]}
                                                                >
                                                                    Tin nhan da
                                                                    duoc thu hoi
                                                                </Text>
                                                            ) : null}

                                                            {imageUrls.length >
                                                            0 ? (
                                                                <View
                                                                    style={
                                                                        styles.imageGrid
                                                                    }
                                                                >
                                                                    {imageUrls.map(
                                                                        (
                                                                            url,
                                                                            imageIndex,
                                                                        ) => (
                                                                            <Pressable
                                                                                key={`${item.id}-image-${imageIndex}`}
                                                                                onPress={() =>
                                                                                    setMediaViewer(
                                                                                        {
                                                                                            type: "IMAGE",
                                                                                            url,
                                                                                        },
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Image
                                                                                    source={{
                                                                                        uri: url,
                                                                                    }}
                                                                                    style={[
                                                                                        styles.imageAttachment,
                                                                                        imageUrls.length ===
                                                                                            1 &&
                                                                                            styles.imageAttachmentLarge,
                                                                                        mine
                                                                                            ? styles.mediaCardMine
                                                                                            : styles.mediaCardOther,
                                                                                        !mine &&
                                                                                            styles.cardShadow,
                                                                                    ]}
                                                                                />
                                                                            </Pressable>
                                                                        ),
                                                                    )}
                                                                </View>
                                                            ) : null}

                                                            {videoUrls.length >
                                                            0 ? (
                                                                <View
                                                                    style={
                                                                        styles.videoList
                                                                    }
                                                                >
                                                                    {videoUrls.map(
                                                                        (
                                                                            url,
                                                                            videoIndex,
                                                                        ) => (
                                                                            <View
                                                                                key={`${item.id}-video-${videoIndex}`}
                                                                                style={[
                                                                                    styles.videoWrap,
                                                                                    mine
                                                                                        ? styles.mediaCardMine
                                                                                        : styles.mediaCardOther,
                                                                                    !mine &&
                                                                                        styles.cardShadow,
                                                                                ]}
                                                                            >
                                                                                <Video
                                                                                    source={{
                                                                                        uri: url,
                                                                                    }}
                                                                                    style={
                                                                                        styles.videoAttachment
                                                                                    }
                                                                                    useNativeControls
                                                                                    resizeMode={
                                                                                        ResizeMode.COVER
                                                                                    }
                                                                                />
                                                                                <Pressable
                                                                                    style={
                                                                                        styles.videoExpandBtn
                                                                                    }
                                                                                    onPress={() =>
                                                                                        setMediaViewer(
                                                                                            {
                                                                                                type: "VIDEO",
                                                                                                url,
                                                                                            },
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <Ionicons
                                                                                        name="expand-outline"
                                                                                        size={
                                                                                            15
                                                                                        }
                                                                                        color={
                                                                                            colors.white
                                                                                        }
                                                                                    />
                                                                                </Pressable>
                                                                            </View>
                                                                        ),
                                                                    )}
                                                                </View>
                                                            ) : null}

                                                            {audioUrls.length >
                                                            0 ? (
                                                                <View
                                                                    style={
                                                                        styles.audioList
                                                                    }
                                                                >
                                                                    {audioUrls.map(
                                                                        (
                                                                            url,
                                                                            audioIndex,
                                                                        ) => {
                                                                            const audioKey = `${item.id}-audio-${audioIndex}`;
                                                                            const isLoading =
                                                                                audioLoadingKey ===
                                                                                audioKey;
                                                                            const isPlaying =
                                                                                playingAudioKey ===
                                                                                audioKey;
                                                                            const isPressing =
                                                                                activePressAudioKey ===
                                                                                audioKey;
                                                                            const isSeeking =
                                                                                activeSeekAudioKey ===
                                                                                audioKey;
                                                                            const shouldAnimateIcon =
                                                                                isLoading ||
                                                                                isPlaying;
                                                                            const progressInfo =
                                                                                audioProgressMap[
                                                                                    audioKey
                                                                                ];
                                                                            const positionMillis =
                                                                                progressInfo?.positionMillis ??
                                                                                0;
                                                                            const durationMillis =
                                                                                progressInfo?.durationMillis ??
                                                                                0;
                                                                            const progressRatio =
                                                                                durationMillis >
                                                                                0
                                                                                    ? Math.min(
                                                                                          1,
                                                                                          Math.max(
                                                                                              0,
                                                                                              positionMillis /
                                                                                                  durationMillis,
                                                                                          ),
                                                                                      )
                                                                                    : 0;
                                                                            const waveBars =
                                                                                getAudioWaveBars(
                                                                                    url,
                                                                                );
                                                                            const iconScaleNode =
                                                                                isPlaying &&
                                                                                isPressing
                                                                                    ? combinedAudioIconScale
                                                                                    : isPlaying
                                                                                      ? audioPlayPulse
                                                                                      : audioPressScale;

                                                                            return (
                                                                                <View
                                                                                    key={
                                                                                        audioKey
                                                                                    }
                                                                                    style={[
                                                                                        styles.audioItem,
                                                                                        mine &&
                                                                                            styles.audioItemMine,
                                                                                        !mine &&
                                                                                            styles.cardShadow,
                                                                                    ]}
                                                                                >
                                                                                    <Pressable
                                                                                        style={[
                                                                                            styles.audioPlayBtn,
                                                                                            mine &&
                                                                                                styles.audioPlayBtnMine,
                                                                                        ]}
                                                                                        onPress={() =>
                                                                                            void toggleAudioPlayback(
                                                                                                audioKey,
                                                                                                url,
                                                                                            )
                                                                                        }
                                                                                        onPressIn={() =>
                                                                                            handleAudioPressIn(
                                                                                                audioKey,
                                                                                            )
                                                                                        }
                                                                                        onPressOut={
                                                                                            handleAudioPressOut
                                                                                        }
                                                                                        disabled={
                                                                                            isLoading
                                                                                        }
                                                                                    >
                                                                                        <Animated.View
                                                                                            style={[
                                                                                                styles.audioPlayIconWrap,
                                                                                                (isPlaying ||
                                                                                                    isPressing) && {
                                                                                                    transform:
                                                                                                        [
                                                                                                            {
                                                                                                                scale: iconScaleNode,
                                                                                                            },
                                                                                                        ],
                                                                                                },
                                                                                                shouldAnimateIcon && {
                                                                                                    opacity:
                                                                                                        audioIconFade,
                                                                                                },
                                                                                            ]}
                                                                                        >
                                                                                            <Ionicons
                                                                                                name={
                                                                                                    isLoading
                                                                                                        ? "time-outline"
                                                                                                        : isPlaying
                                                                                                          ? "pause"
                                                                                                          : "play"
                                                                                                }
                                                                                                size={
                                                                                                    20
                                                                                                }
                                                                                                color={
                                                                                                    colors.white
                                                                                                }
                                                                                            />
                                                                                        </Animated.View>
                                                                                    </Pressable>
                                                                                    <View
                                                                                        style={
                                                                                            styles.audioMeta
                                                                                        }
                                                                                    >
                                                                                        <View
                                                                                            style={[
                                                                                                styles.audioWaveformTrack,
                                                                                                mine &&
                                                                                                    styles.audioWaveformTrackMine,
                                                                                                isSeeking && {
                                                                                                    transform:
                                                                                                        [
                                                                                                            {
                                                                                                                scaleY: audioSeekScale,
                                                                                                            },
                                                                                                        ],
                                                                                                },
                                                                                            ]}
                                                                                            onLayout={(
                                                                                                event,
                                                                                            ) => {
                                                                                                const width =
                                                                                                    event
                                                                                                        .nativeEvent
                                                                                                        .layout
                                                                                                        .width;
                                                                                                setAudioTrackWidthMap(
                                                                                                    (
                                                                                                        prev,
                                                                                                    ) => {
                                                                                                        if (
                                                                                                            prev[
                                                                                                                audioKey
                                                                                                            ] ===
                                                                                                            width
                                                                                                        ) {
                                                                                                            return prev;
                                                                                                        }

                                                                                                        return {
                                                                                                            ...prev,
                                                                                                            [audioKey]:
                                                                                                                width,
                                                                                                        };
                                                                                                    },
                                                                                                );
                                                                                            }}
                                                                                            onStartShouldSetResponder={() =>
                                                                                                true
                                                                                            }
                                                                                            onMoveShouldSetResponder={() =>
                                                                                                true
                                                                                            }
                                                                                            onResponderGrant={(
                                                                                                event,
                                                                                            ) => {
                                                                                                handleSeekInteractionStart(
                                                                                                    audioKey,
                                                                                                );
                                                                                                seekAudioByLocation(
                                                                                                    audioKey,
                                                                                                    url,
                                                                                                    event
                                                                                                        .nativeEvent
                                                                                                        .locationX,
                                                                                                    false,
                                                                                                );
                                                                                            }}
                                                                                            onResponderMove={(
                                                                                                event,
                                                                                            ) =>
                                                                                                seekAudioByLocation(
                                                                                                    audioKey,
                                                                                                    url,
                                                                                                    event
                                                                                                        .nativeEvent
                                                                                                        .locationX,
                                                                                                    true,
                                                                                                )
                                                                                            }
                                                                                            onResponderRelease={(
                                                                                                event,
                                                                                            ) => {
                                                                                                seekAudioByLocation(
                                                                                                    audioKey,
                                                                                                    url,
                                                                                                    event
                                                                                                        .nativeEvent
                                                                                                        .locationX,
                                                                                                    false,
                                                                                                );
                                                                                                handleSeekInteractionEnd();
                                                                                            }}
                                                                                            onResponderTerminate={() =>
                                                                                                handleSeekInteractionEnd()
                                                                                            }
                                                                                        >
                                                                                            {waveBars.map(
                                                                                                (
                                                                                                    barHeight,
                                                                                                    barIndex,
                                                                                                ) => {
                                                                                                    const barStart =
                                                                                                        barIndex /
                                                                                                        waveBars.length;
                                                                                                    const barEnd =
                                                                                                        (barIndex +
                                                                                                            1) /
                                                                                                        waveBars.length;
                                                                                                    const fillRatio =
                                                                                                        progressRatio <=
                                                                                                        barStart
                                                                                                            ? 0
                                                                                                            : progressRatio >=
                                                                                                                barEnd
                                                                                                              ? 1
                                                                                                              : (progressRatio -
                                                                                                                    barStart) /
                                                                                                                (barEnd -
                                                                                                                    barStart);

                                                                                                    return (
                                                                                                        <View
                                                                                                            key={`${audioKey}-bar-${barIndex}`}
                                                                                                            style={[
                                                                                                                styles.audioWaveBar,
                                                                                                                {
                                                                                                                    height: `${barHeight}%`,
                                                                                                                },
                                                                                                                mine
                                                                                                                    ? styles.audioWaveBarIdleMine
                                                                                                                    : styles.audioWaveBarIdleOther,
                                                                                                            ]}
                                                                                                        >
                                                                                                            <View
                                                                                                                style={[
                                                                                                                    styles.audioWaveBarFill,
                                                                                                                    mine
                                                                                                                        ? styles.audioWaveBarPlayedMine
                                                                                                                        : styles.audioWaveBarPlayedOther,
                                                                                                                    {
                                                                                                                        opacity:
                                                                                                                            fillRatio,
                                                                                                                    },
                                                                                                                ]}
                                                                                                            />
                                                                                                        </View>
                                                                                                    );
                                                                                                },
                                                                                            )}
                                                                                        </View>
                                                                                        <Text
                                                                                            style={[
                                                                                                styles.audioTimeText,
                                                                                                mine &&
                                                                                                    styles.audioTimeTextMine,
                                                                                            ]}
                                                                                        >
                                                                                            {isSeeking &&
                                                                                            durationMillis >
                                                                                                0
                                                                                                ? `${formatDurationMillis(positionMillis)} / ${formatDurationMillis(durationMillis)}`
                                                                                                : formatDurationMillis(
                                                                                                      positionMillis >
                                                                                                          0
                                                                                                          ? positionMillis
                                                                                                          : durationMillis,
                                                                                                  )}
                                                                                        </Text>
                                                                                    </View>
                                                                                </View>
                                                                            );
                                                                        },
                                                                    )}
                                                                </View>
                                                            ) : null}

                                                            {fileAttachments.length >
                                                            0 ? (
                                                                <View
                                                                    style={
                                                                        styles.fileList
                                                                    }
                                                                >
                                                                    {fileAttachments.map(
                                                                        (
                                                                            attachment,
                                                                            fileIndex,
                                                                        ) => (
                                                                            <Pressable
                                                                                key={`${item.id}-file-${fileIndex}`}
                                                                                style={[
                                                                                    styles.fileItem,
                                                                                    mine &&
                                                                                        styles.fileItemMine,
                                                                                    !mine &&
                                                                                        styles.cardShadow,
                                                                                ]}
                                                                                onPress={() => {
                                                                                    if (
                                                                                        attachment.resolvedUrl
                                                                                    ) {
                                                                                        void Linking.openURL(
                                                                                            attachment.resolvedUrl,
                                                                                        );
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <View
                                                                                    style={
                                                                                        styles.fileBadge
                                                                                    }
                                                                                >
                                                                                    <Text
                                                                                        style={
                                                                                            styles.fileBadgeText
                                                                                        }
                                                                                    >
                                                                                        {getFileBadgeLabel(
                                                                                            attachment.fileName,
                                                                                        )}
                                                                                    </Text>
                                                                                </View>
                                                                                <View
                                                                                    style={
                                                                                        styles.fileMeta
                                                                                    }
                                                                                >
                                                                                    <Text
                                                                                        numberOfLines={
                                                                                            1
                                                                                        }
                                                                                        style={[
                                                                                            styles.fileName,
                                                                                            mine &&
                                                                                                styles.fileNameMine,
                                                                                        ]}
                                                                                    >
                                                                                        {attachment.fileName ||
                                                                                            "Tep dinh kem"}
                                                                                    </Text>
                                                                                    <Text
                                                                                        style={[
                                                                                            styles.fileSize,
                                                                                            mine &&
                                                                                                styles.fileSizeMine,
                                                                                        ]}
                                                                                    >
                                                                                        {formatFileSize(
                                                                                            attachment.fileSize,
                                                                                        )}
                                                                                    </Text>
                                                                                </View>
                                                                                <View
                                                                                    style={[
                                                                                        styles.fileActionIconWrap,
                                                                                        mine &&
                                                                                            styles.fileActionIconWrapMine,
                                                                                    ]}
                                                                                >
                                                                                    <Ionicons
                                                                                        name="download-outline"
                                                                                        size={
                                                                                            14
                                                                                        }
                                                                                        color={
                                                                                            mine
                                                                                                ? colors.white
                                                                                                : "#475569"
                                                                                        }
                                                                                    />
                                                                                </View>
                                                                            </Pressable>
                                                                        ),
                                                                    )}
                                                                </View>
                                                            ) : null}

                                                            {callMeta ? (
                                                                <Pressable
                                                                    style={[
                                                                        styles.callCard,
                                                                        mine &&
                                                                            styles.callCardMine,
                                                                        !mine &&
                                                                            styles.cardShadow,
                                                                    ]}
                                                                >
                                                                    <View
                                                                        style={
                                                                            styles.callMainRow
                                                                        }
                                                                    >
                                                                        <View
                                                                            style={[
                                                                                styles.callIconWrap,
                                                                                mine &&
                                                                                    styles.callIconWrapMine,
                                                                            ]}
                                                                        >
                                                                            <Ionicons
                                                                                name={
                                                                                    callMeta.icon
                                                                                }
                                                                                size={
                                                                                    18
                                                                                }
                                                                                color={
                                                                                    mine
                                                                                        ? colors.white
                                                                                        : callMeta.iconColor
                                                                                }
                                                                            />
                                                                        </View>
                                                                        <View
                                                                            style={
                                                                                styles.callMeta
                                                                            }
                                                                        >
                                                                            <Text
                                                                                style={[
                                                                                    styles.callTitle,
                                                                                    mine &&
                                                                                        styles.callTitleMine,
                                                                                ]}
                                                                            >
                                                                                {
                                                                                    callMeta.title
                                                                                }
                                                                            </Text>
                                                                            <Text
                                                                                style={[
                                                                                    styles.callSubtitle,
                                                                                    mine &&
                                                                                        styles.callSubtitleMine,
                                                                                ]}
                                                                            >
                                                                                {
                                                                                    callMeta.subtitle
                                                                                }
                                                                            </Text>
                                                                        </View>
                                                                    </View>
                                                                    <View
                                                                        style={[
                                                                            styles.callRecallBadge,
                                                                            mine &&
                                                                                styles.callRecallBadgeMine,
                                                                        ]}
                                                                    >
                                                                        <Text
                                                                            style={[
                                                                                styles.callRecallText,
                                                                                mine &&
                                                                                    styles.callRecallTextMine,
                                                                            ]}
                                                                        >
                                                                            Goi
                                                                            lai
                                                                        </Text>
                                                                    </View>
                                                                </Pressable>
                                                            ) : null}

                                                            {shouldShowFallbackText ? (
                                                                <Text
                                                                    style={[
                                                                        styles.messageText,
                                                                        mine &&
                                                                            styles.messageTextMine,
                                                                    ]}
                                                                >
                                                                    {item.content ||
                                                                        "Tin nhan khong co noi dung"}
                                                                </Text>
                                                            ) : null}

                                                            {shouldShowAttachmentCaption ? (
                                                                <View
                                                                    style={[
                                                                        styles.attachmentCaptionBubble,
                                                                        mine &&
                                                                            styles.attachmentCaptionBubbleMine,
                                                                    ]}
                                                                >
                                                                    <Text
                                                                        style={[
                                                                            styles.attachmentCaptionText,
                                                                            mine &&
                                                                                styles.attachmentCaptionTextMine,
                                                                        ]}
                                                                    >
                                                                        {
                                                                            item.content
                                                                        }
                                                                    </Text>
                                                                </View>
                                                            ) : null}
                                                        </View>
                                                    </View>
                                                </>
                                            )}
                                        </Pressable>
                                    </View>
                                </View>

                                {isLastInGroup && messageTime ? (
                                    <View
                                        style={[
                                            styles.messageMetaRow,
                                            mine
                                                ? styles.messageMetaRowMine
                                                : styles.messageMetaRowOther,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.messageTime,
                                                mine && styles.messageTimeMine,
                                            ]}
                                        >
                                            {messageTime}
                                        </Text>
                                    </View>
                                ) : null}

                                {receiptsForThisMessage.length > 0 ? (
                                    <View
                                        style={[
                                            styles.messageMetaRow,
                                            styles.messageMetaRowMine,
                                        ]}
                                    >
                                        <View style={styles.seenReceiptsRow}>
                                            {receiptsForThisMessage.map(
                                                (receipt) => {
                                                    const member =
                                                        membersById[
                                                            receipt.userId
                                                        ];
                                                    return (
                                                        <UserAvatar
                                                            key={`${item.id}-${receipt.userId}`}
                                                            uri={member?.avatar}
                                                            name={
                                                                member?.nickname ||
                                                                member?.username ||
                                                                "?"
                                                            }
                                                            size={16}
                                                        />
                                                    );
                                                },
                                            )}
                                        </View>
                                    </View>
                                ) : null}
                            </View>
                        );
                    }}
                    ListFooterComponent={
                        <View>
                            {typingParticipantIds.length > 0 ? (
                                <View style={styles.typingIndicatorRow}>
                                    <View style={styles.typingAvatarRow}>
                                        {typingParticipantIds
                                            .slice(0, 3)
                                            .map((typingUserId) => {
                                                const typingMember =
                                                    membersById[typingUserId];

                                                return (
                                                    <UserAvatar
                                                        key={`typing-${typingUserId}`}
                                                        uri={
                                                            typingMember?.avatar
                                                        }
                                                        name={
                                                            typingMember?.nickname ||
                                                            typingMember?.username ||
                                                            "?"
                                                        }
                                                        size={24}
                                                    />
                                                );
                                            })}
                                    </View>

                                    <View style={styles.typingBubble}>
                                        <Animated.View
                                            style={[
                                                styles.typingDot,
                                                {
                                                    opacity:
                                                        typingDotAnimations[0].interpolate(
                                                            {
                                                                inputRange: [
                                                                    0, 1,
                                                                ],
                                                                outputRange: [
                                                                    0.35, 1,
                                                                ],
                                                            },
                                                        ),
                                                    transform: [
                                                        {
                                                            translateY:
                                                                typingDotAnimations[0].interpolate(
                                                                    {
                                                                        inputRange:
                                                                            [
                                                                                0,
                                                                                1,
                                                                            ],
                                                                        outputRange:
                                                                            [
                                                                                0,
                                                                                -2,
                                                                            ],
                                                                    },
                                                                ),
                                                        },
                                                    ],
                                                },
                                            ]}
                                        />
                                        <Animated.View
                                            style={[
                                                styles.typingDot,
                                                styles.typingDotOffsetOne,
                                                {
                                                    opacity:
                                                        typingDotAnimations[1].interpolate(
                                                            {
                                                                inputRange: [
                                                                    0, 1,
                                                                ],
                                                                outputRange: [
                                                                    0.35, 1,
                                                                ],
                                                            },
                                                        ),
                                                    transform: [
                                                        {
                                                            translateY:
                                                                typingDotAnimations[1].interpolate(
                                                                    {
                                                                        inputRange:
                                                                            [
                                                                                0,
                                                                                1,
                                                                            ],
                                                                        outputRange:
                                                                            [
                                                                                0,
                                                                                -2,
                                                                            ],
                                                                    },
                                                                ),
                                                        },
                                                    ],
                                                },
                                            ]}
                                        />
                                        <Animated.View
                                            style={[
                                                styles.typingDot,
                                                styles.typingDotOffsetTwo,
                                                {
                                                    opacity:
                                                        typingDotAnimations[2].interpolate(
                                                            {
                                                                inputRange: [
                                                                    0, 1,
                                                                ],
                                                                outputRange: [
                                                                    0.35, 1,
                                                                ],
                                                            },
                                                        ),
                                                    transform: [
                                                        {
                                                            translateY:
                                                                typingDotAnimations[2].interpolate(
                                                                    {
                                                                        inputRange:
                                                                            [
                                                                                0,
                                                                                1,
                                                                            ],
                                                                        outputRange:
                                                                            [
                                                                                0,
                                                                                -2,
                                                                            ],
                                                                    },
                                                                ),
                                                        },
                                                    ],
                                                },
                                            ]}
                                        />
                                    </View>
                                </View>
                            ) : null}

                            {loadingNewer ? (
                                <Text style={styles.loadingNewerText}>
                                    Dang tai tin nhan moi hon...
                                </Text>
                            ) : null}
                        </View>
                    }
                    ListHeaderComponent={
                        loadingMore ? (
                            <Text style={styles.loadingOlderText}>
                                Dang tai tin nhan cu...
                            </Text>
                        ) : null
                    }
                />

                {showRightScrollCue ? (
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.rightScrollCue,
                            {
                                opacity: rightScrollCueOpacity,
                                top: rightScrollCueBaseTop,
                                transform: [
                                    {
                                        translateY: rightScrollCueTranslateY,
                                    },
                                ],
                            },
                        ]}
                    />
                ) : null}

                {showScrollToBottomButton ? (
                    <Pressable
                        style={[
                            styles.scrollToBottomFab,
                            {
                                bottom: Math.max(insets.bottom + 84, 92),
                            },
                        ]}
                        onPress={() => void handleScrollToBottomClick()}
                        accessibilityLabel={
                            isHistoricalMode
                                ? "Tro ve hien tai"
                                : "Cuon xuong tin nhan moi nhat"
                        }
                    >
                        <Ionicons name="arrow-down" size={18} color="#1F2937" />

                        {pendingNewMessages > 0 ? (
                            <View style={styles.scrollToBottomBadge}>
                                <Text style={styles.scrollToBottomBadgeText}>
                                    {pendingNewMessages > 99
                                        ? "99+"
                                        : pendingNewMessages}
                                </Text>
                            </View>
                        ) : null}
                    </Pressable>
                ) : null}

                <View style={styles.composerWrap}>
                    {replyToMessage ? (
                        <View style={styles.replyComposerBox}>
                            <View style={styles.replyComposerTextWrap}>
                                <Text style={styles.replyComposerSender}>
                                    {replyToMessage.senderName}
                                </Text>
                                <Text
                                    style={styles.replyComposerContent}
                                    numberOfLines={1}
                                >
                                    {replyToMessage.content}
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => setReplyToMessage(null)}
                                hitSlop={8}
                            >
                                <Ionicons
                                    name="close"
                                    size={18}
                                    color={colors.textMuted}
                                />
                            </Pressable>
                        </View>
                    ) : null}

                    <View style={styles.composerBar}>
                        {isRecordingVoice ? (
                            <View style={styles.recordingComposerRow}>
                                <Pressable
                                    style={styles.recordingSideBtn}
                                    hitSlop={8}
                                    onPress={onCancelRecording}
                                    disabled={uploading || sending}
                                >
                                    <Ionicons
                                        name="trash"
                                        size={24}
                                        color="#1D4ED8"
                                    />
                                </Pressable>

                                <View style={styles.recordingPill}>
                                    <Ionicons
                                        name="pause"
                                        size={18}
                                        color={colors.white}
                                    />
                                    <View style={styles.recordingWaveTrack}>
                                        {Array.from({ length: 20 }).map(
                                            (_, index) => (
                                                <View
                                                    key={`wave-${index}`}
                                                    style={[
                                                        styles.recordingWaveBar,
                                                        {
                                                            height:
                                                                index % 5 === 0
                                                                    ? 18
                                                                    : index %
                                                                            2 ===
                                                                        0
                                                                      ? 12
                                                                      : 8,
                                                        },
                                                    ]}
                                                />
                                            ),
                                        )}
                                    </View>
                                    <Text style={styles.recordingPillTime}>
                                        {formatDurationMillis(
                                            recordingSeconds * 1000,
                                        )}
                                    </Text>
                                </View>

                                <Pressable
                                    style={styles.recordingSideBtn}
                                    hitSlop={8}
                                    onPress={onStopRecordingAndSend}
                                    disabled={uploading || sending}
                                >
                                    <Ionicons
                                        name="send"
                                        size={24}
                                        color="#1D4ED8"
                                    />
                                </Pressable>
                            </View>
                        ) : (
                            <>
                                <Pressable style={styles.cameraBtn} hitSlop={8}>
                                    <Ionicons
                                        name="camera"
                                        size={20}
                                        color={colors.white}
                                    />
                                </Pressable>

                                <TextInput
                                    ref={messageInputRef}
                                    value={messageText}
                                    onChangeText={(value) => {
                                        setMessageText(value);
                                        sendTypingSignal(Boolean(value.trim()));
                                    }}
                                    onBlur={() => sendTypingSignal(false)}
                                    onSelectionChange={(event) => {
                                        setInputSelection(
                                            event.nativeEvent.selection,
                                        );
                                    }}
                                    selection={inputSelection}
                                    placeholder={
                                        uploading
                                            ? "Dang tai tep..."
                                            : "Nhan tin"
                                    }
                                    placeholderTextColor={colors.textMuted}
                                    style={styles.input}
                                    returnKeyType="send"
                                    onSubmitEditing={onSend}
                                    editable={!uploading && !sending}
                                />

                                <View style={styles.composerActions}>
                                    {hasTypedText ? (
                                        <>
                                            <Pressable
                                                style={styles.composerActionBtn}
                                                hitSlop={8}
                                                onPress={onToggleEmojiPicker}
                                                disabled={uploading || sending}
                                            >
                                                <Ionicons
                                                    name={
                                                        emojiPickerOpen
                                                            ? "happy"
                                                            : "happy-outline"
                                                    }
                                                    size={23}
                                                    color="#1D4ED8"
                                                />
                                            </Pressable>
                                            <Pressable
                                                style={styles.sendArrowBtn}
                                                hitSlop={8}
                                                onPress={onSend}
                                                disabled={uploading || sending}
                                            >
                                                <Ionicons
                                                    name="send"
                                                    size={24}
                                                    color="#1D4ED8"
                                                />
                                            </Pressable>
                                        </>
                                    ) : (
                                        <>
                                            <Pressable
                                                style={styles.composerActionBtn}
                                                hitSlop={8}
                                                onPress={onStartRecording}
                                                disabled={uploading || sending}
                                            >
                                                <Ionicons
                                                    name="mic-outline"
                                                    size={24}
                                                    color={colors.text}
                                                />
                                            </Pressable>
                                            <Pressable
                                                style={styles.composerActionBtn}
                                                hitSlop={8}
                                                onPress={onPickMediaAndSend}
                                                disabled={uploading || sending}
                                            >
                                                <Ionicons
                                                    name="image-outline"
                                                    size={24}
                                                    color={colors.text}
                                                />
                                            </Pressable>
                                            <Pressable
                                                style={styles.composerActionBtn}
                                                hitSlop={8}
                                                onPress={onPickDocumentAndSend}
                                                disabled={uploading || sending}
                                            >
                                                <Ionicons
                                                    name="document-outline"
                                                    size={24}
                                                    color={colors.text}
                                                />
                                            </Pressable>
                                            <Pressable
                                                style={styles.composerActionBtn}
                                                hitSlop={8}
                                                onPress={onToggleEmojiPicker}
                                                disabled={uploading || sending}
                                            >
                                                <Ionicons
                                                    name={
                                                        emojiPickerOpen
                                                            ? "happy"
                                                            : "happy-outline"
                                                    }
                                                    size={23}
                                                    color="#1D4ED8"
                                                />
                                            </Pressable>
                                        </>
                                    )}
                                </View>
                            </>
                        )}
                    </View>
                    {loading ? (
                        <Text style={styles.statusText}>
                            Dang tai tin nhan...
                        </Text>
                    ) : null}
                    {sending ? (
                        <Text style={styles.statusText}>Dang gui...</Text>
                    ) : null}
                    {uploading ? (
                        <Text style={styles.statusText}>
                            {uploadProgressLabel || "Dang tai tep..."}
                            {typeof uploadProgressPercent === "number"
                                ? ` (${uploadProgressPercent}%)`
                                : ""}
                        </Text>
                    ) : null}
                    {uploadFailedFileNames.length > 0 ? (
                        <Text style={styles.errorText}>
                            Tai tep that bai: {uploadFailedFileNames.join(", ")}
                        </Text>
                    ) : null}
                    {error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : null}
                </View>
            </KeyboardAvoidingView>

            <Modal
                visible={emojiPickerOpen && !isRecordingVoice}
                transparent
                animationType="fade"
                onRequestClose={() => setEmojiPickerOpen(false)}
            >
                <Pressable
                    style={styles.emojiPickerOverlay}
                    onPress={() => setEmojiPickerOpen(false)}
                >
                    <Pressable
                        style={styles.emojiPickerCard}
                        onPress={() => undefined}
                    >
                        <View style={styles.emojiPickerHeader}>
                            <Text style={styles.emojiPickerTitle}>Emoji</Text>
                            <Pressable
                                hitSlop={8}
                                onPress={() => setEmojiPickerOpen(false)}
                            >
                                <Ionicons
                                    name="close"
                                    size={18}
                                    color={colors.textMuted}
                                />
                            </Pressable>
                        </View>

                        <View style={styles.emojiGrid}>
                            {QUICK_EMOJIS.map((emoji) => (
                                <Pressable
                                    key={emoji}
                                    style={styles.emojiCell}
                                    onPress={() => onPickEmoji(emoji)}
                                >
                                    <Text style={styles.emojiCellText}>
                                        {emoji}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={Boolean(contextMenu)}
                transparent
                animationType="fade"
                onRequestClose={closeContextMenu}
            >
                <Pressable
                    style={styles.menuOverlay}
                    onPress={closeContextMenu}
                >
                    {contextMenu ? (
                        <View
                            style={[
                                styles.contextMenuCard,
                                {
                                    top: contextMenu.top,
                                    left: contextMenu.left,
                                },
                            ]}
                        >
                            {contextActions.map((action) => {
                                if ("divider" in action) {
                                    return (
                                        <View
                                            key={action.key}
                                            style={styles.contextDivider}
                                        />
                                    );
                                }

                                const isDestructive =
                                    "destructive" in action &&
                                    Boolean(action.destructive);
                                const hasArrow =
                                    "hasArrow" in action &&
                                    Boolean(action.hasArrow);
                                const iconName =
                                    action.key === "pin"
                                        ? selectedMessagePinned
                                            ? "pin"
                                            : "pin-outline"
                                        : action.icon;
                                const labelText =
                                    action.key === "pin"
                                        ? selectedMessagePinned
                                            ? "Bo ghim"
                                            : "Ghim tin nhan"
                                        : action.label;

                                return (
                                    <Pressable
                                        key={action.key}
                                        style={styles.contextItem}
                                        onPress={() =>
                                            handleContextAction(action.key)
                                        }
                                    >
                                        <Ionicons
                                            name={iconName}
                                            size={16}
                                            color={
                                                isDestructive
                                                    ? "#EF4444"
                                                    : "#1F2937"
                                            }
                                        />
                                        <Text
                                            style={[
                                                styles.contextLabel,
                                                isDestructive &&
                                                    styles.contextLabelDanger,
                                            ]}
                                        >
                                            {labelText}
                                        </Text>
                                        {hasArrow ? (
                                            <Ionicons
                                                name="chevron-forward"
                                                size={15}
                                                color={colors.textMuted}
                                                style={styles.contextChevron}
                                            />
                                        ) : null}
                                    </Pressable>
                                );
                            })}
                        </View>
                    ) : null}
                </Pressable>
            </Modal>

            <Modal
                visible={Boolean(mediaViewer)}
                transparent
                animationType="fade"
                onRequestClose={closeMediaViewer}
            >
                <SafeAreaView style={styles.mediaViewerOverlay}>
                    <Pressable
                        style={styles.mediaViewerCloseBtn}
                        onPress={closeMediaViewer}
                        hitSlop={10}
                    >
                        <Ionicons name="close" size={24} color={colors.white} />
                    </Pressable>

                    <View style={styles.mediaViewerContent}>
                        {mediaViewer?.type === "IMAGE" ? (
                            <Image
                                source={{ uri: mediaViewer.url }}
                                style={styles.mediaViewerImage}
                                resizeMode="contain"
                            />
                        ) : mediaViewer?.type === "VIDEO" ? (
                            <Video
                                source={{ uri: mediaViewer.url }}
                                style={styles.mediaViewerVideo}
                                useNativeControls
                                shouldPlay
                                resizeMode={ResizeMode.CONTAIN}
                            />
                        ) : null}
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "white",
    },
    flex: { flex: 1 },
    header: {
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.sm,
        paddingVertical: 10,
    },
    headerBackBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.xs,
    },
    headerIdentity: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        minWidth: 0,
    },
    headerMeta: {
        marginLeft: spacing.sm,
        minWidth: 0,
    },
    headerName: {
        fontSize: 17,
        fontWeight: "700",
        color: colors.text,
    },
    headerStatus: {
        marginTop: 2,
        fontSize: 13,
        color: colors.textMuted,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: spacing.xs,
    },
    headerActionBtn: {
        width: 34,
        height: 34,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: spacing.xs,
    },
    pinnedBannerWrap: {
        backgroundColor: "#F8F9FA",
        borderBottomColor: colors.border,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,

        // Shadow cho iOS
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2, // Độ cao của bóng đổ xuống dưới
        },
        shadowOpacity: 0.05, // Độ mờ cực nhẹ (từ 0 đến 1)
        shadowRadius: 3, // Độ lan tỏa của bóng

        // Shadow cho Android (Dùng elevation)
        elevation: 3,

        // Đảm bảo bóng không bị cắt mất bởi các component xung quanh
        zIndex: 10,
    },
    pinnedBannerHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    pinnedPrimaryPressable: {
        flex: 1,
        marginLeft: 8,
        marginRight: 6,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    pinnedThumb: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: "#D1D5DB",
    },
    pinnedThumbPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 6,
    },
    pinnedPrimaryTextWrap: {
        flex: 1,
        minWidth: 0,
        marginLeft: 8,
    },
    pinnedSenderText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#4B5563",
    },
    pinnedPreviewText: {
        marginTop: 1,
        fontSize: 12,
        color: "#111827",
    },
    pinnedCountText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 12,
        color: "#4B5563",
        fontWeight: "600",
    },
    pinnedToggleBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    pinnedListWrap: {
        marginTop: 8,
        gap: 6,
    },
    pinnedListItemRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    pinnedListMainPressable: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 10,
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    pinnedUnpinBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        marginLeft: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FEE2E2",
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        gap: 0,
    },
    messageItemWrap: {
        width: "100%",
    },
    row: {
        flexDirection: "row",
        alignItems: "flex-end",
    },
    rowGroupStart: {
        marginTop: 9,
    },
    rowGrouped: {
        marginTop: 2,
    },
    rowGroupedRecalled: {
        marginTop: 8,
    },
    rowGroupedWithReply: {
        marginTop: 8,
    },
    rowMine: {
        justifyContent: "flex-end",
    },
    rowOther: {
        justifyContent: "flex-start",
    },
    avatarSpacer: {
        width: 30,
    },
    messageColumn: {
        maxWidth: "80%",
    },
    messageColumnMine: {
        alignItems: "flex-end",
    },
    messageColumnOther: {
        alignItems: "flex-start",
        marginLeft: spacing.sm,
    },
    groupSenderLabel: {
        maxWidth: 180,
        marginBottom: 4,
        marginLeft: 2,
        fontSize: 11,
        fontWeight: "700",
        color: "#6B7280",
    },
    replyRelationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        maxWidth: "92%",
        marginTop: 2,
        marginBottom: 2,
        marginLeft: 2,
    },
    replyRelationRowMine: {
        alignSelf: "flex-start",
    },
    replyRelationLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "#6B7280",
        flexShrink: 1,
        minWidth: 0,
    },
    replyRelationLabelMine: {
        color: "#6B7280",
    },
    bubble: {
        borderRadius: 18,
        paddingHorizontal: 13,
        paddingVertical: 9,
        maxWidth: "100%",
    },
    bubbleAlignMine: {
        alignSelf: "flex-end",
    },
    bubbleAlignOther: {
        alignSelf: "flex-start",
    },
    bubbleWithReply: {
        marginTop: -4,
        position: "relative",
        zIndex: 3,
    },
    bubbleWithReplyMine: {
        borderTopRightRadius: 12,
    },
    bubbleWithReplyOther: {
        borderTopLeftRadius: 12,
    },
    bubblePlain: {
        borderRadius: 0,
        paddingHorizontal: 0,
        paddingVertical: 0,
        backgroundColor: "transparent",
    },
    highlightedBubble: {
        borderWidth: 2,
        borderColor: "#F59E0B",
    },
    bubbleMine: {
        backgroundColor: "#1D4ED8",
    },
    bubbleMineSingle: {
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 6,
    },
    bubbleMineFirst: {
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 6,
    },
    bubbleMineMiddle: {
        borderTopLeftRadius: 18,
        borderTopRightRadius: 8,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 8,
    },
    bubbleMineLast: {
        borderTopLeftRadius: 18,
        borderTopRightRadius: 8,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 6,
    },
    bubbleOther: {
        backgroundColor: "#FFFFFF",

        borderColor: "#E5E7EB",
    },
    bubbleOtherSingle: {
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderBottomLeftRadius: 6,
        borderBottomRightRadius: 18,
    },
    bubbleOtherFirst: {
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderBottomLeftRadius: 6,
        borderBottomRightRadius: 18,
    },
    bubbleOtherMiddle: {
        borderTopLeftRadius: 8,
        borderTopRightRadius: 18,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 18,
    },
    bubbleOtherLast: {
        borderTopLeftRadius: 8,
        borderTopRightRadius: 18,
        borderBottomLeftRadius: 6,
        borderBottomRightRadius: 18,
    },
    bubbleRecalled: {
        backgroundColor: "#F3F4F6",
    },
    cardShadow: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 1,
    },
    messageText: {
        color: colors.text,
        fontSize: 15,
        lineHeight: 21,
    },
    messageTextMine: {
        color: colors.white,
    },
    recalledText: {
        fontStyle: "italic",
        color: "#6B7280",
    },
    emojiOnlyText: {
        fontSize: 36,
        lineHeight: 42,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    replyPreview: {
        alignSelf: "flex-start",
        maxWidth: "92%",
        borderRadius: 13,
        backgroundColor: "rgba(243, 244, 246, 0.92)",
        borderColor: "rgba(203, 213, 225, 0.75)",
        borderLeftColor: "rgba(203, 213, 225, 0.75)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 1,
    },
    replyPreviewOverlay: {
        paddingBottom: 6,
        marginBottom: -4,
        zIndex: 1,
    },
    replyPreviewMine: {
        backgroundColor: "rgba(243, 244, 246, 0.95)",
        borderColor: "rgba(203, 213, 225, 0.78)",
        borderLeftColor: "rgba(203, 213, 225, 0.78)",
    },
    replyPreviewConnectedMine: {
        borderBottomRightRadius: 10,
    },
    replyPreviewConnectedOther: {
        borderBottomLeftRadius: 10,
    },
    replyPreviewBody: {
        flexDirection: "row",
        alignItems: "center",
    },
    replyPreviewThumb: {
        width: 42,
        height: 42,
        borderRadius: 8,
        backgroundColor: "#CBD5E1",
    },
    replyPreviewIconBox: {
        width: 42,
        height: 42,
        borderRadius: 10,
        backgroundColor: "#E5E7EB",
        alignItems: "center",
        justifyContent: "center",
    },
    replyPreviewIconBoxMine: {
        backgroundColor: "#E5E7EB",
    },
    replyPreviewTextWrap: {
        marginLeft: 8,
        flexShrink: 1,
        minWidth: 0,
    },
    replyPreviewTextWrapNoLead: {
        marginLeft: 0,
    },
    replyFileInline: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    replyContentOnly: {
        color: "#4B5563",
        fontSize: 14,
        lineHeight: 20,
    },
    replyContentOnlyMine: {
        color: "#4B5563",
    },
    bubbleMainContent: {
        zIndex: 0,
    },
    bubbleMainContentLifted: {
        marginTop: 0,
    },
    imageGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 7,
        marginTop: 0,
        marginBottom: 4,
    },
    imageAttachment: {
        width: 138,
        height: 138,
        borderRadius: 16,
        backgroundColor: "#D1D5DB",
        borderWidth: 1,
    },
    imageAttachmentLarge: {
        width: 248,
        height: 286,
    },
    mediaCardMine: {
        borderColor: "rgba(255,255,255,0.35)",
    },
    mediaCardOther: {
        borderColor: "#E5E7EB",
    },
    videoList: {
        marginBottom: 4,
    },
    videoWrap: {
        marginTop: 6,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
    },
    videoAttachment: {
        width: 248,
        height: 176,
        backgroundColor: "#111827",
    },
    videoExpandBtn: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.7)",
    },
    audioList: {
        marginBottom: 4,
    },
    audioItem: {
        marginTop: 6,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E5E7EB",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#CBD5E1",
        paddingHorizontal: 10,
        paddingVertical: 9,
        minWidth: 220,
    },
    audioItemMine: {
        backgroundColor: "#3B82F6",
        borderColor: "rgba(255,255,255,0.28)",
    },
    audioPlayBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#111827",
    },
    audioPlayBtnMine: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    audioPlayIconWrap: {
        width: 20,
        height: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    audioMeta: {
        marginLeft: 8,
        flex: 1,
        minWidth: 0,
        flexDirection: "row",
        alignItems: "center",
    },
    audioWaveformTrack: {
        flex: 1,
        height: 32,
        flexDirection: "row",
        alignItems: "center",
        gap: 1,
        overflow: "hidden",
    },
    audioWaveformTrackMine: {
        opacity: 1,
    },
    audioWaveBar: {
        flex: 1,
        borderRadius: 999,
        minHeight: 4,
        overflow: "hidden",
    },
    audioWaveBarFill: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    },
    audioWaveBarPlayedMine: {
        backgroundColor: colors.white,
    },
    audioWaveBarPlayedOther: {
        backgroundColor: "#111827",
    },
    audioWaveBarIdleMine: {
        backgroundColor: "rgba(255, 255, 255, 0.35)",
    },
    audioWaveBarIdleOther: {
        backgroundColor: "#D1D5DB",
    },
    audioTimeText: {
        marginLeft: 8,
        color: "#374151",
        fontSize: 11,
        fontWeight: "600",
        fontVariant: ["tabular-nums"],
    },
    audioTimeTextMine: {
        color: "#E0E7FF",
    },
    fileList: {
        marginBottom: 4,
    },
    fileItem: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
        backgroundColor: "#F3F4F6",
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    fileItemMine: {
        backgroundColor: "#1D4ED8",
        borderColor: "rgba(255, 255, 255, 0.28)",
    },
    fileBadge: {
        width: 32,
        height: 32,
        borderRadius: 9,
        backgroundColor: "#111827",
        alignItems: "center",
        justifyContent: "center",
    },
    fileBadgeText: {
        fontSize: 10,
        fontWeight: "700",
        color: colors.white,
    },
    fileMeta: {
        marginLeft: 8,
        flex: 1,
        minWidth: 0,
    },
    fileName: {
        color: colors.text,
        fontSize: 13,
        fontWeight: "600",
    },
    fileNameMine: {
        color: colors.white,
    },
    fileSize: {
        marginTop: 2,
        color: colors.textMuted,
        fontSize: 11,
    },
    fileSizeMine: {
        color: "#DBEAFE",
    },
    fileActionIconWrap: {
        marginLeft: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#E2E8F0",
        alignItems: "center",
        justifyContent: "center",
    },
    fileActionIconWrapMine: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    callCard: {
        marginTop: 6,
        borderRadius: 14,
        backgroundColor: "#F8FAFC",
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    callCardMine: {
        backgroundColor: "#1D4ED8",
        borderColor: "rgba(255,255,255,0.28)",
    },
    callMainRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    callIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.85)",
    },
    callIconWrapMine: {
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    callMeta: {
        marginLeft: 8,
        flex: 1,
        minWidth: 0,
    },
    callTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#111827",
    },
    callTitleMine: {
        color: colors.white,
    },
    callSubtitle: {
        marginTop: 1,
        fontSize: 11,
        color: "#6B7280",
    },
    callSubtitleMine: {
        color: "#DBEAFE",
    },
    callRecallBadge: {
        alignSelf: "flex-start",
        marginTop: 8,
        borderRadius: 999,
        backgroundColor: "#E5E7EB",
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    callRecallBadgeMine: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    callRecallText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#1F2937",
    },
    callRecallTextMine: {
        color: colors.white,
    },
    attachmentCaptionBubble: {
        marginTop: 7,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    attachmentCaptionBubbleMine: {
        backgroundColor: "#1D4ED8",
        borderColor: "rgba(255,255,255,0.28)",
    },
    attachmentCaptionText: {
        fontSize: 14,
        lineHeight: 20,
        color: colors.text,
    },
    attachmentCaptionTextMine: {
        color: colors.white,
    },
    messageTime: {
        marginTop: 3,
        fontSize: 11,
        color: "#6B7280",
    },
    messageTimeMine: {
        color: "#6B7280",
        marginRight: 2,
    },
    messageMetaRow: {
        width: "100%",
        marginTop: 1,
    },
    messageMetaRowMine: {
        alignItems: "flex-end",
        paddingRight: 2,
    },
    messageMetaRowOther: {
        alignItems: "flex-start",
        paddingLeft: 30 + spacing.sm,
    },
    systemMessageRow: {
        width: "100%",
        alignItems: "center",
        marginTop: 14,
    },
    systemMessageBadge: {
        maxWidth: "88%",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#E5E7EB",
        flexDirection: "row",
        alignItems: "center",
    },
    systemMessageText: {
        marginLeft: 6,
        fontSize: 12,
        color: "#4B5563",
        flexShrink: 1,
    },
    systemCollapsedBtn: {
        maxWidth: "88%",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        flexDirection: "row",
        alignItems: "center",
    },
    systemCollapsedBtnText: {
        marginLeft: 6,
        fontSize: 12,
        fontWeight: "700",
        color: "#2563EB",
    },
    seenReceiptsRow: {
        marginTop: 4,
        marginRight: 2,
        alignSelf: "flex-end",
        flexDirection: "row",
        gap: 4,
    },
    loadingOlderText: {
        alignSelf: "center",
        marginBottom: spacing.sm,
        fontSize: 12,
        color: colors.textMuted,
    },
    loadingNewerText: {
        alignSelf: "center",
        marginTop: spacing.sm,
        fontSize: 12,
        color: colors.textMuted,
    },
    scrollToBottomFab: {
        position: "absolute",
        right: spacing.md,
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: colors.white,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 20,
    },
    scrollToBottomBadge: {
        position: "absolute",
        top: -4,
        left: -4,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        borderRadius: 9,
        backgroundColor: "#2563EB",
        alignItems: "center",
        justifyContent: "center",
    },
    scrollToBottomBadgeText: {
        fontSize: 10,
        fontWeight: "700",
        color: colors.white,
    },
    rightScrollCue: {
        position: "absolute",
        right: 4,
        width: 4,
        height: RIGHT_SCROLL_CUE_HEIGHT,
        borderRadius: 999,
        backgroundColor: "rgba(75, 85, 99, 0.55)",
        zIndex: 18,
    },
    composerWrap: {
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
    },
    replyComposerBox: {
        borderLeftWidth: 3,
        borderLeftColor: "#3B82F6",
        backgroundColor: "#EFF6FF",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
    },
    replyComposerTextWrap: {
        flex: 1,
        minWidth: 0,
    },
    replyComposerSender: {
        color: "#1D4ED8",
        fontSize: 12,
        fontWeight: "700",
    },
    replyComposerContent: {
        marginTop: 2,
        color: "#374151",
        fontSize: 12,
    },
    composerBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F0F1F3",
        borderRadius: 26,
        minHeight: 48,
        paddingLeft: 6,
        paddingRight: spacing.sm,
    },
    cameraBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#5B5CF0",
        alignItems: "center",
        justifyContent: "center",
    },
    composerActions: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: spacing.xs,
    },
    composerActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 2,
    },
    sendArrowBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 4,
        backgroundColor: "transparent",
    },
    emojiPickerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.2)",
        justifyContent: "flex-end",
        paddingHorizontal: spacing.md,
        paddingBottom: 76,
    },
    emojiPickerCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    emojiPickerHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    emojiPickerTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.text,
    },
    emojiGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    emojiCell: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F3F4F6",
    },
    emojiCellText: {
        fontSize: 20,
    },
    recordingComposerRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
    },
    recordingSideBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    recordingPill: {
        flex: 1,
        marginHorizontal: 6,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#1D4ED8",
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    recordingWaveTrack: {
        flex: 1,
        marginLeft: 10,
        marginRight: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    recordingWaveBar: {
        width: 3,
        borderRadius: 999,
        backgroundColor: "#BFDBFE",
    },
    recordingPillTime: {
        color: colors.white,
        fontSize: 12,
        fontWeight: "700",
        minWidth: 34,
        textAlign: "right",
    },
    input: {
        flex: 1,
        color: colors.text,
        fontSize: 15,
        paddingHorizontal: spacing.sm,
        paddingVertical: Platform.OS === "ios" ? 11 : 9,
        gap: spacing.sm,
    },
    statusText: {
        marginTop: spacing.xs,
        fontSize: 12,
        color: colors.textMuted,
    },
    typingIndicatorRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        marginTop: 8,
        marginBottom: 4,
        paddingHorizontal: spacing.md,
    },
    typingAvatarRow: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 8,
    },
    typingBubble: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: "#E5E7EB",
        alignSelf: "flex-start",
    },
    typingDot: {
        width: 7,
        height: 7,
        borderRadius: 999,
        backgroundColor: "#6B7280",
    },
    typingDotOffsetOne: {
        marginLeft: 4,
    },
    typingDotOffsetTwo: {
        marginLeft: 4,
    },
    errorText: {
        marginTop: spacing.xs,
        fontSize: 12,
        color: "#EF4444",
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.18)",
    },
    contextMenuCard: {
        position: "absolute",
        width: MENU_WIDTH,
        backgroundColor: colors.white,
        borderRadius: 13,
        paddingVertical: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 14,
        elevation: 10,
    },
    contextItem: {
        minHeight: 36,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 11,
    },
    contextLabel: {
        marginLeft: 9,
        fontSize: 14,
        color: "#111827",
        flex: 1,
    },
    contextLabelDanger: {
        color: "#EF4444",
    },
    contextChevron: {
        marginLeft: 8,
    },
    contextDivider: {
        height: 7,
        backgroundColor: "#F3F4F6",
        marginVertical: 3,
    },
    mediaViewerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.95)",
    },
    mediaViewerCloseBtn: {
        alignSelf: "flex-end",
        marginTop: spacing.md,
        marginRight: spacing.md,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255, 255, 255, 0.16)",
    },
    mediaViewerContent: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.lg,
    },
    mediaViewerImage: {
        width: "100%",
        height: "100%",
    },
    mediaViewerVideo: {
        width: "100%",
        height: "78%",
        backgroundColor: "#000",
    },
});
