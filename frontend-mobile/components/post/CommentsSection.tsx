import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import { commentService, Comment } from "@/services/commentService";
import { fetchUserById } from "@/services/postService";
import UserAvatar from "../UserAvatar";
import { User } from "@/types";
import useRealtimeComments from "@/hooks/useRealtimeComments";
import useRealtimeReactions from "@/hooks/useRealtimeReactions";

interface CommentsSectionProps {
    postId: string;
    postAuthorId: string;
    onCommentCountChange?: (count: number) => void;
    HeaderComponent?: React.ReactElement;
}

export default function CommentsSection({ postId, postAuthorId, onCommentCountChange, HeaderComponent }: CommentsSectionProps) {
    const { currentUser, getUserById, upsertUsers } = useAppContext();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    
    const [inputText, setInputText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef<TextInput>(null);

    // Fetch initial comments
    const loadComments = useCallback(async (pageNum: number, isAppend = false) => {
        if (pageNum === 0) setLoading(true);
        else setLoadingMore(true);

        try {
            const response = await commentService.getRootComments("POST", postId, pageNum, 10);
            if (isAppend) {
                setComments((prev) => [...prev, ...response.data]);
            } else {
                setComments(response.data);
            }
            setHasMore(response.hasMore);
            setPage(pageNum);
        } catch (error) {
            console.error("Error loading comments:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [postId]);

    useEffect(() => {
        void loadComments(0);
    }, [loadComments]);

    // Build a map of comments for duplicate checking
    const commentsById = useMemo(() => {
        const map: Record<string, Comment> = {};
        comments.forEach((c) => {
            map[c.id] = c;
            c.replies?.forEach((r) => {
                map[r.id] = r;
            });
        });
        return map;
    }, [comments]);

    const handleCreateReply = useCallback((parentId: string | null, newComment: Comment) => {
        if (!parentId) {
            setComments((prev) => {
                if (prev.some((c) => c.id === newComment.id)) return prev;
                const next = [newComment, ...prev];
                onCommentCountChange?.(next.length);
                return next;
            });
        } else {
            setComments((prev) =>
                prev.map((c) => {
                    if (c.id === parentId) {
                        const replies = c.replies || [];
                        if (replies.some((r) => r.id === newComment.id)) return c;
                        return {
                            ...c,
                            replies: [...replies, newComment],
                            replyCount: (c.replyCount || 0) + 1,
                        };
                    }
                    return c;
                })
            );
        }
    }, [onCommentCountChange]);

    const handleDeleteComment = useCallback((commentId: string) => {
        setComments((prev) => {
            const next = prev.filter((c) => c.id !== commentId);
            if (next.length !== prev.length) {
                onCommentCountChange?.(next.length);
            }
            return next.map((c) => ({
                ...c,
                replies: (c.replies || []).filter((r) => r.id !== commentId),
                replyCount: (c.replies || []).some((r) => r.id === commentId)
                    ? Math.max(0, (c.replyCount || 1) - 1)
                    : c.replyCount,
            }));
        });
    }, [onCommentCountChange]);

    useRealtimeComments({
        postId,
        commentsById,
        createReply: handleCreateReply,
        deleteComment: handleDeleteComment,
        viewerId: currentUser?.id?.toString() || ""
    });

    useRealtimeReactions({
        postId,
        onReactionUpdate: (event) => {
            // Ignore own reaction events as they are updated optimistically
            if (event.userId === currentUser?.id) return;
            if (event.targetType !== "COMMENT") return;

            const isReact = event.action === "REACT";
            const targetId = event.targetId;

            setComments((prev) =>
                prev.map((c) => {
                    if (c.id === targetId) {
                        return {
                            ...c,
                            reactCount: isReact ? c.reactCount + 1 : Math.max(0, c.reactCount - 1),
                        };
                    }
                    if (c.replies && c.replies.some((r) => r.id === targetId)) {
                        return {
                            ...c,
                            replies: c.replies.map((r) =>
                                r.id === targetId
                                    ? { ...r, reactCount: isReact ? r.reactCount + 1 : Math.max(0, r.reactCount - 1) }
                                    : r
                            ),
                        };
                    }
                    return c;
                })
            );
        }
    });

    const handleSubmit = async () => {
        const text = inputText.trim();
        if (!text || submitting || !currentUser) return;

        setSubmitting(true);
        try {
            // If replyingTo is set, we use its id as parentId. 
            // In typical tree layout, we reply to the root parentId if replying to a reply.
            const parentId = replyingTo ? (replyingTo.parentId || replyingTo.id) : null;
            const newComment = await commentService.createComment(
                "POST",
                postId,
                text,
                currentUser.id,
                parentId
            );

            if (!parentId) {
                setComments((prev) => [newComment, ...prev]);
                onCommentCountChange?.(comments.length + 1);
            } else {
                setComments((prev) =>
                    prev.map((c) => {
                        if (c.id === parentId) {
                            return {
                                ...c,
                                replies: [...(c.replies || []), newComment],
                                replyCount: (c.replyCount || 0) + 1,
                            };
                        }
                        return c;
                    })
                );
            }

            setInputText("");
            setReplyingTo(null);
        } catch (error) {
            console.error("Failed to submit comment:", error);
            Alert.alert("Lỗi", "Không thể gửi bình luận.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReplyPress = (comment: Comment) => {
        setReplyingTo(comment);
        inputRef.current?.focus();
    };

    const handleDelete = async (commentId: string, parentId?: string | null) => {
        Alert.alert(
            "Xóa bình luận",
            "Bạn có chắc muốn xóa bình luận này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        if (!currentUser) return;
                        try {
                            await commentService.deleteComment(commentId, currentUser.id);
                            
                            if (!parentId) {
                                setComments((prev) => prev.filter((c) => c.id !== commentId));
                                onCommentCountChange?.(Math.max(0, comments.length - 1));
                            } else {
                                setComments((prev) =>
                                    prev.map((c) => {
                                        if (c.id === parentId) {
                                            return {
                                                ...c,
                                                replies: (c.replies || []).filter((r) => r.id !== commentId),
                                                replyCount: Math.max(0, (c.replyCount || 1) - 1),
                                            };
                                        }
                                        return c;
                                    })
                                );
                            }
                        } catch (error) {
                            console.error("Failed to delete comment:", error);
                            Alert.alert("Lỗi", "Không thể xóa bình luận.");
                        }
                    },
                },
            ]
        );
    };

    const handleToggleReaction = async (comment: Comment) => {
        if (!currentUser) return;
        const commentId = comment.id;
        
        // Optimistic update local helper
        const updateReactionLocal = (isReact: boolean) => {
            setComments((prev) =>
                prev.map((c) => {
                    if (c.id === commentId) {
                        return {
                            ...c,
                            reactCount: isReact ? c.reactCount + 1 : Math.max(0, c.reactCount - 1),
                        };
                    }
                    if (c.replies && c.replies.some((r) => r.id === commentId)) {
                        return {
                            ...c,
                            replies: c.replies.map((r) =>
                                r.id === commentId
                                    ? { ...r, reactCount: isReact ? r.reactCount + 1 : Math.max(0, r.reactCount - 1) }
                                    : r
                            ),
                        };
                    }
                    return c;
                })
            );
        };

        try {
            await commentService.toggleCommentReaction(currentUser.id, commentId, "LIKE");
            // Reload user reaction or toggle state locally
        } catch (error) {
            console.error("Failed to toggle reaction:", error);
        }
    };

    const loadMoreReplies = async (parentId: string, cursor: string | null) => {
        try {
            const response = await commentService.getMoreReplies(parentId, cursor, 5);
            setComments((prev) =>
                prev.map((c) => {
                    if (c.id === parentId) {
                        return {
                            ...c,
                            replies: [...(c.replies || []), ...response.data],
                            hasMoreReplies: response.hasMore,
                            nextCursor: response.nextCursor,
                        };
                    }
                    return c;
                })
            );
        } catch (error) {
            console.error("Error loading more replies:", error);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Bình luận</Text>
            </View>

            <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={HeaderComponent}
                renderItem={({ item }) => (
                    <CommentItem
                        comment={item}
                        currentUserId={currentUser?.id}
                        postAuthorId={postAuthorId}
                        onReply={handleReplyPress}
                        onDelete={handleDelete}
                        onToggleReaction={handleToggleReaction}
                        onLoadMoreReplies={loadMoreReplies}
                    />
                )}
                onEndReached={() => {
                    if (hasMore && !loadingMore) {
                        void loadComments(page + 1, true);
                    }
                }}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                    loadingMore ? (
                        <ActivityIndicator style={styles.footerLoader} color={colors.primary} />
                    ) : null
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
                        <Text style={styles.emptyText}>Chưa có bình luận nào. Hãy là người đầu tiên!</Text>
                    </View>
                }
            />

            {/* Input Bar */}
            <View style={styles.inputContainer}>
                {replyingTo && (
                    <View style={styles.replyingBar}>
                        <Text style={styles.replyingText}>
                            Đang trả lời <Text style={{ fontWeight: "700" }}>@{replyingTo.userId}</Text>
                        </Text>
                        <TouchableOpacity onPress={() => setReplyingTo(null)}>
                            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.inputRow}>
                    <UserAvatar size={36} uri={currentUser?.avatarUrl} name={currentUser?.username || "Me"} />
                    <TextInput
                        ref={inputRef}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder={replyingTo ? "Phản hồi bình luận..." : "Thêm bình luận..."}
                        placeholderTextColor={colors.textMuted}
                        style={styles.textInput}
                        multiline
                    />
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={submitting || !inputText.trim()}
                        style={styles.postBtn}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Text
                                style={[
                                    styles.postBtnText,
                                    !inputText.trim() && styles.postBtnDisabled,
                                ]}
                            >
                                Đăng
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

interface CommentItemProps {
    comment: Comment;
    currentUserId?: string;
    postAuthorId: string;
    isReply?: boolean;
    onReply: (comment: Comment) => void;
    onDelete: (commentId: string, parentId?: string | null) => void;
    onToggleReaction: (comment: Comment) => void;
    onLoadMoreReplies?: (parentId: string, cursor: string | null) => void;
}

function CommentItem({
    comment,
    currentUserId,
    postAuthorId,
    isReply = false,
    onReply,
    onDelete,
    onToggleReaction,
    onLoadMoreReplies,
}: CommentItemProps) {
    const { getUserById, upsertUsers } = useAppContext();
    const cachedUser = getUserById(comment.userId);
    const [author, setAuthor] = useState<User | null>(cachedUser || null);
    const [liked, setLiked] = useState(false);
    const [reactCount, setReactCount] = useState(comment.reactCount || 0);

    // Load user details if not cached
    useEffect(() => {
        if (cachedUser) {
            setAuthor(cachedUser);
            return;
        }
        let active = true;
        const loadUser = async () => {
            try {
                const u = await fetchUserById(comment.userId);
                if (u && active) {
                    upsertUsers([u]);
                    setAuthor(u);
                }
            } catch (err) {
                // Ignore missing users
            }
        };
        void loadUser();
        return () => {
            active = false;
        };
    }, [comment.userId, cachedUser, upsertUsers]);

    // Check user reaction
    useEffect(() => {
        if (!currentUserId) return;
        let active = true;
        const checkReaction = async () => {
            const reaction = await commentService.fetchUserCommentReaction(currentUserId, comment.id);
            if (active) {
                setLiked(!!reaction);
            }
        };
        void checkReaction();
        return () => {
            active = false;
        };
    }, [comment.id, currentUserId]);

    const handleReactionPress = () => {
        setLiked((prev) => {
            const next = !prev;
            setReactCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
            return next;
        });
        onToggleReaction(comment);
    };

    const isOwnComment = currentUserId === comment.userId;
    const isPostOwner = currentUserId === postAuthorId;
    const canDelete = isOwnComment || isPostOwner;

    return (
        <View style={[styles.itemContainer, isReply && styles.replyItem]}>
            <View style={styles.commentRow}>
                <UserAvatar size={isReply ? 28 : 36} uri={author?.avatarUrl} name={author?.username || "User"} />
                <View style={styles.commentContentWrap}>
                    <Text style={styles.usernameText}>
                        {author?.username || `user_${comment.userId}`}
                    </Text>
                    <Text style={styles.commentContent}>{comment.content}</Text>
                    
                    <View style={styles.actionsRow}>
                        <Text style={styles.timeText}>
                            {new Date(comment.createdAt).toLocaleDateString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </Text>
                        
                        {reactCount > 0 && (
                            <Text style={styles.likesCountText}>{reactCount} lượt thích</Text>
                        )}

                        {!isReply && (
                            <TouchableOpacity onPress={() => onReply(comment)}>
                                <Text style={styles.actionBtnText}>Trả lời</Text>
                            </TouchableOpacity>
                        )}

                        {canDelete && (
                            <TouchableOpacity onPress={() => onDelete(comment.id, comment.parentId)}>
                                <Text style={[styles.actionBtnText, { color: colors.danger }]}>Xóa</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Heart Button */}
                <TouchableOpacity onPress={handleReactionPress} style={styles.heartIcon}>
                    <Ionicons
                        name={liked ? "heart" : "heart-outline"}
                        size={14}
                        color={liked ? colors.danger : colors.textMuted}
                    />
                </TouchableOpacity>
            </View>

            {/* Replies List */}
            {!isReply && comment.replies && comment.replies.length > 0 && (
                <View style={styles.repliesList}>
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            currentUserId={currentUserId}
                            postAuthorId={postAuthorId}
                            isReply={true}
                            onReply={onReply}
                            onDelete={onDelete}
                            onToggleReaction={onToggleReaction}
                        />
                    ))}
                    
                    {comment.hasMoreReplies && (
                        <TouchableOpacity
                            onPress={() => onLoadMoreReplies?.(comment.id, comment.nextCursor)}
                            style={styles.moreRepliesBtn}
                        >
                            <Text style={styles.moreRepliesText}>Xem thêm phản hồi...</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        paddingVertical: spacing.md,
        alignItems: "center",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        ...typography.title,
        fontWeight: "700",
        color: colors.text,
    },
    center: {
        padding: spacing.xl,
        alignItems: "center",
        justifyContent: "center",
    },
    itemContainer: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    replyItem: {
        paddingLeft: 40,
        paddingRight: 0,
        paddingVertical: spacing.sm,
    },
    commentRow: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    commentContentWrap: {
        flex: 1,
        marginLeft: spacing.md,
        marginRight: spacing.sm,
    },
    usernameText: {
        ...typography.body,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 2,
    },
    commentContent: {
        ...typography.body,
        color: colors.text,
        lineHeight: 18,
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: spacing.xs,
    },
    timeText: {
        fontSize: 12,
        color: colors.textMuted,
        marginRight: spacing.md,
    },
    likesCountText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.textMuted,
        marginRight: spacing.md,
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: "700",
        color: colors.textMuted,
        marginRight: spacing.md,
    },
    heartIcon: {
        padding: spacing.xs,
    },
    repliesList: {
        marginTop: spacing.xs,
    },
    moreRepliesBtn: {
        paddingLeft: 48,
        paddingVertical: spacing.xs,
    },
    moreRepliesText: {
        fontSize: 12,
        fontWeight: "700",
        color: colors.primary,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 48,
        paddingHorizontal: spacing.xl,
    },
    emptyText: {
        ...typography.body,
        color: colors.textMuted,
        marginTop: spacing.md,
        textAlign: "center",
    },
    footerLoader: {
        paddingVertical: spacing.md,
    },
    inputContainer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        padding: spacing.md,
        backgroundColor: colors.white,
    },
    replyingBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 4,
        marginBottom: spacing.sm,
    },
    replyingText: {
        fontSize: 12,
        color: colors.textMuted,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    textInput: {
        flex: 1,
        minHeight: 36,
        maxHeight: 100,
        backgroundColor: colors.surface,
        borderRadius: 18,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
        marginHorizontal: spacing.md,
        color: colors.text,
        ...typography.body,
    },
    postBtn: {
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
    },
    postBtnText: {
        ...typography.body,
        fontWeight: "700",
        color: colors.primary,
    },
    postBtnDisabled: {
        color: colors.textMuted,
    },
});
