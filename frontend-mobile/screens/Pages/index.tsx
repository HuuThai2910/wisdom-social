import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import pageService, { PageData } from "@/services/pageService";
import { buildS3Url } from "@/utils/s3";
import chatWebsocketService from "@/services/chatWebsocketService";
import pageWebsocketService, { type PageListEvent } from "@/services/pageWebsocketService";

export default function PagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAppContext();
  const [activeTab, setActiveTab] = useState<"discover" | "my-pages">(
    "discover",
  );
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data =
        activeTab === "discover"
          ? await pageService.getAllPages()
          : await pageService.getMyPages();
      setPages(data);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Reload page list when screen comes back into focus (e.g., after editing a page)
  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  // Real-time: lắng nghe page mới tạo / xóa / cập nhật
  // Dùng ref cho loadData để tránh re-subscribe mỗi lần activeTab thay đổi
  const loadDataRef = React.useRef(loadData);
  loadDataRef.current = loadData;

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        await chatWebsocketService.connect();
      } catch { /* ignore — fallback to pull-to-refresh */ }

      if (cancelled) return;

      pageWebsocketService.subscribeToPageList((event: PageListEvent) => {
        console.log("📡 [Mobile] Realtime Page List Event:", event);

        if (event.eventType === "PAGE_CREATED") {
          if (event.page) {
            const newPage = event.page as unknown as PageData;
            setPages(prev => {
              if (prev.some(p => p.id === newPage.id)) return prev;
              return [newPage, ...prev];
            });
          } else {
            void loadDataRef.current();
          }
        } else if (event.eventType === "PAGE_DELETED" && event.pageId) {
          setPages(prev => prev.filter(p => p.id !== event.pageId));
        } else if (event.eventType === "PAGE_UPDATED" && event.page) {
          const updated = event.page as unknown as PageData;
          console.log("🔄 [Mobile] Page UPDATED in list:", { id: updated.id, avatarUrl: updated.avatarUrl });
          setPages(prev => prev.map(p => {
            if (p.id === updated.id) {
              console.log("🔄 [Mobile] Merging updated page:", { old: p.avatarUrl, new: updated.avatarUrl });
              // Merge to ensure we keep all existing fields
              return { ...p, ...updated };
            }
            return p;
          }));
        }
      });
    };

    void setup();

    return () => {
      cancelled = true;
      pageWebsocketService.unsubscribeFromPageList();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data =
        activeTab === "discover"
          ? await pageService.getAllPages()
          : await pageService.getMyPages();
      setPages(data);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFollow = async (page: PageData) => {
    if (!currentUser?.id) return;
    await pageService.followPage(Number(currentUser.id), page.id);
  };

  const renderItem = ({ item }: { item: PageData }) => {
    const raw = item as PageData & {
      memberCount?: number;
      followCount?: number;
    };
    return (
      <TouchableOpacity
        style={styles.pageCard}
        onPress={() =>
          router.push({
            pathname: "/(stack)/page-detail",
            params: { pageId: String(item.id) },
          })
        }
      >
        <View style={styles.avatarWrap}>
          {item.avatarUrl ? (
            <Image
              key={`${item.id}-${item.updatedAt}`}
              source={{ uri: buildS3Url(item.avatarUrl) ? `${buildS3Url(item.avatarUrl)}?t=${item.updatedAt}` : undefined }}
              style={styles.avatarImg}
            />
          ) : (
            <Ionicons name="storefront" size={32} color={colors.primary} />
          )}
        </View>

        <View style={styles.pageInfo}>
          <Text style={styles.pageName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.username && (
            <Text style={styles.pageUsername}>@{item.username}</Text>
          )}
          {item.description ? (
            <Text style={styles.pageDesc} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
          <View style={styles.statsRow}>
            {raw.memberCount !== undefined && (
              <Text style={styles.statText}>👥 {raw.memberCount}</Text>
            )}
            {raw.followCount !== undefined && (
              <Text style={styles.statText}>🔔 {raw.followCount}</Text>
            )}
            {item.status === "PRIVATE" && (
              <Text style={styles.statText}>🔒 Riêng tư</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.followBtn}
          onPress={() => handleFollow(item)}
        >
          <Ionicons name="add-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trang</Text>
        <TouchableOpacity
          onPress={() => router.push("/(stack)/create-page")}
          style={styles.createButton}
        >
          <Ionicons
            name="add-circle-outline"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "discover" && styles.tabActive]}
          onPress={() => setActiveTab("discover")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "discover" && styles.tabTextActive,
            ]}
          >
            Khám phá
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "my-pages" && styles.tabActive]}
          onPress={() => setActiveTab("my-pages")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "my-pages" && styles.tabTextActive,
            ]}
          >
            Trang của tôi
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={pages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="storefront-outline" size={60} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                {activeTab === "discover"
                  ? "Không có trang nào"
                  : "Bạn chưa có trang nào"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  createButton: {
    padding: 8,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: colors.textMuted,
  },
  pageCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImg: {
    width: 60,
    height: 60,
  },
  pageInfo: {
    flex: 1,
  },
  pageName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  pageUsername: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  pageDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  statText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  followBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
});
