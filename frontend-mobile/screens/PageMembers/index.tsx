import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActionSheetIOS,
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Platform,
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
import pageService, { type PageMemberData, type PageRole } from "@/services/pageService";
import { usePageEvents } from "@/hooks/usePageEvents";

const ROLE_LABELS: Record<PageRole, string> = {
    ADMIN: "Admin",
    MODERATOR: "Mod",
    USER: "Thành viên",
};

const ROLE_COLORS: Record<PageRole, string> = {
    ADMIN: colors.danger,
    MODERATOR: colors.primary,
    USER: colors.textMuted,
};

export default function PageMembersScreen() {
    const router = useRouter();
    const { pageId } = useLocalSearchParams<{ pageId?: string }>();
    const { currentUser } = useAppContext();

    const numericPageId = Number(pageId ?? 0);
    const numericUserId = useMemo(() => {
        const id = Number(currentUser?.id);
        return Number.isFinite(id) && id > 0 ? id : null;
    }, [currentUser?.id]);

    const [members, setMembers] = useState<PageMemberData[]>([]);
    const [myRole, setMyRole] = useState<PageRole>("USER");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const isAdmin = myRole === "ADMIN";
    const canManage = myRole === "ADMIN" || myRole === "MODERATOR";

    const load = useCallback(async () => {
        if (!numericPageId) return;
        try {
            const data = await pageService.getPageMembers(numericPageId);
            setMembers(data);
            if (numericUserId) {
                const me = data.find((m) => m.user?.id === numericUserId);
                if (me) setMyRole(me.role);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [numericPageId, numericUserId]);

    useEffect(() => {
        void load();
    }, [load]);

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

    // ── Member actions ─────────────────────────────────────────────────────

    const handleRemove = (member: PageMemberData) => {
        Alert.alert("Xóa thành viên", `Xóa ${member.user?.name ?? "người dùng này"} khỏi trang?`, [
            { text: "Hủy", style: "cancel" },
            {
                text: "Xóa",
                style: "destructive",
                onPress: async () => {
                    const ok = await pageService.removeMember(numericPageId, member.user.id);
                    if (ok) setMembers((prev) => prev.filter((m) => m.user.id !== member.user.id));
                },
            },
        ]);
    };

    const handleBlock = (member: PageMemberData) => {
        Alert.alert("Chặn thành viên", `Chặn ${member.user?.name ?? "người dùng này"}?`, [
            { text: "Hủy", style: "cancel" },
            {
                text: "Chặn",
                style: "destructive",
                onPress: async () => {
                    const ok = await pageService.blockMember(numericPageId, member.user.id);
                    if (ok) setMembers((prev) => prev.filter((m) => m.user.id !== member.user.id));
                },
            },
        ]);
    };

    const handleChangeRole = (member: PageMemberData) => {
        const roles: PageRole[] = ["USER", "MODERATOR", "ADMIN"];
        const options = [...roles.map((r) => ROLE_LABELS[r]), "Hủy"];

        if (Platform.OS === "ios") {
            ActionSheetIOS.showActionSheetWithOptions(
                { options, cancelButtonIndex: options.length - 1, title: "Thay đổi vai trò" },
                async (index) => {
                    if (index < roles.length) {
                        await pageService.authorizeMember(member.user.id, numericPageId, roles[index]);
                        void load();
                    }
                },
            );
        } else {
            Alert.alert(
                "Thay đổi vai trò",
                undefined,
                [
                    ...roles.map((role) => ({
                        text: ROLE_LABELS[role],
                        onPress: async () => {
                            await pageService.authorizeMember(member.user.id, numericPageId, role);
                            void load();
                        },
                    })),
                    { text: "Hủy", style: "cancel" },
                ],
            );
        }
    };

    const openMemberActions = (member: PageMemberData) => {
        if (!canManage || member.user.id === numericUserId) return;
        // Mods cannot manage admins
        if (!isAdmin && member.role === "ADMIN") return;

        const actions: { label: string; action: () => void; danger?: boolean }[] = [
            ...(isAdmin ? [{ label: "Thay đổi vai trò", action: () => handleChangeRole(member) }] : []),
            { label: "Xóa khỏi trang", action: () => handleRemove(member), danger: true },
            { label: "Chặn", action: () => handleBlock(member), danger: true },
        ];

        const options = [...actions.map((a) => a.label), "Hủy"];

        if (Platform.OS === "ios") {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: options.length - 1,
                    destructiveButtonIndex: actions.reduce<number[]>((acc, a, i) => (a.danger ? [...acc, i] : acc), []),
                },
                (index) => {
                    if (index < actions.length) actions[index].action();
                },
            );
        } else {
            Alert.alert(
                member.user?.name ?? "Thành viên",
                undefined,
                [
                    ...actions.map((a) => ({ text: a.label, onPress: a.action, style: a.danger ? ("destructive" as const) : ("default" as const) })),
                    { text: "Hủy", style: "cancel" },
                ],
            );
        }
    };

    const renderMember = ({ item }: { item: PageMemberData }) => {
        const isMe = item.user.id === numericUserId;
        return (
            <Pressable
                style={styles.memberRow}
                onLongPress={() => openMemberActions(item)}
                onPress={() => canManage && !isMe ? openMemberActions(item) : undefined}
            >
                <View style={styles.avatarWrap}>
                    {item.user?.avatarUrl ? (
                        <Image source={{ uri: item.user.avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Ionicons name="person-outline" size={20} color={colors.textMuted} />
                        </View>
                    )}
                </View>
                <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.user?.name ?? item.user?.username ?? "Người dùng"}</Text>
                    {!!item.user?.username && <Text style={styles.memberUsername}>@{item.user.username}</Text>}
                </View>
                <View style={[styles.roleBadge, { borderColor: ROLE_COLORS[item.role] }]}>
                    <Text style={[styles.roleText, { color: ROLE_COLORS[item.role] }]}>{ROLE_LABELS[item.role]}</Text>
                </View>
                {canManage && !isMe && item.role !== "ADMIN" && (
                    <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} style={styles.moreIcon} />
                )}
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title={`Thành viên (${members.length})`}
                leftAction={{ icon: "arrow-back", onPress: () => router.back() }}
            />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={members}
                    keyExtractor={(item) => String(item.user.id)}
                    renderItem={renderMember}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    contentContainerStyle={members.length === 0 ? styles.emptyContainer : styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="people-outline" size={48} color={colors.border} />
                            <Text style={styles.emptyText}>Chưa có thành viên nào</Text>
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

    memberRow: {
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
    memberInfo: { flex: 1 },
    memberName: { fontSize: 14, fontWeight: "600", color: colors.text },
    memberUsername: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    roleBadge: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
    },
    roleText: { fontSize: 11, fontWeight: "600" },
    moreIcon: { marginLeft: spacing.sm },
});
