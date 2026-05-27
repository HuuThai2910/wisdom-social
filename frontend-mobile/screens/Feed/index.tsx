import { AppHeader, EmptyState, PostCard, StoriesBar } from "@/components";
import { colors, spacing } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function FeedScreen() {
    const router = useRouter();
    const {
        posts,
        currentUser,
        upsertUsers,
        loggedIn,
        likedPostIds,
        savedPostIds,
        likePost,
        savePost,
        addComment,
        getUserById,
        refreshPosts,
        removePost,
        updatePostPrivacyLocal,
    } = useAppContext();
    const [refreshing, setRefreshing] = useState(false);

    const sortedPosts = useMemo(
        () =>
            [...posts].sort((a, b) => {
                const da = new Date(a.rankingTime || a.createdAt).getTime();
                const db = new Date(b.rankingTime || b.createdAt).getTime();
                if (Number.isNaN(da) || Number.isNaN(db)) return 0;
                return db - da;
            }),
        [posts],
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refreshPosts();
        } finally {
            setRefreshing(false);
        }
    }, [refreshPosts]);

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title="Wisdom Social"
                leftAction={{ icon: "flag-outline", onPress: () => router.push("/(tabs)/pages") }}
                rightActions={[
                    { icon: "scan-outline", onPress: () => router.push("/(stack)/qr-scanner") },
                    { icon: "notifications-outline", onPress: () => router.push("/(stack)/notifications") },
                    { icon: "heart-outline", onPress: () => router.push("/(stack)/likes") },
                ]}
            />

            <FlatList
                data={sortedPosts}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={<StoriesBar currentUser={currentUser} onUsersLoaded={upsertUsers} />}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        {refreshing ? (
                            <ActivityIndicator color={colors.primary} />
                        ) : loggedIn ? (
                            <EmptyState title="Chưa có bài viết" description="Hãy theo dõi bạn bè hoặc tạo bài viết mới để xem bảng tin." />
                        ) : (
                            <Text style={styles.loginText}>Vui lòng đăng nhập để xem bài viết</Text>
                        )}
                    </View>
                }
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                renderItem={({ item }) => (
                    <PostCard
                        post={item}
                        author={item.user || getUserById(item.userId)}
                        currentUserId={currentUser?.id}
                        liked={likedPostIds.includes(item.id) || item.isLiked}
                        saved={savedPostIds.includes(item.id) || item.isSaved}
                        onLike={() => void likePost(item.id)}
                        onSave={() => void savePost(item.id)}
                        onAddComment={(content) => void addComment(item.id, content)}
                        onDeleted={removePost}
                        onPrivacyChanged={updatePostPrivacyLocal}
                        onOpenPost={(postId) => router.push({ pathname: "/(stack)/post/[postId]" as any, params: { postId } })}
                    />
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    emptyWrap: { paddingVertical: spacing.xxl },
    loginText: { color: colors.textMuted, textAlign: "center", padding: spacing.xl },
});
