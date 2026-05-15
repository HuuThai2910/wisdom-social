import {
    AppHeader,
    CreateGroupModal,
    EmptyState,
    MessageItem,
    SearchBar,
} from "@/components";
import { colors, spacing } from "@/constants";
import { useGroupManagement } from "@/hooks/useGroupManagement";
import { useMessagesController } from "@/hooks/useMessagesController";
import { buildConversationDisplayInfo } from "@/utils/conversationDisplayInfo";
import { buildConversationLastMessagePreview } from "@/utils/conversationLastMessagePreview";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { useRouter, useSegments } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
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

const MAX_MENU_WIDTH = 420;
const MENU_HEIGHT = 318;
const MENU_MARGIN = 12;
const PREVIEW_HEIGHT = 76;
const PREVIEW_GAP = 12;
const CONTEXT_MENU_OPEN_SOUND_URI =
    "data:audio/wav;base64," +
    "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";

type MenuState = {
    conversationId: string;
    top: number;
    left: number;
    width: number;
};

const menuActions = [
    { key: "mute", label: "Tắt thông báo", icon: "notifications-off-outline" },
    { key: "pin", label: "Ghim", icon: "pin-outline" },
    { key: "divider-1", divider: true },
    { key: "hidden", label: "Ẩn", icon: "eye-off-outline" },
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

type MenuActionKey = (typeof menuActions)[number]["key"];

export default function MessagesListScreen() {
    const router = useRouter();
    const segments = useSegments();
    const insets = useSafeAreaInsets();
    const {
        searchQuery,
        setSearchQuery,
        filteredConversations,
        loading,
        error,
        currentUserId,
        clearUnreadCount,
        deleteConversationForMe,
        reload,
    } = useMessagesController();

    const {
        availableFriends,
        friendsLoading,
        friendsError,
        isCreateGroupModalOpen,
        isCreatingGroup,
        actionError,
        openCreateGroupModal,
        closeCreateGroupModal,
        createGroup,
    } = useGroupManagement({
        currentUserId,
        selectedConversation: null,
        selectedConversationId: null,
        reloadConversations: reload,
        onSelectConversation: (conversationId) => {
            router.push({
                pathname: "/(stack)/messages/[conversationId]",
                params: { conversationId: String(conversationId) },
            });
        },
    });
    const [menuState, setMenuState] = useState<MenuState | null>(null);
    const suppressNextPressRef = useRef(false);
    const menuProgress = useRef(new Animated.Value(0)).current;
    const menuSoundRef = useRef<Audio.Sound | null>(null);
    const selectedConversation = useMemo(
        () =>
            menuState
                ? filteredConversations.find(
                      (conversation) =>
                          String(conversation.id) === menuState.conversationId,
                  )
                : null,
        [filteredConversations, menuState],
    );
    const selectedConversationDisplayInfo = selectedConversation
        ? buildConversationDisplayInfo({
              conversation: selectedConversation,
              currentUserId,
          })
        : null;
    const selectedConversationPreviewInfo = selectedConversation
        ? buildConversationLastMessagePreview({
              conversation: selectedConversation,
              currentUserId,
          })
        : null;
    const selectedConversationPreview = selectedConversationPreviewInfo
        ? selectedConversationPreviewInfo.showSenderPrefix
            ? `${selectedConversationPreviewInfo.senderLabel}: ${selectedConversationPreviewInfo.text}`
            : selectedConversationPreviewInfo.text
        : "";

    useEffect(() => {
        if (!menuState) return;

        const playOpenSound = async () => {
            try {
                const previousSound = menuSoundRef.current;
                menuSoundRef.current = null;
                await previousSound?.unloadAsync();

                const { sound } = await Audio.Sound.createAsync(
                    { uri: CONTEXT_MENU_OPEN_SOUND_URI },
                    { shouldPlay: true, volume: 0.35 },
                );
                menuSoundRef.current = sound;
                sound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        menuSoundRef.current = null;
                        void sound.unloadAsync();
                    }
                });
            } catch {
                menuSoundRef.current = null;
            }
        };

        menuProgress.setValue(0);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        void playOpenSound();
        Animated.spring(menuProgress, {
            toValue: 1,
            damping: 18,
            stiffness: 260,
            mass: 0.75,
            useNativeDriver: true,
        }).start();
    }, [menuProgress, menuState]);

    useEffect(() => {
        return () => {
            void menuSoundRef.current?.unloadAsync();
            menuSoundRef.current = null;
        };
    }, []);

    const closeMenu = () => setMenuState(null);

    const handleItemLongPress = (
        event: GestureResponderEvent,
        conversationId: string,
    ) => {
        suppressNextPressRef.current = true;
        const { width, height } = Dimensions.get("window");
        const y = event.nativeEvent.pageY;
        const menuWidth = Math.min(MAX_MENU_WIDTH, width - MENU_MARGIN * 2);
        const left = Math.max(MENU_MARGIN, width - menuWidth - MENU_MARGIN);
        const top = Math.min(
            Math.max(insets.top + MENU_MARGIN, y - PREVIEW_HEIGHT - PREVIEW_GAP),
            height -
                insets.bottom -
                MENU_HEIGHT -
                PREVIEW_HEIGHT -
                PREVIEW_GAP -
                MENU_MARGIN,
        );

        setMenuState({ conversationId, top, left, width: menuWidth });
    };

    const handleMenuAction = (actionKey: MenuActionKey) => {
        if (!menuState) return;

        if (actionKey === "delete") {
            const conversationId = Number(menuState.conversationId);
            if (Number.isFinite(conversationId)) {
                Alert.alert(
                    "Xóa đoạn chat",
                    "Bạn có chắc muốn xóa đoạn chat này chỉ ở phía bạn?",
                    [
                        { text: "Hủy", style: "cancel" },
                        {
                            text: "Xóa",
                            style: "destructive",
                            onPress: () => {
                                void deleteConversationForMe(conversationId);
                            },
                        },
                    ],
                );
            }

            closeMenu();
            return;
        }

        const action = menuActions.find((item) => item.key === actionKey);
        if (action && "label" in action) {
            Alert.alert("Thông báo", `Đã chọn ${action.label}.`);
        }

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
                rightActions={[
                    {
                        icon: "create-outline",
                        onPress: openCreateGroupModal,
                    },
                ]}
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
                keyExtractor={(item) => String(item.id)}
                ListEmptyComponent={
                    <EmptyState
                        title={
                            loading
                                ? "Dang tai cuoc tro chuyen"
                                : searchQuery.trim()
                                  ? "Không tìm thấy cuộc trò chuyện"
                                  : "Chưa có cuộc hội thoại"
                        }
                        description={
                            error
                                ? error
                                : searchQuery.trim()
                                  ? "Thử từ khóa khác."
                                  : "Tin nhắn mới sẽ hiển thị ở đây."
                        }
                    />
                }
                renderItem={({ item }) => {
                    // Mapping web -> mobile:
                    // - Display name/avatar: dung cung quy tac resolve conversation display.
                    // - Last message preview: dung cung builder de giu nguyen behavior.
                    const displayInfo = buildConversationDisplayInfo({
                        conversation: item,
                        currentUserId,
                    });
                    const previewInfo = buildConversationLastMessagePreview({
                        conversation: item,
                        currentUserId,
                    });

                    const preview = previewInfo.showSenderPrefix
                        ? `${previewInfo.senderLabel}: ${previewInfo.text}`
                        : previewInfo.text;

                    return (
                        <MessageItem
                            user={{
                                id: String(item.id),
                                username: displayInfo.name,
                                fullName: displayInfo.name,
                                bio: "",
                                avatar: displayInfo.avatarUrl || "",
                                followers: 0,
                                following: 0,
                            }}
                            preview={preview}
                            unreadCount={item.unreadCount ?? 0}
                            updatedAt={item.updatedAt}
                            onPress={() => {
                                if (suppressNextPressRef.current) {
                                    suppressNextPressRef.current = false;
                                    return;
                                }

                                clearUnreadCount(item.id);
                                router.push({
                                    pathname:
                                        "/(stack)/messages/[conversationId]",
                                    params: { conversationId: String(item.id) },
                                });
                            }}
                            onLongPress={(event) =>
                                handleItemLongPress(event, String(item.id))
                            }
                            delayLongPress={300}
                        />
                    );
                }}
            />

            <CreateGroupModal
                open={isCreateGroupModalOpen}
                friends={availableFriends}
                loadingFriends={friendsLoading}
                friendsError={friendsError}
                submitting={isCreatingGroup}
                error={actionError}
                onClose={closeCreateGroupModal}
                onSubmit={createGroup}
            />

            <Modal
                visible={Boolean(menuState)}
                transparent
                animationType="none"
                onRequestClose={closeMenu}
            >
                <View style={styles.modalRoot}>
                    <Pressable
                        style={styles.modalBackdrop}
                        onPress={closeMenu}
                    />

                    {menuState ? (
                        <>
                            {selectedConversationDisplayInfo ? (
                                <Animated.View
                                    style={[
                                        styles.previewCard,
                                        {
                                            top: menuState.top,
                                            left: menuState.left,
                                            width: menuState.width,
                                            opacity: menuProgress,
                                            transform: [
                                                {
                                                    translateY:
                                                        menuProgress.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [12, 0],
                                                        }),
                                                },
                                                {
                                                    scale: menuProgress.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0.96, 1],
                                                    }),
                                                },
                                            ],
                                        },
                                    ]}
                                    pointerEvents="none"
                                >
                                    <MessageItem
                                        user={{
                                            id: menuState.conversationId,
                                            username:
                                                selectedConversationDisplayInfo.name,
                                            fullName:
                                                selectedConversationDisplayInfo.name,
                                            bio: "",
                                            avatar:
                                                selectedConversationDisplayInfo.avatarUrl ||
                                                "",
                                            followers: 0,
                                            following: 0,
                                        }}
                                        preview={selectedConversationPreview}
                                        unreadCount={
                                            selectedConversation?.unreadCount ?? 0
                                        }
                                        updatedAt={
                                            selectedConversation?.updatedAt ?? ""
                                        }
                                        onPress={() => undefined}
                                    />
                                </Animated.View>
                            ) : null}

                            <Animated.View
                                style={[
                                    styles.menuCard,
                                    {
                                        top:
                                            menuState.top +
                                            PREVIEW_HEIGHT +
                                            PREVIEW_GAP,
                                        left: menuState.left,
                                        width: menuState.width,
                                        opacity: menuProgress,
                                        transform: [
                                            {
                                                translateY:
                                                    menuProgress.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [12, 0],
                                                    }),
                                            },
                                            {
                                                scale: menuProgress.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0.96, 1],
                                                }),
                                            },
                                        ],
                                    },
                                ]}
                            >
                                {menuActions.map((action) => {
                                    if ("divider" in action) {
                                        return (
                                            <View
                                                key={action.key}
                                                style={styles.menuDivider}
                                            />
                                        );
                                    }

                                    const isDestructive =
                                        "destructive" in action &&
                                        Boolean(action.destructive);

                                    return (
                                        <Pressable
                                            key={action.key}
                                            style={styles.menuItem}
                                            onPress={() =>
                                                handleMenuAction(action.key)
                                            }
                                        >
                                            <Ionicons
                                                name={action.icon}
                                                size={17}
                                                color={
                                                    isDestructive
                                                        ? "#EF4444"
                                                        : "#111827"
                                                }
                                            />
                                            <Text
                                                style={[
                                                    styles.menuLabel,
                                                    isDestructive &&
                                                        styles.menuLabelDanger,
                                                ]}
                                            >
                                                {action.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </Animated.View>
                        </>
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
        backgroundColor: "rgba(15, 23, 42, 0.34)",
    },
    previewCard: {
        position: "absolute",
        minHeight: PREVIEW_HEIGHT,
        overflow: "hidden",
        borderRadius: 18,
        backgroundColor: colors.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
        elevation: 14,
    },
    menuCard: {
        position: "absolute",
        backgroundColor: colors.white,
        borderRadius: 18,
        paddingVertical: 6,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 18,
    },
    menuItem: {
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
    },
    menuLabel: {
        marginLeft: 12,
        fontSize: 15,
        color: "#111827",
        flex: 1,
    },
    menuLabelDanger: {
        color: "#EF4444",
    },
    menuDivider: {
        height: 1,
        backgroundColor: "#EEF0F3",
        marginVertical: 6,
    },
});
