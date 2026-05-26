import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppHeader, EmptyState, PostCard, CommentsSection } from "@/components";
import { colors, spacing } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import { fetchPostWithAuthor } from "@/services/postService";
import { Post } from "@/types";

export default function PostDetailScreen() {
    const router = useRouter();
    const { postId } = useLocalSearchParams<{ postId: string }>();
    const {
        posts,
        currentUser,
        likedPostIds,
        savedPostIds,
        likePost,
        savePost,
        getUserById,
        removePost,
        updatePostPrivacyLocal,
    } = useAppContext();
    const [remotePost, setRemotePost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const localPost = posts.find((item) => item.id === postId);
    const post = localPost || remotePost;

    useEffect(() => {
        let mounted = true;
        const loadPost = async () => {
            if (!postId || localPost) return;
            setLoading(true);
            setError(null);
            try {
                const fetched = await fetchPostWithAuthor(postId);
                if (mounted) setRemotePost(fetched);
            } catch (err: any) {
                if (mounted) setError(err?.response?.data?.message || "Không thể tải bài viết");
            } finally {
                if (mounted) setLoading(false);
            }
        };
        void loadPost();
        return () => {
            mounted = false;
        };
    }, [localPost, postId]);

    const postHeader = post ? (
        <PostCard
            post={post}
            author={post.user || getUserById(post.userId)}
            currentUserId={currentUser?.id}
            liked={likedPostIds.includes(post.id) || post.isLiked}
            saved={savedPostIds.includes(post.id) || post.isSaved}
            onLike={() => void likePost(post.id)}
            onSave={() => void savePost(post.id)}
            hideCommentInput={true}
            onDeleted={(id) => {
                removePost(id);
                router.back();
            }}
            onPrivacyChanged={updatePostPrivacyLocal}
        />
    ) : undefined;

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader title="Bài viết" leftAction={{ icon: "arrow-back", onPress: () => router.back() }} />
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.mutedText}>Đang tải bài viết...</Text>
                </View>
            ) : error || !post ? (
                <EmptyState title={error || "Không tìm thấy bài viết"} />
            ) : (
                <CommentsSection
                    postId={post.id}
                    postAuthorId={post.userId}
                    HeaderComponent={postHeader}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
    mutedText: { marginTop: spacing.sm, color: colors.textMuted },
});
