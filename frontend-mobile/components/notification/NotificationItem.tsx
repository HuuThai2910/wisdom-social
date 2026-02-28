import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import type { Notification } from '../../types';

interface NotificationItemProps {
    notification: Notification;
}

export default function NotificationItem({ notification }: NotificationItemProps) {
    return (
        <TouchableOpacity
            style={[styles.container, !notification.isRead && styles.unread]}
        >
            <Image source={{ uri: notification.user.avatar }} style={styles.avatar} />
            <View style={styles.content}>
                <Text style={styles.text}>
                    <Text style={styles.username}>{notification.user.username}</Text>{' '}
                    {notification.message}
                    {' '}
                    <Text style={styles.time}>{notification.createdAt}</Text>
                </Text>
            </View>
            {notification.post && (
                <Image
                    source={{ uri: notification.post.images[0] }}
                    style={styles.postImage}
                />
            )}
            {notification.type === 'follow' && (
                <TouchableOpacity style={styles.followButton}>
                    <Text style={styles.followButtonText}>Follow</Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#fff',
    },
    unread: {
        backgroundColor: '#EFF6FF',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    text: {
        fontSize: 14,
        lineHeight: 18,
    },
    username: {
        fontWeight: '600',
    },
    time: {
        color: '#737373',
    },
    postImage: {
        width: 44,
        height: 44,
        marginLeft: 8,
    },
    followButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 8,
    },
    followButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
});
