import type { ApiResponse } from "../types";
import axiosClient from "../api/axiosClient";

export type MessageType =
    | "TEXT"
    | "IMAGE"
    | "VIDEO"
    | "FILE"
    | "AUDIO"
    | "CALL";

export interface Message {
    id: string;
    conversationId: number;
    content: string;
    type: MessageType;
    createdAt: string;
    senderId: number;
    senderName: string;
    senderAvatar: string;
    active?: boolean;
    isActive?: boolean;
    isRecalled?: boolean;
}

export interface CursorResponse<T> {
    data: T;
    nextCursor: string | null;
    hasNext: boolean;
}

export interface LastMessage {
    lastMessageContent: string;
    lastMessageType: MessageType;
    lastSenderId: number;
    lastSenderName: string;
    lastMessageAt: string;
    read: boolean;
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

    async recallMessage(messageId: string, userId: number): Promise<void> {
        await axiosClient.delete(
            `/messages/${messageId}/recall?userId=${userId}`,
        );
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
