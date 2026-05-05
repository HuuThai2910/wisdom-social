import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import userService from "@/services/userService";
import pageService from "@/services/pageService";
import type { User } from "@/services/userService";
import type { PageData } from "@/services/pageService";

type SearchItem =
    | { kind: "user"; data: User }
    | { kind: "page"; data: PageData };

const S3_BASE = "https://cnmt-hk1-amz.s3.ap-southeast-1.amazonaws.com/";

const toImageUrl = (url?: string): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith("http") || url.startsWith("file://") || url.startsWith("content://")) return url;
    return S3_BASE + url;
};

const buildMixedList = (users: User[], pages: PageData[]): SearchItem[] => {
    const items: SearchItem[] = [];
    const maxLen = Math.max(users.length, pages.length);
    for (let i = 0; i < maxLen; i++) {
        if (i < users.length) items.push({ kind: "user", data: users[i] });
        if (i < pages.length) items.push({ kind: "page", data: pages[i] });
    }
    return items;
};

export default function InstagramSearchScreen() {
    const router = useRouter();
    const { currentUser } = useAppContext();

    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allPages, setAllPages] = useState<PageData[]>([]);
    const [results, setResults] = useState<SearchItem[]>([]);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadData = useCallback(async () => {
        const userId = currentUser?.id;
        if (!userId) return;
        setIsLoading(true);
        try {
            const [users, pages] = await Promise.all([
                userService.getUsersForUser(userId),
                pageService.getAllPages(),
            ]);
            const filtered = users.filter((u) => String(u.id) !== String(userId));
            setAllUsers(filtered);
            setAllPages(pages);
            setResults(buildMixedList(filtered, pages));
        } catch {
        } finally {
            setIsLoading(false);
        }
    }, [currentUser?.id]);

    useEffect(() => { void loadData(); }, [loadData]);

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            const q = text.trim().toLowerCase();
            if (!q) {
                setResults(buildMixedList(allUsers, allPages));
                return;
            }
            const matchedUsers = allUsers.filter(
                (u) =>
                    (u.name && u.name.toLowerCase().includes(q)) ||
                    (u.username && u.username.toLowerCase().includes(q)) ||
                    (u.phone && u.phone.includes(q))
            );
            const matchedPages = allPages.filter(
                (p) =>
                    (p.name && p.name.toLowerCase().includes(q)) ||
                    (p.username && p.username?.toLowerCase().includes(q)) ||
                    (p.category && p.category.toLowerCase().includes(q))
            );
            setResults(buildMixedList(matchedUsers, matchedPages));
        }, 250);
    };

    const renderItem = ({ item }: { item: SearchItem }) => {
        if (item.kind === "user") {
            const u = item.data;
            return (
                <TouchableOpacity
                    style={styles.rowCard}
                    activeOpacity={0.7}
                    onPress={() => router.push({ pathname: "/(stack)/user-profile", params: { userId: u.id } })}
                >
                    {u.avatarUrl ? (
                        <Image source={{ uri: toImageUrl(u.avatarUrl) }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarFallback}>
                            <Ionicons name="person" size={24} color={colors.textMuted} />
                        </View>
                    )}
                    <View style={styles.rowInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.nameText} numberOfLines={1}>
                                {u.name || u.fullName || u.username || u.phone}
                            </Text>
                        </View>
                        {u.username && <Text style={styles.usernameText}>@{u.username}</Text>}
                        {u.bio ? (
                            <Text style={styles.subText} numberOfLines={1}>{u.bio}</Text>
                        ) : null}
                    </View>
                    <View style={styles.kindBadge}>
                        <Ionicons name="person" size={13} color={colors.textMuted} />
                    </View>
                </TouchableOpacity>
            );
        }

        const p = item.data;
        return (
            <TouchableOpacity
                style={styles.rowCard}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: "/(stack)/page-detail", params: { pageId: String(p.id) } })}
            >
                {p.avatarUrl ? (
                    <Image source={{ uri: toImageUrl(p.avatarUrl) }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarFallback}>
                        <Ionicons name="flag" size={24} color={colors.textMuted} />
                    </View>
                )}
                <View style={styles.rowInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.nameText} numberOfLines={1}>{p.name}</Text>
                        {p.isVerified && (
                            <Ionicons name="checkmark-circle" size={14} color="#3B82F6" style={{ marginLeft: 4 }} />
                        )}
                    </View>
                    {p.username && <Text style={styles.usernameText}>@{p.username}</Text>}
                    {p.category && (
                        <View style={styles.categoryChip}>
                            <Text style={styles.categoryText}>{p.category}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.kindBadge}>
                    <Ionicons name="flag" size={13} color={colors.textMuted} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color={colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm người dùng, trang..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoCapitalize="none"
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch("")} hitSlop={8}>
                        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {!isLoading && results.length > 0 && (
                <Text style={styles.resultCount}>
                    {results.length} kết quả{searchQuery ? ` cho "${searchQuery}"` : ""}
                </Text>
            )}

            {isLoading ? (
                <View style={styles.centerWrap}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Đang tải...</Text>
                </View>
            ) : results.length === 0 ? (
                <View style={styles.centerWrap}>
                    <View style={styles.emptyCircle}>
                        <Ionicons
                            name={searchQuery ? "search-outline" : "people-outline"}
                            size={40}
                            color={colors.textMuted}
                        />
                    </View>
                    <Text style={styles.emptyTitle}>
                        {searchQuery ? "Không tìm thấy kết quả" : "Chưa có dữ liệu"}
                    </Text>
                    {searchQuery ? (
                        <Text style={styles.emptySub}>Thử từ khóa khác</Text>
                    ) : null}
                </View>
            ) : (
                <FlatList
                    data={results}
                    renderItem={renderItem}
                    keyExtractor={(item, idx) => `${item.kind}-${item.data.id}-${idx}`}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },

    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginHorizontal: 14,
        marginTop: 10,
        marginBottom: 4,
        backgroundColor: colors.surface,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
        paddingVertical: 0,
    },

    resultCount: {
        fontSize: 13,
        color: colors.textMuted,
        fontWeight: "500",
        marginHorizontal: 18,
        marginTop: 8,
        marginBottom: 2,
    },

    listContent: { padding: 14, paddingBottom: 40 },
    rowCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.white,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    avatarFallback: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    rowInfo: { flex: 1, marginLeft: 12 },
    nameRow: { flexDirection: "row", alignItems: "center" },
    nameText: { fontSize: 15, fontWeight: "600", color: colors.text, flex: 1 },
    usernameText: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    subText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    categoryChip: {
        alignSelf: "flex-start",
        backgroundColor: colors.primary + "15",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: 4,
    },
    categoryText: { fontSize: 11, color: colors.primary, fontWeight: "500" },
    kindBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
    },

    centerWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
    loadingText: { fontSize: 14, color: colors.textMuted },
    emptyCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.textMuted },
    emptySub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
