import React from "react";
import { FlatList, SafeAreaView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { AppHeader, EmptyState, PostCard } from "@/components";
import { colors } from "@/constants";
import { useAppContext } from "@/context/AppContext";

export default function InstagramLikesScreen() {
  const router = useRouter();
  const {
    posts,
    currentUser,
    likedPostIds,
    savedPostIds,
    likePost,
    savePost,
    addComment,
    getUserById,
    removePost,
    updatePostPrivacyLocal,
  } = useAppContext();
  const likedPosts = posts.filter(
    (post) => likedPostIds.includes(post.id) || post.isLiked
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Liked Posts"
        leftAction={{ icon: "arrow-back", onPress: () => router.back() }}
      />
      <FlatList
        data={likedPosts}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState title="Bạn chưa like bài nào" />}
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
            onOpenPost={(postId) =>
              router.push({
                pathname: "/(stack)/post/[postId]" as any,
                params: { postId },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
});
