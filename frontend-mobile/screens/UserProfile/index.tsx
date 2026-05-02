import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppHeader, CustomButton } from "@/components";
import { colors, spacing } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import userService, { User } from "@/services/userService";

export default function UserProfileScreen() {
    const router = useRouter();
    const { users, currentUser } = useAppContext();
    const { userId } = useLocalSearchParams<{ userId?: string }>();
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);

    const fallbackUser = useMemo(() => {
        if (!userId) return currentUser;
        const matched = users.find(
            (u) => u.id === userId || Number(u.id) === Number(userId),
        );

        if (matched) {
            return matched;
        }

        const normalizedId = Number(userId);
        if (Number.isFinite(normalizedId)) {
            return {
                id: String(normalizedId),
                username: `user${normalizedId}`,
                fullName: `User ${normalizedId}`,
                bio: "Local profile fallback",
                avatar: "",
                followers: 0,
                following: 0,
            };
        }

        return null;
    }, [userId, users, currentUser]);

    useEffect(() => {
        const normalizedId = Number(userId);
        if (!userId || !Number.isFinite(normalizedId)) {
            setProfileUser((currentUser as User | null) ?? null);
            setLoading(false);
            return;
        }

        let cancelled = false;

        const loadUserProfile = async () => {
            setLoading(true);
            const remoteUser = await userService.getUserProfile(normalizedId);
            if (cancelled) return;

            setProfileUser(remoteUser);
            setLoading(false);
        };

        void loadUserProfile();

        return () => {
            cancelled = true;
        };
    }, [userId, currentUser]);

    const user = profileUser ?? (fallbackUser as User | null);

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title="User Profile"
                leftAction={{
                    icon: "arrow-back",
                    onPress: () => router.back(),
                }}
            />

            <View style={styles.content}>
                {loading ? (
                    <ActivityIndicator color={colors.primary} />
                ) : null}
                <Text style={styles.name}>
                    {user?.fullName ?? "Unknown user"}
                </Text>
                <Text style={styles.username}>
                    @{user?.username ?? "unknown"}
                </Text>
                <Text style={styles.bio}>{user?.bio ?? "No bio"}</Text>

                <View style={styles.statsRow}>
                    <Text style={styles.stats}>
                        Followers: {user?.followers ?? 0}
                    </Text>
                    <Text style={styles.stats}>
                        Following: {user?.following ?? 0}
                    </Text>
                </View>

                <CustomButton
                    title="Open Friends"
                    onPress={() =>
                        router.push({
                            pathname: "/(stack)/friends-list",
                            params: {
                                userId: String(
                                    user?.id ?? currentUser?.id ?? "",
                                ),
                                tab: "friends",
                            },
                        })
                    }
                    style={styles.gap}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    content: {
        padding: spacing.lg,
    },
    name: {
        fontSize: 22,
        fontWeight: "700",
        color: colors.text,
    },
    username: {
        marginTop: spacing.xs,
        color: colors.textMuted,
        fontWeight: "500",
    },
    bio: {
        marginTop: spacing.md,
        color: colors.text,
    },
    statsRow: {
        flexDirection: "row",
        marginTop: spacing.md,
        gap: spacing.md,
    },
    stats: {
        color: colors.textMuted,
    },
    gap: {
        marginTop: spacing.lg,
    },
});
