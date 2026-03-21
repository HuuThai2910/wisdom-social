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

    async markAsRead(conversationId: number, userId: number): Promise<void> {
        await axiosClient.post(
            `/conversations/${conversationId}/read?userId=${userId}`,
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
        targetId: number,
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
};

export default chatService;
