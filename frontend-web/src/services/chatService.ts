import type { ApiResponse } from "../types";
import axiosClient from "../api/axiosClient";

export type MessageType =
    | "TEXT"
    | "IMAGE"
    | "VIDEO"
    | "FILE"
    | "AUDIO"
    | "CALL"
    | "SYSTEM_PIN"
    | "SYSTEM_UPIN";

export interface ReplyInfo {
    messageId: string;
    senderId?: number;
    type?: MessageType;
    content?: string;
}

export interface Message {
    id: string;
    conversationId: number;
    content: string;
    type: MessageType;
    createdAt: string;
    senderId: number;
    senderName?: string;
    senderAvatar?: string;
    replyInfo?: ReplyInfo;
    active?: boolean;
    isActive?: boolean;
    isRecalled?: boolean;
}

export interface ReferenceUser {
    nickname: string;
    avatar?: string;
}

export interface CursorResponse<T> {
    data: T;
    nextCursor: string | null;
    hasNext: boolean;
    referenceUsers?: Record<string, ReferenceUser>;
}

export interface LastMessage {
    lastMessageContent: string;
    lastMessageType: MessageType;
    lastSenderId: number;
    lastSenderName: string;
    lastMessageAt: string;
    read: boolean;
}

export interface PinnedMessageDetail {
    messageId: string;
    pinnerId: number;
    pinnedAt: string;
}

export interface Conversation {
    id: number;
    name?: string;
    type: "DIRECT" | "GROUP";
    imageUrl?: string;
    updatedAt: string;
    lastMessage?: LastMessage;
    members?: ConversationMember[];
    unreadCount?: number;
    pinnedMessages?: PinnedMessageDetail[];
}

export interface ConversationMember {
    userId: number;
    username: string;
    nickname: string;
    avatar?: string;
    lastReadMessageId?: string; // Mốc tin nhắn đã đọc (watermark)
}

export interface SendMessageRequest {
    content: string;
    type: MessageType;
    conversationId: number;
    replyToId?: string;
}

export interface SendCallMessageRequest {
    conversationId: number;
    callType: "audio" | "video";
    status: "calling" | "ringing" | "accepted" | "rejected" | "ended";
    durationSeconds: number;
}

export interface PresignedUrlResponse {
    presignedUrl: string;
    objectKey: string;
    fileName: string;
}

export interface MessageSeenPayload {
    conversationId: number;
    userId: number;
    lastMessageId: string;
    seenAt: string;
}

export interface UpdateNicknameRequest {
    conversationId: number;
    targetUserId: number;
    nickname: string;
}

function normalizeMembersPayload(
    payload: unknown,
): Record<string, ConversationMember> {
    // Chuẩn hoá response members để FE chịu được 2 kiểu backend:
    // 1) Kiểu bọc ApiResponse: { success, data, ... }
    // 2) Kiểu map raw: { "1": { ... }, "2": { ... } }
    // Mục tiêu: tránh lỗi map sai key/userId khiến UI rơi về fallback
    // "Người dùng" và avatar mặc định.
    if (!payload || typeof payload !== "object") return {};

    // Case 1: API wrapped format { success, data, ... }
    if ("data" in (payload as Record<string, unknown>)) {
        const data = (payload as { data?: unknown }).data;
        if (data && typeof data === "object") {
            return data as Record<string, ConversationMember>;
        }
    }

    // Case 2: raw map format { "1": {...}, "2": {...} }
    return payload as Record<string, ConversationMember>;
}

