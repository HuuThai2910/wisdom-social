import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from "@/constants";

interface PageItem {
    id: number;
    name: string;
    username: string;
    avatar?: string;
    description?: string;
    followCount: number;
    memberCount: number;
}

const MOCK_PAGES: PageItem[] = [
    {
        id: 1,
        name: "Tech News",
        username: "technews",
        description: "Công nghệ hàng ngày",
        followCount: 1250,
        memberCount: 450,
    },
    {
        id: 2,
        name: "Food Lovers",
        username: "foodlovers",
        description: "Chia sẻ công thức nấu ăn",
        followCount: 980,
        memberCount: 320,
    },
    {
        id: 3,
        name: "Travel Tips",
        username: "traveltips",
        description: "Du lịch khám phá thế giới",
        followCount: 2100,
        memberCount: 750,
    },
];

export default function PagesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<"discover" | "my-pages">("discover");
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };

    const displayPages = activeTab === "discover" ? MOCK_PAGES : MOCK_PAGES.slice(0, 2);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Trang</Text>
                <TouchableOpacity onPress={() => router.push("/(stack)/create-page")} style={styles.createButton}>
                    <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "discover" && styles.tabActive]}
                    onPress={() => setActiveTab("discover")}
                >
                    <Text style={[styles.tabText, activeTab === "discover" && styles.tabTextActive]}>
                        Khám phá
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === "my-pages" && styles.tabActive]}
                    onPress={() => setActiveTab("my-pages")}
                >
                    <Text style={[styles.tabText, activeTab === "my-pages" && styles.tabTextActive]}>
                        Trang của tôi
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={displayPages}
                keyExtractor={(item) => String(item.id)}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.pageCard}
                        onPress={() =>
                            router.push({
                                pathname: "/(stack)/page-detail",
                                params: { pageId: String(item.id) },
                            })
                        }
                    >
                        <View style={styles.avatar}>
                            <Ionicons name="storefront" size={32} color={colors.primary} />
                        </View>

                        <View style={styles.pageInfo}>
                            <Text style={styles.pageName}>{item.name}</Text>
                            <Text style={styles.pageUsername}>@{item.username}</Text>
                            {item.description && (
                                <Text style={styles.pageDesc} numberOfLines={1}>
                                    {item.description}
                                </Text>
                            )}
                            <View style={styles.statsRow}>
                                <Text style={styles.statText}>👥 {item.memberCount}</Text>
                                <Text style={styles.statText}>🔔 {item.followCount}</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.followBtn}>
                            <Ionicons name="add-outline" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </TouchableOpacity>
                )}
                scrollEnabled={true}
            />
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
    createButton: {
        padding: 8,
    },
    tabs: {
        flexDirection: "row",
        backgroundColor: colors.background,
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
        fontSize: 14,
        fontWeight: "500",
        color: colors.textMuted,
    },
    tabTextActive: {
        color: colors.primary,
        fontWeight: "600",
    },
    pageCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.surface,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    pageInfo: {
        flex: 1,
    },
    pageName: {
        fontSize: 15,
        fontWeight: "600",
        color: colors.text,
    },
    pageUsername: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 2,
    },
    pageDesc: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 4,
    },
    statsRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 4,
    },
    statText: {
        fontSize: 11,
        color: colors.textMuted,
    },
    followBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.surface,
    },
});
