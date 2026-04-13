import { colors, spacing } from "@/constants";
import { User } from "@/types";
import { formatRelativeTime } from "@/utils/format";
import {
    GestureResponderEvent,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import UserAvatar from "./UserAvatar";

type Props = {
    user: User;
    preview: string;
    updatedAt: string;
    onPress: () => void;
    onLongPress?: (event: GestureResponderEvent) => void;
    delayLongPress?: number;
};

export default function MessageItem({
    user,
    preview,
    updatedAt,
    onPress,
    onLongPress,
    delayLongPress = 300,
}: Props) {
    return (
        <Pressable
            style={styles.container}
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={delayLongPress}
        >
            <UserAvatar uri={user.avatar} name={user.username} size={52} />
            <View style={styles.content}>
                <Text style={styles.name}>{user.username}</Text>
                <Text numberOfLines={1} style={styles.preview}>
                    {preview}
                </Text>
            </View>
            <Text style={styles.time}>{formatRelativeTime(updatedAt)}</Text>
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
    },
    content: {
        marginLeft: spacing.md,
        flex: 1,
    },
    name: {
        fontWeight: "600",
        color: colors.text,
        fontSize: 15,
    },
    preview: {
        marginTop: 2,
        color: colors.textMuted,
        fontSize: 13,
    },
    time: {
        fontSize: 12,
        color: colors.textMuted,
    },
});
