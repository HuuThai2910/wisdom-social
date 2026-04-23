import type { Conversation } from "../services/chatService";
import { buildSystemCreateGroupMessage } from "./systemCreateGroupMessage";

interface ConversationLastMessagePreviewParams {
    conversation: Conversation;
    currentUserId: number;
}

interface MemberLookup {
    nickname?: string;
    username?: string;
}

export interface ConversationLastMessagePreview {
    text: string;
    showSenderPrefix: boolean;
    senderLabel: string;
}

const DEFAULT_PREVIEW_TEXT = "Bắt đầu trò chuyện";

function buildConversationMembersLookup(
    conversation: Conversation,
): Record<number, MemberLookup> {
    const members = conversation.members ?? [];
    return members.reduce<Record<number, MemberLookup>>((acc, member) => {
        acc[member.userId] = {
            nickname: member.nickname,
            username: member.username,
        };
        return acc;
    }, {});
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

    if (lastMessage.lastMessageType === "SYSTEM_CREATE_GROUP") {
        const isFallbackMessage =
            !lastMessage.lastMessageContent?.trim() &&
            !lastMessage.lastSenderName?.trim() &&
            lastMessage.lastSenderId <= 0;

        if (isFallbackMessage) {
            return {
                text: DEFAULT_PREVIEW_TEXT,
                showSenderPrefix: false,
                senderLabel: "",
            };
        }

        return {
            text: buildSystemCreateGroupMessage({
                content: lastMessage.lastMessageContent,
                isOwn: lastMessage.lastSenderId === currentUserId,
                senderName: lastMessage.lastSenderName,
                senderId: lastMessage.lastSenderId,
                currentUserId,
                membersById: buildConversationMembersLookup(conversation),
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