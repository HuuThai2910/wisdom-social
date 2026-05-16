import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppHeader } from "@/components";
import { colors, spacing } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import pageService, { type PageMemberData } from "@/services/pageService";
import { usePageEvents } from "@/hooks/usePageEvents";

export default function PagePendingRequestsScreen() {
    const router = useRouter();
    const { pageId } = useLocalSearchParams<{ pageId?: string }>();
    const { currentUser } = useAppContext();

    const numericPageId = Number(pageId ?? 0);
    const numericUserId = useMemo(() => {
        const id = Number(currentUser?.id);
        return Number.isFinite(id) && id > 0 ? id : null;
    }, [currentUser?.id]);

    const [requests, setRequests] = useState<PageMemberData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

    const load = useCallback(async () => {
        if (!numericPageId) return;
        try {
            const data = await pageService.getPendingJoinRequests(numericPageId);
            setRequests(data);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [numericPageId]);

    useEffect(() => {
        void load();
    }, [load]);

    // real-time: new requests arrive via WebSocket
    const wsRefresh = usePageEvents({ pageId: numericPageId || undefined });
    useEffect(() => {
        if (wsRefresh > 0) {
            const timer = setTimeout(() => {
                void load();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [wsRefresh, load]);

    const onRefresh = () => {
        setRefreshing(true);
        void load();
    };

    const setProcessing = (userId: number, value: boolean) => {
        setProcessingIds((prev) => {
            const next = new Set(prev);
            if (value) next.add(userId);
            else next.delete(userId);
            return next;
        });
    };

    const handleApprove = async (member: PageMemberData) => {
        const uid = member.user.id;
        setProcessing(uid, true);
        try {
            const ok = await pageService.approveJoinRequest(numericPageId, uid);
            if (ok) {
                setRequests((prev) => prev.filter((r) => r.user.id !== uid));
            } else {
                Alert.alert("Lỗi", "Không thể duyệt yêu cầu này.");
            }
        } finally {
            setProcessing(uid, false);
        }
    };

    const handleReject = (member: PageMemberData) => {
        const uid = member.user.id;
        Alert.alert("Từ chối", `Từ chối yêu cầu của ${member.user?.name ?? "người dùng này"}?`, [
            { text: "Hủy", style: "cancel" },
            {
                text: "Từ chối",
                style: "destructive",
                onPress: async () => {
                    setProcessing(uid, true);
                    try {
                        const ok = await pageService.rejectJoinRequest(numericPageId, uid);
                        if (ok) setRequests((prev) => prev.filter((r) => r.user.id !== uid));
                        else Alert.alert("Lỗi", "Không thể từ chối yêu cầu này.");
                    } finally {
                        setProcessing(uid, false);
                    }
                },
            },
        ]);
    };

    const handleApproveAll = () => {
        if (requests.length === 0) return;
        Alert.alert("Duyệt tất cả", `Duyệt ${requests.length} yêu cầu?`, [
            { text: "Hủy", style: "cancel" },
            {
                text: "Duyệt tất cả",
                onPress: async () => {
                    const results = await Promise.allSettled(
                        requests.map((r) => pageService.approveJoinRequest(numericPageId, r.user.id)),
                    );
                    const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value)).length;
                    void load();
                    if (failed > 0) Alert.alert("Thông báo", `${results.length - failed} duyệt thành công, ${failed} thất bại.`);
                },
            },
        ]);
    };

    const renderRequest = ({ item }: { item: PageMemberData }) => {
        const isProcessing = processingIds.has(item.user.id);
        return (
            <View style={styles.requestRow}>
                <View style={styles.avatarWrap}>
                    {item.user?.avatarUrl ? (
                        <Image source={{ uri: item.user.avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Ionicons name="person-outline" size={20} color={colors.textMuted} />
                        </View>
                    )}
                </View>

                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.user?.name ?? item.user?.username ?? "Người dùng"}</Text>
                    {!!item.user?.username && <Text style={styles.userUsername}>@{item.user.username}</Text>}
                    {!!item.joinedAt && (
                        <Text style={styles.requestDate}>
                            {new Date(item.joinedAt).toLocaleDateString("vi-VN")}
                        </Text>
                    )}
                </View>

                <View style={styles.btnGroup}>
                    <Pressable
                        style={[styles.btn, styles.approveBtn, isProcessing && styles.btnDisabled]}
                        onPress={() => handleApprove(item)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <Ionicons name="checkmark" size={18} color={colors.white} />
                        )}
                    </Pressable>
                    <Pressable
                        style={[styles.btn, styles.rejectBtn, isProcessing && styles.btnDisabled]}
                        onPress={() => handleReject(item)}
                        disabled={isProcessing}
                    >
                        <Ionicons name="close" size={18} color={colors.white} />
                    </Pressable>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title={`Yêu cầu tham gia (${requests.length})`}
                leftAction={{ icon: "arrow-back", onPress: () => router.back() }}
                rightActions={
                    requests.length > 0
                        ? [{ icon: "checkmark-done-outline", onPress: handleApproveAll }]
                        : []
                }
            />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={(item) => String(item.user.id)}
                    renderItem={renderRequest}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    contentContainerStyle={requests.length === 0 ? styles.emptyContainer : styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="person-add-outline" size={48} color={colors.border} />
                            <Text style={styles.emptyText}>Không có yêu cầu nào đang chờ</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    listContent: { paddingVertical: spacing.sm },
    emptyContainer: { flex: 1 },
    empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80, gap: spacing.md },
    emptyText: { color: colors.textMuted, fontSize: 15 },

    requestRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    avatarWrap: { marginRight: spacing.md },
    avatar: { width: 46, height: 46, borderRadius: 23 },
    avatarPlaceholder: { backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
    userInfo: { flex: 1 },
    userName: { fontSize: 14, fontWeight: "600", color: colors.text },
    userUsername: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    requestDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

    btnGroup: { flexDirection: "row", gap: spacing.sm },
    btn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
    },
    approveBtn: { backgroundColor: colors.success },
    rejectBtn: { backgroundColor: colors.danger },
    btnDisabled: { opacity: 0.5 },
});
