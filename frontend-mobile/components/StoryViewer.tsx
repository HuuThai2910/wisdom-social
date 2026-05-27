import { Story, StoryGroup, StoryViewerInfo, PrivacyType, User } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { Audio, ResizeMode, Video } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/constants";
import {
    deleteStory,
    fetchStoryViewers,
    reactToStory,
    updateStoryPrivacy,
    updateStorySettings,
    viewStory,
} from "@/services/storyService";
import { removeStoriesFromHighlight } from "@/services/highlightService";
import { buildS3Url } from "@/utils/s3";
import UserAvatar from "./UserAvatar";
import useRealtimeStory from "@/hooks/useRealtimeStory";

type Props = {
    visible: boolean;
    groups: StoryGroup[];
    initialGroupIdx?: number;
    initialStoryIdx?: number;
    currentUser: User | null;
    onClose: () => void;
    onStoryViewed?: (storyId: string) => void;
    onStoryDeleted?: (storyId: string) => void;
    onStoryRemovedFromHighlight?: (storyId: string) => void;
    onEditHighlight?: (highlightId: string) => void;
};

const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👏"];
const TEXT_GRADIENTS: readonly [string, string][] = [
    ["#7C3AED", "#EF4444"],
    ["#2563EB", "#14B8A6"],
    ["#F97316", "#FACC15"],
    ["#059669", "#84CC16"],
    ["#4F46E5", "#EC4899"],
];

