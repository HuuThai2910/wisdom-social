import { AppHeader, EmptyState, PostCard, StoriesBar } from "@/components";
import { colors, spacing, typography } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View, Modal, Pressable, TouchableOpacity } from "react-native";

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
    const [showCreateModal, setShowCreateModal] = useState(false);

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
                leftActions={[
                    { icon: "flag-outline", onPress: () => router.push("/(tabs)/pages") },
                    { icon: "add", onPress: () => setShowCreateModal(true) },
                ]}
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

            <Modal transparent visible={showCreateModal} animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setShowCreateModal(false)}>
                    <Pressable style={styles.menuSheet}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.menuTitle}>Tạo mới</Text>

                        <TouchableOpacity style={styles.menuItem} onPress={() => { setShowCreateModal(false); router.push("/(stack)/create-post"); }}>
                            <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                            <Text style={styles.menuText}>Tạo bài viết mới</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => { setShowCreateModal(false); router.push("/(stack)/create-story"); }}>
                            <Ionicons name="camera-outline" size={24} color={colors.primary} />
                            <Text style={styles.menuText}>Tạo tin mới</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    emptyWrap: { paddingVertical: spacing.xxl },
    loginText: { color: colors.textMuted, textAlign: "center", padding: spacing.xl },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
    menuSheet: { backgroundColor: colors.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: spacing.lg, paddingBottom: spacing.xxl },
    sheetHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
    menuTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: spacing.md, textAlign: "center" },
    menuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    menuText: { color: colors.text, fontWeight: "600", fontSize: 15 },
});
