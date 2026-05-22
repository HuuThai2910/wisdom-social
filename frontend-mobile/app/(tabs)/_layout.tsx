import { colors } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import chatService from "@/services/chatService";
import chatWebsocketService from "@/services/chatWebsocketService";
import { cancelAccountDeletion } from "@/services/securityService";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, usePathname, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, StyleSheet, View } from "react-native";

export default function TabsLayout() {
    const { currentUser, loggedIn, deletionPending, deletionRemainingDays, clearDeletionPending, logout } = useAppContext();
    const router = useRouter();
    const pathname = usePathname();
    const [chatUnreadByConversation, setChatUnreadByConversation] = useState<Record<number, number>>({});
    const chatUnreadCount = useMemo(
        () => Object.values(chatUnreadByConversation).reduce((sum, count) => sum + count, 0),
        [chatUnreadByConversation],
    );
    // Flag để đảm bảo alert chỉ hiện đúng 1 lần dù effect chạy lại nhiều lần
    const alertShownRef = useRef(false);

    // Hiện cảnh báo hủy xóa tài khoản ngay khi vào app (cả cold start lẫn sau đăng nhập lại)
    useEffect(() => {
        if (!loggedIn || !deletionPending) return; // Không reset ref ở đây

        if (alertShownRef.current) return;
        alertShownRef.current = true;

        Alert.alert(
            "⚠️ Tài khoản đang chờ xóa",
            `Tài khoản của bạn sẽ bị xóa vĩnh viễn sau ${deletionRemainingDays ?? 30} ngày. Bạn có muốn hủy yêu cầu xóa không?`,
            [
                {
                    text: "Tiếp tục dùng app",
                    style: "cancel",
                    // Không làm gì — cảnh báo sẽ xuất hiện lại ở lần mở app tiếp theo
                },
                {
                    text: "Đăng xuất",
                    style: "default",
                    onPress: () => {
                        logout();
                        router.replace("/(auth)/login");
                    },
                },
                {
                    text: "Hủy xóa tài khoản",
                    style: "destructive",
                    onPress: async () => {
                        const result = await cancelAccountDeletion();
                        if (result.success) {
                            clearDeletionPending();
                            Alert.alert("Thành công", "Yêu cầu xóa tài khoản đã được hủy. Tài khoản của bạn sẽ không bị xóa.");
                        } else {
                            alertShownRef.current = false; // Cho phép hiện lại nếu thất bại
                            Alert.alert("Lỗi", result.message || "Không thể hủy yêu cầu xóa tài khoản.");
                        }
                    },
                },
            ],
        );
    }, [loggedIn, deletionPending]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const currentUserId = Number(currentUser?.id);
        if (!loggedIn || !Number.isFinite(currentUserId)) {
            setChatUnreadByConversation({});
            return;
        }

        let disposed = false;
        const loadUnread = async () => {
            const response = await chatService.getConversations(currentUserId);
            if (disposed || !response.success || !Array.isArray(response.data)) return;
            const next: Record<number, number> = {};
            response.data.forEach((conversation) => {
                next[conversation.id] = conversation.unreadCount ?? 0;
            });
            setChatUnreadByConversation(next);
        };

        const handleConversationUpdate = (conversationId: number, lastMessage: any) => {
            const lastSenderId = Number(lastMessage?.lastSenderId ?? 0);
            if (lastSenderId === currentUserId) return;
            setChatUnreadByConversation((prev) => ({
                ...prev,
                [conversationId]: (prev[conversationId] ?? 0) + 1,
            }));
        };

        void loadUnread();
        void chatWebsocketService.connect().then(() => {
            if (!disposed) {
                chatWebsocketService.subscribeToUserConversations(
                    currentUserId,
                    handleConversationUpdate,
                );
            }
        });

        return () => {
            disposed = true;
            chatWebsocketService.unsubscribeFromUserConversations(
                currentUserId,
                handleConversationUpdate,
            );
        };
    }, [currentUser?.id, loggedIn, pathname]);

    if (!loggedIn) {
        return <Redirect href="/(auth)/login" />;
    }

    return (
        <Tabs
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: false,
                tabBarActiveTintColor: colors.text,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: {
                    borderTopColor: colors.border,
                    backgroundColor: colors.white,
                    height: 62,
                },
                tabBarIcon: ({ color, size, focused }) => {
                    if (route.name === "profile" && currentUser?.avatar) {
                        return (
                            <View
                                style={[
                                    styles.profileAvatarRing,
                                    focused && styles.profileAvatarRingActive,
                                ]}
                            >
                                <Image
                                    source={{ uri: currentUser.avatar }}
                                    style={styles.profileAvatar}
                                />
                            </View>
                        );
                    }

                    let icon: keyof typeof Ionicons.glyphMap = "ellipse";

                    if (route.name === "index")
                        icon = focused ? "home" : "home-outline";
                    if (route.name === "search")
                        icon = focused ? "search" : "search-outline";
                    if (route.name === "add") icon = "add-circle-outline";
                    if (route.name === "activity")
                        icon = focused
                            ? "chatbubble-ellipses"
                            : "chatbubble-ellipses-outline";
                    if (route.name === "profile")
                        icon = focused ? "person" : "person-outline";

                    return (
                        <Ionicons name={icon} color={color} size={size + 2} />
                    );
                },
            })}
        >
            <Tabs.Screen name="index" />
            <Tabs.Screen name="search" />
            <Tabs.Screen name="add" />
            <Tabs.Screen
                name="activity"
                options={{
                    tabBarBadge: chatUnreadCount > 0 ? (chatUnreadCount > 99 ? "99+" : chatUnreadCount) : undefined,
                }}
            />
            <Tabs.Screen name="profile" />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    profileAvatarRing: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: "transparent",
    },
    profileAvatarRingActive: {
        borderColor: colors.text,
    },
    profileAvatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
    },
});