const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return "";
    const diffMins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (Number.isNaN(diffMins)) return "";
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${Math.floor(diffHours / 24)} ngày trước`;
};

const parseStoryContent = (story?: Story) => {
    const rawText = story?.text || story?.content || "";
    const bgMatch = rawText.match(/\[bg:(.*?)\]/);
    const cleanText = bgMatch ? rawText.replace(/\[bg:(.*?)\]/, "").trim() : rawText;
    return { cleanText, gradientIndex: bgMatch ? Math.abs(parseInt(bgMatch[1], 10) || 0) % TEXT_GRADIENTS.length : 0 };
};

export default function StoryViewer({
    visible,
    groups,
    initialGroupIdx = 0,
    initialStoryIdx = 0,
    currentUser,
    onClose,
    onStoryViewed,
    onStoryDeleted,
    onStoryRemovedFromHighlight,
    onEditHighlight,
}: Props) {
    const insets = useSafeAreaInsets();
    const [groupIdx, setGroupIdx] = useState(initialGroupIdx);
    const [storyIdx, setStoryIdx] = useState(initialStoryIdx);
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const [finished, setFinished] = useState(false);
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [viewersOpen, setViewersOpen] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [reactedEmoji, setReactedEmoji] = useState<string | null>(null);
    const [viewers, setViewers] = useState<StoryViewerInfo[]>([]);
    const [loadingViewers, setLoadingViewers] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [viewCount, setViewCount] = useState<number | null>(null);
    const audioRef = useRef<Audio.Sound | null>(null);

    const activeGroup = groups[Math.max(0, Math.min(groupIdx, groups.length - 1))];
    const activeStory = activeGroup?.stories[Math.max(0, Math.min(storyIdx, (activeGroup?.stories.length || 1) - 1))];
    const highlightId = activeGroup?.highlightId;
    const isMyStory = Boolean(currentUser && activeGroup && String(currentUser.id) === String(activeGroup.userId));

    useEffect(() => {
        if (!visible) return;
        setGroupIdx(initialGroupIdx);
        setStoryIdx(initialStoryIdx);
        setProgress(0);
        setFinished(false);
        setOptionsOpen(false);
        setViewersOpen(false);
    }, [visible, initialGroupIdx, initialStoryIdx]);

    const handleNext = () => {
        const group = groups[groupIdx];
        if (!group) return;
        if (storyIdx < group.stories.length - 1) {
            setStoryIdx((prev) => prev + 1);
            setProgress(0);
        } else if (groupIdx < groups.length - 1) {
            setGroupIdx((prev) => prev + 1);
            setStoryIdx(0);
            setProgress(0);
        } else {
            setFinished(true);
            setProgress(100);
        }
    };

    const handlePrev = () => {
        if (finished) {
            setFinished(false);
            setProgress(0);
            return;
        }
        if (storyIdx > 0) {
            setStoryIdx((prev) => prev - 1);
            setProgress(0);
        } else if (groupIdx > 0) {
            const previousGroup = groups[groupIdx - 1];
            setGroupIdx((prev) => prev - 1);
            setStoryIdx(Math.max(0, previousGroup.stories.length - 1));
            setProgress(0);
        } else {
            setProgress(0);
        }
    };

    useEffect(() => {
        if (!visible || !activeStory || finished) return;
        setProgress(0);
        setReactedEmoji(null);
        setViewersOpen(false);
        setViewCount(null);
        if (!activeStory.isViewed && !activeStory.viewed && currentUser) {
            void viewStory(activeStory.id).then(() => onStoryViewed?.(activeStory.id));
        }
    }, [visible, activeStory?.id, finished]);

    useRealtimeStory({
        storyId: activeStory?.id || "",
        enabled: !!(visible && activeStory?.id),
        onStoryUpdate: (event) => {
            if (event && event.storyId === activeStory?.id) {
                if (event.type === "STORY_VIEW") {
                    const newCount = event.data?.viewCount;
                    if (typeof newCount === "number") {
                        setViewCount(newCount);
                    }
                    if (viewersOpen) {
                        void fetchStoryViewers(activeStory.id).then(setViewers).catch(() => undefined);
                    }
                } else if (event.type === "STORY_REACTION") {
                    if (viewersOpen) {
                        void fetchStoryViewers(activeStory.id).then(setViewers).catch(() => undefined);
                    }
                }
            }
        }
    });


    useEffect(() => {
        let mounted = true;
        const playMusic = async () => {
            if (audioRef.current) {
                await audioRef.current.unloadAsync().catch(() => undefined);
                audioRef.current = null;
            }
            if (!visible || !activeStory?.music?.audioUrl || finished) return;
            const url = buildS3Url(activeStory.music.audioUrl) || activeStory.music.audioUrl;
            const { sound } = await Audio.Sound.createAsync({ uri: url }, { isLooping: true, volume: 0.8, shouldPlay: !paused });
            if (!mounted) {
                await sound.unloadAsync().catch(() => undefined);
                return;
            }
            audioRef.current = sound;
        };
        void playMusic();
        return () => {
            mounted = false;
            if (audioRef.current) {
                void audioRef.current.unloadAsync().catch(() => undefined);
                audioRef.current = null;
            }
        };
    }, [visible, activeStory?.id, finished]);

    useEffect(() => {
        if (audioRef.current) {
            void (paused ? audioRef.current.pauseAsync() : audioRef.current.playAsync()).catch(() => undefined);
        }
    }, [paused]);

    useEffect(() => {
        if (!visible || paused || !activeStory || finished || activeStory.media?.type?.toUpperCase() === "VIDEO") return;
        const step = 50;
        const duration = 5000;
        const inc = (step / duration) * 100;
        const timer = setInterval(() => {
            setProgress((prev) => {
                const next = prev + inc;
                if (next >= 100) {
                    clearInterval(timer);
                    setTimeout(handleNext, 0);
                    return 100;
                }
                return next;
            });
        }, step);
        return () => clearInterval(timer);
    }, [visible, paused, activeStory?.id, finished]);

    const openViewers = async () => {
        if (!activeStory) return;
        setPaused(true);
        setViewersOpen(true);
        setLoadingViewers(true);
        try {
            const list = await fetchStoryViewers(activeStory.id);
            setViewers(list);
            setViewCount(list.length);
        } finally {
            setLoadingViewers(false);
        }
    };

    const handleReaction = async (emoji: string) => {
        if (!activeStory) return;
        setReactedEmoji(emoji);
        await reactToStory(activeStory.id, emoji).catch(() => undefined);
    };

    const handleRemoveFromHighlight = () => {
        if (!activeStory || !highlightId) return;
        Alert.alert(
            "Gỡ tin nổi bật",
            "Bạn có chắc chắn muốn gỡ tin này khỏi tin nổi bật?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Gỡ",
                    style: "destructive",
                    onPress: async () => {
                        setIsUpdating(true);
                        try {
                            await removeStoriesFromHighlight(highlightId, [activeStory.id]);
                            onStoryRemovedFromHighlight?.(activeStory.id);

                            const group = groups[groupIdx];
                            if (group) {
                                const remainingStories = group.stories.filter((s) => s.id !== activeStory.id);
                                group.stories = remainingStories;

                                if (remainingStories.length === 0) {
                                    onClose();
                                    return;
                                } else if (storyIdx >= remainingStories.length) {
                                    setStoryIdx(remainingStories.length - 1);
                                }
                            }
                            setOptionsOpen(false);
                            setPaused(false);
                            setProgress(0);
                        } catch (err: any) {
                            Alert.alert("Lỗi", err.message || "Gỡ tin nổi bật thất bại!");
                        } finally {
                            setIsUpdating(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDelete = () => {
        if (!activeStory) return;
        Alert.alert("Xóa tin", "Bạn có chắc chắn muốn xóa tin này không?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Xóa",
                style: "destructive",
                onPress: async () => {
                    await deleteStory(activeStory.id);
                    onStoryDeleted?.(activeStory.id);
                    setOptionsOpen(false);
                    handleNext();
                },
            },
        ]);
    };

    const handlePrivacy = async (privacy: PrivacyType) => {
        if (!activeStory) return;
        setIsUpdating(true);
        try {
            await updateStoryPrivacy(activeStory.id, privacy);
            activeStory.privacy = privacy;
            setOptionsOpen(false);
            setPaused(false);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSetting = async (key: "allowReplies" | "allowReactions" | "allowSharing") => {
        if (!activeStory) return;
        setIsUpdating(true);
        try {
            const nextValue = activeStory[key] === false;
            await updateStorySettings(activeStory.id, { [key]: nextValue });
            activeStory[key] = nextValue;
        } finally {
            setIsUpdating(false);
        }
    };

    const renderContent = () => {
        if (!activeStory) return null;
        const { cleanText, gradientIndex } = parseStoryContent(activeStory);
        const mediaUrl = activeStory.media?.url || activeStory.image;
        const isVideo = activeStory.media?.type?.toUpperCase() === "VIDEO";
        if (mediaUrl && isVideo) {
            return (
                <Video
                    source={{ uri: mediaUrl }}
                    style={styles.media}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={!paused}
                    isMuted={activeStory.music?.muteOriginal ?? false}
                    onPlaybackStatusUpdate={(status) => {
                        if (!status.isLoaded) return;
                        if (status.durationMillis) setProgress((status.positionMillis / status.durationMillis) * 100);
                        if (status.didJustFinish) handleNext();
                    }}
                />
            );
        }
        if (mediaUrl) {
            return <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />;
        }
        return (
            <LinearGradient colors={TEXT_GRADIENTS[gradientIndex]} style={styles.textOnlyStory}>
                <Text style={styles.textOnlyContent}>{cleanText}</Text>
            </LinearGradient>
        );
    };

    const { cleanText } = parseStoryContent(activeStory);

    return (
        <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <View style={[styles.root, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 8 }]}>
                {finished ? (
                    <View style={styles.finishedBox}>
                        <Ionicons name="checkmark-circle" size={82} color="#34D399" />
                        <Text style={styles.finishedTitle}>Bạn đã xem hết tất cả tin</Text>
                        <Text style={styles.finishedDesc}>Hãy quay lại sau để cập nhật những khoảnh khắc mới nhất từ bạn bè.</Text>
                        <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
                            <Text style={styles.primaryButtonText}>Đóng</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => { setGroupIdx(0); setStoryIdx(0); setProgress(0); setFinished(false); }}>
                            <Text style={styles.secondaryButtonText}>Xem lại từ đầu</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <Pressable
                        style={styles.storyShell}
                        onLongPress={() => setPaused(true)}
                        onPressOut={() => setPaused(false)}
                        onPress={(event) => {
                            const x = event.nativeEvent.locationX;
                            const width = event.currentTarget ? 390 : 390;
                            if (x < width * 0.3) handlePrev();
                            else handleNext();
                        }}
                    >
                        {renderContent()}
                        <View style={styles.topOverlay} pointerEvents="box-none">
                            <View style={styles.progressRow}>
                                {activeGroup?.stories.map((_, index) => (
                                    <View key={index} style={styles.progressTrack}>
                                        <View style={[styles.progressFill, { width: `${index < storyIdx ? 100 : index === storyIdx ? progress : 0}%` }]} />
                                    </View>
                                ))}
                            </View>
                            <View style={styles.headerRow}>
                                <View style={styles.ownerRow}>
                                    <UserAvatar uri={activeGroup?.userAvatar} name={activeGroup?.username || "User"} size={38} />
                                    <View>
                                        <Text style={styles.username}>{activeGroup?.username}</Text>
                                        <Text style={styles.time}>{formatTimeAgo(activeStory?.createdAt)}</Text>
                                    </View>
                                </View>
                                <View style={styles.headerActions}>
                                    {isMyStory ? (
                                        <TouchableOpacity style={styles.iconButton} onPress={() => { setPaused(true); setOptionsOpen(true); }}>
                                            <Ionicons name="ellipsis-horizontal" size={20} color={colors.white} />
                                        </TouchableOpacity>
                                    ) : null}
                                    <TouchableOpacity style={styles.iconButton} onPress={onClose}>
                                        <Ionicons name="close" size={22} color={colors.white} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {activeStory?.music?.title ? (
                            <View style={styles.musicSticker}>
                                <Text style={styles.musicIcon}>🎵</Text>
                                <View style={styles.musicTextWrap}>
                                    <Text numberOfLines={1} style={styles.musicTitle}>{activeStory.music.title}</Text>
                                    <Text numberOfLines={1} style={styles.musicArtist}>{activeStory.music.artist}</Text>
                                </View>
                            </View>
                        ) : null}

                        {activeStory?.media?.url && cleanText ? (
                            <View style={[styles.captionOverlay, { bottom: isMyStory ? 86 : 126 }]}>
                                <Text style={styles.captionText}>{cleanText}</Text>
                            </View>
                        ) : null}

                        {isMyStory ? (
                            <View style={styles.ownerBottom}>
                                <TouchableOpacity style={styles.viewerButton} onPress={openViewers}>
                                    <Ionicons name="eye-outline" size={16} color="#60A5FA" />
                                    <Text style={styles.viewerButtonText}>{viewCount ?? activeStory?.viewCount ?? 0} người xem</Text>
                                </TouchableOpacity>
                            </View>
                        ) : activeStory && (activeStory.allowReactions !== false || activeStory.allowReplies !== false) ? (
                            <View style={styles.reactionBar}>
                                {activeStory.allowReactions !== false ? (
                                    <View style={styles.emojiRow}>
                                        {QUICK_EMOJIS.map((emoji) => (
                                            <TouchableOpacity key={emoji} style={[styles.emojiButton, reactedEmoji === emoji && styles.emojiButtonActive]} onPress={() => handleReaction(emoji)}>
                                                <Text style={styles.emoji}>{emoji}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : null}
                                {activeStory.allowReplies !== false ? (
                                    <View style={styles.replyRow}>
                                        <TextInput
                                            style={styles.replyInput}
                                            placeholder="Trả lời tin..."
                                            placeholderTextColor="rgba(255,255,255,0.45)"
                                            value={replyText}
                                            onFocus={() => setPaused(true)}
                                            onBlur={() => setPaused(false)}
                                            onChangeText={setReplyText}
                                        />
                                        <TouchableOpacity style={[styles.sendButton, !replyText.trim() && styles.sendButtonDisabled]} onPress={() => setReplyText("")} disabled={!replyText.trim()}>
                                            <Ionicons name="send" size={16} color={colors.white} />
                                        </TouchableOpacity>
                                    </View>
                                ) : null}
                            </View>
                        ) : null}
                    </Pressable>
                )}

                <StoryOptionsSheet
                    visible={optionsOpen}
                    story={activeStory}
                    isUpdating={isUpdating}
                    onClose={() => { setOptionsOpen(false); setPaused(false); }}
                    onDelete={handleDelete}
                    onPrivacy={handlePrivacy}
                    onSetting={handleSetting}
                    highlightId={highlightId}
                    onRemoveFromHighlight={handleRemoveFromHighlight}
                    onEditHighlight={() => {
                        setOptionsOpen(false);
                        onClose();
                        if (highlightId) {
                            onEditHighlight?.(highlightId);
                        }
                    }}
                />
                <ViewersSheet
                    visible={viewersOpen}
                    viewers={viewers}
                    loading={loadingViewers}
                    onClose={() => { setViewersOpen(false); setPaused(false); }}
                />
            </View>
        </Modal>
    );
}

function StoryOptionsSheet({
    visible,
    story,
    isUpdating,
    onClose,
    onDelete,
    onPrivacy,
    onSetting,
    highlightId,
    onRemoveFromHighlight,
    onEditHighlight,
}: {
    visible: boolean;
    story?: Story;
    isUpdating: boolean;
    onClose: () => void;
    onDelete: () => void;
    onPrivacy: (privacy: PrivacyType) => void;
    onSetting: (key: "allowReplies" | "allowReactions" | "allowSharing") => void;
    highlightId?: string;
    onRemoveFromHighlight?: () => void;
    onEditHighlight?: () => void;
}) {
    const [panel, setPanel] = useState<"main" | "privacy" | "settings">("main");
    useEffect(() => { if (!visible) setPanel("main"); }, [visible]);
    if (!visible) return null;
    return (
        <View style={styles.sheetOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            <View style={styles.sheetCard}>
                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Tùy chọn tin</Text>
                    <TouchableOpacity onPress={onClose}><Ionicons name="close" color={colors.white} size={18} /></TouchableOpacity>
                </View>
                {panel === "privacy" ? (
                    <View style={styles.sheetBody}>
                        {[
                            { key: "PUBLIC" as PrivacyType, label: "Công khai", icon: "earth-outline" as const },
                            { key: "FRIENDS" as PrivacyType, label: "Bạn bè", icon: "people-outline" as const },
                            { key: "ONLY_ME" as PrivacyType, label: "Chỉ mình tôi", icon: "lock-closed-outline" as const },
                        ].map((item) => (
                            <TouchableOpacity key={item.key} disabled={isUpdating} style={[styles.optionRow, story?.privacy === item.key && styles.optionRowActive]} onPress={() => onPrivacy(item.key)}>
                                <Ionicons name={item.icon} size={20} color={story?.privacy === item.key ? "#60A5FA" : colors.white} />
                                <Text style={styles.optionText}>{item.label}</Text>
                                {story?.privacy === item.key ? <View style={styles.selectedDot} /> : null}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.secondarySheetButton} onPress={() => setPanel("main")}><Text style={styles.secondaryButtonText}>Quay lại</Text></TouchableOpacity>
                    </View>
                ) : panel === "settings" ? (
                    <View style={styles.sheetBody}>
                        {[
                            { key: "allowReplies" as const, label: "Cho phép trả lời", value: story?.allowReplies !== false },
                            { key: "allowReactions" as const, label: "Cho phép bày tỏ cảm xúc", value: story?.allowReactions !== false },
                            { key: "allowSharing" as const, label: "Cho phép chia sẻ", value: story?.allowSharing !== false },
                        ].map((item) => (
                            <TouchableOpacity key={item.key} disabled={isUpdating} style={styles.settingRow} onPress={() => onSetting(item.key)}>
                                <Text style={styles.optionText}>{item.label}</Text>
                                <View style={[styles.switchPill, item.value && styles.switchPillOn]}><View style={[styles.switchDot, item.value && styles.switchDotOn]} /></View>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.secondarySheetButton} onPress={() => setPanel("main")}><Text style={styles.secondaryButtonText}>Quay lại</Text></TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.sheetBody}>
                        {highlightId ? (
                            <>
                                <TouchableOpacity style={styles.optionRow} onPress={onEditHighlight}>
                                    <Ionicons name="create-outline" size={20} color={colors.white} />
                                    <Text style={styles.optionText}>Chỉnh sửa tin nổi bật</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deleteButton} onPress={onRemoveFromHighlight}>
                                    <Ionicons name="trash-outline" size={20} color="#F87171" />
                                    <Text style={styles.deleteText}>Gỡ khỏi tin nổi bật</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity style={styles.optionRow} onPress={() => setPanel("privacy")}><Ionicons name="lock-closed-outline" size={20} color={colors.white} /><Text style={styles.optionText}>Thay đổi quyền riêng tư</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.optionRow} onPress={() => setPanel("settings")}><Ionicons name="settings-outline" size={20} color={colors.white} /><Text style={styles.optionText}>Cài đặt nâng cao</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.deleteButton} onPress={onDelete}><Ionicons name="trash-outline" size={20} color="#F87171" /><Text style={styles.deleteText}>Xóa tin này</Text></TouchableOpacity>
                            </>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
}

function ViewersSheet({ visible, viewers, loading, onClose }: { visible: boolean; viewers: StoryViewerInfo[]; loading: boolean; onClose: () => void }) {
    if (!visible) return null;
    return (
        <View style={styles.sheetOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            <View style={[styles.sheetCard, styles.viewersCard]}>
                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Người xem ({viewers.length})</Text>
                    <TouchableOpacity onPress={onClose}><Ionicons name="close" color={colors.white} size={18} /></TouchableOpacity>
                </View>
                {loading ? <ActivityIndicator color={colors.primary} style={styles.viewerLoader} /> : (
                    <FlatList
                        data={viewers}
                        keyExtractor={(item, index) => item.viewerId || `viewer-${index}`}
                        ListEmptyComponent={<Text style={styles.emptyViewerText}>Chưa có người xem</Text>}
                        renderItem={({ item }) => (
                            <View style={styles.viewerRow}>
                                <UserAvatar uri={buildS3Url(item.avatarUrl) || item.avatarUrl} name={item.username || item.viewerId} size={42} />
                                <View style={styles.viewerInfo}>
                                    <Text style={styles.viewerName}>{item.username || `Người dùng ${String(item.viewerId).slice(0, 6)}`}</Text>
                                    <Text style={styles.viewerTime}>{formatTimeAgo(item.viewedAt)}</Text>
                                </View>
                                {item.reaction ? <Text style={styles.viewerReaction}>{item.reaction}</Text> : null}
                            </View>
                        )}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#050505", alignItems: "center", justifyContent: "center" },
    storyShell: { width: "100%", maxWidth: 430, flex: 1, backgroundColor: "#09090B", overflow: "hidden" },
    media: { width: "100%", height: "100%" },
    textOnlyStory: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    textOnlyContent: { color: colors.white, fontSize: 22, fontWeight: "800", textAlign: "center", lineHeight: 32 },
    topOverlay: { position: "absolute", top: 0, left: 0, right: 0, padding: 12, backgroundColor: "rgba(0,0,0,0.38)" },
    progressRow: { flexDirection: "row", gap: 4, marginBottom: 12 },
    progressTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.3)", overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: colors.white },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    ownerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    username: { color: colors.white, fontSize: 13, fontWeight: "800" },
    time: { color: "rgba(255,255,255,0.55)", fontSize: 10, marginTop: 2 },
    headerActions: { flexDirection: "row", gap: 8 },
    iconButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
    musicSticker: { position: "absolute", top: 88, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.45)" },
    musicIcon: { fontSize: 22 },
    musicTextWrap: { flex: 1 },
    musicTitle: { color: colors.white, fontSize: 12, fontWeight: "800" },
    musicArtist: { color: "rgba(255,255,255,0.6)", fontSize: 10, marginTop: 2 },
    captionOverlay: { position: "absolute", left: 16, right: 16, padding: 12, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.45)" },
    captionText: { color: colors.white, fontSize: 13, fontWeight: "600", textAlign: "center", lineHeight: 19 },
    ownerBottom: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", paddingTop: 30, paddingBottom: 20, backgroundColor: "rgba(0,0,0,0.45)" },
    viewerButton: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)" },
    viewerButtonText: { color: colors.white, fontSize: 12, fontWeight: "700" },
    reactionBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingBottom: 16, paddingTop: 28, backgroundColor: "rgba(0,0,0,0.48)" },
    emojiRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 12 },
    emojiButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)" },
    emojiButtonActive: { backgroundColor: "rgba(255,255,255,0.28)", borderWidth: 1, borderColor: "rgba(255,255,255,0.45)" },
    emoji: { fontSize: 20 },
    replyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    replyInput: { flex: 1, height: 42, borderRadius: 21, paddingHorizontal: 16, color: colors.white, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
    sendButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
    sendButtonDisabled: { backgroundColor: "rgba(255,255,255,0.14)" },
    finishedBox: { alignItems: "center", paddingHorizontal: 28 },
    finishedTitle: { color: colors.white, fontSize: 19, fontWeight: "800", marginTop: 18, textAlign: "center" },
    finishedDesc: { color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "center", lineHeight: 20, marginTop: 8, marginBottom: 24 },
    primaryButton: { width: 220, alignItems: "center", paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary, marginBottom: 10 },
    primaryButtonText: { color: colors.white, fontWeight: "800" },
    secondaryButton: { width: 220, alignItems: "center", paddingVertical: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)" },
    secondaryButtonText: { color: colors.white, fontWeight: "700" },
    sheetOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
    sheetCard: { backgroundColor: "rgba(24,24,27,0.98)", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
    sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
    sheetTitle: { color: colors.white, fontSize: 14, fontWeight: "800" },
    sheetBody: { gap: 10, paddingTop: 14 },
    optionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.07)" },
    optionRowActive: { borderWidth: 1, borderColor: "rgba(96,165,250,0.55)", backgroundColor: "rgba(59,130,246,0.16)" },
    optionText: { color: colors.white, fontSize: 13, fontWeight: "700", flex: 1 },
    selectedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#60A5FA" },
    settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.07)" },
    switchPill: { width: 42, height: 24, borderRadius: 12, backgroundColor: "#3F3F46", padding: 3 },
    switchPillOn: { backgroundColor: colors.primary },
    switchDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.white },
    switchDotOn: { transform: [{ translateX: 18 }] },
    secondarySheetButton: { alignItems: "center", padding: 13, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)" },
    deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 14, borderRadius: 14, backgroundColor: "rgba(239,68,68,0.14)", borderWidth: 1, borderColor: "rgba(248,113,113,0.28)" },
    deleteText: { color: "#F87171", fontSize: 13, fontWeight: "800" },
    viewersCard: { maxHeight: "62%" },
    viewerLoader: { padding: spacing.xl },
    emptyViewerText: { color: "rgba(255,255,255,0.55)", textAlign: "center", padding: 28 },
    viewerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 },
    viewerInfo: { flex: 1 },
    viewerName: { color: colors.white, fontSize: 13, fontWeight: "700" },
    viewerTime: { color: "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 2 },
    viewerReaction: { fontSize: 20 },
});
