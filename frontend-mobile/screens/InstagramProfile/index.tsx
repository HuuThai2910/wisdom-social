import React, { useState, useEffect, useCallback, useMemo } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { useAppContext } from "@/context/AppContext";
import { colors } from "@/constants";
import userService from "@/services/userService";
import friendService from "@/services/friendService";
import blockService from "@/services/blockService";
import { useFriendNotifications } from "@/hooks/useFriendNotifications";
import type { User } from "@/services/userService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = 2;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * 4) / 3;

const S3_BASE = "https://cnmt-hk1-amz.s3.ap-southeast-1.amazonaws.com/";
const toImageUrl = (url?: string): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith("http") || url.startsWith("file://") || url.startsWith("content://")) return url;
    return S3_BASE + url;
};

const GENDER_OPTIONS = [
    { label: "Nam", value: "MALE" },
    { label: "Nữ", value: "FEMALE" },
    { label: "Ẩn", value: "HIDDEN" },
];

type FriendStatus = "NONE" | "SENT" | "RECEIVED" | "FRIEND" | "BLOCKED";

export default function InstagramProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { userId: paramUserId } = useLocalSearchParams<{ userId?: string }>();
    const { currentUser, posts, savedPostIds, logout, refreshCurrentUser } = useAppContext();

    // Determine mode
    const isViewingOther = useMemo(
        () => !!paramUserId && String(paramUserId) !== String(currentUser?.id),
        [paramUserId, currentUser?.id],
    );
    const myId = useMemo(() => Number(currentUser?.id), [currentUser?.id]);
    const targetId = useMemo(() => Number(paramUserId), [paramUserId]);

    // ── State: other-user view ────────────────────────────────────────────────
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [friendStatus, setFriendStatus] = useState<FriendStatus>("NONE");
    const [statusLoading, setStatusLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [otherFriendsCount, setOtherFriendsCount] = useState<number | null>(null);

    // ── State: own-profile view ───────────────────────────────────────────────
    const [selectedTab, setSelectedTab] = useState<"posts" | "saved" | "blocked">("posts");
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarLocalUri, setAvatarLocalUri] = useState("");
    const [friendsCount, setFriendsCount] = useState<number>(0);
    const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
    const [isLoadingBlocked, setIsLoadingBlocked] = useState(false);
    const [editForm, setEditForm] = useState({
        name: "",
        username: "",
        bio: "",
        birthday: "",
        gender: "",
    });

    // ── Effects: other-user view ──────────────────────────────────────────────
    const loadProfile = useCallback(async () => {
        if (!paramUserId) return;
        setProfileLoading(true);
        try {
            const user = await userService.getUserProfile(paramUserId);
            setProfileUser(user);
        } finally {
            setProfileLoading(false);
        }
    }, [paramUserId]);

    const loadFriendStatus = useCallback(async () => {
        if (!isViewingOther || !myId || !targetId || !Number.isFinite(myId) || !Number.isFinite(targetId)) return;
        setStatusLoading(true);
        try {
            const status = await friendService.getFriendStatus(myId, targetId);
            setFriendStatus(status);
        } finally {
            setStatusLoading(false);
        }
    }, [isViewingOther, myId, targetId]);

    const loadOtherFriendsCount = useCallback(async () => {
        if (!isViewingOther || !targetId || !Number.isFinite(targetId)) return;
        try {
            const friends = await friendService.getFriends(targetId);
            setOtherFriendsCount(friends.length);
        } catch {}
    }, [isViewingOther, targetId]);

    const refreshTrigger = useFriendNotifications();

    useEffect(() => {
        if (isViewingOther) {
            void loadProfile();
            void loadFriendStatus();
            void loadOtherFriendsCount();
        }
    }, [isViewingOther, loadProfile, loadFriendStatus, loadOtherFriendsCount, refreshTrigger]);

    // ── Effects: own-profile view ─────────────────────────────────────────────
    useEffect(() => {
        if (isViewingOther || !currentUser?.id) return;
        friendService.getFriends(Number(currentUser.id)).then((list) => setFriendsCount(list.length)).catch(() => {});
    }, [isViewingOther, currentUser?.id]);

    useEffect(() => {
        if (showEditModal && currentUser) {
            setEditForm({
                name: currentUser.name || "",
                username: currentUser.username || "",
                bio: currentUser.bio || "",
                birthday: currentUser.birthday || "",
                gender: currentUser.gender || "",
            });
            setAvatarLocalUri("");
        }
    }, [showEditModal, currentUser]);

    // ── Friend action handlers ────────────────────────────────────────────────
    const handleSendRequest = async () => {
        setActionLoading(true);
        await friendService.sendFriendRequest(myId, targetId);
        setFriendStatus("SENT");
        setActionLoading(false);
    };

    const handleCancelRequest = async () => {
        setActionLoading(true);
        await friendService.cancelFriendRequest(myId, targetId);
        setFriendStatus("NONE");
        setActionLoading(false);
    };

    const handleAccept = async () => {
        setActionLoading(true);
        await friendService.acceptFriendRequest(targetId, myId);
        setFriendStatus("FRIEND");
        setActionLoading(false);
    };

    const handleReject = async () => {
        setActionLoading(true);
        await friendService.rejectFriendRequest(targetId, myId);
        setFriendStatus("NONE");
        setActionLoading(false);
    };

    const handleUnfriend = () => {
        Alert.alert("Hủy kết bạn", "Bạn có chắc muốn hủy kết bạn?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Hủy kết bạn",
                style: "destructive",
                onPress: async () => {
                    setActionLoading(true);
                    await friendService.cancelFriendRequest(myId, targetId);
                    setFriendStatus("NONE");
                    setActionLoading(false);
                },
            },
        ]);
    };

    const handleBlock = () => {
        Alert.alert("Chặn người dùng", "Bạn có chắc muốn chặn người này?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Chặn",
                style: "destructive",
                onPress: async () => {
                    setActionLoading(true);
                    await blockService.blockUser(myId, targetId);
                    setFriendStatus("BLOCKED");
                    setActionLoading(false);
                },
            },
        ]);
    };

    const renderFriendButton = () => {
        if (statusLoading) {
            return (
                <View style={[os.friendBtn, os.friendBtnOutline]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            );
        }
        if (friendStatus === "NONE") {
            return (
                <TouchableOpacity
                    style={[os.friendBtn, os.friendBtnPrimary]}
                    onPress={handleSendRequest}
                    disabled={actionLoading}
                    activeOpacity={0.75}
                >
                    {actionLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="person-add" size={16} color="#fff" />
                            <Text style={os.friendBtnTextWhite}>Kết bạn</Text>
                        </>
                    )}
                </TouchableOpacity>
            );
        }
        if (friendStatus === "SENT") {
            return (
                <TouchableOpacity
                    style={[os.friendBtn, os.friendBtnOutline]}
                    onPress={handleCancelRequest}
                    disabled={actionLoading}
                    activeOpacity={0.75}
                >
                    {actionLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <>
                            <Ionicons name="time-outline" size={16} color={colors.primary} />
                            <Text style={os.friendBtnTextPrimary}>Đã gửi lời mời</Text>
                        </>
                    )}
                </TouchableOpacity>
            );
        }
        if (friendStatus === "RECEIVED") {
            return (
                <View style={os.receivedRow}>
                    <TouchableOpacity
                        style={[os.friendBtn, os.friendBtnPrimary, { flex: 1 }]}
                        onPress={handleAccept}
                        disabled={actionLoading}
                        activeOpacity={0.75}
                    >
                        {actionLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark" size={16} color="#fff" />
                                <Text style={os.friendBtnTextWhite}>Chấp nhận</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[os.friendBtn, os.friendBtnDanger, { flex: 1 }]}
                        onPress={handleReject}
                        disabled={actionLoading}
                        activeOpacity={0.75}
                    >
                        {actionLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="close" size={16} color="#fff" />
                                <Text style={os.friendBtnTextWhite}>Từ chối</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            );
        }
        if (friendStatus === "FRIEND") {
            return (
                <TouchableOpacity
                    style={[os.friendBtn, os.friendBtnOutline]}
                    onPress={handleUnfriend}
                    disabled={actionLoading}
                    activeOpacity={0.75}
                >
                    {actionLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <>
                            <Ionicons name="people" size={16} color={colors.primary} />
                            <Text style={os.friendBtnTextPrimary}>Bạn bè</Text>
                        </>
                    )}
                </TouchableOpacity>
            );
        }
        if (friendStatus === "BLOCKED") {
            return (
                <View style={[os.friendBtn, os.friendBtnOutline]}>
                    <Ionicons name="ban-outline" size={16} color={colors.textMuted} />
                    <Text style={os.friendBtnTextMuted}>Đã chặn</Text>
                </View>
            );
        }
        return null;
    };

    // ── Own-profile callbacks ─────────────────────────────────────────────────
    const handleEditProfile = () => {
        router.push("/(stack)/profile/edit");
    };

    const pickAvatarImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert("Quyền truy cập", "Cần quyền truy cập thư viện ảnh để chọn ảnh.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
        if (result.canceled || !result.assets[0]) return;
        setAvatarLocalUri(result.assets[0].uri);
    };

    const handleSaveProfile = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        try {
            await userService.updateUser(currentUser.id, {
                name: editForm.name,
                username: editForm.username,
                bio: editForm.bio,
                birthday: editForm.birthday,
                gender: editForm.gender as "MALE" | "FEMALE" | "HIDDEN",
            });
            if (refreshCurrentUser) await refreshCurrentUser();
            setShowEditModal(false);
            Alert.alert("Thành công", "Cập nhật hồ sơ thành công!");
        } catch {
            Alert.alert("Lỗi", "Không thể cập nhật hồ sơ. Vui lòng thử lại.");
        } finally {
            setIsSaving(false);
            setIsUploadingAvatar(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Đăng xuất",
                style: "destructive",
                onPress: async () => {
                    logout();
                    router.replace("/(auth)/login");
                },
            },
        ]);
    };

    const loadBlockedUsers = useCallback(async () => {
        if (!currentUser?.id) return;
        setIsLoadingBlocked(true);
        try {
            const list = await blockService.getBlockedUsers(Number(currentUser.id));
            setBlockedUsers(list);
        } catch {}
        finally { setIsLoadingBlocked(false); }
    }, [currentUser?.id]);

    const handleUnblock = async (userId: string) => {
        Alert.alert("Bỏ chặn", "Bạn có chắc muốn bỏ chặn người dùng này?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Bỏ chặn",
                style: "destructive",
                onPress: async () => {
                    try {
                        await blockService.unblockUser(Number(currentUser?.id), Number(userId));
                        setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
                    } catch {
                        Alert.alert("Lỗi", "Không thể bỏ chặn. Vui lòng thử lại.");
                    }
                },
            },
        ]);
    };

    // ── Render: other-user view ───────────────────────────────────────────────
    if (isViewingOther) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={[os.header, { paddingTop: insets.top > 0 ? 0 : 8 }]}>
                    <TouchableOpacity onPress={() => router.back()} style={os.iconBtn} hitSlop={12}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={os.headerTitle} numberOfLines={1}>
                        {profileUser?.username || profileUser?.name || "Hồ sơ"}
                    </Text>
                    <TouchableOpacity style={os.iconBtn} onPress={handleBlock} hitSlop={12}>
                        <Ionicons name="ellipsis-vertical" size={22} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                    {profileLoading ? (
                        <View style={{ paddingVertical: 60, alignItems: "center" }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={{ marginTop: 12, fontSize: 14, color: colors.textMuted }}>Đang tải...</Text>
                        </View>
                    ) : (
                        <View style={os.card}>
                            <View style={os.topRow}>
                                <View style={{ marginRight: 18 }}>
                                    {profileUser?.avatarUrl ? (
                                        <Image
                                            source={{ uri: toImageUrl(profileUser.avatarUrl) }}
                                            style={os.avatar}
                                        />
                                    ) : (
                                        <View style={os.avatarFallback}>
                                            <Ionicons name="person" size={42} color={colors.textMuted} />
                                        </View>
                                    )}
                                </View>

                                <View style={os.statsRow}>
                                    <View style={{ alignItems: "center" }}>
                                        <Text style={os.statNum}>{profileUser?.postsCount ?? "—"}</Text>
                                        <Text style={os.statLbl}>Bài viết</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={{ alignItems: "center" }}
                                        onPress={() =>
                                            router.push({
                                                pathname: "/(stack)/friends-list",
                                                params: { userId: String(targetId), tab: "friends" },
                                            })
                                        }
                                    >
                                        <Text style={os.statNum}>
                                            {otherFriendsCount !== null ? String(otherFriendsCount) : "—"}
                                        </Text>
                                        <Text style={os.statLbl}>Bạn bè</Text>
                                    </TouchableOpacity>
                                    <View style={{ alignItems: "center" }}>
                                        <Text style={os.statNum}>{profileUser?.following ?? "—"}</Text>
                                        <Text style={os.statLbl}>Theo dõi</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={{ marginTop: 16 }}>
                                <Text style={os.displayName}>
                                    {profileUser?.name || profileUser?.fullName || profileUser?.username || "—"}
                                </Text>
                                {profileUser?.username && (
                                    <Text style={os.handle}>@{profileUser.username}</Text>
                                )}
                                {profileUser?.bio ? (
                                    <Text style={os.bio}>{profileUser.bio}</Text>
                                ) : null}
                            </View>

                            <View style={os.btnRow}>
                                {renderFriendButton()}
                                <TouchableOpacity style={os.msgBtn} activeOpacity={0.75}>
                                    <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View style={os.emptyWrap}>
                        <View style={os.emptyCircle}>
                            <Ionicons name="images-outline" size={40} color={colors.textMuted} />
                        </View>
                        <Text style={os.emptyTitle}>Chưa có bài viết</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // ── Render: own-profile view ──────────────────────────────────────────────
    if (!currentUser) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 10 }}>
                    <Ionicons name="person-circle-outline" size={64} color={colors.textMuted} />
                    <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 8 }}>
                        Không có dữ liệu người dùng
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const myPosts = posts.filter((post) => post.userId === currentUser?.id);
    const savedPosts = posts.filter((post) => savedPostIds.includes(post.id));
    const genderLabel = GENDER_OPTIONS.find((g) => g.value === currentUser.gender)?.label;
    const displayPosts = selectedTab === "posts" ? myPosts : selectedTab === "saved" ? savedPosts : [];
    const ds = createDynamicStyles();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <>
                <ScrollView
                    style={ds.screen}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    <View style={ds.card}>
                        <TouchableOpacity
                            style={ds.settingsBtn}
                            onPress={() => router.push("/(stack)/profile/menu")}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="settings-outline" size={22} color={colors.textMuted} />
                        </TouchableOpacity>

                        <View style={ds.topRow}>
                            <View style={ds.avatarWrap}>
                                {currentUser.avatar ? (
                                    <Image source={{ uri: currentUser.avatar }} style={ds.avatar} />
                                ) : (
                                    <View style={ds.avatarFallback}>
                                        <Ionicons name="person" size={42} color={colors.textMuted} />
                                    </View>
                                )}
                                <View style={ds.onlineDot} />
                            </View>

                            <View style={ds.statsRow}>
                                <StatBlock label="Bài viết" value={myPosts.length} />
                                <TouchableOpacity
                                    onPress={() =>
                                        router.push({
                                            pathname: "/(stack)/friends-list",
                                            params: { tab: "friends" },
                                        })
                                    }
                                >
                                    <StatBlock label="Bạn bè" value={friendsCount} />
                                </TouchableOpacity>
                                <StatBlock label="Đang theo dõi" value={currentUser.following || 0} />
                            </View>
                        </View>

                        <View style={ds.infoBlock}>
                            <Text style={ds.displayName}>{currentUser.name || currentUser.username}</Text>
                            {currentUser.username && (
                                <Text style={ds.handle}>@{currentUser.username}</Text>
                            )}
                            {currentUser.bio ? <Text style={ds.bio}>{currentUser.bio}</Text> : null}
                            <View style={ds.metaRow}>
                                {currentUser.birthday ? (
                                    <MetaChip icon="calendar-outline" text={currentUser.birthday} />
                                ) : null}
                                {genderLabel ? (
                                    <MetaChip icon="male-female-outline" text={genderLabel} />
                                ) : null}
                                {currentUser.phone ? (
                                    <MetaChip icon="call-outline" text={currentUser.phone} />
                                ) : null}
                            </View>
                        </View>

                        <View style={ds.btnRow}>
                            <TouchableOpacity style={ds.primaryBtn} onPress={handleEditProfile} activeOpacity={0.75}>
                                <Ionicons name="create-outline" size={17} color={colors.white} />
                                <Text style={ds.primaryBtnText}>Chỉnh sửa hồ sơ</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={ds.dangerBtn} onPress={handleLogout} activeOpacity={0.75}>
                                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={ds.tabBar}>
                        <TouchableOpacity
                            style={[ds.tab, selectedTab === "posts" && ds.tabActive]}
                            onPress={() => setSelectedTab("posts")}
                        >
                            <Ionicons
                                name="grid-outline"
                                size={20}
                                color={selectedTab === "posts" ? colors.primary : colors.textMuted}
                            />
                            <Text style={[ds.tabText, selectedTab === "posts" && ds.tabTextActive]}>Bài viết</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[ds.tab, selectedTab === "saved" && ds.tabActive]}
                            onPress={() => setSelectedTab("saved")}
                        >
                            <Ionicons
                                name="bookmark-outline"
                                size={20}
                                color={selectedTab === "saved" ? colors.primary : colors.textMuted}
                            />
                            <Text style={[ds.tabText, selectedTab === "saved" && ds.tabTextActive]}>Đã lưu</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[ds.tab, selectedTab === "blocked" && ds.tabActive]}
                            onPress={() => {
                                setSelectedTab("blocked");
                                loadBlockedUsers();
                            }}
                        >
                            <Ionicons
                                name="ban-outline"
                                size={20}
                                color={selectedTab === "blocked" ? colors.primary : colors.textMuted}
                            />
                            <Text style={[ds.tabText, selectedTab === "blocked" && ds.tabTextActive]}>Đã chặn</Text>
                        </TouchableOpacity>
                    </View>

                    {selectedTab === "blocked" ? (
                        isLoadingBlocked ? (
                            <View style={ds.emptyWrap}>
                                <ActivityIndicator size="small" color={colors.text} />
                                <Text style={ds.emptySub}>Đang tải...</Text>
                            </View>
                        ) : blockedUsers.length > 0 ? (
                            <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
                                {blockedUsers.map((bu) => (
                                    <View key={bu.id} style={ds.blockedRow}>
                                        {bu.avatar ? (
                                            <Image source={{ uri: bu.avatar }} style={ds.blockedAvatar} />
                                        ) : (
                                            <View style={ds.blockedAvatarFallback}>
                                                <Ionicons name="person" size={22} color={colors.textMuted} />
                                            </View>
                                        )}
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={ds.blockedName} numberOfLines={1}>
                                                {bu.name || bu.username}
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
                                    <Ionicons name="ban-outline" size={40} color={colors.textMuted} />
                                </View>
                                <Text style={ds.emptyTitle}>Chưa chặn ai</Text>
                                <Text style={ds.emptySub}>Những người bạn chặn sẽ hiển thị ở đây</Text>
                            </View>
                        )
                    ) : displayPosts.length > 0 ? (
                        <View style={ds.grid}>
                            {displayPosts.map((post) => (
                                <TouchableOpacity
                                    key={post.id}
                                    style={ds.gridItem}
                                    activeOpacity={0.85}
                                    onPress={() => router.push(`/(stack)/post/${post.id}`)}
                                >
                                    {post.images && post.images[0] ? (
                                        <Image source={{ uri: post.images[0] }} style={ds.gridImage} />
                                    ) : (
                                        <View style={ds.gridImagePlaceholder}>
                                            <Ionicons name="image-outline" size={40} color={colors.textMuted} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <View style={ds.emptyWrap}>
                            <View style={ds.emptyCircle}>
                                <Ionicons name="camera-outline" size={40} color={colors.textMuted} />
                            </View>
                            <Text style={ds.emptyTitle}>
                                {selectedTab === "posts" ? "Chưa có bài viết" : "Chưa lưu bài viết"}
                            </Text>
                            <Text style={ds.emptySub}>
                                {selectedTab === "posts"
                                    ? "Bài viết bạn tạo sẽ hiển thị ở đây"
                                    : "Bài viết bạn lưu sẽ hiển thị ở đây"}
                            </Text>
                        </View>
                    )}
                </ScrollView>

                <Modal
                    visible={showEditModal}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setShowEditModal(false)}
                >
                    <KeyboardAvoidingView
                        style={ds.overlay}
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                    >
                        <View style={[ds.sheet, { paddingBottom: insets.bottom + 16 }]}>
                            <View style={ds.dragBar} />
                            <View style={ds.sheetHeader}>
                                <TouchableOpacity onPress={() => setShowEditModal(false)} hitSlop={12}>
                                    <Text style={ds.sheetCancel}>Hủy</Text>
                                </TouchableOpacity>
                                <Text style={ds.sheetTitle}>Chỉnh sửa hồ sơ</Text>
                                <TouchableOpacity onPress={handleSaveProfile} disabled={isSaving} hitSlop={12}>
                                    <Text style={[ds.sheetSave, isSaving && { color: colors.textMuted }]}>
                                        {isSaving ? "Đang lưu..." : "Lưu"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView
                                style={ds.sheetBody}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                            >
                                <TouchableOpacity
                                    style={ds.avatarPreview}
                                    onPress={pickAvatarImage}
                                    disabled={isUploadingAvatar || isSaving}
                                    activeOpacity={0.7}
                                >
                                    {isUploadingAvatar ? (
                                        <View
                                            style={[
                                                ds.previewImg,
                                                { alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
                                            ]}
                                        >
                                            <ActivityIndicator size="small" color={colors.primary} />
                                        </View>
                                    ) : avatarLocalUri || currentUser.avatar ? (
                                        <Image
                                            source={{ uri: avatarLocalUri || currentUser.avatar }}
                                            style={ds.previewImg}
                                        />
                                    ) : (
                                        <View style={[ds.avatarFallback, { width: 76, height: 76, borderRadius: 38 }]}>
                                            <Ionicons name="person" size={32} color={colors.textMuted} />
                                        </View>
                                    )}
                                    <View style={ds.changePhotoRow}>
                                        <Ionicons name="camera-outline" size={15} color={colors.primary} />
                                        <Text style={ds.changePhotoLabel}>
                                            {avatarLocalUri ? "Đổi ảnh khác" : "Thay đổi ảnh"}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <Field
                                    label="Họ tên"
                                    value={editForm.name}
                                    onChange={(v) => setEditForm((f) => ({ ...f, name: v }))}
                                    placeholder="Nhập họ tên"
                                />
                                <Field
                                    label="Tên người dùng"
                                    value={editForm.username}
                                    onChange={(v) => setEditForm((f) => ({ ...f, username: v }))}
                                    placeholder="@username"
                                    autoCapitalize="none"
                                />
                                <View style={ds.fieldGroup}>
                                    <Text style={ds.fieldLabel}>Tiểu sử</Text>
                                    <TextInput
                                        style={[ds.input, { height: 80, textAlignVertical: "top" }]}
                                        value={editForm.bio}
                                        onChangeText={(v) => setEditForm((f) => ({ ...f, bio: v }))}
                                        placeholder="Giới thiệu bản thân..."
                                        placeholderTextColor={colors.textMuted}
                                        multiline
                                        numberOfLines={3}
                                    />
                                </View>
                                <Field
                                    label="Ngày sinh"
                                    value={editForm.birthday}
                                    onChange={(v) => setEditForm((f) => ({ ...f, birthday: v }))}
                                    placeholder="DD/MM/YYYY"
                                />
                                <View style={ds.fieldGroup}>
                                    <Text style={ds.fieldLabel}>Giới tính</Text>
                                    <View style={ds.chipRow}>
                                        {GENDER_OPTIONS.map((opt) => {
                                            const active = editForm.gender === opt.value;
                                            return (
                                                <TouchableOpacity
                                                    key={opt.value}
                                                    style={[ds.chip, active && ds.chipActive]}
                                                    onPress={() =>
                                                        setEditForm((f) => ({ ...f, gender: opt.value }))
                                                    }
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={[ds.chipText, active && ds.chipTextActive]}>
                                                        {opt.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                                <View style={{ height: 32 }} />
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
            </>
        </SafeAreaView>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatBlock({ label, value }: { label: string; value: number }) {
    return (
        <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 19, fontWeight: "700", color: colors.text }}>{value}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{label}</Text>
        </View>
    );
}

function MetaChip({ icon, text }: { icon: string; text: string }) {
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: colors.surface,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 20,
            }}
        >
            <Ionicons name={icon as any} size={13} color={colors.textMuted} />
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{text}</Text>
        </View>
    );
}

function Field({
    label,
    value,
    onChange,
    placeholder,
    autoCapitalize,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
    return (
        <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 6 }}>
                {label}
            </Text>
            <TextInput
                style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 15,
                    color: colors.text,
                }}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                autoCapitalize={autoCapitalize}
            />
        </View>
    );
}

// ── Styles: other-user view ───────────────────────────────────────────────────

const os = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    },
    iconBtn: { padding: 6 },
    headerTitle: {
        flex: 1,
        textAlign: "center",
        fontSize: 17,
        fontWeight: "700",
        color: colors.text,
    },
    card: {
        backgroundColor: colors.background,
        marginHorizontal: 14,
        marginTop: 12,
        borderRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    topRow: { flexDirection: "row", alignItems: "center" },
    avatar: {
        width: 78,
        height: 78,
        borderRadius: 39,
        borderWidth: 2.5,
        borderColor: colors.border,
    },
    avatarFallback: {
        width: 78,
        height: 78,
        borderRadius: 39,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2.5,
        borderColor: colors.border,
    },
    statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
    statNum: { fontSize: 19, fontWeight: "700", color: colors.text },
    statLbl: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    displayName: { fontSize: 20, fontWeight: "700", color: colors.text },
    handle: { fontSize: 14, color: colors.textMuted, fontWeight: "500", marginTop: 2 },
    bio: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: 8 },
    btnRow: { flexDirection: "row", marginTop: 18, gap: 10 },
    friendBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
        minHeight: 46,
    },
    friendBtnPrimary: { backgroundColor: colors.primary },
    friendBtnOutline: {
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    friendBtnDanger: { backgroundColor: colors.danger },
    friendBtnTextWhite: { color: "#fff", fontSize: 14, fontWeight: "600" },
    friendBtnTextPrimary: { color: colors.primary, fontSize: 14, fontWeight: "600" },
    friendBtnTextMuted: { color: colors.textMuted, fontSize: 14, fontWeight: "500" },
    receivedRow: { flex: 1, flexDirection: "row", gap: 8 },
    msgBtn: {
        width: 46,
        height: 46,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyWrap: { alignItems: "center", paddingVertical: 56 },
    emptyCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.textMuted },
});

// ── Styles: own-profile view ──────────────────────────────────────────────────

const createDynamicStyles = () =>
    StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        card: {
            backgroundColor: colors.background,
            marginHorizontal: 14,
            marginTop: 10,
            borderRadius: 20,
            padding: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
        },
        settingsBtn: { position: "absolute", top: 16, right: 16, zIndex: 10, padding: 4 },
        topRow: { flexDirection: "row", alignItems: "center" },
        avatarWrap: { position: "relative", marginRight: 18 },
        avatar: {
            width: 78,
            height: 78,
            borderRadius: 39,
            borderWidth: 2.5,
            borderColor: colors.border,
        },
        avatarFallback: {
            width: 78,
            height: 78,
            borderRadius: 39,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2.5,
            borderColor: colors.border,
        },
        onlineDot: {
            position: "absolute",
            bottom: 2,
            right: 2,
            width: 13,
            height: 13,
            borderRadius: 7,
            backgroundColor: colors.success,
            borderWidth: 2.5,
            borderColor: colors.background,
        },
        statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
        infoBlock: { marginTop: 16 },
        displayName: { fontSize: 20, fontWeight: "700", color: colors.text },
        handle: { fontSize: 14, color: colors.textMuted, fontWeight: "500", marginTop: 2 },
        bio: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: 8 },
        metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
        btnRow: { flexDirection: "row", marginTop: 18, gap: 10 },
        primaryBtn: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor: colors.primary,
            paddingVertical: 12,
            borderRadius: 12,
        },
        primaryBtnText: { color: colors.white, fontWeight: "600", fontSize: 14 },
        dangerBtn: {
            backgroundColor: "#FFE5E5",
            paddingHorizontal: 14,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
        },
        tabBar: {
            flexDirection: "row",
            marginHorizontal: 14,
            marginTop: 14,
            backgroundColor: colors.background,
            borderRadius: 14,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 2,
        },
        tab: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 13,
            borderBottomWidth: 2.5,
            borderBottomColor: "transparent",
        },
        tabActive: { borderBottomColor: colors.primary },
        tabText: { fontSize: 13, fontWeight: "500", color: colors.textMuted },
        tabTextActive: { color: colors.primary, fontWeight: "600" },
        grid: {
            flexDirection: "row",
            flexWrap: "wrap",
            paddingHorizontal: 14,
            paddingTop: 14,
            gap: GRID_GAP,
        },
        gridItem: { width: GRID_ITEM_SIZE, aspectRatio: 1, borderRadius: 12, overflow: "hidden" },
        gridImage: { width: "100%", height: "100%", backgroundColor: colors.border },
        gridImagePlaceholder: {
            width: "100%",
            height: "100%",
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
        },
        emptyWrap: { alignItems: "center", paddingVertical: 56 },
        emptyCircle: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
        },
        emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.textMuted },
        emptySub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
        overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
        sheet: {
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "92%",
        },
        dragBar: {
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.textMuted,
            alignSelf: "center",
            marginTop: 10,
            marginBottom: 4,
        },
        sheetHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        sheetTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
        sheetCancel: { fontSize: 15, color: colors.textMuted, fontWeight: "500" },
        sheetSave: { fontSize: 15, fontWeight: "700", color: colors.primary },
        sheetBody: { paddingHorizontal: 20 },
        avatarPreview: { alignItems: "center", paddingVertical: 18 },
        previewImg: { width: 76, height: 76, borderRadius: 38, borderWidth: 2.5, borderColor: colors.border },
        changePhotoRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
        changePhotoLabel: { fontSize: 13, color: colors.primary, fontWeight: "600" },
        fieldGroup: { marginTop: 16 },
        fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 6 },
        input: {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: colors.text,
        },
        chipRow: { flexDirection: "row", gap: 10 },
        chip: {
            flex: 1,
            paddingVertical: 11,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: colors.border,
            alignItems: "center",
            backgroundColor: colors.background,
        },
        chipActive: { borderColor: colors.primary, backgroundColor: colors.surface },
        chipText: { fontSize: 14, fontWeight: "500", color: colors.textMuted },
        chipTextActive: { color: colors.text, fontWeight: "600" },
        blockedRow: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.background,
            borderRadius: 14,
            padding: 14,
            marginBottom: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 2,
        },
        blockedAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.border },
        blockedAvatarFallback: {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: colors.border,
        },
        blockedName: { fontSize: 15, fontWeight: "600", color: colors.text },
        blockedUsername: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
        unblockBtn: { backgroundColor: "#FFE5E5", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
        unblockBtnText: { fontSize: 13, fontWeight: "600", color: colors.danger },
    });
