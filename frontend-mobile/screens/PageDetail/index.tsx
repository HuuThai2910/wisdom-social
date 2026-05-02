import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Image,
    Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import pageService from "@/services/pageService";
import { usePageEvents } from "@/hooks/usePageEvents";
import AppHeader from "@/components/AppHeader";
import type {
    PageData,
    PageRole,
    PageInteractionStatus,
    MemberStatus,
} from "@/services/pageService";

interface AdminAction {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    danger?: boolean;
}

export default function PageDetailScreen() {
    const router = useRouter();
    const { pageId } = useLocalSearchParams<{ pageId?: string }>();
    const { currentUser } = useAppContext();

    const numericUserId = useMemo(() => {
        const id = Number(currentUser?.id);
        return Number.isFinite(id) && id > 0 ? id : null;
    }, [currentUser?.id]);

    const numericPageId = Number(pageId ?? 0);

    const [page, setPage] = useState<PageData | null>(null);
    const [interaction, setInteraction] = useState<PageInteractionStatus>({
        isLiked: false,
        isFollowing: false,
        likeCount: 0,
        followCount: 0,
    });
    const [memberStatus, setMemberStatus] = useState<MemberStatus | null>(null);
    const [memberCount, setMemberCount] = useState(0);
    const [userRole, setUserRole] = useState<PageRole | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const isAdmin = userRole === "ADMIN";
    const isMod = userRole === "MODERATOR";
    const canManage = isAdmin || isMod;

    const load = useCallback(async () => {
        if (!numericPageId) return;
        try {
            const [pageData, interactionData, count] = await Promise.all([
                pageService.findPageById(numericPageId),
                pageService.getPageInteractionStatus(numericPageId),
                pageService.getMemberCount(numericPageId),
            ]);
            setPage(pageData);
            setInteraction(interactionData);
            setMemberCount(count);

            if (numericUserId) {
                const status = await pageService.getMemberStatus(numericPageId, numericUserId);
                setMemberStatus(status);

                if (status === "ACTIVE") {
                    const members = await pageService.getPageMembers(numericPageId);
                    const me = members.find((m) => m.user?.id === numericUserId);
                    setUserRole(me?.role ?? "USER");
                }
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [numericPageId, numericUserId]);

    useEffect(() => {
        void load();
    }, [load]);

    // real-time: refresh when any page member event arrives
    const wsRefresh = usePageEvents({
        pageId: numericPageId || undefined,
        userId: numericUserId ?? undefined,
    });

    useEffect(() => {
        if (wsRefresh > 0) void load();
    }, [wsRefresh, load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        void load();
    }, [load]);

    // ── Like / Follow ──────────────────────────────────────────────────────

    const toggleLike = async () => {
        if (!numericUserId || !numericPageId) return;
        setActionLoading(true);
        try {
            if (interaction.isLiked) {
                await pageService.cancelLikePage(numericUserId, numericPageId);
            } else {
                await pageService.likePage(numericUserId, numericPageId);
            }
            const updated = await pageService.getPageInteractionStatus(numericPageId);
            setInteraction(updated);
        } finally {
            setActionLoading(false);
        }
    };

    const toggleFollow = async () => {
        if (!numericUserId || !numericPageId) return;
        setActionLoading(true);
        try {
            if (interaction.isFollowing) {
                await pageService.cancelFollowPage(numericUserId, numericPageId);
            } else {
                await pageService.followPage(numericUserId, numericPageId);
            }
            const updated = await pageService.getPageInteractionStatus(numericPageId);
            setInteraction(updated);
        } finally {
            setActionLoading(false);
        }
    };

    // ── Join / Leave ───────────────────────────────────────────────────────

    const handleJoin = async () => {
        if (!numericUserId || !numericPageId) return;
        setActionLoading(true);
        try {
            await pageService.requestJoinPage(numericUserId, numericPageId);
            const status = await pageService.getMemberStatus(numericPageId, numericUserId);
            setMemberStatus(status);
            if (status === "ACTIVE") setMemberCount((c) => c + 1);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelRequest = async () => {
        if (!numericUserId || !numericPageId) return;
        setActionLoading(true);
        try {
            await pageService.cancelJoinRequest(numericPageId, numericUserId);
            setMemberStatus(null);
        } finally {
            setActionLoading(false);
        }
    };

    const handleLeave = () => {
        if (!numericUserId || !numericPageId) return;
        Alert.alert("Rời khỏi trang", "Bạn có chắc muốn rời khỏi trang này?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Rời",
                style: "destructive",
                onPress: async () => {
                    setActionLoading(true);
                    try {
                        await pageService.removeMember(numericPageId, numericUserId);
                        setMemberStatus(null);
                        setUserRole(null);
                        setMemberCount((c) => Math.max(0, c - 1));
                    } finally {
                        setActionLoading(false);
                    }
                },
            },
        ]);
    };

    // ── Render helpers ─────────────────────────────────────────────────────

    const renderJoinButton = () => {
        if (!numericUserId) return null;

        if (memberStatus === "ACTIVE") {
            return (
                <Pressable style={[styles.actionBtn, styles.memberBtn]} onPress={handleLeave} disabled={actionLoading}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={[styles.actionBtnText, { color: colors.success }]}>Thành viên</Text>
                </Pressable>
            );
        }

        if (memberStatus === "PENDING") {
            return (
                <Pressable style={[styles.actionBtn, styles.pendingBtn]} onPress={handleCancelRequest} disabled={actionLoading}>
                    <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                    <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>Đang chờ duyệt</Text>
                </Pressable>
            );
        }

        return (
            <Pressable style={[styles.actionBtn, styles.joinBtn]} onPress={handleJoin} disabled={actionLoading}>
                <Ionicons name="person-add-outline" size={16} color={colors.white} />
                <Text style={[styles.actionBtnText, { color: colors.white }]}>Tham gia</Text>
            </Pressable>
        );
    };

    const adminActions: AdminAction[] = canManage
        ? [
              {
                  label: "Quản lý thành viên",
                  icon: "people-outline",
                  onPress: () =>
                      router.push({
                          pathname: "/(stack)/page-members",
                          params: { pageId: String(numericPageId) },
                      }),
              },
              ...(isAdmin
                  ? [
                        {
                            label: "Yêu cầu tham gia",
                            icon: "person-add-outline" as keyof typeof Ionicons.glyphMap,
                            onPress: () =>
                                router.push({
                                    pathname: "/(stack)/page-pending-requests",
                                    params: { pageId: String(numericPageId) },
                                }),
                        },
                    ]
                  : []),
          ]
        : [];

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <AppHeader title="Chi tiết trang" leftAction={{ icon: "arrow-back", onPress: () => router.back() }} />
                <View style={styles.center}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title={page?.name ?? "Chi tiết trang"}
                leftAction={{ icon: "arrow-back", onPress: () => router.back() }}
            />

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Cover */}
                {page?.coverUrl ? (
                    <Image source={{ uri: page.coverUrl }} style={styles.cover} resizeMode="cover" />
                ) : (
                    <View style={[styles.cover, styles.coverPlaceholder]}>
                        <Ionicons name="image-outline" size={40} color={colors.border} />
                    </View>
                )}

                {/* Avatar + Name */}
                <View style={styles.profileRow}>
                    <View style={styles.avatarWrap}>
                        {page?.avatarUrl ? (
                            <Image source={{ uri: page.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Ionicons name="business-outline" size={28} color={colors.textMuted} />
                            </View>
                        )}
                    </View>
                    <View style={styles.nameBlock}>
                        <Text style={styles.pageName}>{page?.name}</Text>
                        {!!page?.username && <Text style={styles.pageUsername}>@{page.username}</Text>}
                        {!!page?.category && <Text style={styles.pageMeta}>{page.category}</Text>}
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{memberCount}</Text>
                        <Text style={styles.statLabel}>Thành viên</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{interaction.likeCount}</Text>
                        <Text style={styles.statLabel}>Thích</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{interaction.followCount}</Text>
                        <Text style={styles.statLabel}>Theo dõi</Text>
                    </View>
                </View>

                {/* Action buttons */}
                <View style={styles.actionsRow}>
                    {renderJoinButton()}

                    <Pressable
                        style={[styles.actionBtn, interaction.isLiked ? styles.activeBtn : styles.outlineBtn]}
                        onPress={toggleLike}
                        disabled={actionLoading}
                    >
                        <Ionicons
                            name={interaction.isLiked ? "heart" : "heart-outline"}
                            size={16}
                            color={interaction.isLiked ? colors.danger : colors.text}
                        />
                        <Text style={[styles.actionBtnText, { color: interaction.isLiked ? colors.danger : colors.text }]}>
                            Thích
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[styles.actionBtn, interaction.isFollowing ? styles.activeBtn : styles.outlineBtn]}
                        onPress={toggleFollow}
                        disabled={actionLoading}
                    >
                        <Ionicons
                            name={interaction.isFollowing ? "bookmark" : "bookmark-outline"}
                            size={16}
                            color={interaction.isFollowing ? colors.primary : colors.text}
                        />
                        <Text style={[styles.actionBtnText, { color: interaction.isFollowing ? colors.primary : colors.text }]}>
                            {interaction.isFollowing ? "Đang theo dõi" : "Theo dõi"}
                        </Text>
                    </Pressable>
                </View>

                {/* Description */}
                {!!page?.description && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Giới thiệu</Text>
                        <Text style={styles.description}>{page.description}</Text>
                    </View>
                )}

                {/* Info */}
                {(page?.email || page?.phone || page?.website || page?.address) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
                        {!!page.email && (
                            <View style={styles.infoRow}>
                                <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
                                <Text style={styles.infoText}>{page.email}</Text>
                            </View>
                        )}
                        {!!page.phone && (
                            <View style={styles.infoRow}>
                                <Ionicons name="call-outline" size={16} color={colors.textMuted} />
                                <Text style={styles.infoText}>{page.phone}</Text>
                            </View>
                        )}
                        {!!page.website && (
                            <View style={styles.infoRow}>
                                <Ionicons name="globe-outline" size={16} color={colors.textMuted} />
                                <Text style={styles.infoText}>{page.website}</Text>
                            </View>
                        )}
                        {!!page.address && (
                            <View style={styles.infoRow}>
                                <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                                <Text style={styles.infoText}>{page.address}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Admin / Mod panel */}
                {canManage && adminActions.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Quản lý trang</Text>
                        {adminActions.map((action) => (
                            <Pressable key={action.label} style={styles.adminItem} onPress={action.onPress}>
                                <Ionicons name={action.icon} size={20} color={action.danger ? colors.danger : colors.primary} />
                                <Text style={[styles.adminItemText, action.danger && { color: colors.danger }]}>
                                    {action.label}
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                            </Pressable>
                        ))}
                    </View>
                )}

                <View style={styles.bottomPad} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    cover: { width: "100%", height: 180 },
    coverPlaceholder: { backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
    profileRow: { flexDirection: "row", padding: spacing.lg, alignItems: "flex-end", marginTop: -40 },
    avatarWrap: {
        borderWidth: 3,
        borderColor: colors.white,
        borderRadius: 44,
        overflow: "hidden",
    },
    avatar: { width: 80, height: 80, borderRadius: 40 },
    avatarPlaceholder: { backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
    nameBlock: { flex: 1, paddingLeft: spacing.md, paddingTop: 40 },
    pageName: { fontSize: 18, fontWeight: "700", color: colors.text },
    pageUsername: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    pageMeta: { fontSize: 12, color: colors.primary, marginTop: 2 },

    statsRow: {
        flexDirection: "row",
        marginHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    statItem: { flex: 1, alignItems: "center" },
    statNumber: { fontSize: 16, fontWeight: "700", color: colors.text },
    statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    statDivider: { width: 1, backgroundColor: colors.border },

    actionsRow: {
        flexDirection: "row",
        padding: spacing.lg,
        gap: spacing.sm,
        flexWrap: "wrap",
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionBtnText: { fontSize: 13, fontWeight: "600" },
    joinBtn: { backgroundColor: colors.primary, borderColor: colors.primary },
    pendingBtn: { backgroundColor: colors.surface, borderColor: colors.border },
    memberBtn: { backgroundColor: colors.surface, borderColor: colors.success },
    outlineBtn: { backgroundColor: colors.white, borderColor: colors.border },
    activeBtn: { backgroundColor: colors.surface, borderColor: colors.border },

    section: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.lg,
    },
    sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    description: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },

    infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
    infoText: { fontSize: 14, color: colors.text, flex: 1 },

    adminItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    adminItemText: { flex: 1, fontSize: 14, color: colors.text },

    bottomPad: { height: spacing.xxl },
});