const chatService = {
    async getConversations(
        userId: number,
    ): Promise<ApiResponse<Conversation[]>> {
        const response = await axiosClient.get(
            `/conversations?userId=${userId}`,
        );
        return response.data;
    },

    async getMessages(
        conversationId: number,
        userId: number,
        before?: string | null,
        limit: number = 20,
    ): Promise<ApiResponse<CursorResponse<Message[]>>> {
        const params = new URLSearchParams({
            userId: userId.toString(),
            limit: limit.toString(),
        });
        if (before) params.append("before", before);
        const response = await axiosClient.get(
            `/conversations/${conversationId}/messages?${params.toString()}`,
        );

        return response.data;
    },

    async sendMessage(
        request: SendMessageRequest,
        userId: number,
    ): Promise<Message> {
        const response = await axiosClient.post(
            `/messages/send?userId=${userId}`,
            request,
        );
        return response.data;
    },

    async sendCallMessage(
        request: SendCallMessageRequest,
        userId: number,
    ): Promise<Message> {
        const response = await axiosClient.post(
            `/messages/call?userId=${userId}`,
            request,
        );
        return response.data;
    },

    async getConversation(
        conversationId: number,
        userId: number,
    ): Promise<ApiResponse<Conversation>> {
        const response = await axiosClient.get(
            `/conversations/${conversationId}?userId=${userId}`,
        );
        return response.data;
    },

    async markAsRead(
        conversationId: number,
        userId: number,
        lastMessageId: string,
    ): Promise<void> {
        await axiosClient.put(
            `/conversations/${conversationId}/read?userId=${userId}&lastMessageId=${lastMessageId}`,
        );
    },

    async getConversationMembers(
        conversationId: number,
    ): Promise<Record<string, ConversationMember>> {
        const response = await axiosClient.get(
            `/conversations/${conversationId}/members`,
        );
        // Trả ra đúng map members theo userId để controller dùng join dữ liệu
        // senderId <-> nickname/avatar một cách ổn định.
        return normalizeMembersPayload(response.data);
    },

    async updateConversationMemberNickname(
        request: UpdateNicknameRequest,
    ): Promise<void> {
        await axiosClient.patch(
            `/conversations/${request.conversationId}/members/${request.targetUserId}/nickname`,
            request.nickname,
            {
                headers: {
                    "Content-Type": "text/plain",
                },
            },
        );
    },

    async recallMessage(messageId: string, userId: number): Promise<void> {
        await axiosClient.delete(
            `/messages/${messageId}/recall?userId=${userId}`,
        );
    },

    async pinMessage(messageId: string, userId: number): Promise<void> {
        await axiosClient.post(`/messages/${messageId}/pin?userId=${userId}`);
    },

    async unpinMessage(messageId: string, userId: number): Promise<void> {
        await axiosClient.delete(`/messages/${messageId}/pin?userId=${userId}`);
    },

    // Bước 1: Xin presigned URL từ BE để upload file lên S3
    async getPresignedUrl(
        module: string,
        targetId: string, // Đổi từ number sang string để match với backend
        type: string,
        fileName: string,
        contentType: string,
    ): Promise<PresignedUrlResponse> {
        const response = await axiosClient.get(`/files/presigned-url`, {
            params: { module, targetId, type, fileName, contentType },
        });
        return (response.data as { data: PresignedUrlResponse }).data;
    },

    // Bước 2a: Upload file thẳng lên S3 bằng presigned PUT URL (không qua BE, không cần auth header)
    async uploadToS3(presignedUrl: string, file: File): Promise<void> {
        const res = await fetch(presignedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
        });
        if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
    },

    // Xóa tin nhắn ở phía tôi (chỉ user hiện tại không thấy, người khác vẫn thấy)
    async deleteMessageForMe(messageId: string, userId: number): Promise<void> {
        await axiosClient.delete(
            `/messages/${messageId}/delete-for-me?userId=${userId}`,
        );
    },

    // Xóa cuộc trò chuyện ở phía tôi (xóa lịch sử chat cho user hiện tại)
    async deleteConversationForMe(
        conversationId: number,
        userId: number,
    ): Promise<void> {
        await axiosClient.delete(
            `/conversations/${conversationId}/delete-for-me?userId=${userId}`,
        );
    },
};

export default chatService;
