import React, { useState, useEffect, useCallback } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemeColors } from '../../contexts/ThemeContext';
import userService from '../../services/userService';
import friendService from '../../services/friendService';
import blockService from '../../services/blockService';
import websocketService from '../../services/websocketService';
import { mockPosts } from '../../constants/mockData';
import type { Post, User } from '../../types';
import DatePickerField from '../../components/DatePickerField';
import SuccessModal from '../../components/SuccessModal';
import { validateProfileForm } from '../../utils/validation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 2;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * 4) / 3;

const GENDER_OPTIONS = [
    { label: 'Nam', value: 'MALE' },
    { label: 'Nữ', value: 'FEMALE' },
    { label: 'Khác', value: 'Other' },
];

const S3_BASE = 'https://cnmt-hk1-amz.s3.ap-southeast-1.amazonaws.com/';
const buildS3Url = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;
    return S3_BASE + url;
};

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, logout, updateUser } = useAuth();
    const { colors, isDark } = useTheme();
    const [selectedTab, setSelectedTab] = useState<'posts' | 'saved' | 'blocked'>('posts');
    const [isLoading, setIsLoading] = useState(false);
    const [profileData, setProfileData] = useState<any>(null);
    const [friendsCount, setFriendsCount] = useState(0);
    const [requestsCount, setRequestsCount] = useState(0);

    const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
    const [isLoadingBlocked, setIsLoadingBlocked] = useState(false);

    const [showAvatarModal, setShowAvatarModal] = useState(false);

    const [showEditModal, setShowEditModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarLocalUri, setAvatarLocalUri] = useState('');
    const [pendingAvatarAsset, setPendingAvatarAsset] = useState<{ uri: string; mimeType: string; extension: string } | null>(null);
    const [editFormModalVisible, setEditFormModalVisible] = useState(false);
    const [editFormModalData, setEditFormModalData] = useState({
        type: 'success' as 'success' | 'error' | 'loading',
        title: '',
        message: '',
    });
    const [editForm, setEditForm] = useState({
        name: '',
        username: '',
        bio: '',
        birthday: '',
        gender: '',
        avatarUrl: '',
        backgroundUrl: '',
    });
    const [editFormErrors, setEditFormErrors] = useState({
        name: '',
        username: '',
        birthday: '',
        gender: '',
    });

    const loadProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            const profile = await userService.getProfile();
            if (profile) setProfileData(profile);
        } catch (_) {}
        finally { setIsLoading(false); }
    }, []);

    const loadFriendsData = useCallback(async () => {
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
    }, [profileData?.id, user?.id]);

    const loadBlockedUsers = useCallback(async () => {
        const userId = profileData?.id || user?.id;
        if (!userId) return;
        setIsLoadingBlocked(true);
        try {
            const list = await blockService.getBlockedUsers(userId);
            setBlockedUsers(list);
        } catch (_) {}
        finally { setIsLoadingBlocked(false); }
    }, [profileData?.id, user?.id]);

    const refreshAllData = useCallback(async () => {
        await Promise.all([
            loadProfile(),
            loadFriendsData(),
        ]);
    }, [loadProfile, loadFriendsData]);

    useEffect(() => {
        loadProfile();
        loadFriendsData();
        loadBlockedUsers();
    }, [loadProfile, loadFriendsData, loadBlockedUsers]);

    useFocusEffect(
        useCallback(() => {
            refreshAllData();
        }, [refreshAllData])
    );

    useEffect(() => {
        if (!user) return;
        const handleFriendUpdate = () => {
            loadProfile();
            loadFriendsData();
        };
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
    }, [user, loadProfile, loadFriendsData]);

    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };


    const validateField = useCallback((field: 'name' | 'username' | 'birthday' | 'gender', value: string) => {
        let error = '';

        if (field === 'name') {
            if (!value || value.trim() === '') {
                error = 'Họ và tên không được để trống';
            } else if (value.trim().length < 2) {
                error = 'Họ và tên phải ít nhất 2 ký tự';
            } else if (value.trim().length > 50) {
                error = 'Họ và tên không được vượt quá 50 ký tự';
            }
        } else if (field === 'username') {
            if (!value || value.trim() === '') {
                error = 'Tên người dùng không được để trống';
            } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
                error = 'Tên người dùng phải từ 3-20 ký tự (chữ, số, gạch dưới)';
            }
        } else if (field === 'birthday') {
            if (!value || value.trim() === '') {
                error = 'Ngày sinh không được để trống';
            } else {
                const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
                const match = value.match(dateRegex);
                if (!match) {
                    error = 'Ngày sinh phải có định dạng DD/MM/YYYY';
                } else {
                    const [, day, month, year] = match;
                    const dayNum = parseInt(day, 10);
                    const monthNum = parseInt(month, 10);
                    const yearNum = parseInt(year, 10);

                    if (monthNum < 1 || monthNum > 12) {
                        error = 'Tháng phải từ 01 đến 12';
                    } else {
                        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
                        if (yearNum % 4 === 0 && (yearNum % 100 !== 0 || yearNum % 400 === 0)) {
                            daysInMonth[1] = 29;
                        }
                        if (dayNum < 1 || dayNum > daysInMonth[monthNum - 1]) {
                            error = `Ngày phải từ 01 đến ${daysInMonth[monthNum - 1]}`;
                        } else {
                            const birthDate = new Date(yearNum, monthNum - 1, dayNum);
                            const today = new Date();
                            if (birthDate > today) {
                                error = 'Ngày sinh không được lớn hơn ngày hiện tại';
                            } else {
                                const age = today.getFullYear() - birthDate.getFullYear();
                                if (age < 13) {
                                    error = 'Phải ít nhất 13 tuổi để sử dụng';
                                }
                            }
                        }
                    }
                }
            }
        } else if (field === 'gender') {
            if (!value || value.trim() === '') {
                error = 'Giới tính không được để trống';
            }
        }

        setEditFormErrors(prev => ({ ...prev, [field]: error }));
        return error === '';
    }, []);

    const checkUsernameExists = useCallback(async (username: string, currentUsername: string) => {
        if (!username) return false;

        // Don't check if username hasn't changed
        if (username === currentUsername) return false;

        try {
            const users = await userService.getUserByUsername(username);
            return users && users.length > 0;
        } catch {
            return false;
        }
    }, []);

    const validateUsernameAsync = useCallback(async (value: string, currentUsername: string) => {
        let error = '';

        if (!value || value.trim() === '') {
            error = 'Tên người dùng không được để trống';
        } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
            error = 'Tên người dùng phải từ 3-20 ký tự (chữ, số, gạch dưới)';
        } else {
            // Check if username already exists
            const exists = await checkUsernameExists(value, currentUsername);
            if (exists) {
                error = 'Tên người dùng này đã tồn tại';
            }
        }

        setEditFormErrors(prev => ({ ...prev, username: error }));
        return { isValid: error === '', error };
    }, [checkUsernameExists]);

    const handleEditProfile = () => {
        const d = displayUser;
        setEditForm({
            name: d?.name || '',
            username: d?.username || '',
            bio: d?.bio || '',
            birthday: d?.birthday || '',
            gender: d?.gender || '',
            avatarUrl: d?.avatarUrl || '',
            backgroundUrl: d?.backgroundUrl || '',
        });
        setEditFormErrors({ name: '', username: '', birthday: '', gender: '' });
        setAvatarLocalUri('');
        setPendingAvatarAsset(null);
        setShowEditModal(true);
    };

    const pickAvatarImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh để chọn ảnh.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });
        if (result.canceled || !result.assets[0]) return;
        const asset = result.assets[0];
        const mimeType = asset.mimeType ?? 'image/jpeg';
        const extension = mimeType.split('/')[1].replace('jpeg', 'jpg');
        setAvatarLocalUri(asset.uri);
        setPendingAvatarAsset({ uri: asset.uri, mimeType, extension });
    };

    const pickBackgroundImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh để chọn ảnh.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });
        if (result.canceled || !result.assets[0]) return;
        const asset = result.assets[0];
        const mimeType = asset.mimeType ?? 'image/jpeg';
        const extension = mimeType.split('/')[1].replace('jpeg', 'jpg');
    };

    const handleSaveProfile = async () => {
        const userId = displayUser?.id;
        if (!userId) return;

        // Validate form
        const validation = validateProfileForm(
            editForm.name,
            editForm.username,
            editForm.birthday,
            editForm.gender
        );

        if (!validation.isValid) {
            setEditFormModalData({
                type: 'error',
                title: 'Lỗi xác thực',
                message: validation.error || 'Vui lòng kiểm tra thông tin',
            });
            setEditFormModalVisible(true);
            return;
        }

        // Check if username exists (async validation)
        const usernameValidation = await validateUsernameAsync(editForm.username, displayUser?.username || '');
        if (!usernameValidation.isValid) {
            setEditFormModalData({
                type: 'error',
                title: 'Lỗi xác thực',
                message: usernameValidation.error || 'Tên người dùng không hợp lệ',
            });
            setEditFormModalVisible(true);
            return;
        }

        setIsSaving(true);
        setEditFormModalData({
            type: 'loading',
            title: 'Đang lưu',
            message: 'Vui lòng chờ...',
        });
        setEditFormModalVisible(true);

        try {
            let newAvatarUrl: string | undefined = editForm.avatarUrl || undefined;

            if (pendingAvatarAsset) {
                setIsUploadingAvatar(true);
                const uploadUrl = await userService.getUpdateProfileUploadUrl(pendingAvatarAsset.extension);
                if (!uploadUrl) throw new Error();
                const blob = await fetch(pendingAvatarAsset.uri).then(r => r.blob());
                const uploadRes = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': pendingAvatarAsset.mimeType },
                    body: blob,
                });
                if (!uploadRes.ok) throw new Error();
                const fresh = await userService.getProfile();
                newAvatarUrl = fresh?.avatarUrl ?? undefined;
                setIsUploadingAvatar(false);
            }

            const payload: any = {};
            if (editForm.name) payload.name = editForm.name;
            if (editForm.username) payload.username = editForm.username;
            payload.bio = editForm.bio || '';
            if (editForm.birthday) payload.birthday = editForm.birthday;
            if (editForm.gender) payload.gender = editForm.gender;
            if (newAvatarUrl) payload.avatarUrl = newAvatarUrl;

            const success = await userService.updateProfile(userId, payload);
            if (success) {
                setPendingAvatarAsset(null);
                setAvatarLocalUri('');
                setEditFormModalVisible(false);
                setShowEditModal(false);
                const fresh = await userService.getProfile();
                if (fresh) {
                    setProfileData(fresh);
                    await updateUser(fresh);
                }
            } else {
                setEditFormModalData({
                    type: 'error',
                    title: 'Lỗi',
                    message: 'Không thể cập nhật hồ sơ. Vui lòng thử lại.',
                });
                setEditFormModalVisible(true);
            }
        } catch {
            setEditFormModalData({
                type: 'error',
                title: 'Lỗi',
                message: 'Không thể tải ảnh lên hoặc cập nhật hồ sơ. Vui lòng thử lại.',
            });
            setEditFormModalVisible(true);
        } finally {
            setIsSaving(false);
            setIsUploadingAvatar(false);
        }
    };

    const handleViewFriends = () => {
        const userId = profileData?.id || user?.id;
        if (userId) router.push(`/friends-list?userId=${userId}&tab=friends`);
    };

    const handleViewRequests = () => {
        const userId = profileData?.id || user?.id;
        if (userId) router.push(`/friends-list?userId=${userId}&tab=requests`);
    };

    const handleUnblock = async (blockedId: number) => {
        const userId = profileData?.id || user?.id;
        if (!userId) return;
        Alert.alert('Bỏ chặn', 'Bạn có chắc muốn bỏ chặn người dùng này?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Bỏ chặn', style: 'destructive',
                onPress: async () => {
                    const ok = await blockService.unblockUser(userId, blockedId);
                    if (ok) {
                        setBlockedUsers(prev => prev.filter(u => u.id !== blockedId));
                    } else {
                        Alert.alert('Lỗi', 'Không thể bỏ chặn. Vui lòng thử lại.');
                    }
                },
            },
        ]);
    };

    const displayUser = profileData || user;
    const userPosts = mockPosts.filter((p: Post) => displayUser && p.authorId === displayUser.id?.toString());
    const savedPosts = mockPosts.filter((p: Post) => p.isSaved);
    const displayPosts = selectedTab === 'posts' ? userPosts : savedPosts;

    if (isLoading && !profileData) {
        return (
            <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: 10 }]}>
                <ActivityIndicator size="large" color={colors.text} />
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>Đang tải hồ sơ...</Text>
            </View>
        );
    }

    if (!displayUser) {
        return (
            <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: 10 }]}>
                <Ionicons name="person-circle-outline" size={64} color={colors.textTertiary} />
                <Text style={{ fontSize: 15, color: colors.textTertiary, marginTop: 8 }}>Không có dữ liệu người dùng</Text>
            </View>
        );
    }

    const genderLabel = GENDER_OPTIONS.find(g => g.value === displayUser.gender)?.label;

    const ds = createDynamicStyles(colors);
    return (
        <>
            <ScrollView
                style={ds.screen}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }}
            >
                <View style={ds.card}>
                    <TouchableOpacity
                        style={ds.settingsBtn}
                        onPress={() => router.push('/settings' as any)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={ds.topRow}>
                        <TouchableOpacity
                            style={ds.avatarWrap}
                            onPress={() => setShowAvatarModal(true)}
                            activeOpacity={0.7}
                        >
                            {displayUser.avatarUrl ? (
                                <Image source={{ uri: buildS3Url(displayUser.avatarUrl) }} style={ds.avatar} />
                            ) : (
                                <View style={ds.avatarFallback}>
                                    <Ionicons name="person" size={42} color={colors.textTertiary} />
                                </View>
                            )}
                            <View style={ds.onlineDot} />
                        </TouchableOpacity>

                        <View style={ds.statsRow}>
                            <StatBlock label="Bài viết" value={displayUser.postsCount || 0} colors={colors} />
                            <TouchableOpacity onPress={handleViewFriends}>
                                <StatBlock label="Bạn bè" value={friendsCount} colors={colors} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleViewRequests}>
                                <StatBlock label="Lời mời" value={requestsCount} showBadge={requestsCount > 0} colors={colors} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={ds.infoBlock}>
                        <Text style={ds.displayName}>
                            {displayUser.name || displayUser.username || displayUser.phone}
                        </Text>
                        {displayUser.username && (
                            <Text style={ds.handle}>@{displayUser.username}</Text>
                        )}
                        {displayUser.bio ? <Text style={ds.bio}>{displayUser.bio}</Text> : null}

                        <View style={ds.metaRow}>
                            {displayUser.birthday ? (
                                <MetaChip icon="calendar-outline" text={displayUser.birthday} colors={colors} />
                            ) : null}
                            {genderLabel ? (
                                <MetaChip icon="male-female-outline" text={genderLabel} colors={colors} />
                            ) : null}
                            {displayUser.phone ? (
                                <MetaChip icon="call-outline" text={displayUser.phone} colors={colors} />
                            ) : null}
                        </View>
                    </View>

                    <View style={ds.btnRow}>
                        <TouchableOpacity style={ds.primaryBtn} onPress={handleEditProfile} activeOpacity={0.75}>
                            <Ionicons name="create-outline" size={17} color={colors.primaryText} />
                            <Text style={ds.primaryBtnText}>Chỉnh sửa hồ sơ</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={ds.dangerBtn} onPress={handleLogout} activeOpacity={0.75}>
                            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={ds.tabBar}>
                    <TouchableOpacity
                        style={[ds.tab, selectedTab === 'posts' && ds.tabActive]}
                        onPress={() => setSelectedTab('posts')}
                    >
                        <Ionicons name="grid-outline" size={20} color={selectedTab === 'posts' ? colors.tabActive : colors.textTertiary} />
                        <Text style={[ds.tabText, selectedTab === 'posts' && ds.tabTextActive]}>Bài viết</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[ds.tab, selectedTab === 'saved' && ds.tabActive]}
                        onPress={() => setSelectedTab('saved')}
                    >
                        <Ionicons name="bookmark-outline" size={20} color={selectedTab === 'saved' ? colors.tabActive : colors.textTertiary} />
                        <Text style={[ds.tabText, selectedTab === 'saved' && ds.tabTextActive]}>Đã lưu</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[ds.tab, selectedTab === 'blocked' && ds.tabActive]}
                        onPress={() => { setSelectedTab('blocked'); loadBlockedUsers(); }}
                    >
                        <Ionicons name="ban-outline" size={20} color={selectedTab === 'blocked' ? colors.tabActive : colors.textTertiary} />
                        <Text style={[ds.tabText, selectedTab === 'blocked' && ds.tabTextActive]}>Đã chặn</Text>
                    </TouchableOpacity>
                </View>

                {selectedTab === 'blocked' ? (
                    isLoadingBlocked ? (
                        <View style={ds.emptyWrap}>
                            <ActivityIndicator size="small" color={colors.text} />
                            <Text style={ds.emptySub}>Đang tải...</Text>
                        </View>
                    ) : blockedUsers.length > 0 ? (
                        <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
                            {blockedUsers.map((bu) => (
                                <View key={bu.id} style={ds.blockedRow}>
                                    {bu.avatarUrl ? (
                                        <Image source={{ uri: buildS3Url(bu.avatarUrl) }} style={ds.blockedAvatar} />
                                    ) : (
                                        <View style={ds.blockedAvatarFallback}>
                                            <Ionicons name="person" size={22} color={colors.textTertiary} />
                                        </View>
                                    )}
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={ds.blockedName} numberOfLines={1}>
                                            {bu.name || bu.username || bu.phone}
                                        </Text>
                                        {bu.username && (
                                            <Text style={ds.blockedUsername}>@{bu.username}</Text>
                                        )}
                                    </View>
                                    <TouchableOpacity
                                        style={ds.unblockBtn}
                                        onPress={() => handleUnblock(bu.id)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={ds.unblockBtnText}>Bỏ chặn</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={ds.emptyWrap}>
                            <View style={ds.emptyCircle}>
                                <Ionicons name="ban-outline" size={40} color={colors.textTertiary} />
                            </View>
                            <Text style={ds.emptyTitle}>Chưa chặn ai</Text>
                            <Text style={ds.emptySub}>Những người bạn chặn sẽ hiển thị ở đây</Text>
                        </View>
                    )
                ) : displayPosts.length > 0 ? (
                    <View style={ds.grid}>
                        {displayPosts.map((post: Post) => (
                            <TouchableOpacity key={post.id} style={ds.gridItem} activeOpacity={0.85}>
                                <Image source={{ uri: post.images[0] }} style={ds.gridImage} />
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View style={ds.emptyWrap}>
                        <View style={ds.emptyCircle}>
                            <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
                        </View>
                        <Text style={ds.emptyTitle}>
                            {selectedTab === 'posts' ? 'Chưa có bài viết' : 'Chưa lưu bài viết'}
                        </Text>
                        <Text style={ds.emptySub}>
                            {selectedTab === 'posts'
                                ? 'Bài viết bạn tạo sẽ hiển thị ở đây'
                                : 'Bài viết bạn lưu sẽ hiển thị ở đây'}
                        </Text>
                    </View>
                )}
            </ScrollView>

            <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
                <KeyboardAvoidingView style={ds.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={[ds.sheet, { paddingBottom: insets.bottom + 16 }]}>
                        <View style={ds.dragBar} />

                        <View style={ds.sheetHeader}>
                            <TouchableOpacity onPress={() => {
                                setShowEditModal(false);
                                setEditFormErrors({ name: '', username: '', birthday: '', gender: '' });
                            }} hitSlop={12}>
                                <Text style={ds.sheetCancel}>Hủy</Text>
                            </TouchableOpacity>
                            <Text style={ds.sheetTitle}>Chỉnh sửa hồ sơ</Text>
                            <TouchableOpacity onPress={handleSaveProfile} disabled={isSaving} hitSlop={12}>
                                <Text style={[ds.sheetSave, isSaving && { color: colors.textTertiary }]}>
                                    {isSaving ? 'Đang lưu...' : 'Lưu'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={ds.sheetBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            <TouchableOpacity
                                style={ds.avatarPreview}
                                onPress={pickAvatarImage}
                                disabled={isUploadingAvatar || isSaving}
                                activeOpacity={0.7}
                            >
                                {isUploadingAvatar ? (
                                    <View style={[ds.previewImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chipBg }]}>
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    </View>
                                ) : (avatarLocalUri || editForm.avatarUrl) ? (
                                    <Image source={{ uri: avatarLocalUri || buildS3Url(editForm.avatarUrl) }} style={ds.previewImg} />
                                ) : (
                                    <View style={[ds.avatarFallback, { width: 76, height: 76, borderRadius: 38 }]}>
                                        <Ionicons name="person" size={32} color={colors.textTertiary} />
                                    </View>
                                )}
                                <View style={ds.changePhotoRow}>
                                    <Ionicons name="camera-outline" size={15} color={colors.primary} />
                                    <Text style={ds.changePhotoLabel}>
                                        {avatarLocalUri ? 'Đổi ảnh khác' : 'Thay đổi ảnh'}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <Field label="Họ tên" value={editForm.name}
                                onChange={(v) => {
                                    setEditForm(f => ({ ...f, name: v }));
                                    validateField('name', v);
                                }}
                                placeholder="Nhập họ tên" colors={colors} error={editFormErrors.name} />

                            <Field label="Tên người dùng" value={editForm.username}
                                onChange={(v) => {
                                    setEditForm(f => ({ ...f, username: v }));
                                    validateField('username', v);
                                }}
                                placeholder="@username" autoCapitalize="none" colors={colors} error={editFormErrors.username} />

                            <View style={ds.fieldGroup}>
                                <Text style={ds.fieldLabel}>Tiểu sử</Text>
                                <TextInput
                                    style={[ds.input, { height: 80, textAlignVertical: 'top' }]}
                                    value={editForm.bio}
                                    onChangeText={(v) => setEditForm(f => ({ ...f, bio: v }))}
                                    placeholder="Giới thiệu bản thân..."
                                    placeholderTextColor={colors.textTertiary}
                                    multiline numberOfLines={3}
                                />
                            </View>

                            <DatePickerField
                                label="Ngày sinh"
                                value={editForm.birthday}
                                onChange={(v) => {
                                    setEditForm(f => ({ ...f, birthday: v }));
                                    validateField('birthday', v);
                                }}
                                colors={colors}
                                error={editFormErrors.birthday}
                            />

                            <View style={ds.fieldGroup}>
                                <Text style={ds.fieldLabel}>Giới tính</Text>
                                <View style={ds.chipRow}>
                                    {GENDER_OPTIONS.map(opt => {
                                        const active = editForm.gender === opt.value;
                                        return (
                                            <TouchableOpacity
                                                key={opt.value}
                                                style={[ds.chip, active && ds.chipActive]}
                                                onPress={() => {
                                                    setEditForm(f => ({ ...f, gender: opt.value }));
                                                    validateField('gender', opt.value);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[ds.chipText, active && ds.chipTextActive]}>{opt.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                {editFormErrors.gender && (
                                    <Text style={{ fontSize: 12, color: colors.danger, marginTop: 6 }}>{editFormErrors.gender}</Text>
                                )}
                            </View>

                            <View style={{ height: 32 }} />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <SuccessModal
                visible={editFormModalVisible}
                type={editFormModalData.type}
                title={editFormModalData.title}
                message={editFormModalData.message}
                onClose={() => setEditFormModalVisible(false)}
                confirmText={editFormModalData.type === 'loading' ? undefined : 'OK'}
            />

            <Modal visible={showAvatarModal} transparent animationType="fade" onRequestClose={() => setShowAvatarModal(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity
                        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => setShowAvatarModal(false)}
                        activeOpacity={1}
                    >
                        {displayUser.avatarUrl ? (
                            <Image
                                source={{ uri: buildS3Url(displayUser.avatarUrl) }}
                                style={{ width: 500, height: 500, borderRadius: 20 }}
                                resizeMode="contain"
                            />
                        ) : (
                            <View style={{ width: 200, height: 200, borderRadius: 100, backgroundColor: colors.chipBg, justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name="person" size={80} color={colors.textTertiary} />
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ position: 'absolute', top: insets.top + 16, right: 16, padding: 8 }}
                        onPress={() => setShowAvatarModal(false)}
                        hitSlop={12}
                    >
                        <Ionicons name="close-circle" size={32} color="#fff" />
                    </TouchableOpacity>
                </View>
            </Modal>
        </>
    );
}

function StatBlock({ label, value, showBadge, colors }: { label: string; value: number; showBadge?: boolean; colors: ThemeColors }) {
    return (
        <View style={{ alignItems: 'center' }}>
            <View style={{ position: 'relative' }}>
                <Text style={{ fontSize: 19, fontWeight: '700', color: colors.text }}>{value}</Text>
                {showBadge && <View style={{ position: 'absolute', top: -3, right: -10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.badge }} />}
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{label}</Text>
        </View>
    );
}

function MetaChip({ icon, text, colors }: { icon: string; text: string; colors: ThemeColors }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.chipBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
            <Ionicons name={icon as any} size={13} color={colors.textSecondary} />
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{text}</Text>
        </View>
    );
}

function Field({ label, value, onChange, placeholder, autoCapitalize, colors, error }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    colors: ThemeColors; error?: string;
}) {
    return (
        <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>{label}</Text>
            <TextInput
                style={{
                    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: error ? colors.danger : colors.border,
                    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                    fontSize: 15, color: colors.text,
                }}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize={autoCapitalize}
            />
            {error && (
                <Text style={{ fontSize: 12, color: colors.danger, marginTop: 6 }}>{error}</Text>
            )}
        </View>
    );
}

const createDynamicStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },

    card: {
        backgroundColor: colors.card,
        marginHorizontal: 14,
        marginTop: 10,
        borderRadius: 20,
        padding: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    settingsBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        padding: 4,
    },
    topRow: { flexDirection: 'row', alignItems: 'center' },
    avatarWrap: { position: 'relative', marginRight: 18 },
    avatar: {
        width: 78, height: 78, borderRadius: 39,
        borderWidth: 2.5, borderColor: colors.border,
    },
    avatarFallback: {
        width: 78, height: 78, borderRadius: 39,
        backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2.5, borderColor: colors.border,
    },
    onlineDot: {
        position: 'absolute', bottom: 2, right: 2,
        width: 13, height: 13, borderRadius: 7,
        backgroundColor: colors.success, borderWidth: 2.5, borderColor: colors.card,
    },
    statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },

    infoBlock: { marginTop: 16 },
    displayName: { fontSize: 20, fontWeight: '700', color: colors.text },
    handle: { fontSize: 14, color: colors.textSecondary, fontWeight: '500', marginTop: 2 },
    bio: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginTop: 8 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },

    btnRow: { flexDirection: 'row', marginTop: 18, gap: 10 },
    primaryBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12,
    },
    primaryBtnText: { color: colors.primaryText, fontWeight: '600', fontSize: 14 },
    dangerBtn: {
        backgroundColor: colors.dangerBg, paddingHorizontal: 14, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    tabBar: {
        flexDirection: 'row', marginHorizontal: 14, marginTop: 14,
        backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden',
        shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 13,
        borderBottomWidth: 2.5, borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: colors.tabActive },
    tabText: { fontSize: 13, fontWeight: '500', color: colors.textTertiary },
    tabTextActive: { color: colors.tabActive, fontWeight: '600' },

    grid: {
        flexDirection: 'row', flexWrap: 'wrap',
        paddingHorizontal: 14, paddingTop: 14, gap: GRID_GAP,
    },
    gridItem: {
        width: GRID_ITEM_SIZE, aspectRatio: 1, borderRadius: 12, overflow: 'hidden',
    },
    gridImage: { width: '100%', height: '100%', backgroundColor: colors.border },

    emptyWrap: { alignItems: 'center', paddingVertical: 56 },
    emptyCircle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: colors.chipBg,
        alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
    emptySub: { fontSize: 13, color: colors.textTertiary, marginTop: 4 },

    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%',
    },
    dragBar: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: colors.textTertiary,
        alignSelf: 'center', marginTop: 10, marginBottom: 4,
    },
    sheetHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    sheetCancel: { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
    sheetSave: { fontSize: 15, fontWeight: '700', color: colors.primary },
    sheetBody: { paddingHorizontal: 20 },

    avatarPreview: { alignItems: 'center', paddingVertical: 18 },
    previewImg: { width: 76, height: 76, borderRadius: 38, borderWidth: 2.5, borderColor: colors.border },
    changePhotoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    changePhotoLabel: { fontSize: 13, color: colors.primary, fontWeight: '600' },

    coverImage: {
        width: '100%', height: 110, borderRadius: 14,
        marginBottom: 12, backgroundColor: colors.border,
    },
    backgroundPicker: { alignItems: 'center', paddingBottom: 14 },
    backgroundPickerImg: {
        width: '100%', height: 90, borderRadius: 12,
        borderWidth: 1.5, borderColor: colors.border,
        overflow: 'hidden',
    },

    fieldGroup: { marginTop: 16 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
    input: {
        backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 15, color: colors.text,
    },
    chipRow: { flexDirection: 'row', gap: 10 },
    chip: {
        flex: 1, paddingVertical: 11, borderRadius: 12,
        borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.inputBg,
    },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.chipBg },
    chipText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
    chipTextActive: { color: colors.text, fontWeight: '600' },

    blockedRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10,
        shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    blockedAvatar: {
        width: 48, height: 48, borderRadius: 24,
        borderWidth: 2, borderColor: colors.border,
    },
    blockedAvatarFallback: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: colors.border,
    },
    blockedName: { fontSize: 15, fontWeight: '600', color: colors.text },
    blockedUsername: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    unblockBtn: {
        backgroundColor: colors.dangerBg, paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 10,
    },
    unblockBtnText: { fontSize: 13, fontWeight: '600', color: colors.danger },
});

