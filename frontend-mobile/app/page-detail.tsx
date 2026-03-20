import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import pageService from '../services/pageService';
import type { PageData, UpdatePageRequest, PageRole, PageMemberData, PagePost } from '../services/pageService';
import type { ThemeColors } from '../contexts/ThemeContext';
import userService from '../services/userService';
import { Post, User } from '@/types';

const PAGE_ROLES: { label: string; value: PageRole }[] = [
    { label: 'Admin', value: 'ADMIN' },
    { label: 'Editor', value: 'EDITOR' },
    { label: 'Moderator', value: 'MODERATOR' },
    { label: 'Analyst', value: 'ANALYST' },
    { label: 'User', value: 'USER' },
];

const S3_BASE = 'https://cnmt-hk1-amz.s3.ap-southeast-1.amazonaws.com/';
const buildS3Url = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) return url;
    return S3_BASE + url;
};

const { width: screenWidth } = Dimensions.get('window');
const POST_IMAGE_WIDTH = screenWidth * 0.75; // 75% màn hình cho mỗi ảnh

export default function PageDetailScreen() {
    const router = useRouter();
    const { pageId } = useLocalSearchParams<{ pageId: string }>();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { user } = useAuth();
    const [page, setPage] = useState<PageData | null>(null);
    const [members, setMembers] = useState<PageMemberData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [followCount, setFollowCount] = useState(0);
    const [activeSection, setActiveSection] = useState<'info' | 'members' | 'posts'>('info');
    const [posts, setPosts] = useState<any[]>([]);
    const [postsWaiting, setPostsWaiting] = useState<Post[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);
    const [isLoadingWaitingPosts, setIsLoadingWaitingPosts] = useState(false);
    const [usersCache, setUsersCache] = useState<Map<string, any>>(new Map());

    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [postContent, setPostContent] = useState('');
    const [postImages, setPostImages] = useState<{ uri: string; name: string; type: string }[]>([]);
    const [isCreatingPost, setIsCreatingPost] = useState(false);

    const [showEditModal, setShowEditModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarLocalUri, setAvatarLocalUri] = useState('');
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [coverLocalUri, setCoverLocalUri] = useState('');
    const [pendingAvatarAsset, setPendingAvatarAsset] = useState<{ uri: string; mimeType: string; extension: string } | null>(null);
    const [pendingCoverAsset, setPendingCoverAsset] = useState<{ uri: string; mimeType: string; extension: string } | null>(null);
    const [editForm, setEditForm] = useState({
        name: '', username: '', category: '', description: '',
        avatarUrl: '', coverUrl: '', phone: '', email: '', website: '', address: '',
    });

    const [showMemberModal, setShowMemberModal] = useState(false);
    const [memberUsername, setMemberUsername] = useState('');
    const [memberRole, setMemberRole] = useState<PageRole>('USER');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

    const styles = createStyles(colors);
    const isOwner = page?.createdBy?.id === user?.id;

    const [userMap, setUserMap] = useState<Record<string, User>>({});
    const [postApproveMap, setPostApproveMap] = useState<Record<string, PagePost>>({});

    useEffect(() => {
        if (pageId) loadAll();
    }, [pageId]);

    // Tìm kiếm user khi nhập username
    useEffect(() => {
        const searchUsers = async () => {
            if (!memberUsername || memberUsername.length < 2) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const results = await userService.getUserByUsername(memberUsername);
                if (results && Array.isArray(results)) {
                    // Lọc bỏ những user đã là thành viên của page
                    const memberIds = members.map(m => m.user.id);
                    const filteredResults = results.filter(u => !memberIds.includes(u.id));
                    setSearchResults(filteredResults);
                } else {
                    setSearchResults([]);
                }
            } catch (error) {
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(searchUsers, 300);
        return () => clearTimeout(timeoutId);
    }, [memberUsername, members]);

    useEffect(() => {
        if (pageId && activeSection === 'posts') {
            loadPosts();
        }
        if (pageId && activeSection === 'info' && isOwner) {
            loadWaitingPosts();
        }
    }, [pageId, activeSection, isOwner]);

    const getUserInfo = useCallback(async (authorId: string): Promise<User|null> => {
        const profile = await userService.getUserById(Number(authorId));
        return profile||null;
    }, []);

    // Optimize: Memoize user fetching để tránh fetch lại khi đã có data
    useEffect(() => {
        const fetchUsers = async () => {
            const uniqueIds = [...new Set(posts.map(p => p.authorId))];
            const idsToFetch = uniqueIds.filter(id => !userMap[id]);

            if (idsToFetch.length === 0) return;

            const results = await Promise.all(
                idsToFetch.map(id => getUserInfo(id))
            );

            const newMap: Record<string, User> = { ...userMap };
            idsToFetch.forEach((id, index) => {
                if (results[index]) {
                    newMap[id] = results[index]!;
                }
            });

            setUserMap(newMap);
        };

        if (posts.length > 0) {
            fetchUsers();
        }
    }, [posts, getUserInfo]);


    const fetchPagePosts = useCallback(async (postId: string, pageId: number) => {
        if (!pageId) return;
        const data = await pageService.getPagePostByIdandPostId(postId, pageId);
        return data;
    }, []);

    // Fix: Đổi dependency từ postsWaiting thành posts để fetch đúng data
    useEffect(() => {
        const fetchPostsApproval = async () => {
            const uniqueIds = [...new Set(posts.map(p => p.id))];
            const idsToFetch = uniqueIds.filter(id => !postApproveMap[id]);

            if (idsToFetch.length === 0) return;

            const results = await Promise.all(
                idsToFetch.map(id => fetchPagePosts(id, Number(pageId)))
            );

            const newMap: Record<string, PagePost> = { ...postApproveMap };
            idsToFetch.forEach((id, index) => {
                if (results[index]) {
                    newMap[id] = results[index]!;
                }
            });
            setPostApproveMap(newMap);
        };

        if (posts.length > 0 && pageId) {
            fetchPostsApproval();
        }
    }, [posts, pageId, fetchPagePosts]);

    const loadAll = async () => {
        setIsLoading(true);
        try {
            const [pageData, membersData, interactionData] = await Promise.all([
                pageService.findPageById(Number(pageId)),
                pageService.getPageMembers(Number(pageId)),
                pageService.getPageInteractionStatus(Number(pageId)),
            ]);
            setPage(pageData);
            setMembers(Array.isArray(membersData) ? membersData : []);
            setIsLiked(interactionData.isLiked);
            setIsFollowing(interactionData.isFollowing);
            setLikeCount(interactionData.likeCount);
            setFollowCount(interactionData.followCount);
        } catch {
        } finally {
            setIsLoading(false);
        }
    };

    const loadPosts = async () => {
        if (!pageId) return;
        setIsLoadingPosts(true);
        try {
            const data = await pageService.getAllPostsOfPage(Number(pageId));
            setPosts(data);
            // Load user info for all posts
            await loadPostsUserInfo(data);
        } catch (error) {
            console.error('Error loading posts:', error);
        } finally {
            setIsLoadingPosts(false);
        }
    };

    const loadWaitingPosts = async () => {
        if (!pageId) return;
        setIsLoadingWaitingPosts(true);
        try {
            const data = await pageService.getAllPostsWaitingForApprove(Number(pageId));
            setPostsWaiting(data);
            // Load user info for all waiting posts
            await loadPostsUserInfo(data);
        } catch (error) {
            console.error('Error loading waiting posts:', error);
        } finally {
            setIsLoadingWaitingPosts(false);
        }
    };

    const loadPostsUserInfo = async (posts: any[]) => {
        const newCache = new Map(usersCache);
        const authorIds = posts
            .map(p => p.authorId)
            .filter((id, idx, arr) => id && arr.indexOf(id) === idx && !usersCache.has(id));

        for (const authorId of authorIds) {
            try {
                // Fallback: show authorId if user not found
                if (authorId && !newCache.has(authorId)) {
                    // Mock user info if not available from API
                    newCache.set(authorId, {
                        id: Number(authorId),
                        name: `User #${authorId}`,
                        username: `user${authorId}`,
                        avatarUrl: undefined,
                    });
                }
            } catch (error) {
                console.error('Error loading user:', error);
            }
        }
        setUsersCache(newCache);
    };



    const handleLike = async () => {
        if (!user?.id || !page) return;
        try {
            if (isLiked) {
                await pageService.cancelLikePage(user.id, page.id);
                setIsLiked(false);
                setLikeCount(prev => Math.max(0, prev - 1));
            } else {
                await pageService.likePage(user.id, page.id);
                setIsLiked(true);
                setLikeCount(prev => prev + 1);
            }
        } catch {
            Alert.alert('Lỗi', 'Thao tác thất bại.');
        }
    };

    const handleFollow = async () => {
        if (!user?.id || !page) return;
        try {
            if (isFollowing) {
                await pageService.cancelFollowPage(user.id, page.id);
                setIsFollowing(false);
                setFollowCount(prev => Math.max(0, prev - 1));
            } else {
                await pageService.followPage(user.id, page.id);
                setIsFollowing(true);
                setFollowCount(prev => prev + 1);
            }
        } catch {
            Alert.alert('Lỗi', 'Thao tác thất bại.');
        }
    };

    const handleOpenEdit = () => {
        if (!page) return;
        setEditForm({
            name: page.name || '', username: page.username || '',
            category: page.category || '', description: page.description || '',
            avatarUrl: page.avatarUrl || '', coverUrl: page.coverUrl || '',
            phone: page.phone || '', email: page.email || '',
            website: page.website || '', address: page.address || '',
        });
        setAvatarLocalUri('');
        setCoverLocalUri('');
        setPendingAvatarAsset(null);
        setPendingCoverAsset(null);
        setShowEditModal(true);
    };

    const pickAvatarImage = async () => {
        if (!page) return;
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

    const pickCoverImage = async () => {
        if (!page) return;
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
        setCoverLocalUri(asset.uri);
        setPendingCoverAsset({ uri: asset.uri, mimeType, extension });
    };

    const handleSaveEdit = async () => {
        if (!page) return;
        setIsSaving(true);
        try {
            let newAvatarUrl: string | undefined = editForm.avatarUrl || undefined;
            let newCoverUrl: string | undefined = editForm.coverUrl || undefined;

            if (pendingAvatarAsset) {
                setIsUploadingAvatar(true);
                const uploadUrl = await pageService.getUpdateUploadUrl('pages', page.id, pendingAvatarAsset.extension);
                if (!uploadUrl) throw new Error();
                const blob = await fetch(pendingAvatarAsset.uri).then(r => r.blob());
                const uploadRes = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': pendingAvatarAsset.mimeType },
                    body: blob,
                });
                if (!uploadRes.ok) throw new Error();
                const updatedPage = await pageService.findPageById(page.id);
                newAvatarUrl = updatedPage?.avatarUrl;
                setIsUploadingAvatar(false);
            }

            if (pendingCoverAsset) {
                setIsUploadingCover(true);
                const uploadUrl = await pageService.getUpdateCoverUploadUrl('pages', page.id, pendingCoverAsset.extension);
                if (!uploadUrl) throw new Error();
                const blob = await fetch(pendingCoverAsset.uri).then(r => r.blob());
                const uploadRes = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': pendingCoverAsset.mimeType },
                    body: blob,
                });
                if (!uploadRes.ok) throw new Error();
                const updatedPage = await pageService.findPageById(page.id);
                newCoverUrl = updatedPage?.coverUrl;
                setIsUploadingCover(false);
            }

            const payload: UpdatePageRequest = {
                name: editForm.name || undefined,
                username: editForm.username || undefined,
                category: editForm.category || undefined,
                description: editForm.description || undefined,
                avatarUrl: newAvatarUrl,
                coverUrl: newCoverUrl,
                phone: editForm.phone || undefined,
                email: editForm.email || undefined,
                website: editForm.website || undefined,
                address: editForm.address || undefined,
            };
            await pageService.updatePage(page.id, payload);
            setPendingAvatarAsset(null);
            setPendingCoverAsset(null);
            setShowEditModal(false);
            await loadAll();
            Alert.alert('Thành công', 'Đã cập nhật trang.');
        } catch {
            Alert.alert('Lỗi', 'Không thể cập nhật trang.');
        } finally {
            setIsSaving(false);
            setIsUploadingAvatar(false);
            setIsUploadingCover(false);
        }
    };

    const handleDelete = () => {
        if (!page) return;
        Alert.alert('Xóa trang', 'Bạn có chắc chắn muốn xóa trang này?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive',
                onPress: async () => {
                    try {
                        await pageService.deletePage(page.id);
                        Alert.alert('Thành công', 'Đã xóa trang.');
                        router.back();
                    } catch {
                        Alert.alert('Lỗi', 'Không thể xóa trang.');
                    }
                },
            },
        ]);
    };



    const handleAddMember = async () => {
        if (!page || selectedUsers.length === 0) {
            Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một người dùng.');
            return;
        }

        try {
            // Thêm tất cả người dùng đã chọn
            await Promise.all(
                selectedUsers.map(user =>
                    pageService.addMember({
                        userId: Number(user.id),
                        pageId: page.id,
                        pageRole: memberRole,
                    })
                )
            );

            setShowMemberModal(false);
            setMemberUsername('');
            setSearchResults([]);
            setSelectedUsers([]);
            await loadAll();
            Alert.alert(
                'Thành công',
                `Đã thêm ${selectedUsers.length} thành viên vào trang.`
            );
        } catch {
            Alert.alert('Lỗi', 'Không thể thêm thành viên.');
        }
    };

    const handleRemoveMember = (memberId: number, memberName: string) => {
        if (!page) return;
        Alert.alert('Xóa thành viên', `Xóa ${memberName} khỏi trang?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive',
                onPress: async () => {
                    try {
                        const res=await pageService.deleteMember(page.id, memberId);
                        await loadAll();
                    } catch {
                        Alert.alert('Lỗi', 'Không thể xóa thành viên.');
                    }
                },
            },
        ]);
    };

    const handleApprovePost = async (postId: string) => {
        if (!user?.id || !page) return;
        try {
            await pageService.approvePostPage(user.id, page.id, postId);
            Alert.alert('Thành công', 'Đã phê duyệt bài viết.');
            await loadWaitingPosts();
            await loadPosts();
        } catch {
            Alert.alert('Lỗi', 'Không thể phê duyệt bài viết.');
        }
    };

    const handleCancelApprovePost = async (postId: string) => {
        if (!user?.id || !page) return;
        try {
            await pageService.cancelApprovePostPage(user.id, page.id, postId);
            Alert.alert('Thành công', 'Đã hủy phê duyệt bài viết.');
            await loadWaitingPosts();
        } catch {
            Alert.alert('Lỗi', 'Không thể hủy phê duyệt bài viết.');
        }
    };

    const handleRemovePost = (postId: string, postCaption: string) => {
        if (!user?.id || !page) return;
        Alert.alert('Xóa bài viết', `Xóa bài viết?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive',
                onPress: async () => {
                    try {
                        await pageService.removePostPage(user.id, page.id, postId);
                        Alert.alert('Thành công', 'Đã xóa bài viết.');
                        await loadPosts();
                        await loadWaitingPosts();
                    } catch {
                        Alert.alert('Lỗi', 'Không thể xóa bài viết.');
                    }
                },
            },
        ]);
    };

    const handleApproveAll = async () => {
        if (!user?.id || !page) return;
        Alert.alert('Phê duyệt tất cả', 'Phê duyệt tất cả bài viết chờ?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Phê duyệt',
                onPress: async () => {
                    try {
                        await pageService.approveAllPosts(user.id, page.id);
                        Alert.alert('Thành công', 'Đã phê duyệt tất cả.');
                        await loadWaitingPosts();
                        await loadPosts();
                    } catch {
                        Alert.alert('Lỗi', 'Không thể phê duyệt tất cả.');
                    }
                },
            },
        ]);
    };

    const handleCancelAll = async () => {
        if (!user?.id || !page) return;
        Alert.alert('Hủy duyệt tất cả', 'Hủy duyệt tất cả bài viết?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Hủy duyệt', style: 'destructive',
                onPress: async () => {
                    try {
                        await pageService.cancelAllPosts(user.id, page.id);
                        Alert.alert('Thành công', 'Đã hủy duyệt tất cả.');
                        await loadWaitingPosts();
                    } catch {
                        Alert.alert('Lỗi', 'Không thể hủy duyệt tất cả.');
                    }
                },
            },
        ]);
    };

    const pickPostImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
        });
        if (!result.canceled && result.assets) {
            const newImages = result.assets.map((asset, idx) => ({
                uri: asset.uri,
                name: `post_image_${Date.now()}_${idx}.jpg`,
                type: asset.mimeType || 'image/jpeg',
            }));
            setPostImages(prev => [...prev, ...newImages]);
        }
    };

    const removePostImage = (index: number) => {
        setPostImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleCreatePost = async () => {
        if (!user?.id || !page) return;
        if (!postContent.trim() && postImages.length === 0) {
            Alert.alert('Lỗi', 'Vui lòng nhập nội dung hoặc chọn hình ảnh.');
            return;
        }

        setIsCreatingPost(true);
        try {
            const postData = {
                content: postContent,
                privacy: 'PUBLIC',
                allowComments: true,
                allowShares: true,
            };

            await pageService.addPostPage(page.id, postData, postImages);
            Alert.alert('Thành công', 'Đã tạo bài viết.');
            setShowCreatePostModal(false);
            setPostContent('');
            setPostImages([]);
            await loadWaitingPosts();
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể tạo bài viết.');
        } finally {
            setIsCreatingPost(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!page) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
                <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Không tìm thấy trang</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{page.name}</Text>
                {isOwner ? (
                    <TouchableOpacity onPress={handleOpenEdit} hitSlop={12}>
                        <Ionicons name="create-outline" size={22} color={colors.primary} />
                    </TouchableOpacity>
                ) : <View style={{ width: 24 }} />}
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
                {page.coverUrl ? (
                    <Image source={{ uri: buildS3Url(page.coverUrl) }} style={styles.coverImage} />
                ) : (
                    <View style={styles.coverPlaceholder}>
                        <Ionicons name="image-outline" size={32} color={colors.textTertiary} />
                    </View>
                )}

                <View style={styles.profileCard}>
                    <View style={styles.avatarSection}>
                        {page.avatarUrl ? (
                            <Image source={{ uri: buildS3Url(page.avatarUrl) }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Ionicons name="flag" size={36} color={colors.textTertiary} />
                            </View>
                        )}
                    </View>

                    <View style={styles.nameSection}>
                        <View style={styles.nameRow}>
                            <Text style={styles.pageName}>{page.name}</Text>
                            {page.isVerified && <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />}
                        </View>
                        {page.username ? <Text style={styles.usernameText}>@{page.username}</Text> : null}
                        {page.category ? (
                            <View style={styles.categoryChip}>
                                <Text style={styles.categoryText}>{page.category}</Text>
                            </View>
                        ) : null}
                    </View>

                    {page.description ? <Text style={styles.description}>{page.description}</Text> : null}

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{likeCount}</Text>
                            <Text style={styles.statLabel}>lượt thích</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{followCount}</Text>
                            <Text style={styles.statLabel}>theo dõi</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{members.length}</Text>
                            <Text style={styles.statLabel}>thành viên</Text>
                        </View>
                    </View>

                    {page.status ? (
                        <View style={styles.statusRow}>
                            <Ionicons
                                name={page.status === 'PUBLIC' ? 'earth-outline' : 'lock-closed-outline'}
                                size={14} color={colors.textSecondary}
                            />
                            <Text style={styles.statusText}>
                                {page.status === 'PUBLIC' ? 'Công khai' : page.status === 'PRIVATE' ? 'Riêng tư' : page.status}
                            </Text>
                        </View>
                    ) : null}

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, isLiked && styles.actionBtnActive]}
                            onPress={handleLike}
                            activeOpacity={0.75}
                        >
                            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={20} color={isLiked ? '#fff' : colors.danger} />
                            <Text style={[styles.actionBtnText, isLiked && styles.actionBtnTextActive]}>
                                {isLiked ? 'Đã thích' : 'Thích'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, isFollowing && styles.actionBtnActive]}
                            onPress={handleFollow}
                            activeOpacity={0.75}
                        >
                            <Ionicons name={isFollowing ? 'checkmark-circle' : 'add-circle-outline'} size={20} color={isFollowing ? '#fff' : colors.primary} />
                            <Text style={[styles.actionBtnText, isFollowing && styles.actionBtnTextActive]}>
                                {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.sectionTabs}>
                    {(['info', 'members', 'posts'] as const).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.sectionTab, activeSection === tab && styles.sectionTabActive]}
                            onPress={() => setActiveSection(tab)}
                        >
                            <Ionicons
                                name={tab === 'info' ? 'information-circle-outline' : tab === 'members' ? 'people-outline' : 'grid-outline'}
                                size={18}
                                color={activeSection === tab ? colors.tabActive : colors.textTertiary}
                            />
                            <Text style={[styles.sectionTabText, activeSection === tab && styles.sectionTabTextActive]}>
                                {tab === 'info' ? 'Thông tin' : tab === 'members' ? `Thành viên (${members.length})` : 'Bài viết'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {activeSection === 'info' && (
                    <>
                        <View style={styles.infoCard}>
                            <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
                            {page.phone ? <InfoRow icon="call-outline" label="Điện thoại" value={page.phone} colors={colors} /> : null}
                            {page.email ? <InfoRow icon="mail-outline" label="Email" value={page.email} colors={colors} /> : null}
                            {page.website ? <InfoRow icon="globe-outline" label="Website" value={page.website} colors={colors} /> : null}
                            {page.address ? <InfoRow icon="location-outline" label="Địa chỉ" value={page.address} colors={colors} /> : null}
                            {!page.phone && !page.email && !page.website && !page.address && (
                                <Text style={styles.noInfoText}>Chưa có thông tin liên hệ</Text>
                            )}
                        </View>

                        {page.createdBy && (
                            <View style={styles.infoCard}>
                                <Text style={styles.sectionTitle}>Người tạo</Text>
                                <View style={styles.ownerRow}>
                                    {page.createdBy.avatarUrl ? (
                                        <Image source={{ uri: buildS3Url(page.createdBy.avatarUrl) }} style={styles.ownerAvatar} />
                                    ) : (
                                        <View style={styles.ownerAvatarFallback}>
                                            <Ionicons name="person" size={16} color={colors.textTertiary} />
                                        </View>
                                    )}
                                    <Text style={styles.ownerName}>
                                        {page.createdBy.name || page.createdBy.username || page.createdBy.phone || 'Không rõ'}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {isOwner && (
                            <View style={styles.infoCard}>
                                <Text style={styles.sectionTitle}>Quản lý trang</Text>
                                <TouchableOpacity style={styles.managementBtn} onPress={() => { setMemberUsername(''); setMemberRole('USER'); setShowMemberModal(true); }} activeOpacity={0.7}>
                                    <Ionicons name="person-add-outline" size={20} color={colors.primary} />
                                    <Text style={[styles.managementBtnText, { color: colors.primary }]}>Thêm thành viên</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.managementBtn} onPress={handleOpenEdit} activeOpacity={0.7}>
                                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                                    <Text style={[styles.managementBtnText, { color: colors.primary }]}>Chỉnh sửa trang</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.managementBtn, { borderBottomWidth: 0 }]} onPress={handleDelete} activeOpacity={0.7}>
                                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                    <Text style={[styles.managementBtnText, { color: colors.danger }]}>Xóa trang</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {isOwner && postsWaiting.length > 0 && (
                            <View style={styles.infoCard}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <Text style={styles.sectionTitle}>
                                        Bài viết chờ duyệt ({postsWaiting.length})
                                    </Text>
                                    <TouchableOpacity onPress={() => setShowCreatePostModal(true)} hitSlop={8}>
                                        <Ionicons name="add-circle" size={22} color={colors.primary} />
                                    </TouchableOpacity>
                                </View>

                                {postsWaiting.length > 0 && (
                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                                        <TouchableOpacity
                                            style={[styles.bulkActionBtn, { backgroundColor: colors.successBg }]}
                                            onPress={handleApproveAll}
                                        >
                                            <Ionicons name="checkmark-done" size={16} color={colors.success} />
                                            <Text style={[styles.bulkActionText, { color: colors.success }]}>
                                                Duyệt tất cả
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.bulkActionBtn, { backgroundColor: colors.errorBg }]}
                                            onPress={handleCancelAll}
                                        >
                                            <Ionicons name="close" size={16} color={colors.error} />
                                            <Text style={[styles.bulkActionText, { color: colors.error }]}>
                                                Hủy tất cả
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {isLoadingWaitingPosts ? (
                                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    </View>
                                ) : (
                                    <View style={{ gap: 12 }}>
                                        {postsWaiting.map((post) => {
                                            const media = post.media || [];
                                            const userInfo = userMap[post.authorId||''];

                                            return (
                                            <View key={post.id} style={[styles.postCard, { backgroundColor: colors.warningBg }]}>
                                                <View style={styles.postHeader}>
                                                    {userInfo?.avatarUrl ? (
                                                        <Image source={{ uri: buildS3Url(userInfo.avatarUrl) }} style={styles.postAvatar} />
                                                    ) : (
                                                        <View style={styles.postAvatarFallback}>
                                                            <Ionicons name="person" size={16} color={colors.textTertiary} />
                                                        </View>
                                                    )}
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.postAuthorName}>
                                                            {userInfo?.username || 'Người dùng'}
                                                        </Text>
                                                        <Text style={styles.postDate}>
                                                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString('vi-VN', {
                                                                year: 'numeric', month: '2-digit', day: '2-digit',
                                                                hour: '2-digit', minute: '2-digit'
                                                            }) : 'Không rõ'}
                                                        </Text>
                                                    </View>
                                                    <TouchableOpacity onPress={() => handleRemovePost(post.id, post.content || '')}>
                                                        <Ionicons name="close" size={20} color={colors.error} />
                                                    </TouchableOpacity>
                                                </View>
                                                {post.content && <Text style={styles.postContent}>{post.content}</Text>}
                                                {media && media.length > 0 && (
                                                    <ScrollView
                                                        horizontal
                                                        showsHorizontalScrollIndicator={false}
                                                        style={{ marginTop: 8 }}
                                                        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
                                                    >
                                                        {media.map((item: any, idx: number) => (
                                                            item?.url && (
                                                                <Image
                                                                    key={idx}
                                                                    source={{ uri: buildS3Url(item.url) }}
                                                                    style={{
                                                                        width: POST_IMAGE_WIDTH,
                                                                        height: 250,
                                                                        borderRadius: 12,
                                                                    }}
                                                                    resizeMode="cover"
                                                                />
                                                            )
                                                        ))}
                                                    </ScrollView>
                                                )}
                                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                                                    <TouchableOpacity
                                                        style={[styles.postActionBtn, { flex: 1, backgroundColor: colors.successBg }]}
                                                        onPress={() => handleApprovePost(post.id)}
                                                    >
                                                        <Ionicons name="checkmark" size={16} color={colors.success || '#10b981'} />
                                                        <Text style={[styles.postActionText, { color: colors.success || '#10b981' }]}>Duyệt</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.postActionBtn, { flex: 1, backgroundColor: colors.errorBg }]}
                                                        onPress={() => handleCancelApprovePost(post.id)}
                                                    >
                                                        <Ionicons name="close" size={16} color={colors.error} />
                                                        <Text style={[styles.postActionText, { color: colors.error }]}>Hủy</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        )}
                    </>
                )}

                {activeSection === 'members' && (
                    <View style={styles.infoCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={styles.sectionTitle}>Danh sách thành viên</Text>
                            {isOwner && (
                                <TouchableOpacity onPress={() => { setMemberUsername(''); setMemberRole('USER'); setShowMemberModal(true); }} hitSlop={8}>
                                    <Ionicons name="person-add" size={22} color={colors.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                        {members.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                                <Ionicons name="people-outline" size={40} color={colors.textTertiary} />
                                <Text style={{ color: colors.textTertiary, marginTop: 8 }}>Chưa có thành viên nào</Text>
                            </View>
                        ) : (
                            members.map((member) => (
                                <View key={member.id} style={styles.memberRow}>
                                    {member.user?.avatarUrl ? (
                                        <Image source={{ uri: buildS3Url(member.user.avatarUrl) }} style={styles.memberAvatar} />
                                    ) : (
                                        <View style={styles.memberAvatarFallback}>
                                            <Ionicons name="person" size={18} color={colors.textTertiary} />
                                        </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.memberName}>
                                            { member.user?.username}
                                        </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                            <View style={[styles.roleBadge, member.role === 'ADMIN' && { backgroundColor: colors.primary + '20' }]}>
                                                <Text style={[styles.roleBadgeText, member.role === 'ADMIN' && { color: colors.primary }]}>
                                                    {member.role}
                                                </Text>
                                            </View>
                                            {member.status && (
                                                <Text style={{ fontSize: 11, color: colors.textTertiary }}>{member.status}</Text>
                                            )}
                                        </View>
                                    </View>
                                    {isOwner && (
                                        <TouchableOpacity
                                            onPress={() => handleRemoveMember(member.user?.id, member.user?.username || 'thành viên')}
                                            hitSlop={8}
                                        >
                                            <Ionicons name="close-circle-outline" size={22} color={colors.danger} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                )}

                {activeSection === 'posts' && (
                    <View style={styles.infoCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={styles.sectionTitle}>Bài viết của trang</Text>
                            {isOwner && (
                                <TouchableOpacity onPress={() => setShowCreatePostModal(true)} hitSlop={8}>
                                    <Ionicons name="add-circle" size={24} color={colors.primary} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {isLoadingPosts ? (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <ActivityIndicator size="large" color={colors.primary} />
                            </View>
                        ) : posts.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <View style={{
                                    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.chipBg,
                                    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                                }}>
                                    <Ionicons name="newspaper-outline" size={32} color={colors.textTertiary} />
                                </View>
                                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>
                                    Chưa có bài viết
                                </Text>
                                <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 4, textAlign: 'center' }}>
                                    Bài viết của trang sẽ hiển thị tại đây
                                </Text>
                            </View>
                        ) : (
                            <View style={{ gap: 12 }}>
                                {posts.map( (post) => {
                                    const media = post.media || [];
                                    const userInfo = userMap[post.authorId];
                                    const pagePostInfo = postApproveMap[post.id];

                                    return (
                                    <View key={post.id} style={styles.postCard}>
                                        <View style={styles.postHeader}>
                                            {userInfo?.avatarUrl ? (
                                                <Image source={{ uri: buildS3Url(userInfo.avatarUrl) }} style={styles.postAvatar} />
                                            ) : (
                                                <View style={styles.postAvatarFallback}>
                                                    <Ionicons name="person" size={16} color={colors.textTertiary} />
                                                </View>
                                            )}
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.postAuthorName}>
                                                    {userInfo?.username || 'Người dùng'}
                                                </Text>
                                                <Text style={styles.postDate}>
                                                    {pagePostInfo?.approvedAt ? new Date(pagePostInfo.approvedAt).toLocaleDateString('vi-VN', {
                                                        year: 'numeric', month: '2-digit', day: '2-digit',
                                                        hour: '2-digit', minute: '2-digit'
                                                    }) : 'Không rõ'}
                                                </Text>
                                            </View>
                                            {isOwner && (
                                                <TouchableOpacity onPress={() => handleRemovePost(post.id, post.content || '')}>
                                                    <Ionicons name="close" size={20} color={colors.error} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                        {post.content && <Text style={styles.postContent}>{post.content}</Text>}
                                        {media && media.length > 0 && (
                                            <ScrollView
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                style={{ marginTop: 8 }}
                                                contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
                                            >
                                                {media.map((item: any, idx: number) => (
                                                    item?.url && (
                                                        <Image
                                                            key={idx}
                                                            source={{ uri: buildS3Url(item.url) }}
                                                            style={{
                                                                width: POST_IMAGE_WIDTH,
                                                                height: 250,
                                                                borderRadius: 12,
                                                            }}
                                                            resizeMode="cover"
                                                        />
                                                    )
                                                ))}
                                            </ScrollView>
                                        )}
                                        {post.stats && (
                                            <View style={{ flexDirection: 'row', marginTop: 8, gap: 16 }}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.postStat, { color: colors.danger }]}>
                                                        ❤️ {post.stats.likes ?? 0}
                                                    </Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.postStat, { color: colors.primary }]}>
                                                        💬 {post.stats.comments ?? 0}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
                <View style={styles.overlay}>
                    <Pressable style={styles.overlayBackdrop} onPress={() => setShowEditModal(false)} />
                    <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
                        <View style={styles.dragBar} />
                        <View style={styles.sheetHeader}>
                            <TouchableOpacity onPress={() => setShowEditModal(false)} hitSlop={12}>
                                <Text style={styles.sheetCancel}>Hủy</Text>
                            </TouchableOpacity>
                            <Text style={styles.sheetTitle}>Chỉnh sửa trang</Text>
                            <TouchableOpacity onPress={handleSaveEdit} disabled={isSaving} hitSlop={12}>
                                <Text style={[styles.sheetSave, isSaving && { color: colors.textTertiary }]}>
                                    {isSaving ? 'Đang lưu...' : 'Lưu'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            <EditField label="Tên trang" value={editForm.name} onChange={v => setEditForm(f => ({ ...f, name: v }))} colors={colors} />
                            <EditField label="Username" value={editForm.username} onChange={v => setEditForm(f => ({ ...f, username: v }))} colors={colors} autoCapitalize="none" />
                            <EditField label="Danh mục" value={editForm.category} onChange={v => setEditForm(f => ({ ...f, category: v }))} colors={colors} />
                            <EditField label="Mô tả" value={editForm.description} onChange={v => setEditForm(f => ({ ...f, description: v }))} colors={colors} multiline />
                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 14, marginBottom: 8 }}>Avatar trang</Text>
                            <TouchableOpacity
                                onPress={pickAvatarImage}
                                disabled={isUploadingAvatar}
                                style={[styles.avatarPickerBtn, { borderColor: colors.border, backgroundColor: colors.inputBg }]}
                                activeOpacity={0.7}
                            >
                                {isUploadingAvatar ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (avatarLocalUri || editForm.avatarUrl) ? (
                                    <Image source={{ uri: avatarLocalUri || buildS3Url(editForm.avatarUrl) }} style={styles.avatarPickerImg} />
                                ) : (
                                    <Ionicons name="camera-outline" size={28} color={colors.textTertiary} />
                                )}
                                <Text style={{ fontSize: 13, color: (avatarLocalUri || editForm.avatarUrl) ? colors.primary : colors.textTertiary, marginTop: 6 }}>
                                    {isUploadingAvatar ? 'Đang tải lên...' : (avatarLocalUri || editForm.avatarUrl) ? 'Đổi ảnh' : 'Chọn ảnh'}
                                </Text>
                            </TouchableOpacity>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 14, marginBottom: 8 }}>Ảnh bìa trang</Text>
                            <TouchableOpacity
                                onPress={pickCoverImage}
                                disabled={isUploadingCover}
                                style={[styles.coverPickerBtn, { borderColor: colors.border, backgroundColor: colors.inputBg }]}
                                activeOpacity={0.7}
                            >
                                {isUploadingCover ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (coverLocalUri || editForm.coverUrl) ? (
                                    <Image source={{ uri: coverLocalUri || buildS3Url(editForm.coverUrl) }} style={styles.coverPickerImg} />
                                ) : (
                                    <Ionicons name="image-outline" size={28} color={colors.textTertiary} />
                                )}
                                <Text style={{ fontSize: 13, color: (coverLocalUri || editForm.coverUrl) ? colors.primary : colors.textTertiary, marginTop: 6 }}>
                                    {isUploadingCover ? 'Đang tải lên...' : (coverLocalUri || editForm.coverUrl) ? 'Đổi ảnh bìa' : 'Chọn ảnh bìa'}
                                </Text>
                            </TouchableOpacity>
                            <EditField label="Điện thoại" value={editForm.phone} onChange={v => setEditForm(f => ({ ...f, phone: v }))} colors={colors} />
                            <EditField label="Email" value={editForm.email} onChange={v => setEditForm(f => ({ ...f, email: v }))} colors={colors} autoCapitalize="none" />
                            <EditField label="Website" value={editForm.website} onChange={v => setEditForm(f => ({ ...f, website: v }))} colors={colors} autoCapitalize="none" />
                            <EditField label="Địa chỉ" value={editForm.address} onChange={v => setEditForm(f => ({ ...f, address: v }))} colors={colors} />
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal visible={showMemberModal} animationType="slide" transparent onRequestClose={() => setShowMemberModal(false)}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.overlay}>
                        <Pressable style={styles.overlayBackdrop} onPress={() => setShowMemberModal(false)} />
                        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxHeight: '80%' }]}>
                            <View style={styles.dragBar} />
                            <View style={styles.sheetHeader}>
                                <TouchableOpacity onPress={() => {
                                    setShowMemberModal(false);
                                    setMemberUsername('');
                                    setSearchResults([]);
                                    setSelectedUsers([]);
                                }} hitSlop={12}>
                                    <Text style={styles.sheetCancel}>Hủy</Text>
                                </TouchableOpacity>
                                <Text style={styles.sheetTitle}>Thêm thành viên</Text>
                                <TouchableOpacity
                                    onPress={handleAddMember}
                                    hitSlop={12}
                                    disabled={selectedUsers.length === 0}
                                >
                                    <Text style={[
                                        styles.sheetSave,
                                        selectedUsers.length === 0 && { color: colors.textTertiary }
                                    ]}>
                                        Thêm ({selectedUsers.length})
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView
                                style={{ paddingHorizontal: 20, paddingTop: 16 }}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                            >
                                <EditField
                                    label="Tìm kiếm người dùng"
                                    value={memberUsername}
                                    onChange={setMemberUsername}
                                    colors={colors}
                                    placeholder="Nhập username để tìm kiếm"
                                />

                                {/* Danh sách kết quả tìm kiếm */}
                                {isSearching && (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    </View>
                                )}

                                {!isSearching && searchResults.length > 0 && (
                                    <View style={{ marginTop: 16 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
                                            Kết quả tìm kiếm ({searchResults.length})
                                        </Text>
                                        {searchResults.map(user => {
                                            const isSelected = selectedUsers.some(u => u.id === user.id);
                                            return (
                                                <TouchableOpacity
                                                    key={user.id}
                                                    onPress={() => {
                                                        if (isSelected) {
                                                            setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
                                                        } else {
                                                            setSelectedUsers(prev => [...prev, user]);
                                                        }
                                                    }}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        padding: 12,
                                                        backgroundColor: colors.inputBg,
                                                        borderRadius: 12,
                                                        marginBottom: 8,
                                                        borderWidth: 1.5,
                                                        borderColor: isSelected ? colors.primary : colors.border,
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    {/* Checkbox */}
                                                    <View style={{
                                                        width: 24,
                                                        height: 24,
                                                        borderRadius: 6,
                                                        borderWidth: 2,
                                                        borderColor: isSelected ? colors.primary : colors.border,
                                                        backgroundColor: isSelected ? colors.primary : 'transparent',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: 12,
                                                    }}>
                                                        {isSelected && (
                                                            <Ionicons name="checkmark" size={16} color={colors.primaryText} />
                                                        )}
                                                    </View>

                                                    {/* Avatar */}
                                                    <Image
                                                        source={{ uri: user.avatarUrl ? buildS3Url(user.avatarUrl): 'https://via.placeholder.com/24' }}
                                                        style={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 20,
                                                            marginRight: 12,
                                                        }}
                                                    />

                                                    {/* User info */}
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{
                                                            fontSize: 15,
                                                            fontWeight: '600',
                                                            color: colors.text,
                                                            marginBottom: 2,
                                                        }}>
                                                            {user.name}
                                                        </Text>
                                                        <Text style={{
                                                            fontSize: 13,
                                                            color: colors.textSecondary,
                                                        }}>
                                                            @{user.username}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}

                                {!isSearching && memberUsername.length >= 2 && searchResults.length === 0 && (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
                                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8 }}>
                                            Không tìm thấy người dùng
                                        </Text>
                                    </View>
                                )}

                                {/* Danh sách người dùng đã chọn */}
                                {selectedUsers.length > 0 && (
                                    <View style={{ marginTop: 16 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
                                            Đã chọn ({selectedUsers.length})
                                        </Text>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {selectedUsers.map(user => (
                                                <View
                                                    key={user.id}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        paddingLeft: 8,
                                                        paddingRight: 4,
                                                        paddingVertical: 6,
                                                        backgroundColor: colors.primary + '20',
                                                        borderRadius: 20,
                                                        borderWidth: 1,
                                                        borderColor: colors.primary,
                                                    }}
                                                >
                                                    <Image
                                                        source={{ uri: user.avatarUrl? buildS3Url(user.avatarUrl): 'https://via.placeholder.com/24' }}
                                                        style={{
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: 12,
                                                            marginRight: 6,
                                                        }}
                                                    />
                                                    <Text style={{
                                                        fontSize: 13,
                                                        fontWeight: '500',
                                                        color: colors.primary,
                                                        marginRight: 4,
                                                    }}>
                                                        {user.username}/ {user.name}
                                                    </Text>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
                                                        }}
                                                        hitSlop={8}
                                                    >
                                                        <Ionicons name="close-circle" size={20} color={colors.primary} />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 16, marginBottom: 8 }}>
                                    Vai trò
                                </Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {PAGE_ROLES.map(role => {
                                        const active = memberRole === role.value;
                                        return (
                                            <TouchableOpacity
                                                key={role.value}
                                                onPress={() => setMemberRole(role.value)}
                                                style={{
                                                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                                                    borderWidth: 1.5,
                                                    borderColor: active ? colors.primary : colors.border,
                                                    backgroundColor: active ? colors.primary : colors.inputBg,
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={{
                                                    fontSize: 13, fontWeight: active ? '600' : '500',
                                                    color: active ? colors.primaryText : colors.textSecondary,
                                                }}>
                                                    {role.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                <View style={{ height: 20 }} />
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal visible={showCreatePostModal} animationType="slide" transparent onRequestClose={() => setShowCreatePostModal(false)}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.overlay}>
                        <Pressable style={styles.overlayBackdrop} onPress={() => setShowCreatePostModal(false)} />
                        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
                            <View style={styles.dragBar} />
                            <View style={styles.sheetHeader}>
                                <TouchableOpacity onPress={() => setShowCreatePostModal(false)} hitSlop={12}>
                                    <Text style={styles.sheetCancel}>Hủy</Text>
                                </TouchableOpacity>
                                <Text style={styles.sheetTitle}>Tạo bài viết</Text>
                                <TouchableOpacity onPress={handleCreatePost} disabled={isCreatingPost} hitSlop={12}>
                                    <Text style={[styles.sheetSave, isCreatingPost && { color: colors.textTertiary }]}>
                                        {isCreatingPost ? 'Đang đăng...' : 'Đăng'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView
                                style={{ paddingHorizontal: 20 }}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                            >
                                <View style={{ marginTop: 14 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
                                        Nội dung bài viết
                                    </Text>
                                    <TextInput
                                        style={{
                                            backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
                                            borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                                            fontSize: 15, color: colors.text,
                                            height: 120, textAlignVertical: 'top',
                                        }}
                                        value={postContent}
                                        onChangeText={setPostContent}
                                        placeholder="Bạn đang nghĩ gì?"
                                        placeholderTextColor={colors.textTertiary}
                                        multiline
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={pickPostImages}
                                    style={{
                                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                        gap: 8, marginTop: 16, paddingVertical: 14, borderRadius: 12,
                                        backgroundColor: colors.chipBg, borderWidth: 1.5, borderStyle: 'dashed',
                                        borderColor: colors.border,
                                    }}
                                >
                                    <Ionicons name="images-outline" size={22} color={colors.primary} />
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                                        Chọn hình ảnh
                                    </Text>
                                </TouchableOpacity>

                                {postImages.length > 0 && (
                                    <View style={{ marginTop: 16, gap: 10 }}>
                                        {postImages.map((img, idx) => (
                                            <View key={idx} style={{ position: 'relative' }}>
                                                <Image
                                                    source={{ uri: img.uri }}
                                                    style={{ width: '100%', height: 200, borderRadius: 12 }}
                                                />
                                                <TouchableOpacity
                                                    onPress={() => removePostImage(idx)}
                                                    style={{
                                                        position: 'absolute', top: 8, right: 8,
                                                        backgroundColor: colors.overlay, borderRadius: 20,
                                                        padding: 6,
                                                    }}
                                                >
                                                    <Ionicons name="close" size={18} color="#FFF" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                <View style={{ height: 20 }} />
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

function InfoRow({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: ThemeColors }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
            <Ionicons name={icon as any} size={18} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: colors.textTertiary }}>{label}</Text>
                <Text style={{ fontSize: 14, color: colors.text, marginTop: 1 }}>{value}</Text>
            </View>
        </View>
    );
}

function EditField({ label, value, onChange, colors, multiline, autoCapitalize, placeholder }: {
    label: string; value: string; onChange: (v: string) => void; colors: ThemeColors;
    multiline?: boolean; autoCapitalize?: 'none' | 'sentences'; placeholder?: string;
}) {
    return (
        <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>{label}</Text>
            <TextInput
                style={{
                    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
                    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                    fontSize: 15, color: colors.text,
                    ...(multiline ? { height: 80, textAlignVertical: 'top' as any } : {}),
                }}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder || label}
                placeholderTextColor={colors.textTertiary}
                multiline={multiline}
                autoCapitalize={autoCapitalize}
            />
        </View>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center', marginHorizontal: 12 },
    scrollView: { flex: 1 },

    coverImage: { width: '100%', height: 180, backgroundColor: colors.border },
    coverPlaceholder: {
        width: '100%', height: 120, backgroundColor: colors.chipBg,
        alignItems: 'center', justifyContent: 'center',
    },

    profileCard: {
        backgroundColor: colors.card, marginHorizontal: 14, marginTop: -30,
        borderRadius: 20, padding: 20,
        shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    },
    avatarSection: { alignItems: 'center', marginTop: -50 },
    avatar: {
        width: 80, height: 80, borderRadius: 20, borderWidth: 3, borderColor: colors.card,
    },
    avatarFallback: {
        width: 80, height: 80, borderRadius: 20, backgroundColor: colors.chipBg,
        alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.card,
    },
    nameSection: { alignItems: 'center', marginTop: 12 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    pageName: { fontSize: 22, fontWeight: '700', color: colors.text },
    usernameText: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
    categoryChip: {
        backgroundColor: colors.chipBg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 8,
    },
    categoryText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
    description: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginTop: 16, textAlign: 'center' },
    statsRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginTop: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border,
    },
    statItem: { alignItems: 'center', flex: 1 },
    statNumber: { fontSize: 18, fontWeight: '700', color: colors.text },
    statLabel: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    statDivider: { width: 1, height: 28, backgroundColor: colors.border },
    statusRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12,
    },
    statusText: { fontSize: 13, color: colors.textSecondary },
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 18, justifyContent: 'center' },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
        borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBg,
    },
    actionBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    actionBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
    actionBtnTextActive: { color: colors.primaryText },

    infoCard: {
        backgroundColor: colors.card, marginHorizontal: 14, marginTop: 14,
        borderRadius: 16, padding: 18,
        shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 },
    noInfoText: { fontSize: 14, color: colors.textTertiary, fontStyle: 'italic' },

    ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    ownerAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border },
    ownerAvatarFallback: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: colors.chipBg,
        alignItems: 'center', justifyContent: 'center',
    },
    ownerName: { fontSize: 15, fontWeight: '600', color: colors.text },

    managementBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    managementBtnText: { fontSize: 15, fontWeight: '600' },

    sectionTabs: {
        flexDirection: 'row', backgroundColor: colors.card, marginHorizontal: 14, marginTop: 14,
        borderRadius: 16, padding: 4,
        shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    sectionTab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        paddingVertical: 10, borderRadius: 12,
    },
    sectionTabActive: { backgroundColor: colors.chipBg },
    sectionTabText: { fontSize: 12, fontWeight: '500', color: colors.textTertiary },
    sectionTabTextActive: { fontWeight: '700', color: colors.tabActive },

    memberRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    memberAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: colors.border },
    memberAvatarFallback: {
        width: 42, height: 42, borderRadius: 21, backgroundColor: colors.chipBg,
        alignItems: 'center', justifyContent: 'center',
    },
    memberName: { fontSize: 15, fontWeight: '600', color: colors.text },
    roleBadge: {
        backgroundColor: colors.chipBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    },
    roleBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textTertiary },

    overlay: { flex: 1, justifyContent: 'flex-end' },
    overlayBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay,
    },
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

    avatarPickerBtn: {
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16,
        paddingVertical: 20, marginBottom: 4,
    },
    avatarPickerImg: { width: 80, height: 80, borderRadius: 16 },
    coverPickerBtn: {
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16,
        paddingVertical: 20, marginBottom: 4,
    },
    coverPickerImg: { width: '100%', height: 120, borderRadius: 12 },

    postCard: {
        backgroundColor: colors.inputBg,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    postAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    postUserName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    postTime: {
        fontSize: 11,
        color: colors.textTertiary,
        marginTop: 2,
    },
    postCaption: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 10,
    },
    postImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginBottom: 10,
    },
    postStats: {
        flexDirection: 'row',
        gap: 16,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    postStatText: {
        fontSize: 12,
        color: colors.textTertiary,
    },
    postActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    postActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
        borderRadius: 8,
    },
    postActionText: {
        fontSize: 12,
        fontWeight: '600',
    },

    bulkActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1.5,
    },
    bulkActionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    postAvatarFallback: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    postAuthorName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    postDate: {
        fontSize: 11,
        color: colors.textTertiary,
        marginTop: 2,
        marginBottom: 10,
    },
    postContent: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    postStat: {
        fontSize: 12,
        color: colors.textTertiary,
    },
});
