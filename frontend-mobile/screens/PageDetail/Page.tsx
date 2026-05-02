import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@/constants";

export default function PageDetailScreen() {
    const router = useRouter();
    const { pageId } = useLocalSearchParams();
    const [activeTab, setActiveTab] = useState<"info" | "members" | "posts">("info");

    return (
        <SafeAreaView>
            <View style={[styles.container]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Chi tiết trang</Text>
                    <TouchableOpacity style={styles.menuButton}>
                        <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Cover */}
                    <View style={[styles.cover, { backgroundColor: colors.primary }]}>
                        <Ionicons name="image" size={60} color="rgba(255,255,255,0.3)" />
                    </View>

                    {/* Page Info */}
                    <View style={styles.infoSection}>
                        <View style={styles.avatarRow}>
                            <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
                                <Ionicons name="storefront" size={40} color={colors.primary} />
                            </View>

                            <View style={styles.actionButtons}>
                                <TouchableOpacity style={styles.followBtn}>
                                    <Ionicons name="person-add" size={18} color="#fff" />
                                    <Text style={styles.followBtnText}>Theo dõi</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.messageBtn}>
                                    <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={styles.pageName}>Tech News</Text>
                        <Text style={styles.pageUsername}>@technews</Text>
                        <Text style={styles.category}>Công nghệ</Text>

                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>125</Text>
                                <Text style={styles.statLabel}>Bài viết</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>1.2K</Text>
                                <Text style={styles.statLabel}>Theo dõi</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>450</Text>
                                <Text style={styles.statLabel}>Thành viên</Text>
                            </View>
                        </View>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabs}>
                        {["info", "posts", "members"].map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tab, activeTab === tab && styles.tabActive]}
                                onPress={() => setActiveTab(tab as any)}
                            >
                                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                    {tab === "info" ? "Thông tin" : tab === "posts" ? "Bài viết" : "Thành viên"}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {activeTab === "info" && (
                            <View>
                                <Text style={styles.description}>
                                    Cập nhật tin tức công nghệ hàng ngày
                                </Text>

                                <View style={styles.infoBox}>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="mail-outline" size={18} color={colors.primary} />
                                        <Text style={styles.infoText}>contact@technews.com</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="call-outline" size={18} color={colors.primary} />
                                        <Text style={styles.infoText}>+84 123 456 789</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="globe-outline" size={18} color={colors.primary} />
                                        <Text style={styles.infoText}>www.technews.com</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {activeTab === "posts" && (
                            <View style={styles.emptyState}>
                                <Ionicons name="document-text-outline" size={50} color={colors.textMuted} />
                                <Text style={styles.emptyText}>Chưa có bài viết</Text>
                            </View>
                        )}

                        {activeTab === "members" && (
                            <View style={styles.emptyState}>
                                <Ionicons name="people-outline" size={50} color={colors.textMuted} />
                                <Text style={styles.emptyText}>Chưa có thành viên</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
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
    cover: {
        height: 120,
        justifyContent: "center",
        alignItems: "center",
    },
    infoSection: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    avatarRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: colors.background,
        marginTop: -40,
    },
    actionButtons: {
        flexDirection: "row",
        gap: 8,
    },
    followBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    followBtnText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "600",
    },
    messageBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    pageName: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 2,
    },
    pageUsername: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: 4,
    },
    category: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: "600",
        marginBottom: 12,
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
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
        marginTop: 2,
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
    content: {
        padding: 16,
    },
    description: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
        marginBottom: 16,
    },
    infoBox: {
        gap: 12,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 8,
    },
    infoText: {
        fontSize: 13,
        color: colors.text,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: 12,
    },
});
