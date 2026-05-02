import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter, useSafeAreaInsets } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants";

export default function UserProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { userId } = useLocalSearchParams<{ userId?: string }>();
    const [selectedTab, setSelectedTab] = useState<"posts" | "tagged">("posts");
    const [isFollowing, setIsFollowing] = useState(false);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hồ sơ</Text>
                <TouchableOpacity style={styles.menuButton}>
                    <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Avatar Section */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
                            <Ionicons name="person" size={50} color={colors.primary} />
                        </View>
                        <View style={styles.onlineDot} />
                    </View>

                    <Text style={styles.name}>John Doe</Text>
                    <Text style={styles.username}>@johndoe</Text>
                    <Text style={styles.bio}>Yêu thích công nghệ và du lịch</Text>

                    {/* Stats */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>125</Text>
                            <Text style={styles.statLabel}>Bài viết</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>1.2K</Text>
                            <Text style={styles.statLabel}>Người theo dõi</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>450</Text>
                            <Text style={styles.statLabel}>Đang theo dõi</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                            onPress={() => setIsFollowing(!isFollowing)}
                        >
                            <Ionicons
                                name={isFollowing ? "checkmark" : "person-add"}
                                size={18}
                                color={isFollowing ? colors.primary : "#fff"}
                            />
                            <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                                {isFollowing ? "Đang theo dõi" : "Theo dõi"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.messageBtn}>
                            <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabs}>
                    <TouchableOpacity
                        style={[styles.tab, selectedTab === "posts" && styles.tabActive]}
                        onPress={() => setSelectedTab("posts")}
                    >
                        <Text style={[styles.tabText, selectedTab === "posts" && styles.tabTextActive]}>
                            Bài viết
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, selectedTab === "tagged" && styles.tabActive]}
                        onPress={() => setSelectedTab("tagged")}
                    >
                        <Text style={[styles.tabText, selectedTab === "tagged" && styles.tabTextActive]}>
                            Được gắn thẻ
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Empty State */}
                <View style={styles.emptyState}>
                    <Ionicons name="images-outline" size={60} color={colors.textMuted} />
                    <Text style={styles.emptyText}>Chưa có bài viết nào</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
    },
    menuButton: {
        padding: 8,
    },
    profileHeader: {
        alignItems: "center",
        paddingVertical: 24,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    avatarContainer: {
        position: "relative",
        marginBottom: 12,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: "center",
        justifyContent: "center",
    },
    onlineDot: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.success,
        borderWidth: 3,
        borderColor: colors.background,
    },
    name: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        marginTop: 8,
    },
    username: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: 2,
    },
    bio: {
        fontSize: 13,
        color: colors.text,
        marginTop: 8,
        textAlign: "center",
        lineHeight: 18,
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        width: "100%",
        marginTop: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    statItem: {
        alignItems: "center",
    },
    statNumber: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.text,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 4,
    },
    actionButtons: {
        flexDirection: "row",
        gap: 8,
        marginTop: 16,
        width: "100%",
    },
    followBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: colors.primary,
        paddingVertical: 10,
        borderRadius: 8,
    },
    followBtnActive: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    followBtnText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "600",
    },
    followBtnTextActive: {
        color: colors.primary,
    },
    messageBtn: {
        width: 45,
        height: 45,
        borderRadius: 8,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
    },
    tabs: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tab: {
        flex: 1,
        paddingVertical: 14,
        alignItems: "center",
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabActive: {
        borderBottomColor: colors.primary,
    },
    tabText: {
        fontSize: 13,
        fontWeight: "500",
        color: colors.textMuted,
    },
    tabTextActive: {
        color: colors.primary,
        fontWeight: "600",
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 80,
        paddingHorizontal: 16,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: 12,
    },
});
