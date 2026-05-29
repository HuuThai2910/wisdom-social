import { colors, spacing } from "@/constants";
import {
    getNotificationText,
    type ServerNotification,
} from "@/services/notificationService";
import { buildS3Url } from "@/utils/s3";
import { formatRelativeTime } from "@/utils/format";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import UserAvatar from "./UserAvatar";

type Props = {
    notification: ServerNotification;
    onPress?: (n: ServerNotification) => void;
};

// Page-centric outcomes already read as full sentences, so we don't prefix the
// actor name on those.
const HIDE_ACTOR_NAME = new Set([
    "PAGE_JOIN_APPROVED",
    "PAGE_POST_APPROVED",
    "PAGE_MEMBER_ADDED",
    "PAGE_ROLE_GRANTED",
]);

export default function NotificationRow({ notification, onPress }: Props) {
    const router = useRouter();
    const actorName = HIDE_ACTOR_NAME.has(notification.type)
        ? undefined
        : notification.metadata?.actorName;
    const avatarUri = buildS3Url(notification.metadata?.imageUrl);
    const primaryActorId = notification.actorIds?.[0];

    const navigate = () => {
        const deepLink = notification.metadata?.deepLink;

        // Page notifications
        if (notification.targetType === "PAGE" && notification.targetId) {
            router.push({
                pathname: "/(stack)/page-detail",
                params: { pageId: String(notification.targetId) },
            });
            return;
        }
        if (deepLink?.startsWith("/pages/")) {
            const id = deepLink.split("/").pop();
            if (id)
                router.push({
                    pathname: "/(stack)/page-detail",
                    params: { pageId: id },
                });
            return;
        }

        // Friend notifications -> actor profile
        if (
            notification.type === "FRIEND_REQUEST" ||
            notification.type === "FRIEND_ACCEPT"
        ) {
            if (primaryActorId)
                router.push({
                    pathname: "/(tabs)/user-profile",
                    params: { userId: String(primaryActorId) },
                });
            return;
        }

        // Post notifications (reaction/comment/share) -> post detail
        const postId =
            notification.targetType === "POST"
                ? notification.targetId
                : deepLink?.startsWith("/post/")
                  ? deepLink.split("/").pop()
                  : notification.targetId;
        if (postId) {
            router.push({
                pathname: "/(stack)/post/[postId]" as any,
                params: { postId: String(postId) },
            });
        }
    };

    const handlePress = () => {
        onPress?.(notification);
        navigate();
    };

    return (
        <Pressable
            onPress={handlePress}
            style={[styles.container, !notification.isRead && styles.unread]}
        >
            <UserAvatar
                uri={avatarUri}
                name={actorName ?? "?"}
                size={44}
            />
            <View style={styles.content}>
                <Text style={styles.text}>
                    {actorName ? (
                        <Text style={styles.username}>{actorName} </Text>
                    ) : null}
                    {notification.content || getNotificationText(notification.type)}
                </Text>
                <Text style={styles.time}>
                    {formatRelativeTime(notification.createdAt)}
                </Text>
            </View>
            {!notification.isRead && <View style={styles.dot} />}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.white,
    },
    unread: {
        backgroundColor: "#F3F8FF",
    },
    content: {
        marginLeft: spacing.md,
        flex: 1,
    },
    text: {
        color: colors.text,
        fontSize: 14,
        lineHeight: 20,
    },
    username: {
        fontWeight: "700",
    },
    time: {
        marginTop: 2,
        color: colors.textMuted,
        fontSize: 12,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#2563EB",
        marginLeft: spacing.sm,
    },
});
