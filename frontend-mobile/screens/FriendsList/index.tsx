import React, { useEffect, useMemo, useState } from "react";
import { FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppHeader, CustomButton } from "@/components";
import { colors, spacing } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import blockService from "@/services/blockService";
import friendService, { FriendUser } from "@/services/friendService";
import { useFriendNotifications } from "@/hooks/useFriendNotifications";

type TabType = "friends" | "requests" | "sent" | "blocked";

export default function FriendsListScreen() {
    const router = useRouter();
    const { currentUser } = useAppContext();
    const params = useLocalSearchParams<{ userId?: string; tab?: string }>();

    const [tab, setTab] = useState<TabType>(
        params.tab === "requests" || params.tab === "sent" || params.tab === "blocked"
            ? params.tab
            : "friends",
    );
    const [list, setList] = useState<FriendUser[]>([]);
    const [loading, setLoading] = useState(false);

    const numericUserId = useMemo(() => {
        const sourceId = params.userId ?? currentUser?.id;
        const id = Number(sourceId);
        return Number.isFinite(id) ? id : null;
    }, [params.userId, currentUser?.id]);

    const loadData = async () => {
        const actingUserId = numericUserId ?? 0;

        setLoading(true);
        if (tab === "friends") {
            setList(await friendService.getFriends(actingUserId));
        } else if (tab === "requests") {
            setList(await friendService.getFriendRequests(actingUserId));
        } else if (tab === "sent") {
            setList(await friendService.getSentRequests(actingUserId));
        } else {
            setList(await blockService.getBlockedUsers(actingUserId));
        }
        setLoading(false);
    };

    const handleAccept = async (senderId: number) => {
        const myId = numericUserId ?? 0;
        await friendService.acceptFriendRequest(senderId, myId);
        setList((prev) => prev.filter((u) => u.id !== senderId));
    };

    const handleReject = async (senderId: number) => {
        const myId = numericUserId ?? 0;
        await friendService.rejectFriendRequest(senderId, myId);
        setList((prev) => prev.filter((u) => u.id !== senderId));
    };

    const handleCancel = async (targetId: number) => {
        const myId = numericUserId ?? 0;
        await friendService.cancelFriendRequest(myId, targetId);
        setList((prev) => prev.filter((u) => u.id !== targetId));
    };

    const refreshTrigger = useFriendNotifications();

    useEffect(() => {
        void loadData();
    }, [numericUserId, tab, refreshTrigger]);

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title="Friends"
                leftAction={{
                    icon: "arrow-back",
                    onPress: () => router.back(),
                }}
            />

            <View style={styles.tabRow}>
                <CustomButton
                    title="Friends"
                    variant={tab === "friends" ? "primary" : "outline"}
                    onPress={() => setTab("friends")}
                    style={styles.tabBtn}
                />
                <CustomButton
                    title="Requests"
                    variant={tab === "requests" ? "primary" : "outline"}
                    onPress={() => setTab("requests")}
                    style={styles.tabBtn}
                />
                <CustomButton
                    title="Sent"
                    variant={tab === "sent" ? "primary" : "outline"}
                    onPress={() => setTab("sent")}
                    style={styles.tabBtn}
                />
                <CustomButton
                    title="Blocked"
                    variant={tab === "blocked" ? "primary" : "outline"}
                    onPress={() => setTab("blocked")}
                    style={styles.tabBtn}
                />
            </View>

            <FlatList
                data={list}
                refreshing={loading}
                onRefresh={loadData}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <Text style={styles.emptyText}>Không có dữ liệu.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={styles.row}>
                        <View>
                            <Text style={styles.name}>
                                {item.name ||
                                    item.username ||
                                    item.phone ||
                                    `User ${item.id}`}
                            </Text>
                            {!!item.username && (
                                <Text style={styles.meta}>
                                    @{item.username}
                                </Text>
                            )}
                        </View>

                        {tab === "friends" && (
                            <View style={styles.actionRow}>
                                <CustomButton
                                    title="View"
                                    variant="outline"
                                    onPress={() =>
                                        router.push({
                                            pathname: "/user-profile",
                                            params: { userId: String(item.id) },
                                        })
                                    }
                                />
                                <CustomButton
                                    title="Unfriend"
                                    variant="outline"
                                    onPress={() => handleCancel(item.id)}
                                />
                            </View>
                        )}
                        {tab === "requests" && (
                            <View style={styles.actionRow}>
                                <CustomButton
                                    title="Accept"
                                    variant="primary"
                                    onPress={() => handleAccept(item.id)}
                                />
                                <CustomButton
                                    title="Reject"
                                    variant="outline"
                                    onPress={() => handleReject(item.id)}
                                />
                            </View>
                        )}
                        {tab === "sent" && (
                            <View style={styles.actionRow}>
                                <CustomButton
                                    title="View"
                                    variant="outline"
                                    onPress={() =>
                                        router.push({
                                            pathname: "/user-profile",
                                            params: { userId: String(item.id) },
                                        })
                                    }
                                />
                                <CustomButton
                                    title="Cancel"
                                    variant="outline"
                                    onPress={() => handleCancel(item.id)}
                                />
                            </View>
                        )}
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    tabRow: {
        flexDirection: "row",
        gap: spacing.xs,
        padding: spacing.md,
    },
    tabBtn: {
        flex: 1,
    },
    listContent: {
        padding: spacing.md,
    },
    row: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        padding: spacing.md,
        marginBottom: spacing.sm,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    name: {
        color: colors.text,
        fontWeight: "700",
    },
    meta: {
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    emptyWrap: {
        alignItems: "center",
        marginTop: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    emptyText: {
        color: colors.textMuted,
        textAlign: "center",
    },
    actionRow: {
        flexDirection: "row",
        gap: spacing.xs,
    },
});
