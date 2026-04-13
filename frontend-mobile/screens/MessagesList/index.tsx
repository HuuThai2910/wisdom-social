import { AppHeader, EmptyState, MessageItem, SearchBar } from "@/components";
import { colors, spacing } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
    Alert,
    Dimensions,
    FlatList,
    GestureResponderEvent,
    Modal,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MENU_WIDTH = 206;
const MENU_HEIGHT = 304;
const MENU_MARGIN = 10;

type MenuState = {
    conversationId: string;
    top: number;
    left: number;
};

const menuActions = [
    {
        key: "mark-unread",
        label: "Đánh dấu là chưa đọc",
        icon: "mail-unread-outline",
    },
    { key: "mute", label: "Tắt thông báo", icon: "notifications-off-outline" },
    { key: "profile", label: "Xem trang cá nhân", icon: "person-outline" },
    { key: "divider-1", divider: true },
    { key: "block", label: "Chặn", icon: "ban-outline" },
    { key: "archive", label: "Lưu trữ đoạn chat", icon: "archive-outline" },
    {
        key: "delete",
        label: "Xóa đoạn chat",
        icon: "trash-outline",
        destructive: true,
    },
    { key: "divider-2", divider: true },
    { key: "report", label: "Báo cáo", icon: "flag-outline" },
] as const;

export default function MessagesListScreen() {
    const router = useRouter();
    const segments = useSegments();
    const insets = useSafeAreaInsets();
    const { conversations, currentUser, getUserById } = useAppContext();
    const [menuState, setMenuState] = useState<MenuState | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const suppressNextPressRef = useRef(false);

    const filteredConversations = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return conversations;

        return conversations.filter((conversation) => {
            const otherId = conversation.participantIds.find(
                (id) => id !== currentUser?.id,
            );
            if (!otherId) return false;

            const otherUser = getUserById(otherId);
            if (!otherUser) return false;

            const candidate = [
                otherUser.username,
                otherUser.fullName,
                conversation.lastMessage,
            ]
                .join(" ")
                .toLowerCase();

            return candidate.includes(query);
        });
    }, [conversations, currentUser?.id, getUserById, searchQuery]);

    const closeMenu = () => setMenuState(null);

    const handleItemLongPress = (
        event: GestureResponderEvent,
        conversationId: string,
    ) => {
        suppressNextPressRef.current = true;
        const { width, height } = Dimensions.get("window");
        const x = event.nativeEvent.pageX;
        const y = event.nativeEvent.pageY;
        const left = Math.min(
            Math.max(MENU_MARGIN, x - 40),
            width - MENU_WIDTH - MENU_MARGIN,
        );
        const top = Math.min(
            Math.max(insets.top + MENU_MARGIN, y - 36),
            height - insets.bottom - MENU_HEIGHT - MENU_MARGIN,
        );

        setMenuState({ conversationId, top, left });
    };

    const handleMenuAction = (label: string) => {
        Alert.alert("Thông báo", `Đã chọn ${label}.`);
        closeMenu();
    };

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title="Messages"
                leftAction={
                    segments[0] === "(stack)"
                        ? { icon: "arrow-back", onPress: () => router.back() }
                        : undefined
                }
            />

            <View style={styles.searchWrap}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Tìm kiếm cuộc trò chuyện..."
                />
            </View>

            <FlatList
                data={filteredConversations}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                    <EmptyState
                        title={
                            searchQuery.trim()
                                ? "Không tìm thấy cuộc trò chuyện"
                                : "Chưa có cuộc hội thoại"
                        }
                        description={
                            searchQuery.trim()
                                ? "Thử từ khóa khác."
                                : "Tin nhắn mới sẽ hiển thị ở đây."
                        }
                    />
                }
                renderItem={({ item }) => {
                    const otherId = item.participantIds.find(
                        (id) => id !== currentUser?.id,
                    );
                    const otherUser = otherId
                        ? getUserById(otherId)
                        : undefined;
                    if (!otherUser) return null;

                    return (
                        <MessageItem
                            user={otherUser}
                            preview={item.lastMessage}
                            updatedAt={item.updatedAt}
                            onPress={() => {
                                if (suppressNextPressRef.current) {
                                    suppressNextPressRef.current = false;
                                    return;
                                }

                                router.push({
                                    pathname:
                                        "/(stack)/messages/[conversationId]",
                                    params: { conversationId: item.id },
                                });
                            }}
                            onLongPress={(event) =>
                                handleItemLongPress(event, item.id)
                            }
                            delayLongPress={300}
                        />
                    );
                }}
            />

            <Modal
                visible={Boolean(menuState)}
                transparent
                animationType="fade"
                onRequestClose={closeMenu}
            >
                <View style={styles.modalRoot}>
                    <Pressable
                        style={styles.modalBackdrop}
                        onPress={closeMenu}
                    />

                    {menuState ? (
                        <View
                            style={[
                                styles.menuCard,
                                {
                                    top: menuState.top,
                                    left: menuState.left,
                                },
                            ]}
                        >
                            {menuActions.map((action) => {
                                if ("divider" in action && action.divider) {
                                    return (
                                        <View
                                            key={action.key}
                                            style={styles.menuDivider}
                                        />
                                    );
                                }

                                return (
                                    <Pressable
                                        key={action.key}
                                        style={styles.menuItem}
                                        onPress={() =>
                                            handleMenuAction(action.label)
                                        }
                                    >
                                        <Ionicons
                                            name={action.icon}
                                            size={17}
                                            color={
                                                action.destructive
                                                    ? "#EF4444"
                                                    : "#111827"
                                            }
                                        />
                                        <Text
                                            style={[
                                                styles.menuLabel,
                                                action.destructive &&
                                                    styles.menuLabelDanger,
                                            ]}
                                        >
                                            {action.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    ) : null}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    searchWrap: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalRoot: {
        flex: 1,
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.16)",
    },
    menuCard: {
        position: "absolute",
        width: MENU_WIDTH,
        backgroundColor: colors.white,
        borderRadius: 12,
        paddingVertical: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 12,
        elevation: 9,
    },
    menuItem: {
        minHeight: 38,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
    },
    menuLabel: {
        marginLeft: 10,
        fontSize: 15,
        color: "#111827",
    },
    menuLabelDanger: {
        color: "#EF4444",
    },
    menuDivider: {
        height: 7,
        backgroundColor: "#F3F4F6",
        marginVertical: 4,
    },
});
