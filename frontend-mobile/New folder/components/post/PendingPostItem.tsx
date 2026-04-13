import React from 'react';
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
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

interface PendingPostItemProps {
    post: Post;
    colors: ThemeColors;
    onApprove?: (postId: string) => void;
    onReject?: (postId: string) => void;
    onDelete?: (postId: string) => void;
}

export default function PendingPostItem({
    post,
    colors,
    onApprove,
    onReject,
    onDelete,
}: PendingPostItemProps) {
    const styles = createStyles(colors);

    return (
        <View style={styles.container}>
            <View style={styles.statusBadge}>
                <Ionicons name="time-outline" size={12} color={colors.warning} />
                <Text style={styles.statusText}>Chờ duyệt</Text>
            </View>

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
                        <View style={styles.metaRow}>
                            <Ionicons name="calendar-outline" size={12} color={colors.textTertiary} />
                            <Text style={styles.timestamp}>{formatDate(post.createdAt)}</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => onDelete?.(post.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="close" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
            </View>

            {post.caption && (
                <Text style={styles.caption} numberOfLines={4}>
                    {post.caption}
                </Text>
            )}

            {post.images && post.images.length > 0 ? (
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
            ) : (
                <View style={styles.noImageBadge}>
                    <Ionicons name="image-outline" size={14} color={colors.textTertiary} />
                    <Text style={styles.noImageText}>Không có ảnh</Text>
                </View>
            )}

            <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                    <Ionicons name="heart-outline" size={14} color={colors.textTertiary} />
                    <Text style={styles.infoText}>{post.likes || 0} lượt thích</Text>
                </View>
                <View style={styles.infoItem}>
                    <Ionicons name="chatbubble-outline" size={14} color={colors.textTertiary} />
                    <Text style={styles.infoText}>{post.comments?.length || 0} bình luận</Text>
                </View>
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => onApprove?.(post.id)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                    <Text style={[styles.actionBtnText, { color: colors.success }]}>
                        Phê duyệt
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => onReject?.(post.id)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                    <Text style={[styles.actionBtnText, { color: colors.danger }]}>
                        Từ chối
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
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
        borderWidth: 1,
        borderColor: colors.warning + '40',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.warning + '15',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.warning + '30',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.warning,
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
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: colors.border,
    },
    avatarFallback: {
        width: 44,
        height: 44,
        borderRadius: 22,
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
        maxWidth: SCREEN_WIDTH * 0.45,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    timestamp: {
        fontSize: 12,
        color: colors.textTertiary,
    },
    deleteButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
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
        marginHorizontal: 14,
        borderRadius: 12,
        overflow: 'hidden',
    },
    postImage: {
        width: '100%',
        height: 180,
        backgroundColor: colors.border,
    },
    imageCountBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    imageCountText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '600',
    },
    noImageBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginHorizontal: 14,
        paddingVertical: 16,
        backgroundColor: colors.chipBg,
        borderRadius: 12,
    },
    noImageText: {
        fontSize: 13,
        color: colors.textTertiary,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingHorizontal: 14,
        paddingTop: 12,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    infoText: {
        fontSize: 12,
        color: colors.textTertiary,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
        padding: 14,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
    },
    approveBtn: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
    },
    rejectBtn: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
