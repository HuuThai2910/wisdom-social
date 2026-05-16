import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { colors, spacing } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import pageService from "@/services/pageService";
import { buildS3Url } from "@/utils/s3";
import userService from "@/services/userService";
import { usePageEvents } from "@/hooks/usePageEvents";
import { usePagePostEvents } from "@/hooks/usePagePostEvents";
import AppHeader from "@/components/AppHeader";
import type {
  PageData,
  PageRole,
  PageInteractionStatus,
  MemberStatus,
  PageMemberData,
  PagePostItem,
} from "@/services/pageService";
import type { User } from "@/services/userService";

// ── Types ──────────────────────────────────────────────────────────────────

type PostItem = {
  id: string;
  content?: string;
  authorId?: string | number;
  createdAt?: string;
  media?: Array<{ url?: string; type?: string }>;
  stats?: { likes?: number; comments?: number };
};

type Section = "info" | "members" | "posts";

// ── Helpers ────────────────────────────────────────────────────────────────

const { width: screenWidth } = Dimensions.get("window");
const POST_IMG_WIDTH = screenWidth * 0.75;

const MEMBER_ROLES: { label: string; value: PageRole }[] = [
  { label: "Admin", value: "ADMIN" },
  { label: "Moderator", value: "MODERATOR" },
  { label: "User", value: "USER" },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function PageDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pageId } = useLocalSearchParams<{ pageId?: string }>();
  const { currentUser } = useAppContext();

  const numericUserId = useMemo(() => {
    const id = Number(currentUser?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [currentUser?.id]);

  const numericPageId = Number(pageId ?? 0);

  // ── Core state ─────────────────────────────────────────────────────────

  const [page, setPage] = useState<PageData | null>(null);
  const [members, setMembers] = useState<PageMemberData[]>([]);
  const [interaction, setInteraction] = useState<PageInteractionStatus>({
    isLiked: false,
    isFollowing: false,
    likeCount: 0,
    followCount: 0,
  });
  const [memberStatus, setMemberStatus] = useState<MemberStatus | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [userRole, setUserRole] = useState<PageRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Tabs ───────────────────────────────────────────────────────────────

  const [activeSection, setActiveSection] = useState<Section>("info");

  // ── Posts state ────────────────────────────────────────────────────────

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsWaiting, setPostsWaiting] = useState<PagePostItem[]>([]);
  const [loadingWaiting, setLoadingWaiting] = useState(false);

  // ── Pending requests state ─────────────────────────────────────────────

  const [pendingRequests, setPendingRequests] = useState<PageMemberData[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  // ── Create post modal ──────────────────────────────────────────────────

  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImages, setPostImages] = useState<
    { uri: string; name: string; type: string }[]
  >([]);
  const [creatingPost, setCreatingPost] = useState(false);

  // ── Add member modal ───────────────────────────────────────────────────

  const [showAddMember, setShowAddMember] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<User[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [newMemberRole, setNewMemberRole] = useState<PageRole>("USER");
  const [addingMembers, setAddingMembers] = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────

  const isAdmin = userRole === "ADMIN";
  const isMod = userRole === "MODERATOR";
  const canManage = isAdmin || isMod;
  const isOwner = !!(
    page &&
    numericUserId &&
    Number(page.createdBy?.id) === numericUserId
  );

  // ── Data loading ───────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!numericPageId) return;
    try {
      const [pageData, interactionData, count, membersData] = await Promise.all(
        [
          pageService.findPageById(numericPageId),
          pageService.getPageInteractionStatus(numericPageId),
          pageService.getMemberCount(numericPageId),
          pageService.getPageMembers(numericPageId),
        ],
      );
      setPage(pageData);
      setInteraction(interactionData);
      setMemberCount(count);
      setMembers(membersData);

      if (numericUserId) {
        const status = await pageService.getMemberStatus(
          numericPageId,
          numericUserId,
        );
        setMemberStatus(status);
        if (status === "ACTIVE") {
          const me = membersData.find((m) => m.user?.id === numericUserId);
          setUserRole(me?.role ?? "USER");
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [numericPageId, numericUserId]);

  const loadPosts = useCallback(async () => {
    if (!numericPageId) return;
    setLoadingPosts(true);
    try {
      const data = await pageService.getAllPostsOfPage(numericPageId);
      setPosts(data);
    } finally {
      setLoadingPosts(false);
    }
  }, [numericPageId]);

  const loadWaiting = useCallback(async () => {
    if (!numericPageId) return;
    setLoadingWaiting(true);
    try {
      const data = await pageService.getPostsWaitingForApproval(numericPageId);
      setPostsWaiting(data);
    } finally {
      setLoadingWaiting(false);
    }
  }, [numericPageId]);

  const loadPending = useCallback(async () => {
    if (!numericPageId) return;
    setLoadingPending(true);
    try {
      const data = await pageService.getPendingJoinRequests(numericPageId);
      setPendingRequests(data);
    } finally {
      setLoadingPending(false);
    }
  }, [numericPageId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reload page data when screen comes back into focus (e.g., after editing)
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Load pending/waiting after page loads (when we know if we can manage)
  useEffect(() => {
    if (!page || !canManage) return;
    void loadWaiting();
    if (isAdmin || isOwner) void loadPending();
  }, [page?.id, canManage, isAdmin, isOwner]);

  // Load posts when posts tab is selected
  useEffect(() => {
    if (activeSection === "posts") void loadPosts();
  }, [activeSection, loadPosts]);

  const wsRefresh = usePageEvents({
    pageId: numericPageId || undefined,
    userId: numericUserId ?? undefined,
  });
  useEffect(() => {
    if (wsRefresh > 0) {
      const timer = setTimeout(() => {
        void load();
        void loadPending();
        void loadWaiting();
        if (activeSection === "posts") void loadPosts();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [wsRefresh, load, loadPending, loadWaiting, loadPosts, activeSection]);

  // Real-time: lắng nghe sự kiện bài viết của page
  usePagePostEvents({
    pageId: numericPageId || undefined,
    onPostSubmitted: (_postId, post) => {
      // Bài viết mới gửi lên → thêm vào postsWaiting (admin/mod thấy ngay)
      if (post && canManage) {
        const newPost = post as unknown as import("@/services/pageService").PagePostItem;
        setPostsWaiting(prev => {
          if (prev.some(p => p.id === newPost.id)) return prev;
          return [newPost, ...prev];
        });
      }
    },
    onPostApproved: (postId, post) => {
      // Bài viết được duyệt → xóa khỏi waiting, thêm vào posts
      setPostsWaiting(prev => prev.filter(p => p.id !== postId));
      if (post) {
        const approvedPost = post as unknown as PostItem;
        setPosts(prev => {
          if (prev.some(p => p.id === postId)) return prev;
          return [approvedPost, ...prev];
        });
      }
    },
    onPostRejected: (postId) => {
      // Bài viết bị từ chối → xóa khỏi waiting
      setPostsWaiting(prev => prev.filter(p => p.id !== postId));
    },
    onPostRemoved: (postId) => {
      // Bài viết bị xóa → xóa khỏi posts
      setPosts(prev => prev.filter(p => p.id !== postId));
    },
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
    void loadPending();
    void loadWaiting();
    if (activeSection === "posts") void loadPosts();
  }, [load, loadPending, loadWaiting, loadPosts, activeSection]);

  // ── User search for add member ─────────────────────────────────────────

  useEffect(() => {
    if (!memberQuery || memberQuery.length < 2) {
      setMemberSearchResults([]);
      return;
    }
    setMemberSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const results = await userService.searchUserByUsername(memberQuery);
        if (Array.isArray(results)) {
          const memberIds = members.map((m) => m.user?.id);
          setMemberSearchResults(
            results.filter((u) => !memberIds.includes(Number(u.id))),
          );
        } else {
          setMemberSearchResults([]);
        }
      } catch {
        setMemberSearchResults([]);
      } finally {
        setMemberSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [memberQuery, members]);

  // ── Like / Follow ──────────────────────────────────────────────────────

  const toggleLike = async () => {
    if (!numericUserId) return;
    setActionLoading(true);
    try {
      if (interaction.isLiked) {
        await pageService.cancelLikePage(numericUserId, numericPageId);
        setInteraction((s) => ({
          ...s,
          isLiked: false,
          likeCount: Math.max(0, s.likeCount - 1),
        }));
      } else {
        await pageService.likePage(numericUserId, numericPageId);
        setInteraction((s) => ({
          ...s,
          isLiked: true,
          likeCount: s.likeCount + 1,
        }));
      }
    } finally {
      setActionLoading(false);
    }
  };

  const toggleFollow = async () => {
    if (!numericUserId) return;
    setActionLoading(true);
    try {
      if (interaction.isFollowing) {
        await pageService.cancelFollowPage(numericUserId, numericPageId);
        setInteraction((s) => ({
          ...s,
          isFollowing: false,
          followCount: Math.max(0, s.followCount - 1),
        }));
      } else {
        await pageService.followPage(numericUserId, numericPageId);
        setInteraction((s) => ({
          ...s,
          isFollowing: true,
          followCount: s.followCount + 1,
        }));
      }
    } finally {
      setActionLoading(false);
    }
  };

  // ── Join / Leave ───────────────────────────────────────────────────────

  const handleJoin = async () => {
    if (!numericUserId) return;
    setActionLoading(true);
    try {
      await pageService.requestJoinPage(numericUserId, numericPageId);
      const status = await pageService.getMemberStatus(
        numericPageId,
        numericUserId,
      );
      setMemberStatus(status);
      if (status === "ACTIVE") setMemberCount((c) => c + 1);
      Alert.alert(
        "Thành công",
        page?.status === "PUBLIC"
          ? "Đã tham gia trang."
          : "Đã gửi yêu cầu tham gia.",
      );
    } catch {
      Alert.alert("Lỗi", "Không thể gửi yêu cầu.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = () => {
    if (!numericUserId) return;
    Alert.alert("Hủy yêu cầu", "Bạn muốn hủy yêu cầu tham gia trang?", [
      { text: "Không", style: "cancel" },
      {
        text: "Hủy yêu cầu",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await pageService.cancelJoinRequest(numericPageId, numericUserId);
            setMemberStatus(null);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleLeave = () => {
    if (!numericUserId) return;
    Alert.alert("Rời khỏi trang", "Bạn có chắc muốn rời khỏi trang này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Rời",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await pageService.removeMember(numericPageId, numericUserId);
            setMemberStatus(null);
            setUserRole(null);
            setMemberCount((c) => Math.max(0, c - 1));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  // ── Post actions ───────────────────────────────────────────────────────

  const handleApprovePost = async (postId: string) => {
    if (!numericUserId) return;
    try {
      await pageService.approvePost(numericUserId, numericPageId, postId);
      void loadWaiting();
    } catch {
      Alert.alert("Lỗi", "Không thể duyệt bài viết.");
    }
  };

  const handleCancelApprovePost = async (postId: string) => {
    if (!numericUserId) return;
    try {
      await pageService.cancelApprovePost(numericUserId, numericPageId, postId);
      void loadWaiting();
    } catch {
      Alert.alert("Lỗi", "Không thể hủy duyệt bài viết.");
    }
  };

  const handleRemovePost = (postId: string) => {
    if (!numericUserId) return;
    Alert.alert("Xóa bài viết", "Xóa bài viết này khỏi trang?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await pageService.removePostFromPage(
              numericUserId,
              numericPageId,
              postId,
            );
            void loadPosts();
            void loadWaiting();
          } catch {
            Alert.alert("Lỗi", "Không thể xóa bài viết.");
          }
        },
      },
    ]);
  };

  const handleApproveAll = () => {
    if (!numericUserId) return;
    Alert.alert("Duyệt tất cả", "Duyệt tất cả bài viết đang chờ?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Duyệt",
        onPress: async () => {
          try {
            await pageService.approveAllPosts(numericUserId, numericPageId);
            void loadWaiting();
          } catch {
            Alert.alert("Lỗi", "Không thể duyệt tất cả.");
          }
        },
      },
    ]);
  };

  const handleCancelAll = () => {
    if (!numericUserId) return;
    Alert.alert("Hủy tất cả", "Hủy duyệt tất cả bài viết?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Hủy duyệt",
        style: "destructive",
        onPress: async () => {
          try {
            await pageService.cancelAllPosts(numericUserId, numericPageId);
            void loadWaiting();
          } catch {
            Alert.alert("Lỗi", "Không thể hủy duyệt.");
          }
        },
      },
    ]);
  };

  const handleCreatePost = async () => {
    if (!numericUserId || !numericPageId) return;
    if (!postContent.trim() && postImages.length === 0) {
      Alert.alert(
        "Thiếu nội dung",
        "Vui lòng nhập nội dung hoặc chọn hình ảnh.",
      );
      return;
    }
    setCreatingPost(true);
    try {
      const ok = await pageService.addPostToPage(
        numericPageId,
        { content: postContent },
        postImages.length > 0 ? postImages : undefined,
      );
      if (ok) {
        Alert.alert("Thành công", "Đã tạo bài viết.");
        setShowCreatePost(false);
        setPostContent("");
        setPostImages([]);
        void loadWaiting();
        if (activeSection === "posts") void loadPosts();
      } else {
        Alert.alert("Lỗi", "Không thể tạo bài viết.");
      }
    } catch {
      Alert.alert("Lỗi", "Không thể tạo bài viết.");
    } finally {
      setCreatingPost(false);
    }
  };

  const pickPostImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const newImages = result.assets.map((asset, idx) => ({
        uri: asset.uri,
        name: `post_${Date.now()}_${idx}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
      }));
      setPostImages((prev) => [...prev, ...newImages]);
    }
  };

  // ── Member actions ─────────────────────────────────────────────────────

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn ít nhất một người dùng.");
      return;
    }
    setAddingMembers(true);
    try {
      await Promise.all(
        selectedUsers.map((u) =>
          pageService.addMember(Number(u.id), numericPageId, newMemberRole),
        ),
      );
      Alert.alert("Thành công", `Đã thêm ${selectedUsers.length} thành viên.`);
      setShowAddMember(false);
      setMemberQuery("");
      setSelectedUsers([]);
      void load();
    } catch {
      Alert.alert("Lỗi", "Không thể thêm thành viên.");
    } finally {
      setAddingMembers(false);
    }
  };

  const handleRemoveMember = (userId: number, name: string) => {
    Alert.alert("Xóa thành viên", `Xóa ${name} khỏi trang?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await pageService.removeMember(numericPageId, userId);
            void load();
          } catch {
            Alert.alert("Lỗi", "Không thể xóa thành viên.");
          }
        },
      },
    ]);
  };

  // ── Join request actions ───────────────────────────────────────────────

  const handleApproveJoinRequest = (userId: number, name: string) => {
    Alert.alert("Duyệt yêu cầu", `Chấp nhận ${name} vào trang?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Duyệt",
        onPress: async () => {
          try {
            await pageService.approveJoinRequest(numericPageId, userId);
            void loadPending();
            void load();
          } catch {
            Alert.alert("Lỗi", "Không thể duyệt yêu cầu.");
          }
        },
      },
    ]);
  };

  const handleRejectJoinRequest = (userId: number, name: string) => {
    Alert.alert("Từ chối yêu cầu", `Từ chối ${name}?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Từ chối",
        style: "destructive",
        onPress: async () => {
          try {
            await pageService.rejectJoinRequest(numericPageId, userId);
            void loadPending();
          } catch {
            Alert.alert("Lỗi", "Không thể từ chối.");
          }
        },
      },
    ]);
  };

  // ── Delete page ────────────────────────────────────────────────────────

  const handleDeletePage = () => {
    Alert.alert(
      "Xóa trang",
      "Bạn có chắc muốn xóa trang này? Hành động không thể hoàn tác.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa trang",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              const ok = await pageService.deletePage(numericPageId);
              if (ok) router.back();
              else Alert.alert("Lỗi", "Không thể xóa trang.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  // ── Render: join button ────────────────────────────────────────────────

  const renderJoinButton = () => {
    if (!numericUserId || isOwner) return null;
    if (memberStatus === "ACTIVE") {
      return (
        <TouchableOpacity
          style={[styles.actionBtn, styles.memberBtn]}
          onPress={handleLeave}
          disabled={actionLoading}
        >
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={[styles.actionBtnText, { color: colors.success }]}>
            Thành viên
          </Text>
        </TouchableOpacity>
      );
    }
    if (memberStatus === "PENDING") {
      return (
        <TouchableOpacity
          style={[styles.actionBtn, styles.pendingBtn]}
          onPress={handleCancelRequest}
          disabled={actionLoading}
        >
          <Ionicons name="time-outline" size={16} color="#F59E0B" />
          <Text style={[styles.actionBtnText, { color: "#F59E0B" }]}>
            Hủy yêu cầu
          </Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.actionBtn, styles.joinBtn]}
        onPress={handleJoin}
        disabled={actionLoading}
      >
        <Ionicons name="person-add-outline" size={16} color={colors.white} />
        <Text style={[styles.actionBtnText, { color: colors.white }]}>
          {page?.status === "PUBLIC" ? "Tham gia" : "Xin tham gia"}
        </Text>
      </TouchableOpacity>
    );
  };

  // ── Loading / Error ────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title="Chi tiết trang"
          leftAction={{ icon: "arrow-back", onPress: () => router.back() }}
        />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!page) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title="Chi tiết trang"
          leftAction={{ icon: "arrow-back", onPress: () => router.back() }}
        />
        <View style={styles.center}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.textMuted}
          />
          <Text style={{ color: colors.textMuted, marginTop: 10 }}>
            Không tìm thấy trang
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 16 }}
          >
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              Quay lại
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title={page.name ?? "Chi tiết trang"}
        leftAction={{ icon: "arrow-back", onPress: () => router.back() }}
      />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {/* Cover */}
        {page.coverUrl ? (
          <Image
            key={`cover-${page.coverUrl}`}
            source={{ uri: buildS3Url(page.coverUrl)! }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Ionicons name="image-outline" size={40} color={colors.border} />
          </View>
        )}

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrap}>
              {page.avatarUrl ? (
                <Image
                  key={`avatar-${page.avatarUrl}`}
                  source={{ uri: buildS3Url(page.avatarUrl)! }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Ionicons
                    name="business-outline"
                    size={28}
                    color={colors.textMuted}
                  />
                </View>
              )}
            </View>
          </View>

          <View style={styles.nameBlock}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text style={styles.pageName}>{page.name}</Text>
              {page.isVerified && (
                <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
              )}
            </View>
            {!!page.username && (
              <Text style={styles.pageUsername}>@{page.username}</Text>
            )}
            {!!page.category && (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryText}>{page.category}</Text>
              </View>
            )}
            {!!page.status && (
              <View style={styles.statusRow}>
                <Ionicons
                  name={
                    page.status === "PUBLIC"
                      ? "earth-outline"
                      : "lock-closed-outline"
                  }
                  size={13}
                  color={colors.textMuted}
                />
                <Text style={styles.statusText}>
                  {page.status === "PUBLIC"
                    ? "Công khai"
                    : page.status === "PRIVATE"
                      ? "Riêng tư"
                      : page.status}
                </Text>
              </View>
            )}
          </View>

          {!!page.description && (
            <Text style={styles.description}>{page.description}</Text>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{interaction.likeCount}</Text>
              <Text style={styles.statLabel}>Thích</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{interaction.followCount}</Text>
              <Text style={styles.statLabel}>Theo dõi</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{memberCount}</Text>
              <Text style={styles.statLabel}>Thành viên</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                interaction.isLiked ? styles.activeBtn : styles.outlineBtn,
              ]}
              onPress={toggleLike}
              disabled={actionLoading}
            >
              <Ionicons
                name={interaction.isLiked ? "heart" : "heart-outline"}
                size={16}
                color={interaction.isLiked ? colors.danger : colors.danger}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  { color: interaction.isLiked ? colors.white : colors.text },
                ]}
              >
                {interaction.isLiked ? "Đã thích" : "Thích"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                interaction.isFollowing ? styles.activeBtn : styles.outlineBtn,
              ]}
              onPress={toggleFollow}
              disabled={actionLoading}
            >
              <Ionicons
                name={
                  interaction.isFollowing
                    ? "checkmark-circle"
                    : "add-circle-outline"
                }
                size={16}
                color={interaction.isFollowing ? colors.white : colors.primary}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  {
                    color: interaction.isFollowing ? colors.white : colors.text,
                  },
                ]}
              >
                {interaction.isFollowing ? "Đang theo dõi" : "Theo dõi"}
              </Text>
            </TouchableOpacity>

            {renderJoinButton()}
          </View>
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {(["info", "members", "posts"] as Section[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeSection === tab && styles.tabActive]}
              onPress={() => setActiveSection(tab)}
            >
              <Ionicons
                name={
                  tab === "info"
                    ? "information-circle-outline"
                    : tab === "members"
                      ? "people-outline"
                      : "grid-outline"
                }
                size={18}
                color={
                  activeSection === tab ? colors.primary : colors.textMuted
                }
              />
              <Text
                style={[
                  styles.tabText,
                  activeSection === tab && styles.tabTextActive,
                ]}
              >
                {tab === "info"
                  ? "Thông tin"
                  : tab === "members"
                    ? `Thành viên (${members.length})`
                    : "Bài viết"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Info tab ── */}
        {activeSection === "info" && (
          <View
            style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}
          >
            {/* Contact */}
            {(page.email || page.phone || page.website || page.address) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Thông tin liên hệ</Text>
                {!!page.phone && (
                  <InfoRow
                    icon="call-outline"
                    label="Điện thoại"
                    value={page.phone}
                  />
                )}
                {!!page.email && (
                  <InfoRow
                    icon="mail-outline"
                    label="Email"
                    value={page.email}
                  />
                )}
                {!!page.website && (
                  <InfoRow
                    icon="globe-outline"
                    label="Website"
                    value={page.website}
                  />
                )}
                {!!page.address && (
                  <InfoRow
                    icon="location-outline"
                    label="Địa chỉ"
                    value={page.address}
                  />
                )}
              </View>
            )}

            {/* Creator */}
            {!!page.createdBy && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Người tạo</Text>
                <View style={styles.ownerRow}>
                  {page.createdBy.avatarUrl ? (
                    <Image
                      source={{ uri: buildS3Url(page.createdBy.avatarUrl) }}
                      style={styles.ownerAvatar}
                    />
                  ) : (
                    <View style={[styles.ownerAvatar, styles.avatarFallback]}>
                      <Ionicons
                        name="person"
                        size={14}
                        color={colors.textMuted}
                      />
                    </View>
                  )}
                  <Text style={styles.ownerName}>
                    {page.createdBy.name ||
                      page.createdBy.username ||
                      page.createdBy.phone ||
                      "Không rõ"}
                  </Text>
                </View>
              </View>
            )}

            {/* Management (admin/owner) */}
            {(canManage || isOwner) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Quản lý trang</Text>
                <ManageBtn
                  icon="add-circle-outline"
                  label="Tạo bài viết"
                  color={colors.primary}
                  onPress={() => setShowCreatePost(true)}
                />
                {(isAdmin || isOwner) && (
                  <ManageBtn
                    icon="person-add-outline"
                    label="Thêm thành viên"
                    color={colors.primary}
                    onPress={() => {
                      setMemberQuery("");
                      setSelectedUsers([]);
                      setShowAddMember(true);
                    }}
                  />
                )}
                {(isAdmin || isOwner) && (
                  <ManageBtn
                    icon="create-outline"
                    label="Chỉnh sửa trang"
                    color={colors.primary}
                    onPress={() =>
                      router.push({
                        pathname: "/(stack)/page-edit",
                        params: { pageId: String(numericPageId) },
                      })
                    }
                  />
                )}
                {isOwner && (
                  <ManageBtn
                    icon="trash-outline"
                    label="Xóa trang"
                    color={colors.danger}
                    onPress={handleDeletePage}
                    last
                  />
                )}
              </View>
            )}

            {/* Pending join requests */}
            {(isAdmin || isOwner) && pendingRequests.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  Yêu cầu tham gia ({pendingRequests.length})
                </Text>
                {loadingPending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  pendingRequests.map((req) => (
                    <View key={req.id} style={styles.requestRow}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          flex: 1,
                        }}
                      >
                        {req.user?.avatarUrl ? (
                          <Image
                            source={{ uri: buildS3Url(req.user.avatarUrl) }}
                            style={styles.reqAvatar}
                          />
                        ) : (
                          <View
                            style={[styles.reqAvatar, styles.avatarFallback]}
                          >
                            <Ionicons
                              name="person"
                              size={14}
                              color={colors.textMuted}
                            />
                          </View>
                        )}
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.memberName}>
                            {req.user?.name ||
                              req.user?.username ||
                              "Người dùng"}
                          </Text>
                          <Text style={styles.memberSub}>
                            @{req.user?.username || "unknown"}
                          </Text>
                          {req.joinedAt && (
                            <Text style={styles.memberSub}>
                              {new Date(req.joinedAt).toLocaleDateString(
                                "vi-VN",
                              )}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View
                        style={{ flexDirection: "row", gap: 8, marginTop: 10 }}
                      >
                        <TouchableOpacity
                          style={[
                            styles.smallBtn,
                            { backgroundColor: "#D1FAE5" },
                          ]}
                          onPress={() =>
                            handleApproveJoinRequest(
                              req.user?.id ?? 0,
                              req.user?.name ||
                                req.user?.username ||
                                "người dùng",
                            )
                          }
                        >
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={colors.success}
                          />
                          <Text
                            style={[
                              styles.smallBtnText,
                              { color: colors.success },
                            ]}
                          >
                            Duyệt
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.smallBtn,
                            { backgroundColor: "#FEE2E2" },
                          ]}
                          onPress={() =>
                            handleRejectJoinRequest(
                              req.user?.id ?? 0,
                              req.user?.name ||
                                req.user?.username ||
                                "người dùng",
                            )
                          }
                        >
                          <Ionicons
                            name="close"
                            size={16}
                            color={colors.danger}
                          />
                          <Text
                            style={[
                              styles.smallBtnText,
                              { color: colors.danger },
                            ]}
                          >
                            Từ chối
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Waiting posts */}
            {canManage && (postsWaiting.length > 0 || loadingWaiting) && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>
                    Bài viết chờ duyệt ({postsWaiting.length})
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCreatePost(true)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="add-circle"
                      size={22}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
                {postsWaiting.length > 0 && (
                  <View
                    style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}
                  >
                    <TouchableOpacity
                      style={[styles.bulkBtn, { backgroundColor: "#D1FAE5" }]}
                      onPress={handleApproveAll}
                    >
                      <Ionicons
                        name="checkmark-done"
                        size={15}
                        color={colors.success}
                      />
                      <Text
                        style={[styles.bulkBtnText, { color: colors.success }]}
                      >
                        Duyệt tất cả
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.bulkBtn, { backgroundColor: "#FEE2E2" }]}
                      onPress={handleCancelAll}
                    >
                      <Ionicons name="close" size={15} color={colors.danger} />
                      <Text
                        style={[styles.bulkBtnText, { color: colors.danger }]}
                      >
                        Hủy tất cả
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {loadingWaiting ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  postsWaiting.map((post) => (
                    <View
                      key={post.id}
                      style={[styles.postCard, { backgroundColor: "#FEF3C7" }]}
                    >
                      <View style={styles.postHeader}>
                        {post.user?.avatarUrl ? (
                          <Image
                            source={{ uri: buildS3Url(post.user.avatarUrl) }}
                            style={styles.postAvatar}
                          />
                        ) : (
                          <View
                            style={[styles.postAvatar, styles.avatarFallback]}
                          >
                            <Ionicons
                              name="person"
                              size={14}
                              color={colors.textMuted}
                            />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.postAuthor}>
                            {post.user?.name ||
                              post.user?.username ||
                              "Người dùng"}
                          </Text>
                          {post.createdAt && (
                            <Text style={styles.postDate}>
                              {new Date(post.createdAt).toLocaleDateString(
                                "vi-VN",
                              )}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemovePost(post.id)}
                          hitSlop={8}
                        >
                          <Ionicons
                            name="close"
                            size={20}
                            color={colors.danger}
                          />
                        </TouchableOpacity>
                      </View>
                      {!!post.content && (
                        <Text style={styles.postContent}>{post.content}</Text>
                      )}
                      {post.images && post.images.length > 0 && (
                        <Image
                          source={{ uri: buildS3Url(post.images[0]) }}
                          style={styles.postImagePreview}
                          resizeMode="cover"
                        />
                      )}
                      <View
                        style={{ flexDirection: "row", gap: 8, marginTop: 10 }}
                      >
                        <TouchableOpacity
                          style={[
                            styles.smallBtn,
                            { flex: 1, backgroundColor: "#D1FAE5" },
                          ]}
                          onPress={() => handleApprovePost(post.id)}
                        >
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={colors.success}
                          />
                          <Text
                            style={[
                              styles.smallBtnText,
                              { color: colors.success },
                            ]}
                          >
                            Duyệt
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.smallBtn,
                            { flex: 1, backgroundColor: "#FEE2E2" },
                          ]}
                          onPress={() => handleCancelApprovePost(post.id)}
                        >
                          <Ionicons
                            name="close"
                            size={16}
                            color={colors.danger}
                          />
                          <Text
                            style={[
                              styles.smallBtnText,
                              { color: colors.danger },
                            ]}
                          >
                            Hủy
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        )}

        {/* ── Members tab ── */}
        {activeSection === "members" && (
          <View
            style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}
          >
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Danh sách thành viên</Text>
                {(isAdmin || isOwner) && (
                  <TouchableOpacity
                    onPress={() => {
                      setMemberQuery("");
                      setSelectedUsers([]);
                      setShowAddMember(true);
                    }}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="person-add"
                      size={22}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>
              {members.length === 0 ? (
                <View style={styles.emptyBlock}>
                  <Ionicons
                    name="people-outline"
                    size={40}
                    color={colors.border}
                  />
                  <Text style={styles.emptyText}>Chưa có thành viên nào</Text>
                </View>
              ) : (
                members.map((m) => (
                  <View key={m.id ?? m.user?.id} style={styles.memberRow}>
                    {m.user?.avatarUrl ? (
                      <Image
                        source={{ uri: buildS3Url(m.user.avatarUrl) }}
                        style={styles.memberAvatar}
                      />
                    ) : (
                      <View
                        style={[styles.memberAvatar, styles.avatarFallback]}
                      >
                        <Ionicons
                          name="person"
                          size={16}
                          color={colors.textMuted}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>
                        {m.user?.name || m.user?.username || "Người dùng"}
                      </Text>
                      <View
                        style={{ flexDirection: "row", gap: 6, marginTop: 2 }}
                      >
                        <View
                          style={[
                            styles.roleBadge,
                            m.role === "ADMIN" && {
                              backgroundColor: colors.primary + "20",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleBadgeText,
                              m.role === "ADMIN" && { color: colors.primary },
                            ]}
                          >
                            {m.role}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {(isAdmin || isOwner) && m.user?.id !== numericUserId && (
                      <TouchableOpacity
                        onPress={() =>
                          handleRemoveMember(
                            m.user?.id ?? 0,
                            m.user?.name || m.user?.username || "thành viên",
                          )
                        }
                        hitSlop={8}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={22}
                          color={colors.danger}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* ── Posts tab ── */}
        {activeSection === "posts" && (
          <View
            style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}
          >
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Bài viết của trang</Text>
                <TouchableOpacity
                  onPress={() => setShowCreatePost(true)}
                  hitSlop={8}
                >
                  <Ionicons
                    name="add-circle"
                    size={24}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
              {loadingPosts ? (
                <ActivityIndicator
                  size="large"
                  color={colors.primary}
                  style={{ paddingVertical: 40 }}
                />
              ) : posts.length === 0 ? (
                <View style={styles.emptyBlock}>
                  <Ionicons
                    name="newspaper-outline"
                    size={40}
                    color={colors.border}
                  />
                  <Text style={styles.emptyText}>Chưa có bài viết</Text>
                </View>
              ) : (
                posts.map((post) => (
                  <View key={post.id} style={styles.postCard}>
                    <View style={styles.postHeader}>
                      <View style={[styles.postAvatar, styles.avatarFallback]}>
                        <Ionicons
                          name="person"
                          size={14}
                          color={colors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.postAuthor}>
                          Người dùng #{post.authorId}
                        </Text>
                        {post.createdAt && (
                          <Text style={styles.postDate}>
                            {new Date(post.createdAt).toLocaleDateString(
                              "vi-VN",
                            )}
                          </Text>
                        )}
                      </View>
                      {canManage && (
                        <TouchableOpacity
                          onPress={() => handleRemovePost(post.id)}
                          hitSlop={8}
                        >
                          <Ionicons
                            name="close"
                            size={20}
                            color={colors.danger}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                    {!!post.content && (
                      <Text style={styles.postContent}>{post.content}</Text>
                    )}
                    {post.media && post.media.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginTop: 8 }}
                        contentContainerStyle={{ gap: 8 }}
                      >
                        {post.media.map((item, idx) =>
                          item?.url ? (
                            <Image
                              key={idx}
                              source={{ uri: buildS3Url(item.url) }}
                              style={{
                                width: POST_IMG_WIDTH,
                                height: 220,
                                borderRadius: 10,
                              }}
                              resizeMode="cover"
                            />
                          ) : null,
                        )}
                      </ScrollView>
                    )}
                    {post.stats && (
                      <View
                        style={{ flexDirection: "row", marginTop: 8, gap: 16 }}
                      >
                        <Text style={{ fontSize: 13, color: colors.textMuted }}>
                          ❤️ {post.stats.likes ?? 0}
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.textMuted }}>
                          💬 {post.stats.comments ?? 0}
                        </Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* ── Create post modal ── */}
      <Modal
        visible={showCreatePost}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreatePost(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.overlay}>
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.dragBar} />
              <View style={styles.sheetHeader}>
                <TouchableOpacity
                  onPress={() => setShowCreatePost(false)}
                  hitSlop={12}
                >
                  <Text style={styles.sheetCancel}>Hủy</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>Tạo bài viết</Text>
                <TouchableOpacity
                  onPress={handleCreatePost}
                  disabled={creatingPost}
                  hitSlop={12}
                >
                  <Text
                    style={[
                      styles.sheetSave,
                      creatingPost && { color: colors.textMuted },
                    ]}
                  >
                    {creatingPost ? "Đang đăng..." : "Đăng"}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                style={{ paddingHorizontal: 20 }}
                keyboardShouldPersistTaps="handled"
              >
                <TextInput
                  style={styles.postInput}
                  value={postContent}
                  onChangeText={setPostContent}
                  placeholder="Bạn đang nghĩ gì?"
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
                <TouchableOpacity
                  style={styles.imagePickerRow}
                  onPress={pickPostImages}
                >
                  <Ionicons
                    name="images-outline"
                    size={22}
                    color={colors.primary}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: colors.primary,
                    }}
                  >
                    Chọn hình ảnh
                  </Text>
                </TouchableOpacity>
                {postImages.map((img, idx) => (
                  <View
                    key={idx}
                    style={{ position: "relative", marginTop: 10 }}
                  >
                    <Image
                      source={{ uri: buildS3Url(img.uri) }}
                      style={{ width: "100%", height: 200, borderRadius: 12 }}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setPostImages((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                      style={styles.removeImageBtn}
                    >
                      <Ionicons name="close" size={18} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add member modal ── */}
      <Modal
        visible={showAddMember}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddMember(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.overlay}>
            <View
              style={[
                styles.sheet,
                { paddingBottom: insets.bottom + 16, maxHeight: "80%" },
              ]}
            >
              <View style={styles.dragBar} />
              <View style={styles.sheetHeader}>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddMember(false);
                    setMemberQuery("");
                    setSelectedUsers([]);
                  }}
                  hitSlop={12}
                >
                  <Text style={styles.sheetCancel}>Hủy</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>Thêm thành viên</Text>
                <TouchableOpacity
                  onPress={handleAddMembers}
                  disabled={selectedUsers.length === 0 || addingMembers}
                  hitSlop={12}
                >
                  <Text
                    style={[
                      styles.sheetSave,
                      selectedUsers.length === 0 && { color: colors.textMuted },
                    ]}
                  >
                    {addingMembers
                      ? "Đang thêm..."
                      : `Thêm (${selectedUsers.length})`}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                style={{ paddingHorizontal: 20, paddingTop: 12 }}
                keyboardShouldPersistTaps="handled"
              >
                <TextInput
                  style={styles.searchInput}
                  value={memberQuery}
                  onChangeText={setMemberQuery}
                  placeholder="Nhập username để tìm kiếm"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
                {memberSearching && (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={{ marginTop: 12 }}
                  />
                )}
                {!memberSearching &&
                  memberSearchResults.map((u) => {
                    const selected = selectedUsers.some((s) => s.id === u.id);
                    return (
                      <TouchableOpacity
                        key={u.id}
                        style={[
                          styles.userRow,
                          selected && { borderColor: colors.primary },
                        ]}
                        onPress={() =>
                          setSelectedUsers((prev) =>
                            selected
                              ? prev.filter((s) => s.id !== u.id)
                              : [...prev, u],
                          )
                        }
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            selected && {
                              backgroundColor: colors.primary,
                              borderColor: colors.primary,
                            },
                          ]}
                        >
                          {selected && (
                            <Ionicons
                              name="checkmark"
                              size={14}
                              color={colors.white}
                            />
                          )}
                        </View>
                        {u.avatarUrl ? (
                          <Image
                            source={{ uri: buildS3Url(u.avatarUrl) }}
                            style={styles.userAvatar}
                          />
                        ) : (
                          <View
                            style={[styles.userAvatar, styles.avatarFallback]}
                          >
                            <Ionicons
                              name="person"
                              size={16}
                              color={colors.textMuted}
                            />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.memberName}>
                            {u.name || u.fullName}
                          </Text>
                          <Text style={styles.memberSub}>@{u.username}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                {!memberSearching &&
                  memberQuery.length >= 2 &&
                  memberSearchResults.length === 0 && (
                    <Text
                      style={{
                        textAlign: "center",
                        color: colors.textMuted,
                        marginTop: 20,
                      }}
                    >
                      Không tìm thấy người dùng
                    </Text>
                  )}
                {selectedUsers.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: colors.textMuted,
                        marginBottom: 8,
                      }}
                    >
                      Đã chọn ({selectedUsers.length})
                    </Text>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                    >
                      {selectedUsers.map((u) => (
                        <View key={u.id} style={styles.selectedChip}>
                          <Text
                            style={{
                              fontSize: 13,
                              color: colors.primary,
                              fontWeight: "500",
                            }}
                          >
                            {u.username}
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              setSelectedUsers((prev) =>
                                prev.filter((s) => s.id !== u.id),
                              )
                            }
                            hitSlop={8}
                          >
                            <Ionicons
                              name="close-circle"
                              size={18}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: colors.textMuted,
                    marginTop: 16,
                    marginBottom: 8,
                  }}
                >
                  Vai trò
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}
                >
                  {MEMBER_ROLES.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[
                        styles.roleChip,
                        newMemberRole === r.value && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => setNewMemberRole(r.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
                          newMemberRole === r.value && { color: colors.white },
                        ]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Helper components ──────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 8,
      }}
    >
      <Ionicons name={icon as any} size={17} color={colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
        <Text style={{ fontSize: 14, color: colors.text, marginTop: 1 }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ManageBtn({
  icon,
  label,
  color,
  onPress,
  last,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          paddingVertical: 12,
        },
        !last && { borderBottomWidth: 1, borderColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={{ flex: 1, fontSize: 14, color }}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  cover: { width: "100%", height: 180 },
  coverPlaceholder: {
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },

  profileCard: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  avatarRow: { marginTop: -40 },
  avatarWrap: {
    borderWidth: 3,
    borderColor: colors.white,
    borderRadius: 44,
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: {
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  nameBlock: { marginTop: spacing.sm },
  pageName: { fontSize: 18, fontWeight: "700", color: colors.text },
  pageUsername: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  categoryChip: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: colors.primary + "15",
    borderRadius: 12,
  },
  categoryText: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  statusText: { fontSize: 12, color: colors.textMuted },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: 8,
  },

  statsRow: {
    flexDirection: "row",
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 16, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },

  actionsRow: {
    flexDirection: "row",
    marginTop: spacing.md,
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
  joinBtn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pendingBtn: { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" },
  memberBtn: { backgroundColor: "#D1FAE5", borderColor: colors.success },
  outlineBtn: { backgroundColor: colors.white, borderColor: colors.border },
  activeBtn: { backgroundColor: colors.primary, borderColor: colors.primary },

  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 12,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: "500", color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: "700" },

  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  ownerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  ownerAvatar: { width: 36, height: 36, borderRadius: 18 },
  ownerName: { fontSize: 14, fontWeight: "600", color: colors.text },

  requestRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  reqAvatar: { width: 40, height: 40, borderRadius: 20 },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  memberAvatar: { width: 42, height: 42, borderRadius: 21 },
  memberName: { fontSize: 14, fontWeight: "600", color: colors.text },
  memberSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  roleBadgeText: { fontSize: 11, color: colors.textMuted, fontWeight: "500" },

  emptyBlock: { alignItems: "center", paddingVertical: 30 },
  emptyText: { color: colors.textMuted, marginTop: 8, fontSize: 14 },

  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallBtnText: { fontSize: 13, fontWeight: "600" },
  bulkBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkBtnText: { fontSize: 13, fontWeight: "600" },

  postCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  postAvatar: { width: 36, height: 36, borderRadius: 18 },
  postAuthor: { fontSize: 14, fontWeight: "600", color: colors.text },
  postDate: { fontSize: 11, color: colors.textMuted },
  postContent: { fontSize: 14, color: colors.text, lineHeight: 20 },
  postImagePreview: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginTop: 8,
  },

  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  dragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  sheetCancel: { fontSize: 15, color: colors.textMuted },
  sheetSave: { fontSize: 15, fontWeight: "700", color: colors.primary },

  postInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    height: 120,
    textAlignVertical: "top",
    marginTop: 14,
  },
  imagePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    padding: 5,
  },

  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatar: { width: 40, height: 40, borderRadius: 20 },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 6,
    backgroundColor: colors.primary + "20",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  roleChipText: { fontSize: 13, fontWeight: "500", color: colors.textMuted },
});
