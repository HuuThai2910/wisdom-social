import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import userService from '../../services/userService';
import friendService from '../../services/friendService';
import websocketService from '../../services/websocketService';
import { mockPosts } from '../../constants/mockData';
import type { Post } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 2;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * 4) / 3;

const GENDER_OPTIONS = [
    { label: 'Nam', value: 'MALE' },
    { label: 'Nữ', value: 'FEMALE' },
    { label: 'Ẩn', value: 'HIDDEN' },
];

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, logout, updateUser } = useAuth();
    const [selectedTab, setSelectedTab] = useState<'posts' | 'saved'>('posts');
    const [isLoading, setIsLoading] = useState(false);
    const [profileData, setProfileData] = useState<any>(null);
    const [friendsCount, setFriendsCount] = useState(0);
    const [requestsCount, setRequestsCount] = useState(0);

    // Edit modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        username: '',
        bio: '',
        birthday: '',
        gender: '',
        avatarUrl: '',
    });

    useEffect(() => {
        loadProfile();
        loadFriendsData();
    }, []);

    useEffect(() => {
        if (!user) return;
        const handleFriendUpdate = () => loadFriendsData();
        websocketService.on('friend-request', handleFriendUpdate);
        websocketService.on('friend-accept', handleFriendUpdate);
        websocketService.on('friend-cancel', handleFriendUpdate);
        websocketService.on('friend-reject', handleFriendUpdate);
        return () => {
            websocketService.off('friend-request', handleFriendUpdate);
            websocketService.off('friend-accept', handleFriendUpdate);
            websocketService.off('friend-cancel', handleFriendUpdate);
            websocketService.off('friend-reject', handleFriendUpdate);
        };
    }, [user]);

    const loadProfile = async () => {
        setIsLoading(true);
        try {
            const profile = await userService.getProfile();
            if (profile) setProfileData(profile);
        } catch (_) {}
        finally { setIsLoading(false); }
    };

    const loadFriendsData = async () => {
        try {
            const userId = profileData?.id || user?.id;
            if (userId) {
                const [friends, requests] = await Promise.all([
                    friendService.getFriends(userId),
                    friendService.getFriendRequests(userId),
                ]);
                setFriendsCount(friends.length);
                setRequestsCount(requests.length);
            }
        } catch (_) {}
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };

    const handleEditProfile = () => {
        const d = displayUser;
        setEditForm({
            name: d?.name || '',
            username: d?.username || '',
            bio: d?.bio || '',
            birthday: d?.birthday || '',
            gender: d?.gender || '',
            avatarUrl: d?.avatarUrl || '',
        });
        setShowEditModal(true);
    };

    const handleSaveProfile = async () => {
        const userId = displayUser?.id;
        if (!userId) return;
        setIsSaving(true);
        try {
            const payload: any = {};
            if (editForm.name) payload.name = editForm.name;
            if (editForm.username) payload.username = editForm.username;
            payload.bio = editForm.bio || '';
            if (editForm.birthday) payload.birthday = editForm.birthday;
            if (editForm.gender) payload.gender = editForm.gender;
            if (editForm.avatarUrl) payload.avatarUrl = editForm.avatarUrl;

            const success = await userService.updateProfile(userId, payload);
            if (success) {
                setShowEditModal(false);
                await loadProfile();
                await updateUser({ ...displayUser, ...editForm });
            } else {
                Alert.alert('Lỗi', 'Không thể cập nhật hồ sơ. Vui lòng thử lại.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleViewFriends = () => {
        const userId = profileData?.id || user?.id;
        if (userId) router.push(`/friends-list?userId=${userId}` as any);
    };

    const displayUser = profileData || user;
    const userPosts = mockPosts.filter((p: Post) => displayUser && p.user.id === displayUser.id?.toString());
    const savedPosts = mockPosts.filter((p: Post) => p.isSaved);
    const displayPosts = selectedTab === 'posts' ? userPosts : savedPosts;

    /* ---- Loading ---- */
    if (isLoading && !profileData) {
        return (
            <View style={styles.centerScreen}>
                <ActivityIndicator size="large" color="#111827" />
                <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
            </View>
        );
    }

    if (!displayUser) {
        return (
            <View style={styles.centerScreen}>
                <Ionicons name="person-circle-outline" size={64} color="#D1D5DB" />
                <Text style={styles.errorText}>Không có dữ liệu người dùng</Text>
            </View>
        );
    }

    const genderLabel = GENDER_OPTIONS.find(g => g.value === displayUser.gender)?.label;

    /* ======================== RENDER ======================== */
    return (
        <>
            <ScrollView
                style={styles.screen}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* ───── PROFILE CARD ───── */}
                <View style={styles.card}>
                    {/* Avatar + Stats */}
                    <View style={styles.topRow}>
                        <View style={styles.avatarWrap}>
                            {displayUser.avatarUrl ? (
                                <Image source={{ uri: displayUser.avatarUrl }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarFallback}>
                                    <Ionicons name="person" size={42} color="#9CA3AF" />
                                </View>
                            )}
                            <View style={styles.onlineDot} />
                        </View>

                        <View style={styles.statsRow}>
                            <StatBlock label="Bài viết" value={displayUser.postsCount || 0} />
                            <TouchableOpacity onPress={handleViewFriends}>
                                <StatBlock label="Bạn bè" value={friendsCount} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleViewFriends}>
                                <StatBlock label="Lời mời" value={requestsCount} showBadge={requestsCount > 0} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* User info */}
                    <View style={styles.infoBlock}>
                        <Text style={styles.displayName}>
                            {displayUser.name || displayUser.username || displayUser.phone}
                        </Text>
                        {displayUser.username && (
                            <Text style={styles.handle}>@{displayUser.username}</Text>
                        )}
                        {displayUser.bio ? <Text style={styles.bio}>{displayUser.bio}</Text> : null}

                        <View style={styles.metaRow}>
                            {displayUser.birthday ? (
                                <MetaChip icon="calendar-outline" text={displayUser.birthday} />
                            ) : null}
                            {genderLabel ? (
                                <MetaChip icon="male-female-outline" text={genderLabel} />
                            ) : null}
                            {displayUser.phone ? (
                                <MetaChip icon="call-outline" text={displayUser.phone} />
                            ) : null}
                        </View>
                    </View>

                    {/* Buttons */}
                    <View style={styles.btnRow}>
                        <TouchableOpacity style={styles.primaryBtn} onPress={handleEditProfile} activeOpacity={0.75}>
                            <Ionicons name="create-outline" size={17} color="#fff" />
                            <Text style={styles.primaryBtnText}>Chỉnh sửa hồ sơ</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.dangerBtn} onPress={handleLogout} activeOpacity={0.75}>
                            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ───── TAB BAR ───── */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, selectedTab === 'posts' && styles.tabActive]}
                        onPress={() => setSelectedTab('posts')}
                    >
                        <Ionicons name="grid-outline" size={20} color={selectedTab === 'posts' ? '#111827' : '#9CA3AF'} />
                        <Text style={[styles.tabText, selectedTab === 'posts' && styles.tabTextActive]}>Bài viết</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, selectedTab === 'saved' && styles.tabActive]}
                        onPress={() => setSelectedTab('saved')}
                    >
                        <Ionicons name="bookmark-outline" size={20} color={selectedTab === 'saved' ? '#111827' : '#9CA3AF'} />
                        <Text style={[styles.tabText, selectedTab === 'saved' && styles.tabTextActive]}>Đã lưu</Text>
                    </TouchableOpacity>
                </View>

                {/* ───── GRID / EMPTY ───── */}
                {displayPosts.length > 0 ? (
                    <View style={styles.grid}>
                        {displayPosts.map((post: Post) => (
                            <TouchableOpacity key={post.id} style={styles.gridItem} activeOpacity={0.85}>
                                <Image source={{ uri: post.images[0] }} style={styles.gridImage} />
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyWrap}>
                        <View style={styles.emptyCircle}>
                            <Ionicons name="camera-outline" size={40} color="#D1D5DB" />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {selectedTab === 'posts' ? 'Chưa có bài viết' : 'Chưa lưu bài viết'}
                        </Text>
                        <Text style={styles.emptySub}>
                            {selectedTab === 'posts'
                                ? 'Bài viết bạn tạo sẽ hiển thị ở đây'
                                : 'Bài viết bạn lưu sẽ hiển thị ở đây'}
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* ==================== EDIT MODAL ==================== */}
            <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
                <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
                        <View style={styles.dragBar} />

                        {/* Header */}
                        <View style={styles.sheetHeader}>
                            <TouchableOpacity onPress={() => setShowEditModal(false)} hitSlop={12}>
                                <Text style={styles.sheetCancel}>Hủy</Text>
                            </TouchableOpacity>
                            <Text style={styles.sheetTitle}>Chỉnh sửa hồ sơ</Text>
                            <TouchableOpacity onPress={handleSaveProfile} disabled={isSaving} hitSlop={12}>
                                <Text style={[styles.sheetSave, isSaving && { color: '#9CA3AF' }]}>
                                    {isSaving ? 'Đang lưu...' : 'Lưu'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            {/* Avatar preview */}
                            <View style={styles.avatarPreview}>
                                {editForm.avatarUrl ? (
                                    <Image source={{ uri: editForm.avatarUrl }} style={styles.previewImg} />
                                ) : (
                                    <View style={[styles.avatarFallback, { width: 76, height: 76, borderRadius: 38 }]}>
                                        <Ionicons name="person" size={32} color="#9CA3AF" />
                                    </View>
                                )}
                                <Text style={styles.changePhotoLabel}>Thay đổi ảnh</Text>
                            </View>

                            {/* Fields */}
                            <Field label="Ảnh đại diện (URL)" value={editForm.avatarUrl}
                                onChange={(v) => setEditForm(f => ({ ...f, avatarUrl: v }))}
                                placeholder="https://example.com/avatar.jpg" autoCapitalize="none" />

                            <Field label="Họ tên" value={editForm.name}
                                onChange={(v) => setEditForm(f => ({ ...f, name: v }))}
                                placeholder="Nhập họ tên" />

                            <Field label="Tên người dùng" value={editForm.username}
                                onChange={(v) => setEditForm(f => ({ ...f, username: v }))}
                                placeholder="@username" autoCapitalize="none" />

                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>Tiểu sử</Text>
                                <TextInput
                                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                    value={editForm.bio}
                                    onChangeText={(v) => setEditForm(f => ({ ...f, bio: v }))}
                                    placeholder="Giới thiệu bản thân..."
                                    placeholderTextColor="#9CA3AF"
                                    multiline numberOfLines={3}
                                />
                            </View>

                            <Field label="Ngày sinh" value={editForm.birthday}
                                onChange={(v) => setEditForm(f => ({ ...f, birthday: v }))}
                                placeholder="DD/MM/YYYY" />

                            {/* Gender chips */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>Giới tính</Text>
                                <View style={styles.chipRow}>
                                    {GENDER_OPTIONS.map(opt => {
                                        const active = editForm.gender === opt.value;
                                        return (
                                            <TouchableOpacity
                                                key={opt.value}
                                                style={[styles.chip, active && styles.chipActive]}
                                                onPress={() => setEditForm(f => ({ ...f, gender: opt.value }))}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <View style={{ height: 32 }} />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
}

/* ─────────── Small components ─────────── */

function StatBlock({ label, value, showBadge }: { label: string; value: number; showBadge?: boolean }) {
    return (
        <View style={styles.statBlock}>
            <View style={{ position: 'relative' }}>
                <Text style={styles.statNum}>{value}</Text>
                {showBadge && <View style={styles.badge} />}
            </View>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function MetaChip({ icon, text }: { icon: string; text: string }) {
    return (
        <View style={styles.metaChip}>
            <Ionicons name={icon as any} size={13} color="#6B7280" />
            <Text style={styles.metaText}>{text}</Text>
        </View>
    );
}

function Field({ label, value, onChange, placeholder, autoCapitalize }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
    return (
        <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                autoCapitalize={autoCapitalize}
            />
        </View>
    );
}

/* ======================== STYLES ======================== */
const styles = StyleSheet.create({
    /* ---- Screens ---- */
    screen: { flex: 1, backgroundColor: '#F5F5F7' },
    centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F7', gap: 10 },
    loadingText: { fontSize: 14, color: '#6B7280' },
    errorText: { fontSize: 15, color: '#9CA3AF', marginTop: 8 },

    /* ---- Card ---- */
    card: {
        backgroundColor: '#fff',
        marginHorizontal: 14,
        marginTop: 10,
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    topRow: { flexDirection: 'row', alignItems: 'center' },
    avatarWrap: { position: 'relative', marginRight: 18 },
    avatar: {
        width: 78, height: 78, borderRadius: 39,
        borderWidth: 2.5, borderColor: '#E5E7EB',
    },
    avatarFallback: {
        width: 78, height: 78, borderRadius: 39,
        backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2.5, borderColor: '#E5E7EB',
    },
    onlineDot: {
        position: 'absolute', bottom: 2, right: 2,
        width: 13, height: 13, borderRadius: 7,
        backgroundColor: '#22C55E', borderWidth: 2.5, borderColor: '#fff',
    },
    statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
    statBlock: { alignItems: 'center' },
    statNum: { fontSize: 19, fontWeight: '700', color: '#1F2937' },
    statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    badge: {
        position: 'absolute', top: -3, right: -10,
        width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444',
    },

    /* ---- Info ---- */
    infoBlock: { marginTop: 16 },
    displayName: { fontSize: 20, fontWeight: '700', color: '#111827' },
    handle: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginTop: 2 },
    bio: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginTop: 8 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
    metaChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    },
    metaText: { fontSize: 12, color: '#6B7280' },

    /* ---- Actions ---- */
    btnRow: { flexDirection: 'row', marginTop: 18, gap: 10 },
    primaryBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, backgroundColor: '#111827', paddingVertical: 12, borderRadius: 12,
    },
    primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    dangerBtn: {
        backgroundColor: '#FEF2F2', paddingHorizontal: 14, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },

    /* ---- Tab bar ---- */
    tabBar: {
        flexDirection: 'row', marginHorizontal: 14, marginTop: 14,
        backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 13,
        borderBottomWidth: 2.5, borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: '#111827' },
    tabText: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },
    tabTextActive: { color: '#111827', fontWeight: '600' },

    /* ---- Grid ---- */
    grid: {
        flexDirection: 'row', flexWrap: 'wrap',
        paddingHorizontal: 14, paddingTop: 14, gap: GRID_GAP,
    },
    gridItem: {
        width: GRID_ITEM_SIZE, aspectRatio: 1, borderRadius: 12, overflow: 'hidden',
    },
    gridImage: { width: '100%', height: '100%', backgroundColor: '#E5E7EB' },

    /* ---- Empty ---- */
    emptyWrap: { alignItems: 'center', paddingVertical: 56 },
    emptyCircle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
    emptySub: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },

    /* ======== MODAL ======== */
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%',
    },
    dragBar: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB',
        alignSelf: 'center', marginTop: 10, marginBottom: 4,
    },
    sheetHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
    sheetCancel: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
    sheetSave: { fontSize: 15, fontWeight: '700', color: '#111827' },
    sheetBody: { paddingHorizontal: 20 },

    avatarPreview: { alignItems: 'center', paddingVertical: 18 },
    previewImg: { width: 76, height: 76, borderRadius: 38, borderWidth: 2.5, borderColor: '#E5E7EB' },
    changePhotoLabel: { fontSize: 13, color: '#111827', fontWeight: '600', marginTop: 8 },

    /* ---- Fields ---- */
    fieldGroup: { marginTop: 16 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
    input: {
        backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 15, color: '#1F2937',
    },
    chipRow: { flexDirection: 'row', gap: 10 },
    chip: {
        flex: 1, paddingVertical: 11, borderRadius: 12,
        borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#F9FAFB',
    },
    chipActive: { borderColor: '#111827', backgroundColor: '#F3F4F6' },
    chipText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
    chipTextActive: { color: '#111827', fontWeight: '600' },
});

