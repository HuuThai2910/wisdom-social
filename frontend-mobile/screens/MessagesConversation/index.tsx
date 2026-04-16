import { UserAvatar } from "@/components";
import { colors, spacing } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import { formatRelativeTime } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    Alert,
    Dimensions,
    FlatList,
    GestureResponderEvent,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MENU_WIDTH = 232;
const MENU_HORIZONTAL_MARGIN = 12;
const MENU_VERTICAL_MARGIN = 16;
const MENU_ESTIMATED_HEIGHT = 390;

type ContextMenuState = {
    messageId: string;
    top: number;
    left: number;
};

const contextActions = [
    { key: "copy", label: "Copy tin nhắn", icon: "copy-outline" },
    { key: "pin", label: "Bỏ ghim", icon: "pin-outline" },
    { key: "reply", label: "Trả lời", icon: "return-up-back-outline" },
    { key: "divider-1", divider: true },
    {
        key: "save",
        label: "Đánh dấu tin nhắn",
        icon: "bookmark-outline",
    },
    { key: "divider-2", divider: true },
    {
        key: "select-many",
        label: "Chọn nhiều tin nhắn",
        icon: "list-outline",
    },
    {
        key: "details",
        label: "Xem chi tiết",
        icon: "information-circle-outline",
    },
    {
        key: "more",
        label: "Tùy chọn khác",
        icon: "ellipsis-horizontal-outline",
        hasArrow: true,
    },
    { key: "divider-3", divider: true },
    {
        key: "unsend",
        label: "Thu hồi",
        icon: "arrow-undo-outline",
        destructive: true,
    },
    {
        key: "delete-mine",
        label: "Xóa chỉ ở phía tôi",
        icon: "trash-outline",
        destructive: true,
    },
] as const;

