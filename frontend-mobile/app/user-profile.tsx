/**
 * Other user's profile screen
 * Route: /user-profile?userId=<id>
 * Shows social actions: Add Friend / Message / Block
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, Image, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Dimensions, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import userService from '../services/userService';
import friendService from '../services/friendService';
import { mockPosts } from '../constants/mockData';
import type { Post } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMG_SIZE = (SCREEN_WIDTH - 3) / 3;

// Friend status: NONE | SENT | RECEIVED | FRIEND | BLOCKED
type FriendStatus = 'NONE' | 'SENT' | 'RECEIVED' | 'FRIEND' | 'BLOCKED';

export default function UserProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user: currentUser } = useAuth();
    const { userId } = useLocalSearchParams<{ userId: string }>();

    const [targetUser, setTargetUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState<'posts' | 'tagged'>('posts');

    // Social state
    const [friendStatus, setFriendStatus] = useState<FriendStatus>('NONE');
    const [friendsCount, setFriendsCount] = useState(0);
    const [isFriendLoading, setIsFriendLoading] = useState(false);
    const [showMoreSheet, setShowMoreSheet] = useState(false);

    const myId = currentUser?.id;
    const targetId = userId ? parseInt(userId, 10) : null;

    const loadUser = useCallback(async () => {
        if (!targetId) return;
        setIsLoading(true);
        try {
            const profile = await userService.getUserById(targetId);
            if (profile) setTargetUser(profile);
        } catch (_) {}
        finally { setIsLoading(false); }
    }, [targetId]);

    const loadSocialData = useCallback(async () => {
        if (!myId || !targetId) return;
        try {
            const [status, friends] = await Promise.all([
                friendService.getFriendStatus(myId, targetId),
                friendService.getFriends(targetId),
            ]);
            setFriendStatus(status as FriendStatus);
            setFriendsCount(friends.length);
        } catch (_) {}
    }, [myId, targetId]);

    useEffect(() => { loadUser(); }, [loadUser]);
    useEffect(() => { if (targetUser) loadSocialData(); }, [targetUser]);

    /* ─── Friend actions ─── */
    const handleFriendAction = async () => {
        if (!myId || !targetId || isFriendLoading) return;
        setIsFriendLoading(true);
        try {
            if (friendStatus === 'NONE') {
                const ok = await friendService.sendFriendRequest(myId, targetId);
                if (ok) setFriendStatus('SENT');
            } else if (friendStatus === 'SENT') {
                const ok = await friendService.cancelFriendRequest(myId, targetId);
                if (ok) setFriendStatus('NONE');
            } else if (friendStatus === 'RECEIVED') {
                Alert.alert(
                    'Lời mời kết bạn',
                    `${targetUser?.name || targetUser?.username} đã gửi lời mời kết bạn cho bạn.`,
                    [
                        { text: 'Từ chối', style: 'destructive', onPress: async () => {
                            await friendService.rejectFriendRequest(targetId, myId);
                            setFriendStatus('NONE');
                        }},
                        { text: 'Chấp nhận', onPress: async () => {
                            await friendService.acceptFriendRequest(targetId, myId);
                            setFriendStatus('FRIEND');
                        }},
                    ],
                );
            } else if (friendStatus === 'FRIEND') {
                Alert.alert(
                    'Hủy kết bạn',
                    `Bạn có chắc muốn hủy kết bạn với ${targetUser?.name || targetUser?.username}?`,
                    [
                        { text: 'Không', style: 'cancel' },
                        { text: 'Hủy kết bạn', style: 'destructive', onPress: async () => {
                            await friendService.removeFriend(myId, targetId);
                            setFriendStatus('NONE');
                        }},
                    ],
                );
            }
        } finally { setIsFriendLoading(false); }
    };

    /* ─── Block action ─── */
    const handleBlock = async () => {
        if (!myId || !targetId) return;
        Alert.alert(
            'Chặn người dùng',
            `Chặn ${targetUser?.name || targetUser?.username}? Họ sẽ không thể xem trang cá nhân hay nhắn tin cho bạn.`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Chặn', style: 'destructive',
                    onPress: async () => {
                        setShowMoreSheet(false);
                        await friendService.blockUser(myId, targetId);
                        setFriendStatus('BLOCKED');
                        Alert.alert('Đã chặn', `Bạn đã chặn ${targetUser?.name || targetUser?.username}.`);
                    },
                },
            ],
        );
    };

    /* ─── Render helpers ─── */
    const getFriendButtonConfig = () => {
        switch (friendStatus) {
            case 'NONE': return { label: 'Thêm bạn bè', icon: 'person-add-outline', color: '#111827', textColor: '#fff' };
            case 'SENT': return { label: 'Đã gửi lời mời', icon: 'time-outline', color: '#F3F4F6', textColor: '#111827' };
            case 'RECEIVED': return { label: 'Phản hồi', icon: 'people-outline', color: '#3B82F6', textColor: '#fff' };
            case 'FRIEND': return { label: 'Bạn bè', icon: 'people', color: '#F3F4F6', textColor: '#111827' };
            case 'BLOCKED': return { label: 'Đã chặn', icon: 'ban-outline', color: '#FEE2E2', textColor: '#EF4444' };
        }
    };

    const friendBtnCfg = getFriendButtonConfig();
    const userPosts = mockPosts.filter((p: Post) => targetUser && p.user.id === targetUser.id?.toString());
    const headerName = targetUser?.username || targetUser?.name || '';

    if (isLoading) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#111827" />
            </View>
        );
    }

    if (!targetUser) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <Ionicons name="person-circle-outline" size={64} color="#D1D5DB" />
                <Text style={styles.errorText}>Người dùng không tồn tại</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
                {/* ─── HEADER ─── */}
                <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
                    <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.headerBack}>
                        <Ionicons name="chevron-back" size={28} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.headerUsername} numberOfLines={1}>{headerName}</Text>
                    <TouchableOpacity onPress={() => setShowMoreSheet(true)} hitSlop={10}>
                        <Ionicons name="ellipsis-horizontal" size={26} color="#111827" />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                    {/* ─── PROFILE SECTION ─── */}
                    <View style={styles.profileSection}>
                        {/* Avatar + stats row */}
                        <View style={styles.statsRow}>
                            <View style={styles.avatarContainer}>
                                <LinearGradient
                                    colors={['#FCAF45', '#E1306C', '#833AB4']}
                                    start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
                                    style={styles.avatarGradientRing}
                                >
                                    <View style={styles.avatarInnerRing}>
                                        {targetUser.avatarUrl ? (
                                            <Image source={{ uri: targetUser.avatarUrl }} style={styles.avatar} />
                                        ) : (
                                            <View style={styles.avatarFallback}>
                                                <Ionicons name="person" size={46} color="#9CA3AF" />
                                            </View>
                                        )}
                                    </View>
                                </LinearGradient>
                            </View>

                            <View style={styles.statsList}>
                                <StatItem value={targetUser.postsCount || userPosts.length || 0} label="Bài viết" />
                                <StatItem value={friendsCount} label="Bạn bè" />
                            </View>
                        </View>

                        {/* Name & Bio */}
                        <View style={styles.bioSection}>
                            {targetUser.name ? <Text style={styles.displayName}>{targetUser.name}</Text> : null}
                            {targetUser.bio ? <Text style={styles.bio}>{targetUser.bio}</Text> : null}
                            {friendStatus === 'FRIEND' && friendsCount > 0 && (
                                <Text style={styles.mutualFriends}>
                                    <Ionicons name="people-outline" size={13} color="#6B7280" /> {friendsCount} người bạn chung
                                </Text>
                            )}
                        </View>

                        {/* ─── ACTION BUTTONS ─── */}
                        {friendStatus !== 'BLOCKED' ? (
                            <View style={styles.actionRow}>
                                {/* Friend button */}
                                <TouchableOpacity
                                    style={[styles.friendBtn, { backgroundColor: friendBtnCfg!.color }]}
                                    onPress={handleFriendAction}
                                    activeOpacity={0.75}
                                    disabled={isFriendLoading}
                                >
                                    {isFriendLoading
                                        ? <ActivityIndicator size="small" color={friendBtnCfg!.textColor} />
                                        : <>
                                            <Ionicons name={friendBtnCfg!.icon as any} size={16} color={friendBtnCfg!.textColor} />
                                            <Text style={[styles.friendBtnText, { color: friendBtnCfg!.textColor }]}>
                                                {friendBtnCfg!.label}
                                            </Text>
                                        </>
                                    }
                                </TouchableOpacity>

                                {/* Message button */}
                                <TouchableOpacity style={styles.msgBtn} activeOpacity={0.75} onPress={() => {/* TODO: open chat */ }}>
                                    <Ionicons name="chatbubble-outline" size={16} color="#111827" />
                                    <Text style={styles.msgBtnText}>Nhắn tin</Text>
                                </TouchableOpacity>

                                {/* More button */}
                                <TouchableOpacity style={styles.moreBtn} onPress={() => setShowMoreSheet(true)} activeOpacity={0.75}>
                                    <Ionicons name="chevron-down" size={18} color="#111827" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            /* Blocked state */
                            <View style={styles.blockedBanner}>
                                <Ionicons name="ban-outline" size={18} color="#EF4444" />
                                <Text style={styles.blockedText}>Bạn đã chặn người dùng này</Text>
                                <TouchableOpacity onPress={async () => {
                                    if (!myId || !targetId) return;
                                    await friendService.unblockUser(myId, targetId);
                                    setFriendStatus('NONE');
                                }}>
                                    <Text style={styles.unblockText}>Bỏ chặn</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                    </View>

                    {/* ─── DIVIDER ─── */}
                    <View style={styles.divider} />

                    {/* ─── TABS ─── */}
                    <View style={styles.tabBar}>
                        <TouchableOpacity
                            style={[styles.tabItem, selectedTab === 'posts' && styles.tabItemActive]}
                            onPress={() => setSelectedTab('posts')}
                        >
                            <Ionicons name="grid" size={22} color={selectedTab === 'posts' ? '#111827' : '#9CA3AF'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabItem, selectedTab === 'tagged' && styles.tabItemActive]}
                            onPress={() => setSelectedTab('tagged')}
                        >
                            <Ionicons name="pricetag" size={22} color={selectedTab === 'tagged' ? '#111827' : '#9CA3AF'} />
                        </TouchableOpacity>
                    </View>

                    {/* ─── PHOTO GRID ─── */}
                    {userPosts.length > 0 ? (
                        <View style={styles.grid}>
                            {userPosts.map((post: Post, index: number) => (
                                <TouchableOpacity key={post.id} activeOpacity={0.85}
                                    style={[styles.gridItem, { marginRight: (index + 1) % 3 === 0 ? 0 : 1, marginBottom: 1 }]}
                                >
                                    <Image source={{ uri: post.images[0] }} style={styles.gridImage} />
                                    {post.images.length > 1 && (
                                        <View style={styles.multiIcon}>
                                            <Ionicons name="copy" size={14} color="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyWrap}>
                            <View style={styles.emptyCircle}>
                                <Ionicons name="camera-outline" size={44} color="#D1D5DB" />
                            </View>
                            <Text style={styles.emptyTitle}>Chưa có bài viết</Text>
                            <Text style={styles.emptySub}>Khi đăng bài, ảnh sẽ hiển thị ở đây.</Text>
                        </View>
                    )}
                </ScrollView>
            </View>

            {/* ─── MORE OPTIONS SHEET ─── */}
            <Modal visible={showMoreSheet} transparent animationType="slide" onRequestClose={() => setShowMoreSheet(false)}>
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowMoreSheet(false)} />
                <View style={[styles.moreSheet, { paddingBottom: insets.bottom + 12 }]}>
                    <View style={styles.dragBar} />
                    <Text style={styles.sheetTitle}>Tùy chọn</Text>

                    <SheetAction icon="share-social-outline" label="Chia sẻ trang cá nhân"
                        onPress={() => setShowMoreSheet(false)} />
                    <SheetAction icon="flag-outline" label="Báo cáo" onPress={() => setShowMoreSheet(false)} />
                    <View style={styles.sheetDivider} />
                    {friendStatus !== 'BLOCKED' ? (
                        <SheetAction icon="ban-outline" label="Chặn" danger onPress={handleBlock} />
                    ) : (
                        <SheetAction icon="checkmark-circle-outline" label="Bỏ chặn"
                            onPress={async () => {
                                setShowMoreSheet(false);
                                if (!myId || !targetId) return;
                                await friendService.unblockUser(myId, targetId);
                                setFriendStatus('NONE');
                            }} />
                    )}
                </View>
            </Modal>
        </>
    );
}

/* ─── Small components ─── */
function StatItem({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
    const content = (
        <View style={styles.statItem}>
            <Text style={styles.statNum}>{value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
    return onPress ? <TouchableOpacity onPress={onPress} activeOpacity={0.8}>{content}</TouchableOpacity> : content;
}

function SheetAction({ icon, label, onPress, danger }: {
    icon: any; label: string; onPress: () => void; danger?: boolean;
}) {
    return (
        <TouchableOpacity style={styles.sheetAction} onPress={onPress} activeOpacity={0.7}>
            <Ionicons name={icon} size={22} color={danger ? '#EF4444' : '#111827'} />
            <Text style={[styles.sheetActionLabel, danger && { color: '#EF4444' }]}>{label}</Text>
        </TouchableOpacity>
    );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
    center: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 12 },
    errorText: { fontSize: 15, color: '#9CA3AF' },
    backBtn: { marginTop: 12, backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
    backBtnText: { fontSize: 14, fontWeight: '600', color: '#111827' },

    /* Header */
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 10, backgroundColor: '#fff',
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
    },
    headerBack: { padding: 2 },
    headerUsername: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginHorizontal: 8 },

    /* Profile */
    profileSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: '#fff' },
    statsRow: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: { marginRight: 24 },
    avatarGradientRing: { width: 94, height: 94, borderRadius: 47, padding: 2.5 },
    avatarInnerRing: {
        flex: 1, borderRadius: 44, backgroundColor: '#fff', padding: 2,
        alignItems: 'center', justifyContent: 'center',
    },
    avatar: { width: 80, height: 80, borderRadius: 40 },
    avatarFallback: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
    },
    statsList: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
    statItem: { alignItems: 'center', paddingHorizontal: 4 },
    statNum: { fontSize: 18, fontWeight: '700', color: '#111827' },
    statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2, textAlign: 'center' },

    /* Bio */
    bioSection: { marginTop: 12 },
    displayName: { fontSize: 15, fontWeight: '700', color: '#111827' },
    bio: { fontSize: 14, color: '#374151', lineHeight: 20, marginTop: 4 },
    mutualFriends: { fontSize: 13, color: '#6B7280', marginTop: 6 },

    /* Action buttons */
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
    friendBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 9, borderRadius: 10,
        borderWidth: 1, borderColor: '#E5E7EB', minHeight: 40,
    },
    friendBtnText: { fontSize: 13, fontWeight: '600' },
    msgBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 9, borderRadius: 10,
        backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', minHeight: 40,
    },
    msgBtnText: { fontSize: 13, fontWeight: '600', color: '#111827' },
    moreBtn: {
        width: 40, height: 40, borderRadius: 10, backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#E5E7EB',
    },

    /* Blocked banner */
    blockedBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
        backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA',
    },
    blockedText: { flex: 1, fontSize: 13, color: '#EF4444', fontWeight: '500' },
    unblockText: { fontSize: 13, fontWeight: '700', color: '#3B82F6' },

    /* Divider */
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginTop: 16 },

    /* Tabs */
    tabBar: {
        flexDirection: 'row', backgroundColor: '#fff',
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
    },
    tabItem: {
        flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12,
        borderBottomWidth: 1.5, borderBottomColor: 'transparent',
    },
    tabItemActive: { borderBottomColor: '#111827' },

    /* Grid */
    grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff' },
    gridItem: { width: IMG_SIZE, height: IMG_SIZE, backgroundColor: '#F3F4F6' },
    gridImage: { width: '100%', height: '100%' },
    multiIcon: {
        position: 'absolute', top: 6, right: 6,
        backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 4, padding: 3,
    },

    /* Empty */
    emptyWrap: { alignItems: 'center', paddingVertical: 60, backgroundColor: '#fff' },
    emptyCircle: {
        width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: '#111827',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
    emptySub: { fontSize: 13, color: '#9CA3AF', marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },

    /* More sheet */
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    moreSheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        position: 'absolute', bottom: 0, left: 0, right: 0,
    },
    dragBar: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB',
        alignSelf: 'center', marginTop: 10, marginBottom: 4,
    },
    sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center', paddingVertical: 12 },
    sheetAction: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, gap: 14,
    },
    sheetActionLabel: { fontSize: 16, color: '#111827' },
    sheetDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginVertical: 6 },
});
