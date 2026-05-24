import { colors } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import chatService from "@/services/chatService";
import chatWebsocketService from "@/services/chatWebsocketService";
import { cancelAccountDeletion } from "@/services/securityService";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, usePathname, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

export default function TabsLayout() {
    const { currentUser, loggedIn, deletionPending, deletionRemainingDays, clearDeletionPending, logout } = useAppContext();
    const router = useRouter();
    const pathname = usePathname();
    const [chatUnreadByConversation, setChatUnreadByConversation] = useState<Record<number, number>>({});
    const chatUnreadCount = useMemo(
        () => Object.values(chatUnreadByConversation).reduce((sum, count) => sum + count, 0),
        [chatUnreadByConversation],
    );
    const alertShownRef = useRef(false);

    useEffect(() => {
        if (!loggedIn || !deletionPending) return;
        if (alertShownRef.current) return;
        alertShownRef.current = true;

        Alert.alert(
            "⚠️ Tài khoản đang chờ xóa",
            `Tài khoản của bạn sẽ bị xóa vĩnh viễn sau ${deletionRemainingDays ?? 30} ngày. Bạn có muốn hủy yêu cầu xóa không?`,
            [
                { text: "Tiếp tục dùng app", style: "cancel" },
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
                            alertShownRef.current = false;
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
                chatWebsocketService.subscribeToUserConversations(currentUserId, handleConversationUpdate);
            }
        });

        return () => {
            disposed = true;
            chatWebsocketService.unsubscribeFromUserConversations(currentUserId, handleConversationUpdate);
        };
    }, [currentUser?.id, loggedIn, pathname]);

    if (!loggedIn) {
        return <Redirect href="/(auth)/login" />;
    }

    return (
        <Tabs
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: true,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: "600",
                    marginTop: -2,
                },
                tabBarStyle: {
                    borderTopColor: colors.border,
                    backgroundColor: colors.white,
                    height: 64,
                    paddingBottom: 8,
                    paddingTop: 6,
                },
                tabBarIcon: ({ color, size, focused }) => {
                    let icon: keyof typeof Ionicons.glyphMap = "ellipse";

                    if (route.name === "activity")
                        icon = focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline";
                    if (route.name === "friends")
                        icon = focused ? "people" : "people-outline";
                    if (route.name === "index")
                        icon = focused ? "home" : "home-outline";
                    if (route.name === "explore")
                        icon = focused ? "compass" : "compass-outline";
                    if (route.name === "profile")
                        icon = focused ? "person-circle" : "person-circle-outline";

                    return <Ionicons name={icon} color={color} size={size} />;
                },
            })}
        >
            <Tabs.Screen name="activity" options={{ tabBarLabel: "Tin nhắn", tabBarBadge: chatUnreadCount > 0 ? (chatUnreadCount > 99 ? "99+" : chatUnreadCount) : undefined }} />
            <Tabs.Screen name="friends" options={{ tabBarLabel: "Bạn bè" }} />
            <Tabs.Screen name="index" options={{ tabBarLabel: "Tường nhà" }} />
            <Tabs.Screen name="explore" options={{ tabBarLabel: "Khám phá" }} />
            <Tabs.Screen name="profile" options={{ tabBarLabel: "Cá nhân" }} />
            <Tabs.Screen name="pages" options={{ href: null }} />
            <Tabs.Screen name="user-profile" options={{ href: null }} />
            <Tabs.Screen name="search" options={{ href: null }} />
            <Tabs.Screen name="add" options={{ href: null }} />
        </Tabs>
    );
}

