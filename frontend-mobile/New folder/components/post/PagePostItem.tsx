import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Post } from '../../types';
import type { ThemeColors } from '../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const S3_BASE = 'https://cnmt-hk1-amz.s3.ap-southeast-1.amazonaws.com/';

const buildS3Url = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;
    return S3_BASE + url;
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

interface PagePostItemProps {
    post: Post;
    colors: ThemeColors;
    showDeleteButton?: boolean;
    onDelete?: (postId: string) => void;
    onPress?: (post: Post) => void;
}

export default function PagePostItem({
    post,
    colors,
    showDeleteButton = false,
    onDelete,
    onPress,
}: PagePostItemProps) {
    const [isLiked, setIsLiked] = useState(post.isLiked);
    const [likesCount, setLikesCount] = useState(post.likes);

    const handleLike = () => {
        setIsLiked(!isLiked);
        setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    };

    const styles = createStyles(colors);

    return (
        <TouchableOpacity
            style={styles.container}
            activeOpacity={onPress ? 0.9 : 1}
            onPress={() => onPress?.(post)}
        >
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    {post.user?.avatarUrl ? (
                        <Image
                            source={{ uri: buildS3Url(post.user.avatarUrl) }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={styles.avatarFallback}>
                            <Ionicons name="person" size={18} color={colors.textTertiary} />
                        </View>
                    )}
                    <View style={styles.userDetails}>
                        <View style={styles.usernameRow}>
                            <Text style={styles.username} numberOfLines={1}>
                                {post.user?.name || post.user?.username || 'Ẩn danh'}
                            </Text>
                            {post.user?.isVerified && (
                                <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
                            )}
                        </View>
                        <Text style={styles.timestamp}>{formatDate(post.createdAt)}</Text>
                    </View>
                </View>

                {showDeleteButton && (
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => onDelete?.(post.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                )}
            </View>

            {post.caption && (
                <Text style={styles.caption} numberOfLines={3}>
                    {post.caption}
                </Text>
            )}

            {post.images && post.images.length > 0 && (
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: buildS3Url(post.images[0]) }}
                        style={styles.postImage}
                        resizeMode="cover"
                    />
                    {post.images.length > 1 && (
                        <View style={styles.imageCountBadge}>
                            <Ionicons name="images" size={12} color="#fff" />
                            <Text style={styles.imageCountText}>+{post.images.length - 1}</Text>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.footer}>
                <View style={styles.statsRow}>
                    <TouchableOpacity style={styles.statItem} onPress={handleLike}>
                        <Ionicons
                            name={isLiked ? 'heart' : 'heart-outline'}
                            size={20}
                            color={isLiked ? '#EF4444' : colors.textSecondary}
                        />
                        <Text style={[styles.statText, isLiked && { color: '#EF4444' }]}>
                            {likesCount}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.statItem}>
                        <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                        <Text style={styles.statText}>{post.comments?.length || 0}</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        paddingBottom: 10,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 2,
        borderColor: colors.border,
    },
    avatarFallback: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.chipBg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.border,
    },
    userDetails: {
        marginLeft: 12,
        flex: 1,
    },
    usernameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    username: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        maxWidth: SCREEN_WIDTH * 0.5,
    },
    timestamp: {
        fontSize: 12,
        color: colors.textTertiary,
        marginTop: 2,
    },
    deleteButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.chipBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    caption: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
        paddingHorizontal: 14,
        paddingBottom: 10,
    },
    imageContainer: {
        position: 'relative',
    },
    postImage: {
        width: '100%',
        height: 240,
        backgroundColor: colors.border,
    },
    imageCountBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    imageCountText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
    },
    footer: {
        padding: 14,
        paddingTop: 10,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
});
