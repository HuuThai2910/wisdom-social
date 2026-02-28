import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Post } from '../../types';

interface PostCardProps {
    post: Post;
}

export default function PostCard({ post }: PostCardProps) {
    const [isLiked, setIsLiked] = React.useState(post.isLiked);
    const [isSaved, setIsSaved] = React.useState(post.isSaved);
    const [likesCount, setLikesCount] = React.useState(post.likes);

    const handleLike = () => {
        setIsLiked(!isLiked);
        setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
                    <View>
                        <View style={styles.usernameRow}>
                            <Text style={styles.username}>{post.user.username}</Text>
                            {post.user.isVerified && (
                                <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
                            )}
                        </View>
                    </View>
                </View>
                <TouchableOpacity>
                    <Ionicons name="ellipsis-vertical" size={20} color="#000" />
                </TouchableOpacity>
            </View>

            {/* Image */}
            <Image source={{ uri: post.images[0] }} style={styles.postImage} />

            {/* Actions */}
            <View style={styles.actions}>
                <View style={styles.leftActions}>
                    <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
                        <Ionicons
                            name={isLiked ? 'heart' : 'heart-outline'}
                            size={28}
                            color={isLiked ? '#EF4444' : '#000'}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="chatbubble-outline" size={26} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="paper-plane-outline" size={26} color="#000" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setIsSaved(!isSaved)}>
                    <Ionicons
                        name={isSaved ? 'bookmark' : 'bookmark-outline'}
                        size={26}
                        color="#000"
                    />
                </TouchableOpacity>
            </View>

            {/* Likes */}
            <Text style={styles.likes}>{likesCount.toLocaleString()} likes</Text>

            {/* Caption */}
            {post.caption && (
                <View style={styles.captionContainer}>
                    <Text style={styles.caption}>
                        <Text style={styles.username}>{post.user.username}</Text>{' '}
                        {post.caption}
                    </Text>
                </View>
            )}

            {/* Comments */}
            {post.comments.length > 0 && (
                <TouchableOpacity>
                    <Text style={styles.viewComments}>
                        View all {post.comments.length} comments
                    </Text>
                </TouchableOpacity>
            )}

            {/* Time */}
            <Text style={styles.time}>{post.createdAt}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 12,
    },
    usernameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    username: {
        fontWeight: '600',
        fontSize: 14,
    },
    postImage: {
        width: '100%',
        height: 400,
        backgroundColor: '#f0f0f0',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
    },
    leftActions: {
        flexDirection: 'row',
        gap: 16,
    },
    actionButton: {
        padding: 0,
    },
    likes: {
        fontWeight: '600',
        fontSize: 14,
        paddingHorizontal: 12,
        marginBottom: 8,
    },
    captionContainer: {
        paddingHorizontal: 12,
        marginBottom: 8,
    },
    caption: {
        fontSize: 14,
        lineHeight: 18,
    },
    viewComments: {
        color: '#737373',
        fontSize: 14,
        paddingHorizontal: 12,
        marginBottom: 8,
    },
    time: {
        color: '#737373',
        fontSize: 12,
        paddingHorizontal: 12,
        marginBottom: 8,
    },
});
