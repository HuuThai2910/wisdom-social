import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import pageService from '../services/pageService';
import type { PageData } from '../services/pageService';
import type { ThemeColors } from '../contexts/ThemeContext';

interface PageInteraction {
    isLiked: boolean;
    isFollowing: boolean;
    likeCount: number;
    followCount: number;
}

export default function PagesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'discover' | 'my-pages'>('discover');
    const [allPages, setAllPages] = useState<PageData[]>([]);
    const [myPages, setMyPages] = useState<PageData[]>([]);
    const [interactions, setInteractions] = useState<Record<number, PageInteraction>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const styles = createStyles(colors);

    useEffect(() => {
        loadPages();
    }, []);

    const loadPages = async () => {
        setIsLoading(true);
        try {
            const [all, mine] = await Promise.all([
                pageService.getAllPages(),
                pageService.getMyPages(),
            ]);
            const allSafe = Array.isArray(all) ? all : [];
            const mineSafe = Array.isArray(mine) ? mine : [];
            setAllPages(allSafe);
            setMyPages(mineSafe);

            const uniquePageIds = [...new Set([...allSafe, ...mineSafe].map(p => p.id))];
            await loadInteractions(uniquePageIds);
        } catch {
        } finally {
            setIsLoading(false);
        }
    };

    const loadInteractions = async (pageIds: number[]) => {
        try {
            const results = await Promise.all(
                pageIds.map(id => pageService.getPageInteractionStatus(id).then(data => ({ id, data })))
            );
            const map: Record<number, PageInteraction> = {};
            for (const r of results) {
                map[r.id] = r.data;
            }
            setInteractions(prev => ({ ...prev, ...map }));
        } catch {
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadPages();
        setRefreshing(false);
    }, []);

    const handleToggleLike = async (pageId: number) => {
        if (!user?.id) return;
        const current = interactions[pageId];
        const liked = current?.isLiked ?? false;
        try {
            if (liked) {
                await pageService.cancelLikePage(user.id, pageId);
            } else {
                await pageService.likePage(user.id, pageId);
            }
            setInteractions(prev => ({
                ...prev,
                [pageId]: {
                    ...prev[pageId],
                    isLiked: !liked,
                    likeCount: (prev[pageId]?.likeCount ?? 0) + (liked ? -1 : 1),
                },
            }));
        } catch {
            Alert.alert('Lỗi', 'Không thể thực hiện thao tác.');
        }
    };

    const handleToggleFollow = async (pageId: number) => {
        if (!user?.id) return;
        const current = interactions[pageId];
        const following = current?.isFollowing ?? false;
        try {
            if (following) {
                await pageService.cancelFollowPage(user.id, pageId);
            } else {
                await pageService.followPage(user.id, pageId);
            }
            setInteractions(prev => ({
                ...prev,
                [pageId]: {
                    ...prev[pageId],
                    isFollowing: !following,
                    followCount: (prev[pageId]?.followCount ?? 0) + (following ? -1 : 1),
                },
            }));
        } catch {
            Alert.alert('Lỗi', 'Không thể thực hiện thao tác.');
        }
    };

    const handleDeletePage = async (pageId: number) => {
        Alert.alert(
            'Xóa trang',
            'Bạn có chắc chắn muốn xóa trang này?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await pageService.deletePage(pageId);
                            await loadPages();
                            Alert.alert('Thành công', 'Đã xóa trang.');
                        } catch {
                            Alert.alert('Lỗi', 'Không thể xóa trang.');
                        }
                    },
                },
            ]
        );
    };

    const displayPages = activeTab === 'discover' ? allPages : myPages;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Trang</Text>
                <TouchableOpacity onPress={() => router.push('/create-page' as any)} hitSlop={12}>
                    <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
                    onPress={() => setActiveTab('discover')}
                >
                    <Ionicons name="compass-outline" size={18} color={activeTab === 'discover' ? colors.tabActive : colors.textTertiary} />
                    <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>Khám phá</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'my-pages' && styles.tabActive]}
                    onPress={() => setActiveTab('my-pages')}
                >
                    <Ionicons name="flag-outline" size={18} color={activeTab === 'my-pages' ? colors.tabActive : colors.textTertiary} />
                    <Text style={[styles.tabText, activeTab === 'my-pages' && styles.tabTextActive]}>Trang của tôi</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.centerWrap}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Đang tải...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                >
                    {displayPages.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <View style={styles.emptyCircle}>
                                <Ionicons name="flag-outline" size={40} color={colors.textTertiary} />
                            </View>
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'discover' ? 'Chưa có trang nào' : 'Bạn chưa tạo trang nào'}
                            </Text>
                            <Text style={styles.emptySub}>
                                {activeTab === 'discover'
                                    ? 'Hãy khám phá và tạo trang mới!'
                                    : 'Tạo trang đầu tiên của bạn ngay!'}
                            </Text>
                            {activeTab === 'my-pages' && (
                                <TouchableOpacity
                                    style={styles.createBtn}
                                    onPress={() => router.push('/create-page' as any)}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name="add" size={20} color={colors.primaryText} />
                                    <Text style={styles.createBtnText}>Tạo trang mới</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        displayPages.map((page) => (
                            <PageCard
                                key={page.id}
                                page={page}
                                isOwner={page.createdBy?.id === user?.id}
                                interaction={interactions[page.id]}
                                colors={colors}
                                styles={styles}
                                onPress={() => router.push(`/page-detail?pageId=${page.id}` as any)}
                                onToggleLike={() => handleToggleLike(page.id)}
                                onToggleFollow={() => handleToggleFollow(page.id)}
                                onDelete={() => handleDeletePage(page.id)}
                            />
                        ))
                    )}
                </ScrollView>
            )}
        </View>
    );
}

