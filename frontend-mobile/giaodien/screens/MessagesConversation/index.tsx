import { AppHeader, UserAvatar } from "@/components";
import { colors, spacing } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

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
    const [input, setInput] = useState("");

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

    const handleSend = async () => {
        const result = await sendMessage(conversationId ?? "", input);
        if (result.success) {
            setInput("");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title={otherUser?.username ?? "Conversation"}
                leftAction={{
                    icon: "arrow-back",
                    onPress: () => router.back(),
                }}
            />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <FlatList
                    data={messages}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
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
                                        size={30}
                                    />
                                ) : null}
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
                            </View>
                        );
                    }}
                />

                <View style={styles.inputRow}>
                    <TextInput
                        value={input}
                        onChangeText={setInput}
                        placeholder="Nhập tin nhắn..."
                        placeholderTextColor={colors.textMuted}
                        style={styles.input}
                    />
                    <Pressable style={styles.sendBtn} onPress={handleSend}>
                        <Text style={styles.sendText}>Send</Text>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    flex: { flex: 1 },
    listContent: {
        padding: spacing.md,
        gap: spacing.sm,
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
        borderRadius: 18,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        maxWidth: "74%",
    },
    bubbleMine: {
        backgroundColor: colors.primary,
        marginLeft: spacing.sm,
    },
    bubbleOther: {
        backgroundColor: "#F1F1F3",
        marginLeft: spacing.sm,
    },
    messageText: {
        color: colors.text,
        fontSize: 14,
    },
    messageTextMine: {
        color: colors.white,
    },
    inputRow: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        alignItems: "center",
        gap: spacing.sm,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        color: colors.text,
    },
    sendBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    sendText: {
        color: colors.primary,
        fontWeight: "700",
    },
});
