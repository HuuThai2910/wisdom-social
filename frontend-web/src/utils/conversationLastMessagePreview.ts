import type { Conversation } from "../services/chatService";
import { buildSystemGroupMessage } from "./systemCreateGroupMessage";

interface ConversationLastMessagePreviewParams {
    conversation: Conversation;
    currentUserId: number;
}

export interface ConversationLastMessagePreview {
    text: string;
    showSenderPrefix: boolean;
    senderLabel: string;
}

type GroupSystemPreviewType =
    | "SYSTEM_CREATE_GROUP"
    | "SYSTEM_ADD_MEMBER"
    | "SYSTEM_UPDATE_ROLE"
    | "SYSTEM_KICK_MEMBER"
    | "SYSTEM_LEAVE_GROUP"
    | "SYSTEM_DISBAND_GROUP"
    | "SYSTEM_UPDATE_SETTING"
    | "SYSTEM_REQUIRE_APPROVAL"
    | "SYSTEM_JOIN_VIA_LINK";

const DEFAULT_PREVIEW_TEXT = "Bắt đầu trò chuyện";

const GROUP_SYSTEM_PREVIEW_TYPES = new Set<GroupSystemPreviewType>([
    "SYSTEM_CREATE_GROUP",
    "SYSTEM_ADD_MEMBER",
    "SYSTEM_UPDATE_ROLE",
    "SYSTEM_KICK_MEMBER",
    "SYSTEM_LEAVE_GROUP",
    "SYSTEM_DISBAND_GROUP",
    "SYSTEM_UPDATE_SETTING",
    "SYSTEM_REQUIRE_APPROVAL",
    "SYSTEM_JOIN_VIA_LINK",
]);

function isGroupSystemPreviewType(
    type: Conversation["lastMessage"] extends infer T
        ? T extends { lastMessageType: infer M }
            ? M
            : never
        : never,
): type is GroupSystemPreviewType {
    return GROUP_SYSTEM_PREVIEW_TYPES.has(type as GroupSystemPreviewType);
}

function isSystemMessageType(type: unknown): type is string {
    return typeof type === "string" && type.startsWith("SYSTEM_");
}

export function buildConversationLastMessagePreview({
    conversation,
    currentUserId,
}: ConversationLastMessagePreviewParams): ConversationLastMessagePreview {
    const lastMessage = conversation.lastMessage;
    if (!lastMessage) {
        return {
            text: DEFAULT_PREVIEW_TEXT,
            showSenderPrefix: false,
            senderLabel: "",
        };
    }

    if (isSystemMessageType(lastMessage.lastMessageType)) {
        const isFallbackMessage =
            !lastMessage.lastMessageContent?.trim() &&
            !lastMessage.lastSenderName?.trim() &&
            lastMessage.lastSenderId <= 0;

        if (isFallbackMessage) {
            if (lastMessage.lastMessageType === "SYSTEM_DISBAND_GROUP") {
                return {
                    text: buildSystemGroupMessage({
                        type: lastMessage.lastMessageType,
                        content: lastMessage.lastMessageContent,
                        isOwn: false,
                        senderName: lastMessage.lastSenderName,
                        senderId: lastMessage.lastSenderId,
                        currentUserId,
                        membersById: {},
                    }),
                    showSenderPrefix: false,
                    senderLabel: "",
                };
            }

            return {
                text: DEFAULT_PREVIEW_TEXT,
                showSenderPrefix: false,
                senderLabel: "",
            };
        }

        if (!isGroupSystemPreviewType(lastMessage.lastMessageType)) {
            return {
                text: lastMessage.lastMessageContent?.trim() || DEFAULT_PREVIEW_TEXT,
                showSenderPrefix: false,
                senderLabel: "",
            };
        }

        return {
            text: buildSystemGroupMessage({
                type: lastMessage.lastMessageType,
                content: lastMessage.lastMessageContent,
                isOwn: lastMessage.lastSenderId === currentUserId,
                senderName: lastMessage.lastSenderName,
                senderId: lastMessage.lastSenderId,
                currentUserId,
                membersById: {},
            }),
            showSenderPrefix: false,
            senderLabel: "",
        };
    }

    const normalizedContent = (lastMessage.lastMessageContent || "").trim();
    if (!normalizedContent) {
        return {
            text: DEFAULT_PREVIEW_TEXT,
            showSenderPrefix: false,
            senderLabel: "",
        };
    }

    const showSenderPrefix =
        conversation.type === "GROUP" ||
        lastMessage.lastSenderId === currentUserId;
    const senderLabel =
        lastMessage.lastSenderId === currentUserId
            ? "Bạn"
            : lastMessage.lastSenderName?.trim() || "Người dùng";

    return {
        text: normalizedContent,
        showSenderPrefix,
        senderLabel,
    };
}