function PageCard({
    page, isOwner, interaction, colors, styles, onPress, onToggleLike, onToggleFollow, onDelete,
}: {
    page: PageData; isOwner: boolean; interaction?: PageInteraction;
    colors: ThemeColors; styles: any;
    onPress: () => void; onToggleLike: () => void; onToggleFollow: () => void; onDelete: () => void;
}) {
    const liked = interaction?.isLiked ?? false;
    const following = interaction?.isFollowing ?? false;
    const likeCount = interaction?.likeCount ?? 0;
    const followCount = interaction?.followCount ?? 0;

    return (
        <TouchableOpacity style={styles.pageCard} onPress={onPress} activeOpacity={0.8}>
            <View style={styles.pageCardHeader}>
                {page.avatarUrl ? (
                    <Image source={{ uri: `https://cnmt-hk1-amz.s3.ap-southeast-1.amazonaws.com/${page.avatarUrl}` }} style={styles.pageAvatar} />
                ) : (
                    <View style={styles.pageAvatarFallback}>
                        <Ionicons name="flag" size={28} color={colors.textTertiary} />
                    </View>
                )}
                <View style={styles.pageInfo}>
                    <View style={styles.pageNameRow}>
                        <Text style={styles.pageName} numberOfLines={1}>{page.name}</Text>
                        {page.isVerified && (
                            <Ionicons name="checkmark-circle" size={16} color="#3B82F6" style={{ marginLeft: 4 }} />
                        )}
                    </View>
                    {page.username && <Text style={styles.pageUsername}>@{page.username}</Text>}
                    {page.category && (
                        <View style={styles.categoryChip}>
                            <Text style={styles.categoryText}>{page.category}</Text>
                        </View>
                    )}
                </View>
            </View>

            {page.description ? (
                <Text style={styles.pageDesc} numberOfLines={2}>{page.description}</Text>
            ) : null}

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Ionicons name="heart" size={14} color={colors.danger} />
                    <Text style={styles.statText}>{likeCount}</Text>
                </View>
                <View style={styles.statItem}>
                    <Ionicons name="people" size={14} color={colors.primary} />
                    <Text style={styles.statText}>{followCount}</Text>
                </View>
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.actionBtn, liked && styles.actionBtnActive]}
                    onPress={onToggleLike}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={liked ? 'heart' : 'heart-outline'}
                        size={18}
                        color={liked ? '#fff' : colors.danger}
                    />
                    <Text style={[styles.actionBtnText, { color: liked ? '#fff' : colors.danger }]}>
                        {liked ? 'Đã thích' : 'Thích'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, following && styles.actionBtnActiveFollow]}
                    onPress={onToggleFollow}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={following ? 'checkmark-circle' : 'add-circle-outline'}
                        size={18}
                        color={following ? '#fff' : colors.primary}
                    />
                    <Text style={[styles.actionBtnText, { color: following ? '#fff' : colors.primary }]}>
                        {following ? 'Đang theo dõi' : 'Theo dõi'}
                    </Text>
                </TouchableOpacity>
                {isOwner && (
                    <TouchableOpacity style={styles.actionBtn} onPress={onDelete} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        <Text style={[styles.actionBtnText, { color: colors.danger }]}>Xóa</Text>
                    </TouchableOpacity>
                )}
            </View>

            {page.status && (
                <View style={[styles.statusBadge, page.status === 'PUBLIC' ? styles.statusPublic : styles.statusPrivate]}>
                    <Text style={styles.statusText}>
                        {page.status === 'PUBLIC' ? 'Công khai' : page.status === 'PRIVATE' ? 'Riêng tư' : page.status}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    tabBar: {
        flexDirection: 'row', marginHorizontal: 14, marginTop: 14,
        backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden',
        shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 13, borderBottomWidth: 2.5, borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: colors.tabActive },
    tabText: { fontSize: 13, fontWeight: '500', color: colors.textTertiary },
    tabTextActive: { color: colors.tabActive, fontWeight: '600' },
    scrollView: { flex: 1, paddingHorizontal: 14, paddingTop: 14 },
    centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    loadingText: { fontSize: 14, color: colors.textSecondary },

    emptyWrap: { alignItems: 'center', paddingVertical: 56 },
    emptyCircle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: colors.chipBg,
        alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
    emptySub: { fontSize: 13, color: colors.textTertiary, marginTop: 4 },
    createBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: 12, marginTop: 20,
    },
    createBtnText: { color: colors.primaryText, fontWeight: '600', fontSize: 14 },

    pageCard: {
        backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12,
        shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
        position: 'relative',
    },
    pageCardHeader: { flexDirection: 'row', alignItems: 'center' },
    pageAvatar: { width: 56, height: 56, borderRadius: 16, borderWidth: 2, borderColor: colors.border },
    pageAvatarFallback: {
        width: 56, height: 56, borderRadius: 16, backgroundColor: colors.chipBg,
        alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border,
    },
    pageInfo: { flex: 1, marginLeft: 14 },
    pageNameRow: { flexDirection: 'row', alignItems: 'center' },
    pageName: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1 },
    pageUsername: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    categoryChip: {
        alignSelf: 'flex-start', backgroundColor: colors.chipBg,
        paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginTop: 6,
    },
    categoryText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },

    pageDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginTop: 12 },

    contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    contactChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: colors.chipBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
    contactText: { fontSize: 11, color: colors.textSecondary, maxWidth: 140 },

    actionRow: {
        flexDirection: 'row', gap: 12, marginTop: 14, paddingTop: 14,
        borderTopWidth: 1, borderTopColor: colors.border,
    },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
        backgroundColor: colors.chipBg,
    },
    actionBtnActive: {
        backgroundColor: colors.danger,
    },
    actionBtnActiveFollow: {
        backgroundColor: colors.primary,
    },
    actionBtnText: { fontSize: 13, fontWeight: '600' },

    statsRow: {
        flexDirection: 'row', gap: 16, marginTop: 10, paddingHorizontal: 2,
    },
    statItem: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    statText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

    statusBadge: {
        position: 'absolute', top: 12, right: 12,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    },
    statusPublic: { backgroundColor: '#DCFCE7' },
    statusPrivate: { backgroundColor: '#FEF3C7' },
    statusText: { fontSize: 10, fontWeight: '600', color: '#374151' },
});
