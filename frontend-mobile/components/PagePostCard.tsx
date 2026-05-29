import { colors } from "@/constants";
import { commentService } from "@/services/commentService";
import {
    fetchPostReactionsCount,
    fetchUserReaction,
    sharePost,
    togglePostReaction,
} from "@/services/postService";
import postWebsocketService, {
    type CommentEvent,
    type ReactionEvent,
} from "@/services/postWebsocketService";
import { buildS3Url } from "@/utils/s3";
import { formatRelativeTime } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const FB_BLUE = "#1877F2";
const screenWidth = Dimensions.get("window").width;

type PagePost = {
    id: string;
    content?: string;
    media?: { url?: string }[];
    authorId?: string | number;
    createdAt?: string;
    stats?: { likes?: number; comments?: number };
};

type Props = {
    post: PagePost;
    pageName: string;
    pageAvatarUri?: string;
    currentUserId: number | null;
    canManage: boolean;
    onRemove: (postId: string) => void;
    onOpenComments: (postId: string) => void;
};

export default function PagePostCard({
    post,
    pageName,
    pageAvatarUri,
    currentUserId,
    canManage,
    onRemove,
    onOpenComments,
}: Props) {
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(post.stats?.likes ?? 0);
    const [commentsCount, setCommentsCount] = useState(
        post.stats?.comments ?? 0,
    );
    const [sharing, setSharing] = useState(false);

    const isOwnPost =
        currentUserId != null && String(post.authorId) === String(currentUserId);
    const canDelete = canManage || isOwnPost;

    // Fetch real reaction + comment counts (same backend as the wall)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const count = await fetchPostReactionsCount(post.id);
                if (!cancelled) setLikesCount(count);
                if (currentUserId != null) {
                    const r = await fetchUserReaction(
                        String(currentUserId),
                        post.id,
                    );
                    if (!cancelled) setIsLiked(!!r);
                }
            } catch {
                /* ignore */
            }
            try {
                const res = await commentService.getRootComments(
                    "POST",
                    post.id,
                    0,
                    1,
                );
                if (!cancelled && typeof res?.totalCount === "number") {
                    setCommentsCount(res.totalCount);
                }
            } catch {
                /* ignore */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [post.id, currentUserId]);

    // Realtime likes
    useEffect(() => {
        const onReaction = (e: ReactionEvent) => {
            if (e.targetType !== "POST" || e.targetId !== post.id) return;
            if (String(e.userId) === String(currentUserId)) return; // own = optimistic
            setLikesCount((c) =>
                e.action === "REACT" ? c + 1 : Math.max(0, c - 1),
            );
        };
        postWebsocketService.subscribeToPostReactions(post.id, onReaction);
        return () =>
            postWebsocketService.unsubscribeFromPostReactions(post.id, onReaction);
    }, [post.id, currentUserId]);

    // Realtime comment count
    useEffect(() => {
        const onComment = (e: CommentEvent) => {
            if (e.postId !== post.id) return;
            const uid = e.payload?.userId;
            if (uid != null && String(uid) === String(currentUserId)) return;
            setCommentsCount((c) =>
                e.action === "DELETE" ? Math.max(0, c - 1) : c + 1,
            );
        };
        postWebsocketService.subscribeToPostComments(post.id, onComment);
        return () =>
            postWebsocketService.unsubscribeFromPostComments(post.id, onComment);
    }, [post.id, currentUserId]);

    const handleLike = async () => {
        if (currentUserId == null) return;
        try {
            const reaction = await togglePostReaction(
                String(currentUserId),
                post.id,
                "LIKE",
            );
            if (!reaction) {
                setIsLiked(false);
                setLikesCount((c) => Math.max(0, c - 1));
            } else {
                setLikesCount((c) => c + (isLiked ? 0 : 1));
                setIsLiked(true);
            }
        } catch {
            /* ignore */
        }
    };

    const handleShare = async () => {
        if (sharing) return;
        setSharing(true);
        try {
            await sharePost(post.id);
            Alert.alert("Thành công", "Đã chia sẻ bài viết.");
        } catch {
            Alert.alert("Lỗi", "Không thể chia sẻ bài viết.");
        } finally {
            setSharing(false);
        }
    };

    return (
        <View style={st.card}>
            {/* Header */}
            <View style={st.header}>
                {pageAvatarUri ? (
                    <Image source={{ uri: pageAvatarUri }} style={st.avatar} />
                ) : (
                    <View style={[st.avatar, st.avatarFallback]}>
                        <Ionicons name="flag" size={12} color={FB_BLUE} />
                    </View>
                )}
                <View style={{ flex: 1 }}>
                    <Text style={st.author}>{pageName}</Text>
                    <Text style={st.date}>
                        {post.createdAt ? formatRelativeTime(post.createdAt) : ""}
                    </Text>
                </View>
                {canDelete && (
                    <TouchableOpacity
                        onPress={() => onRemove(post.id)}
                        hitSlop={8}
                    >
                        <Ionicons
                            name="ellipsis-horizontal"
                            size={20}
                            color={colors.textMuted}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {/* Content */}
            {!!post.content && (
                <Text style={[st.content, { paddingHorizontal: 14 }]}>
                    {post.content}
                </Text>
            )}

            {/* Media */}
            {post.media && post.media.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: 10 }}
                    contentContainerStyle={{ gap: 2 }}
                >
                    {post.media.map((item, idx) =>
                        item?.url ? (
                            <Image
                                key={idx}
                                source={{ uri: buildS3Url(item.url) }}
                                style={{
                                    width: screenWidth * 0.85,
                                    height: 240,
                                }}
                                resizeMode="cover"
                            />
                        ) : null,
                    )}
                </ScrollView>
            )}

            {/* Stats */}
            {likesCount > 0 || commentsCount > 0 ? (
                <View style={st.statsRow}>
                    {likesCount > 0 && (
                        <Text style={st.statText}>👍 {likesCount}</Text>
                    )}
                    {commentsCount > 0 && (
                        <Text style={[st.statText, { marginLeft: "auto" }]}>
                            {commentsCount} bình luận
                        </Text>
                    )}
                </View>
            ) : null}

            {/* Action buttons */}
            <View style={st.actionsRow}>
                <TouchableOpacity style={st.actionBtn} onPress={handleLike}>
                    <Ionicons
                        name={isLiked ? "thumbs-up" : "thumbs-up-outline"}
                        size={20}
                        color={isLiked ? FB_BLUE : colors.textMuted}
                    />
                    <Text
                        style={[
                            st.actionText,
                            isLiked && { color: FB_BLUE, fontWeight: "700" },
                        ]}
                    >
                        Thích
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={st.actionBtn}
                    onPress={() => onOpenComments(post.id)}
                >
                    <Ionicons
                        name="chatbubble-outline"
                        size={19}
                        color={colors.textMuted}
                    />
                    <Text style={st.actionText}>Bình luận</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={st.actionBtn}
                    onPress={handleShare}
                    disabled={sharing}
                >
                    <Ionicons
                        name="arrow-redo-outline"
                        size={20}
                        color={colors.textMuted}
                    />
                    <Text style={st.actionText}>Chia sẻ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const st = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        borderRadius: 12,
        marginBottom: 10,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 14,
        paddingBottom: 8,
    },
    avatar: { width: 38, height: 38, borderRadius: 19 },
    avatarFallback: {
        backgroundColor: "#E7F0FF",
        justifyContent: "center",
        alignItems: "center",
    },
    author: { fontSize: 14, fontWeight: "700", color: colors.text },
    date: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    content: { fontSize: 15, color: colors.text, lineHeight: 22, paddingBottom: 10 },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    statText: { fontSize: 13, color: colors.textMuted },
    actionsRow: {
        flexDirection: "row",
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        paddingVertical: 4,
        paddingHorizontal: 6,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 9,
        borderRadius: 8,
    },
    actionText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
});
