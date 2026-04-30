import React, { useMemo, useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import {
    AppHeader,
    EmptyState,
    PostGrid,
    ProfileHeader,
    ProfileTabSwitcher,
} from "@/components";
import { colors } from "@/constants";
import { useAppContext } from "@/context/AppContext";

export default function InstagramProfileScreen() {
    const router = useRouter();
    const { currentUser, posts, savedPostIds } = useAppContext();
    const [tab, setTab] = useState<"posts" | "saved">("posts");

    const myPosts = useMemo(
        () => posts.filter((post) => post.userId === currentUser?.id),
        [posts, currentUser?.id],
    );
    const savedPosts = useMemo(
        () => posts.filter((post) => savedPostIds.includes(post.id)),
        [posts, savedPostIds],
    );

    if (!currentUser) {
        return (
            <SafeAreaView style={styles.container}>
                <EmptyState title="Bạn chưa đăng nhập" />
            </SafeAreaView>
        );
    }

    const gridData = tab === "posts" ? myPosts : savedPosts;

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title={currentUser.username}
                rightActions={[
                    {
                        icon: "menu-outline",
                        onPress: () => router.push("/(stack)/profile/menu"),
                    },
                ]}
            />

            <ScrollView showsVerticalScrollIndicator={false}>
                <ProfileHeader
                    user={currentUser}
                    stats={{
                        posts: myPosts.length,
                        followers: currentUser.followers,
                        following: currentUser.following,
                    }}
                    onEditProfile={() => router.push("/(stack)/profile/edit")}
                />

                <ProfileTabSwitcher value={tab} onChange={setTab} />

                {gridData.length === 0 ? (
                    <EmptyState
                        title="Chưa có nội dung"
                        description={tab === "posts" ? "Hãy đăng bài đầu tiên" : "Hãy lưu bài viết"}
                    />
                ) : (
                    <PostGrid posts={gridData} />
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
});
