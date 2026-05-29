import { AppHeader } from "@/components";
import NotificationRow from "@/components/NotificationRow";
import { colors } from "@/constants";
import { useNotifications } from "@/context/NotificationContext";
import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function NotificationsScreen() {
    const router = useRouter();
    const segments = useSegments();
    const { notifications, loading, markAsRead, markAllAsRead, refresh } =
        useNotifications();

    useEffect(() => {
        // Mark all as read once when the screen is opened (matches web behaviour)
        void markAllAsRead();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <View style={styles.container}>
            <AppHeader
                title="Thông báo"
                leftAction={
                    segments[0] === "(stack)"
                        ? { icon: "arrow-back", onPress: () => router.back() }
                        : undefined
                }
            />
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <NotificationRow
                        notification={item}
                        onPress={(n) => {
                            if (!n.isRead) void markAsRead(n.id);
                        }}
                    />
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={() => void refresh()}
                    />
                }
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator
                            style={{ marginTop: 40 }}
                            color="#2563EB"
                        />
                    ) : (
                        <Text style={styles.empty}>Chưa có thông báo nào</Text>
                    )
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    empty: {
        textAlign: "center",
        marginTop: 48,
        color: colors.textMuted,
        fontSize: 15,
    },
});
