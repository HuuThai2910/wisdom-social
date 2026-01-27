import type { ApiResponse } from "../types";
import axiosClient from "../api/axiosClient";

export interface Message {
    id: string;
    conversationId: number;
    content: string;
    type: "TEXT" | "IMAGE" | "FILE";
    createdAt: string;
    senderId: number;
    senderName: string;
    senderAvatar: string;
    // Backend thường serialize boolean field `isActive` thành key `active`
    active?: boolean;
    isActive?: boolean;
}

// Response cho cursor-based pagination (load more messages)
// Backend trả về: { data: [...], nextCursor: "2026-01-25T10:00:00Z", hasNext: true }
export interface CursorResponse<T> {
    data: T; // Danh sách messages
    nextCursor: string | null; // Cursor (createdAt) của tin nhắn cũ nhất để load tiếp
    hasNext: boolean; // Còn tin nhắn cũ hơn không
}

export interface LastMessage {
    lastMessageContent: string;
    lastMessageType: "TEXT" | "IMAGE" | "FILE";
    lastSenderId: number;
    lastSenderName: string;
    lastMessageAt: string;
    // Backend trả về field tên `read` (không phải isRead)
    // - true: user hiện tại đã đọc hội thoại này
    // - false: user hiện tại chưa đọc (thường đi kèm unreadCount > 0)
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
    type: "TEXT" | "IMAGE" | "FILE";
    conversationId: number;
}

const chatService = {
    // Lấy danh sách conversations
    async getConversations(
        userId: number,
    ): Promise<ApiResponse<Conversation[]>> {
        const response = await axiosClient.get(
            `/conversations?userId=${userId}`,
        );
        return response.data;
    },

    // Lấy messages của một conversation với cursor-based pagination
    // - before: timestamp (ISO string) của tin nhắn cũ nhất đã load (để load tin cũ hơn)
    // - limit: số lượng tin nhắn tối đa muốn load (mặc định 20)
    // Backend trả về tin nhắn theo thứ tự: cũ -> mới (ascending)
    // Response structure: ApiResponse<CursorResponse<Message[]>>
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
        if (before) {
            params.append("before", before);
        }
        const response = await axiosClient.get(
            `/conversations/${conversationId}/messages?${params.toString()}`,
        );
        return response.data;
    },

    // Gửi message
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

    // Lấy thông tin conversation
    async getConversation(
        conversationId: number,
        userId: number,
    ): Promise<ApiResponse<Conversation>> {
        const response = await axiosClient.get(
            `/conversations/${conversationId}?userId=${userId}`,
        );
        return response.data;
    },

    // Đánh dấu conversation đã đọc:
    // - Backend sẽ reset unreadCount về 0 cho userId hiện tại trong conversation này
    // - FE thường gọi khi user mở hội thoại hoặc đang đứng trong hội thoại và nhận tin mới
    async markAsRead(conversationId: number, userId: number): Promise<void> {
        await axiosClient.post(
            `/conversations/${conversationId}/read?userId=${userId}`,
        );
    },
};

export default chatService;
