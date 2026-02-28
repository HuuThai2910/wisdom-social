import React, { useState, useEffect } from 'react';
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
    FlatList,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import pageService from '../services/pageService';
import type { PageData, UpdatePageRequest, PageRole, PageMemberData } from '../services/pageService';
import type { ThemeColors } from '../contexts/ThemeContext';

const PAGE_ROLES: { label: string; value: PageRole }[] = [
    { label: 'Admin', value: 'ADMIN' },
    { label: 'Editor', value: 'EDITOR' },
    { label: 'Moderator', value: 'MODERATOR' },
    { label: 'Analyst', value: 'ANALYST' },
    { label: 'User', value: 'USER' },
];

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

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '', username: '', category: '', description: '',
        avatarUrl: '', coverUrl: '', phone: '', email: '', website: '', address: '',
    });

    // Add member modal
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [memberUserId, setMemberUserId] = useState('');
    const [memberRole, setMemberRole] = useState<PageRole>('USER');

    const styles = createStyles(colors);
    const isOwner = page?.createdBy?.id === user?.id;

    useEffect(() => {
        if (pageId) loadAll();
    }, [pageId]);

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
        } catch (err) {
            console.error('Load page error:', err);
        } finally {
            setIsLoading(false);
        }
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
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!page) return;
        setIsSaving(true);
        try {
            const payload: UpdatePageRequest = {
                name: editForm.name || undefined,
                username: editForm.username || undefined,
                category: editForm.category || undefined,
                description: editForm.description || undefined,
                avatarUrl: editForm.avatarUrl || undefined,
                coverUrl: editForm.coverUrl || undefined,
                phone: editForm.phone || undefined,
                email: editForm.email || undefined,
                website: editForm.website || undefined,
                address: editForm.address || undefined,
            };
            await pageService.updatePage(page.id, payload);
            setShowEditModal(false);
            await loadAll();
            Alert.alert('Thành công', 'Đã cập nhật trang.');
        } catch {
            Alert.alert('Lỗi', 'Không thể cập nhật trang.');
        } finally {
            setIsSaving(false);
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
        if (!page || !memberUserId) return;
        try {
            await pageService.addMember({
                userId: Number(memberUserId),
                pageId: page.id,
                pageRole: memberRole,
            });
            setShowMemberModal(false);
            setMemberUserId('');
            await loadAll();
            Alert.alert('Thành công', 'Đã thêm thành viên vào trang.');
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
                        await pageService.deleteMember(page.id, memberId);
                        await loadAll();
                    } catch {
                        Alert.alert('Lỗi', 'Không thể xóa thành viên.');
                    }
                },
            },
        ]);
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
            {/* Header */}
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
                {/* Cover */}
                {page.coverUrl ? (
                    <Image source={{ uri: page.coverUrl }} style={styles.coverImage} />
                ) : (
                    <View style={styles.coverPlaceholder}>
                        <Ionicons name="image-outline" size={32} color={colors.textTertiary} />
                    </View>
                )}

                {/* Profile card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarSection}>
                        {page.avatarUrl ? (
                            <Image source={{ uri: page.avatarUrl }} style={styles.avatar} />
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

                    {/* Stats row */}
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

                    {/* Action buttons */}
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

                {/* ───── Section Tabs ───── */}
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

                {/* ───── INFO SECTION ───── */}
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
                                        <Image source={{ uri: page.createdBy.avatarUrl }} style={styles.ownerAvatar} />
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
                                <TouchableOpacity style={styles.managementBtn} onPress={() => { setMemberUserId(''); setMemberRole('USER'); setShowMemberModal(true); }} activeOpacity={0.7}>
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
                    </>
                )}

                {/* ───── MEMBERS SECTION ───── */}
                {activeSection === 'members' && (
                    <View style={styles.infoCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={styles.sectionTitle}>Danh sách thành viên</Text>
                            {isOwner && (
                                <TouchableOpacity onPress={() => { setMemberUserId(''); setMemberRole('USER'); setShowMemberModal(true); }} hitSlop={8}>
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
                                        <Image source={{ uri: member.user.avatarUrl }} style={styles.memberAvatar} />
                                    ) : (
                                        <View style={styles.memberAvatarFallback}>
                                            <Ionicons name="person" size={18} color={colors.textTertiary} />
                                        </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.memberName}>
                                            {member.user?.name || member.user?.username || member.user?.phone || `User #${member.user?.id}`}
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
                                            onPress={() => handleRemoveMember(member.user?.id, member.user?.name || 'thành viên')}
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

                {/* ───── POSTS SECTION ───── */}
                {activeSection === 'posts' && (
                    <View style={styles.infoCard}>
                        <Text style={styles.sectionTitle}>Bài viết của trang</Text>
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
                    </View>
                )}
            </ScrollView>

            {/* ═══════ EDIT MODAL ═══════ */}
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
                            <EditField label="Avatar URL" value={editForm.avatarUrl} onChange={v => setEditForm(f => ({ ...f, avatarUrl: v }))} colors={colors} autoCapitalize="none" />
                            <EditField label="Cover URL" value={editForm.coverUrl} onChange={v => setEditForm(f => ({ ...f, coverUrl: v }))} colors={colors} autoCapitalize="none" />
                            <EditField label="Điện thoại" value={editForm.phone} onChange={v => setEditForm(f => ({ ...f, phone: v }))} colors={colors} />
                            <EditField label="Email" value={editForm.email} onChange={v => setEditForm(f => ({ ...f, email: v }))} colors={colors} autoCapitalize="none" />
                            <EditField label="Website" value={editForm.website} onChange={v => setEditForm(f => ({ ...f, website: v }))} colors={colors} autoCapitalize="none" />
                            <EditField label="Địa chỉ" value={editForm.address} onChange={v => setEditForm(f => ({ ...f, address: v }))} colors={colors} />
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ═══════ ADD MEMBER MODAL ═══════ */}
            <Modal visible={showMemberModal} animationType="slide" transparent onRequestClose={() => setShowMemberModal(false)}>
                <View style={styles.overlay}>
                    <Pressable style={styles.overlayBackdrop} onPress={() => setShowMemberModal(false)} />
                    <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxHeight: '60%' }]}>
                        <View style={styles.dragBar} />
                        <View style={styles.sheetHeader}>
                            <TouchableOpacity onPress={() => setShowMemberModal(false)} hitSlop={12}>
                                <Text style={styles.sheetCancel}>Hủy</Text>
                            </TouchableOpacity>
                            <Text style={styles.sheetTitle}>Thêm thành viên</Text>
                            <TouchableOpacity onPress={handleAddMember} hitSlop={12}>
                                <Text style={styles.sheetSave}>Thêm</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
                            <EditField
                                label="User ID"
                                value={memberUserId}
                                onChange={setMemberUserId}
                                colors={colors}
                                placeholder="Nhập ID người dùng"
                            />
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
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

/* ─── Helper Components ─── */
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

/* ═══════════ STYLES ═══════════ */
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

    // Info card
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

    // Section tabs
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

    // Member row
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

    // Modal
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
});
