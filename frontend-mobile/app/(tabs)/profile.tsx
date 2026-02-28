import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Modal,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import userService from '../../services/userService';
import friendService from '../../services/friendService';
import websocketService from '../../services/websocketService';
import { mockPosts } from '../../constants/mockData';
import type { Post } from '../../types';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout, updateUser } = useAuth();
    const [selectedTab, setSelectedTab] = useState<'posts' | 'saved'>('posts');
    const [isLoading, setIsLoading] = useState(false);
    const [profileData, setProfileData] = useState<any>(null);
    const [friendsCount, setFriendsCount] = useState(0);
    const [requestsCount, setRequestsCount] = useState(0);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        username: '',
        bio: '',
        birthday: '',
        gender: '',
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
            if (profile) {
                setProfileData(profile);
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadFriendsData = async () => {
        try {
            if (user?.id || profileData?.id) {
                const userId = profileData?.id || user?.id;
                const friends = await friendService.getFriends(userId);
                const requests = await friendService.getFriendRequests(userId);
                setFriendsCount(friends.length);
                setRequestsCount(requests.length);
            }
        } catch (error) {
            console.error('Failed to load friends data:', error);
        }
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };

    const handleEditProfile = () => {
        setEditForm({
            name: displayUser?.name || '',
            username: displayUser?.username || '',
            bio: displayUser?.bio || '',
            birthday: displayUser?.birthday || '',
            gender: displayUser?.gender || '',
        });
        setShowEditModal(true);
    };

    const handleSaveProfile = async () => {
        const userId = displayUser?.id;
        if (!userId) return;
        setIsSaving(true);
        try {
            const success = await userService.updateProfile(userId, {
                name: editForm.name || undefined,
                username: editForm.username || undefined,
                bio: editForm.bio || undefined,
                birthday: editForm.birthday || undefined,
                gender: editForm.gender || undefined,
            });
            if (success) {
                setShowEditModal(false);
                await loadProfile();
                await updateUser({ ...displayUser, ...editForm });
            } else {
                Alert.alert('Error', 'Failed to update profile. Please try again.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleViewFriends = () => {
        const userId = profileData?.id || user?.id;
        if (userId) {
            router.push(`/friends-list?userId=${userId}` as any);
        }
    };

    const displayUser = profileData || user;
    
    // For now, still using mock posts until posts are integrated with backend
    const userPosts = mockPosts.filter((post: Post) => displayUser && post.user.id === displayUser.id?.toString());
    const savedPosts = mockPosts.filter((post: Post) => post.isSaved);

    const displayPosts = selectedTab === 'posts' ? userPosts : savedPosts;

    if (isLoading && !profileData) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
        );
    }

    if (!displayUser) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>No user data available</Text>
            </View>
        );
    }

    return (
        <>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Profile Header */}
            <View style={styles.header}>
                <View style={styles.statsContainer}>
                    <View style={styles.avatarContainer}>
                        {displayUser.avatarUrl ? (
                            <Image 
                                source={{ uri: displayUser.avatarUrl }} 
                                style={styles.avatar} 
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={50} color="#9CA3AF" />
                            </View>
                        )}
                    </View>
                    <View style={styles.stats}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{displayUser.postsCount || 0}</Text>
                            <Text style={styles.statLabel}>posts</Text>
                        </View>
                        <TouchableOpacity style={styles.statItem} onPress={handleViewFriends}>
                            <Text style={styles.statNumber}>
                                {friendsCount}
                            </Text>
                            <Text style={styles.statLabel}>friends</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.statItem} onPress={handleViewFriends}>
                            <View style={styles.statNumberContainer}>
                                <Text style={styles.statNumber}>{requestsCount}</Text>
                                {requestsCount > 0 && (
                                    <View style={styles.redDot} />
                                )}
                            </View>
                            <Text style={styles.statLabel}>requests</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.fullName}>
                            {displayUser.name || displayUser.username || displayUser.phone}
                        </Text>
                        {displayUser.username && (
                            <Text style={styles.username}>@{displayUser.username}</Text>
                        )}
                    </View>
                    {displayUser.bio && <Text style={styles.bio}>{displayUser.bio}</Text>}
                    {displayUser.birthday && (
                        <Text style={styles.infoText}>
                            <Ionicons name="calendar-outline" size={14} color="#6B7280" /> {displayUser.birthday}
                        </Text>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                        <Text style={styles.editButtonText}>Edit Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'posts' && styles.tabActive]}
                    onPress={() => setSelectedTab('posts')}
                >
                    <Ionicons
                        name="grid-outline"
                        size={24}
                        color={selectedTab === 'posts' ? '#000' : '#737373'}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'saved' && styles.tabActive]}
                    onPress={() => setSelectedTab('saved')}
                >
                    <Ionicons
                        name="bookmark-outline"
                        size={24}
                        color={selectedTab === 'saved' ? '#000' : '#737373'}
                    />
                </TouchableOpacity>
            </View>

            {/* Posts Grid */}
            <View style={styles.postsGrid}>
                {displayPosts.map((post: Post) => (
                    <TouchableOpacity key={post.id} style={styles.postItem}>
                        <Image source={{ uri: post.images[0] }} style={styles.postImage} />
                    </TouchableOpacity>
                ))}
            </View>

            {displayPosts.length === 0 && (
                <View style={styles.emptyState}>
                    <Ionicons name="camera-outline" size={80} color="#D1D5DB" />
                    <Text style={styles.emptyText}>
                        {selectedTab === 'posts' ? 'No posts yet' : 'No saved posts'}
                    </Text>
                </View>
            )}
        </ScrollView>

        {/* Edit Profile Modal */}
        <Modal
            visible={showEditModal}
            animationType="slide"
            transparent
            onRequestClose={() => setShowEditModal(false)}
        >
            <KeyboardAvoidingView
                style={styles.modalOverlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowEditModal(false)}>
                            <Text style={styles.modalCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Edit Profile</Text>
                        <TouchableOpacity onPress={handleSaveProfile} disabled={isSaving}>
                            <Text style={[styles.modalSave, isSaving && styles.modalSaveDisabled]}>
                                {isSaving ? 'Saving...' : 'Save'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                        <Text style={styles.fieldLabel}>Name</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={editForm.name}
                            onChangeText={(v) => setEditForm(f => ({ ...f, name: v }))}
                            placeholder="Your name"
                            placeholderTextColor="#9CA3AF"
                        />

                        <Text style={styles.fieldLabel}>Username</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={editForm.username}
                            onChangeText={(v) => setEditForm(f => ({ ...f, username: v }))}
                            placeholder="@username"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="none"
                        />

                        <Text style={styles.fieldLabel}>Bio</Text>
                        <TextInput
                            style={[styles.fieldInput, styles.fieldInputMultiline]}
                            value={editForm.bio}
                            onChangeText={(v) => setEditForm(f => ({ ...f, bio: v }))}
                            placeholder="Tell something about you"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            numberOfLines={3}
                        />

                        <Text style={styles.fieldLabel}>Birthday</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={editForm.birthday}
                            onChangeText={(v) => setEditForm(f => ({ ...f, birthday: v }))}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#9CA3AF"
                        />

                        <Text style={styles.fieldLabel}>Gender</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={editForm.gender}
                            onChangeText={(v) => setEditForm(f => ({ ...f, gender: v }))}
                            placeholder="male / female / other"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="none"
                        />
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
    },
    header: {
        padding: 16,
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarContainer: {
        marginRight: 24,
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
    },
    avatarPlaceholder: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stats: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statNumberContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    statLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    redDot: {
        position: 'absolute',
        top: -2,
        right: -8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
    },
    userInfo: {
        marginBottom: 16,
    },
    nameRow: {
        marginBottom: 4,
    },
    fullName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 2,
    },
    username: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    bio: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
        marginBottom: 8,
    },
    infoText: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 4,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    editButton: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    editButtonText: {
        fontWeight: '600',
        fontSize: 14,
        color: '#1F2937',
    },
    logoutButton: {
        backgroundColor: '#FEF2F2',
        padding: 10,
        borderRadius: 8,
        width: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabs: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#1F2937',
    },
    postsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 1,
    },
    postItem: {
        width: '33.33%',
        aspectRatio: 1,
        padding: 1,
    },
    postImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F3F4F6',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    modalCancel: {
        fontSize: 15,
        color: '#6B7280',
    },
    modalSave: {
        fontSize: 15,
        fontWeight: '700',
        color: '#3B82F6',
    },
    modalSaveDisabled: {
        color: '#93C5FD',
    },
    modalBody: {
        padding: 16,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginTop: 12,
        marginBottom: 4,
    },
    fieldInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: '#1F2937',
    },
    fieldInputMultiline: {
        height: 80,
        textAlignVertical: 'top',
    },
});