export default function MessagesConversationScreen() {
    const { conversationId } = useLocalSearchParams<{
        conversationId: string;
    }>();
    const router = useRouter();
    const {
        currentUser,
        conversations,
        getMessagesByConversation,
        getUserById,
        sendMessage,
    } = useAppContext();
    const insets = useSafeAreaInsets();
    const [input, setInput] = useState("");
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(
        null,
    );

    const conversation = conversations.find(
        (item) => item.id === conversationId,
    );
    const otherUser = useMemo(() => {
        const targetId = conversation?.participantIds.find(
            (id) => id !== currentUser?.id,
        );
        return targetId ? getUserById(targetId) : undefined;
    }, [conversation, currentUser?.id, getUserById]);

    const messages = getMessagesByConversation(conversationId ?? "");
    const lastMessage = messages[messages.length - 1];
    const showSeen = lastMessage?.senderId === currentUser?.id;
    const activityText = conversation?.updatedAt
        ? `Hoạt động ${formatRelativeTime(conversation.updatedAt)} trước`
        : "Đang hoạt động";

    const handleSend = async () => {
        const result = await sendMessage(conversationId ?? "", input);
        if (result.success) {
            setInput("");
        }
    };

    const closeContextMenu = () => setContextMenu(null);

    const handleMessageLongPress = (
        event: GestureResponderEvent,
        messageId: string,
        mine: boolean,
    ) => {
        const { width, height } = Dimensions.get("window");
        const x = event.nativeEvent.pageX;
        const y = event.nativeEvent.pageY;
        const rawLeft = mine ? x - MENU_WIDTH + 34 : x - 18;
        const left = Math.min(
            Math.max(MENU_HORIZONTAL_MARGIN, rawLeft),
            width - MENU_WIDTH - MENU_HORIZONTAL_MARGIN,
        );
        const minTop = insets.top + MENU_VERTICAL_MARGIN;
        const top = Math.min(
            Math.max(minTop, y - 220),
            height - MENU_ESTIMATED_HEIGHT - MENU_VERTICAL_MARGIN,
        );

        setContextMenu({ messageId, top, left });
    };

    const handleContextAction = (actionKey: string) => {
        if (actionKey === "copy") {
            Alert.alert("Thông báo", "Đã chọn Copy tin nhắn.");
        }
        closeContextMenu();
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={styles.header}>
                    <Pressable
                        style={styles.headerBackBtn}
                        onPress={() => router.back()}
                        hitSlop={8}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={24}
                            color={colors.text}
                        />
                    </Pressable>

                    <View style={styles.headerIdentity}>
                        <UserAvatar
                            uri={otherUser?.avatar}
                            name={otherUser?.username ?? "?"}
                            size={40}
                        />
                        <View style={styles.headerMeta}>
                            <Text style={styles.headerName} numberOfLines={1}>
                                {otherUser?.fullName ??
                                    otherUser?.username ??
                                    "Conversation"}
                            </Text>
                            <Text style={styles.headerStatus} numberOfLines={1}>
                                {activityText}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.headerActions}>
                        <Pressable style={styles.headerActionBtn} hitSlop={8}>
                            <Ionicons
                                name="sparkles-outline"
                                size={22}
                                color={colors.text}
                            />
                        </Pressable>
                        <Pressable style={styles.headerActionBtn} hitSlop={8}>
                            <Ionicons
                                name="call-outline"
                                size={22}
                                color={colors.text}
                            />
                        </Pressable>
                        <Pressable style={styles.headerActionBtn} hitSlop={8}>
                            <Ionicons
                                name="videocam-outline"
                                size={22}
                                color={colors.text}
                            />
                        </Pressable>
                    </View>
                </View>

                <FlatList
                    data={messages}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                        const mine = item.senderId === currentUser?.id;
                        const sender = getUserById(item.senderId);
                        return (
                            <View
                                style={[
                                    styles.row,
                                    mine ? styles.rowMine : styles.rowOther,
                                ]}
                            >
                                {!mine ? (
                                    <UserAvatar
                                        uri={sender?.avatar}
                                        name={sender?.username ?? "?"}
                                        size={31}
                                    />
                                ) : null}
                                <Pressable
                                    delayLongPress={500}
                                    onLongPress={(event) =>
                                        handleMessageLongPress(
                                            event,
                                            item.id,
                                            mine,
                                        )
                                    }
                                >
                                    <View
                                        style={[
                                            styles.bubble,
                                            mine
                                                ? styles.bubbleMine
                                                : styles.bubbleOther,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.messageText,
                                                mine && styles.messageTextMine,
                                            ]}
                                        >
                                            {item.content}
                                        </Text>
                                    </View>
                                </Pressable>
                            </View>
                        );
                    }}
                    ListFooterComponent={
                        showSeen ? (
                            <Text style={styles.seenText}>Đã xem</Text>
                        ) : null
                    }
                />

                <View style={styles.composerWrap}>
                    <View style={styles.composerBar}>
                        <Pressable style={styles.cameraBtn} hitSlop={8}>
                            <Ionicons
                                name="camera"
                                size={20}
                                color={colors.white}
                            />
                        </Pressable>

                        <TextInput
                            value={input}
                            onChangeText={setInput}
                            placeholder="Nhắn tin..."
                            placeholderTextColor={colors.textMuted}
                            style={styles.input}
                            returnKeyType="send"
                            onSubmitEditing={handleSend}
                        />

                        <View style={styles.composerActions}>
                            <Pressable
                                style={styles.composerActionBtn}
                                hitSlop={8}
                            >
                                <Ionicons
                                    name="mic-outline"
                                    size={24}
                                    color={colors.text}
                                />
                            </Pressable>
                            <Pressable
                                style={styles.composerActionBtn}
                                hitSlop={8}
                            >
                                <Ionicons
                                    name="image-outline"
                                    size={24}
                                    color={colors.text}
                                />
                            </Pressable>
                            <Pressable
                                style={styles.composerActionBtn}
                                hitSlop={8}
                            >
                                <Ionicons
                                    name="happy-outline"
                                    size={24}
                                    color={colors.text}
                                />
                            </Pressable>
                            <Pressable
                                style={styles.composerActionBtn}
                                hitSlop={8}
                                onPress={handleSend}
                            >
                                <Ionicons
                                    name="add-circle-outline"
                                    size={26}
                                    color={colors.text}
                                />
                            </Pressable>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>

            <Modal
                visible={Boolean(contextMenu)}
                transparent
                animationType="fade"
                onRequestClose={closeContextMenu}
            >
                <Pressable
                    style={styles.menuOverlay}
                    onPress={closeContextMenu}
                >
                    {contextMenu ? (
                        <View
                            style={[
                                styles.contextMenuCard,
                                {
                                    top: contextMenu.top,
                                    left: contextMenu.left,
                                },
                            ]}
                        >
                            {contextActions.map((action) => {
                                if ("divider" in action && action.divider) {
                                    return (
                                        <View
                                            key={action.key}
                                            style={styles.contextDivider}
                                        />
                                    );
                                }

                                return (
                                    <Pressable
                                        key={action.key}
                                        style={styles.contextItem}
                                        onPress={() =>
                                            handleContextAction(action.key)
                                        }
                                    >
                                        <Ionicons
                                            name={action.icon}
                                            size={16}
                                            color={
                                                action.destructive
                                                    ? "#EF4444"
                                                    : "#1F2937"
                                            }
                                        />
                                        <Text
                                            style={[
                                                styles.contextLabel,
                                                action.destructive &&
                                                    styles.contextLabelDanger,
                                            ]}
                                        >
                                            {action.label}
                                        </Text>
                                        {action.hasArrow ? (
                                            <Ionicons
                                                name="chevron-forward"
                                                size={15}
                                                color={colors.textMuted}
                                                style={styles.contextChevron}
                                            />
                                        ) : null}
                                    </Pressable>
                                );
                            })}
                        </View>
                    ) : null}
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F2F3F5",
    },
    flex: { flex: 1 },
    header: {
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.sm,
        paddingVertical: 10,
    },
    headerBackBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.xs,
    },
    headerIdentity: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        minWidth: 0,
    },
    headerMeta: {
        marginLeft: spacing.sm,
        minWidth: 0,
    },
    headerName: {
        fontSize: 17,
        fontWeight: "700",
        color: colors.text,
    },
    headerStatus: {
        marginTop: 2,
        fontSize: 13,
        color: colors.textMuted,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: spacing.xs,
    },
    headerActionBtn: {
        width: 34,
        height: 34,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: spacing.xs,
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        gap: spacing.lg,
    },
    row: {
        flexDirection: "row",
        alignItems: "flex-end",
    },
    rowMine: {
        justifyContent: "flex-end",
    },
    rowOther: {
        justifyContent: "flex-start",
    },
    bubble: {
        borderRadius: 22,
        paddingHorizontal: 14,
        paddingVertical: 10,
        maxWidth: "78%",
    },
    bubbleMine: {
        backgroundColor: "#6E43FA",
    },
    bubbleOther: {
        backgroundColor: "#E9ECEF",
        marginLeft: spacing.sm,
    },
    messageText: {
        color: colors.text,
        fontSize: 15,
    },
    messageTextMine: {
        color: colors.white,
    },
    seenText: {
        alignSelf: "flex-end",
        marginTop: spacing.xs,
        marginRight: spacing.sm,
        fontSize: 13,
        color: colors.textMuted,
    },
    composerWrap: {
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
    },
    composerBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F0F1F3",
        borderRadius: 26,
        minHeight: 48,
        paddingLeft: 6,
        paddingRight: spacing.sm,
    },
    cameraBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#5B5CF0",
        alignItems: "center",
        justifyContent: "center",
    },
    composerActions: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: spacing.xs,
    },
    composerActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 2,
    },
    input: {
        flex: 1,
        color: colors.text,
        fontSize: 15,
        paddingHorizontal: spacing.sm,
        paddingVertical: Platform.OS === "ios" ? 11 : 9,
        gap: spacing.sm,
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.18)",
    },
    contextMenuCard: {
        position: "absolute",
        width: MENU_WIDTH,
        backgroundColor: colors.white,
        borderRadius: 13,
        paddingVertical: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 14,
        elevation: 10,
    },
    contextItem: {
        minHeight: 36,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 11,
    },
    contextLabel: {
        marginLeft: 9,
        fontSize: 14,
        color: "#111827",
        flex: 1,
    },
    contextLabelDanger: {
        color: "#EF4444",
    },
    contextChevron: {
        marginLeft: 8,
    },
    contextDivider: {
        height: 7,
        backgroundColor: "#F3F4F6",
        marginVertical: 3,
    },
});
