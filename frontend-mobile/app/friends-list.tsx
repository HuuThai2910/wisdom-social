import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import friendService from '../services/friendService';
import blockService from '../services/blockService';
import websocketService from '../services/websocketService';
import { User } from '../types';

export default function FriendsListScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const userId = params.userId as string;
    const [friends, setFriends] = useState<User[]>([]);
    const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState<'friends' | 'requests' | 'blocked'>('friends');

    // Use ref to always have the latest selectedTab in WebSocket handlers
    const selectedTabRef = useRef(selectedTab);
    useEffect(() => {
        selectedTabRef.current = selectedTab;
    }, [selectedTab]);

    const loadData = useCallback(async (tab?: 'friends' | 'requests' | 'blocked') => {
        const currentTab = tab || selectedTabRef.current;
        setIsLoading(true);
        try {
            if (currentTab === 'friends') {
                const friendsList = await friendService.getFriends(Number(userId));
                setFriends(friendsList);
            } else if (currentTab === 'requests') {
                const requestsList = await friendService.getFriendRequests(Number(userId));
                setFriends(requestsList);
            } else {
                const blocked = await blockService.getBlockedUsers(Number(userId));
                setBlockedUsers(blocked);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadData(selectedTab);
    }, [selectedTab, loadData]);

    useEffect(() => {
        if (!userId) return;

        const handleFriendRequest = () => loadData();
        const handleFriendAccept = () => loadData();
        const handleFriendCancel = () => loadData();
        const handleFriendReject = () => loadData();

        websocketService.on('friend-request', handleFriendRequest);
        websocketService.on('friend-accept', handleFriendAccept);
        websocketService.on('friend-cancel', handleFriendCancel);
        websocketService.on('friend-reject', handleFriendReject);

        return () => {
            websocketService.off('friend-request', handleFriendRequest);
            websocketService.off('friend-accept', handleFriendAccept);
            websocketService.off('friend-cancel', handleFriendCancel);
            websocketService.off('friend-reject', handleFriendReject);
        };
    }, [userId, loadData]);

    const handleAcceptRequest = async (friendId: number) => {
        const success = await friendService.acceptFriendRequest(friendId, Number(userId));
        if (success) {
            loadData(); // Reload list
        }
    };

    const handleRejectRequest = async (friendId: number) => {
        const success = await friendService.rejectFriendRequest(friendId, Number(userId));
        if (success) {
            loadData(); // Reload list
        }
    };

    const handleUnfriend = async (friendId: number) => {
        const success = await friendService.cancelFriendRequest(Number(userId), friendId);
        if (success) {
            loadData(); // Reload list
        }
    };

    const handleSendRequest = async (receiverId: number) => {
        const success = await friendService.sendFriendRequest(Number(userId), receiverId);
        if (success) {
            loadData();
        }
    };

    const handleUnblock = (blockedId: number) => {
        Alert.alert('Bỏ chặn', 'Bạn có chắc muốn bỏ chặn người dùng này?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Bỏ chặn', style: 'destructive',
                onPress: async () => {
                    const ok = await blockService.unblockUser(Number(userId), blockedId);
                    if (ok) {
                        setBlockedUsers(prev => prev.filter(u => u.id !== blockedId));
                    } else {
                        Alert.alert('Lỗi', 'Không thể bỏ chặn. Vui lòng thử lại.');
                    }
                },
            },
        ]);
    };

    const filteredBlockedUsers = blockedUsers.filter(user => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            user.name?.toLowerCase().includes(query) ||
            user.username?.toLowerCase().includes(query) ||
            user.phone?.includes(query)
        );
    });

    const renderFriend = ({ item }: { item: User }) => (
        <View style={styles.friendItem}>
            <TouchableOpacity style={styles.friendInfo} onPress={() => router.push(`/user-profile?userId=${item.id}` as any)}>
                {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={30} color="#9CA3AF" />
                    </View>
                )}
                <View style={styles.textInfo}>
                    <Text style={styles.name}>
                        {item.name || item.username || item.phone}
                    </Text>
                    {item.username && item.name && (
                        <Text style={styles.username}>@{item.username}</Text>
                    )}
                </View>
            </TouchableOpacity>

            {selectedTab === 'friends' ? (
                <TouchableOpacity
                    style={styles.unfriendButton}
                    onPress={() => handleUnfriend(item.id)}
                >
                    <Ionicons name="person-remove" size={20} color="#EF4444" />
                </TouchableOpacity>
            ) : selectedTab === 'requests' ? (
                <View style={styles.requestActions}>
                    <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleAcceptRequest(item.id)}
                    >
                        <Ionicons name="checkmark" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleRejectRequest(item.id)}
                    >
                        <Ionicons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            ) : null}
        </View>
    );

    const renderBlockedUser = ({ item }: { item: User }) => (
        <View style={styles.friendItem}>
            <TouchableOpacity style={styles.friendInfo} onPress={() => router.push(`/user-profile?userId=${item.id}` as any)}>
                {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={30} color="#9CA3AF" />
                    </View>
                )}
                <View style={styles.textInfo}>
                    <Text style={styles.name}>
                        {item.name || item.username || item.phone}
                    </Text>
                    {item.username && item.name && (
                        <Text style={styles.username}>@{item.username}</Text>
                    )}
                </View>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.unblockButton}
                onPress={() => handleUnblock(item.id)}
            >
                <Text style={styles.unblockText}>Bỏ chặn</Text>
            </TouchableOpacity>
        </View>
    );

    

    const getHeaderTitle = () => {
        switch (selectedTab) {
            case 'friends': return 'Bạn bè';
            case 'requests': return 'Lời mời kết bạn';
            case 'blocked': return 'Đã chặn';
            default: return 'Bạn bè';
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'friends' && styles.tabActive]}
                    onPress={() => setSelectedTab('friends')}
                >
                    <Text style={[styles.tabText, selectedTab === 'friends' && styles.tabTextActive]}>
                        Bạn bè
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'requests' && styles.tabActive]}
                    onPress={() => setSelectedTab('requests')}
                >
                    <Text style={[styles.tabText, selectedTab === 'requests' && styles.tabTextActive]}>
                        Lời mời
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'blocked' && styles.tabActive]}
                    onPress={() => setSelectedTab('blocked')}
                >
                    <Text style={[styles.tabText, selectedTab === 'blocked' && styles.tabTextActive]}>
                        Đã chặn
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search Input for blocked tab */}
            {selectedTab === 'blocked' && (
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm trong danh sách chặn..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#9CA3AF"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Content */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : selectedTab === 'blocked' ? (
                <FlatList
                    data={filteredBlockedUsers}
                    renderItem={renderBlockedUser}
                    keyExtractor={(item) => item.id.toString()}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="ban-outline" size={60} color="#D1D5DB" />
                            <Text style={styles.emptyText}>
                                {searchQuery ? 'Không tìm thấy' : 'Chưa chặn ai'}
                            </Text>
                        </View>
                    }
                />
            ) : friends.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons
                        name={selectedTab === 'friends' ? 'people-outline' : 'person-add-outline'}
                        size={60}
                        color="#D1D5DB"
                    />
                    <Text style={styles.emptyText}>
                        {selectedTab === 'friends' ? 'Chưa có bạn bè' : 'Không có lời mời'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={friends}
                    renderItem={renderFriend}
                    keyExtractor={(item) => item.id.toString()}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    placeholder: {
        width: 40,
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tab: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#3B82F6',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    tabTextActive: {
        color: '#3B82F6',
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#1F2937',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 15,
        color: '#6B7280',
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    friendInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    textInfo: {
        flex: 1,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    username: {
        fontSize: 13,
        color: '#6B7280',
    },
    unfriendButton: {
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#FEF2F2',
    },
    requestActions: {
        flexDirection: 'row',
        gap: 8,
    },
    acceptButton: {
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#10B981',
    },
    rejectButton: {
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#EF4444',
    },
    addButton: {
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#3B82F6',
    },
    unblockButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#FEF2F2',
    },
    unblockText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#EF4444',
    },
});
