import React from "react";
import { FlatList, SafeAreaView, StyleSheet } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { AppHeader, EmptyState, MessageItem } from "@/components";
import { colors } from "@/constants";
import { useAppContext } from "@/context/AppContext";

export default function MessagesListScreen() {
  const router = useRouter();
  const segments = useSegments();
  const { conversations, currentUser, getUserById } = useAppContext();

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Messages"
        leftAction={
          segments[0] === "(stack)"
            ? { icon: "arrow-back", onPress: () => router.back() }
            : undefined
        }
      />

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState title="Chưa có cuộc hội thoại" description="Tin nhắn mới sẽ hiển thị ở đây." />
        }
        renderItem={({ item }) => {
          const otherId = item.participantIds.find((id) => id !== currentUser?.id);
          const otherUser = otherId ? getUserById(otherId) : undefined;
          if (!otherUser) return null;

          return (
            <MessageItem
              user={otherUser}
              preview={item.lastMessage}
              updatedAt={item.updatedAt}
              onPress={() =>
                router.push({
                  pathname: "/(stack)/messages/[conversationId]",
                  params: { conversationId: item.id },
                })
              }
            />
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
});
