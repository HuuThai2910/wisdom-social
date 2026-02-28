import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mockUsers } from '../../constants/mockData';
import type { User } from '../../types';

export default function SearchScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState(mockUsers);

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (text.trim() === '') {
            setFilteredUsers(mockUsers);
        } else {
            const filtered = mockUsers.filter(
                (user: User) =>
                    (user.username && user.username.toLowerCase().includes(text.toLowerCase())) ||
                    (user.fullName && user.fullName.toLowerCase().includes(text.toLowerCase())) ||
                    (user.name && user.name.toLowerCase().includes(text.toLowerCase()))
            );
            setFilteredUsers(filtered);
        }
    };

    const renderUser = ({ item }: { item: User }) => (
        <TouchableOpacity style={styles.userItem}>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View style={styles.userInfo}>
                <View style={styles.usernameRow}>
                    <Text style={styles.username}>{item.username}</Text>
                    {item.isVerified && (
                        <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
                    )}
                </View>
                <Text style={styles.fullName}>{item.fullName}</Text>
                <Text style={styles.followers}>
                    {(item.followersCount || 0).toLocaleString()} followers
                </Text>
            </View>
            <TouchableOpacity style={styles.followButton}>
                <Text style={styles.followButtonText}>Follow</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#737373" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search"
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoCapitalize="none"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch('')}>
                        <Ionicons name="close-circle" size={20} color="#737373" />
                    </TouchableOpacity>
                )}
            </View>

            {/* User List */}
            <FlatList
                data={filteredUsers}
                renderItem={renderUser}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F3F4F6',
        margin: 12,
        borderRadius: 8,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
    },
    listContainer: {
        padding: 12,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    usernameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    username: {
        fontWeight: '600',
        fontSize: 14,
    },
    fullName: {
        color: '#737373',
        fontSize: 14,
        marginBottom: 2,
    },
    followers: {
        color: '#737373',
        fontSize: 12,
    },
    followButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    followButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
});
