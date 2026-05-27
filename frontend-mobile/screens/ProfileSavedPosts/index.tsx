import React from "react";
import { FlatList, SafeAreaView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { AppHeader, EmptyState, PostCard } from "@/components";
import { colors } from "@/constants";
import { useAppContext } from "@/context/AppContext";

export default function ProfileSavedPostsScreen() {
    const router = useRouter();
    const { posts, currentUser, savedPostIds, likedPostIds, savePost, likePost, addComment, getUserById, removePost, updatePostPrivacyLocal } = useAppContext();
    const savedPosts = posts.filter((item) => savedPostIds.includes(item.id) || item.isSaved);

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader title="Saved Posts" leftAction={{ icon: "arrow-back", onPress: () => router.back() }} />
            <FlatList
                data={savedPosts}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={<EmptyState title="Bạn chưa lưu bài viết nào" />}
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
});
