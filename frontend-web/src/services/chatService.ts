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
    | "SYSTEM_UPIN"
    | "SYSTEM_CREATE_GROUP"
    | "SYSTEM_ADD_MEMBER"
    | "SYSTEM_LEAVE_GROUP"
    | "SYSTEM_KICK_MEMBER"
    | "SYSTEM_UPDATE_ROLE"
    | "SYSTEM_DISBAND_GROUP";

export type MemberRole = "OWNER" | "DEPUTY" | "MEMBER";

export type MemberStatus = "ACTIVE" | "LEFT" | "KICKED" | "GROUP_DISBANDED";

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
    attachments?: MessageAttachment[];
    deletedFor?: number[];
}

export interface MessageAttachment {
    url: string;
    type?: string;
    fileName?: string;
    fileSize?: number;
}

export interface ReferenceUser {
    nickname: string;
    avatar?: string;
}

export interface CursorResponse<T> {
    data: T;
    nextCursor: string | null;
    hasMoreOlder: boolean;
    hasMoreNewer: boolean;
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
    originalSenderId?: number;
    type?: MessageType;
    content?: string;
}

export interface ConversationSidebar {
    id: number;
    name?: string;
    type: "DIRECT" | "GROUP";
    imageUrl?: string;
    updatedAt: string;
    lastMessage?: LastMessage;
    unreadCount?: number;
}

export interface Conversation extends ConversationSidebar {
    members?: ConversationMember[];
    pinnedMessages?: PinnedMessageDetail[];
}

export interface ConversationMember {
    id?: number;
    userId: number;
    username?: string;
    nickname: string;
    avatar?: string;
    unreadCount?: number;
    clearedAt?: string;
    lastReadMessageId?: string; // Mốc tin nhắn đã đọc (watermark)
    role?: MemberRole;
    status?: MemberStatus;
    joinedAt?: string;
    leftAt?: string;
}

export interface SendMessageRequest {
    content: string;
    type: MessageType;
    conversationId: number;
    replyToId?: string;
    attachments?: Array<{
        url: string;
        type: string;
        fileName: string;
        fileSize: number;
    }>;
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

export interface BulkPresignedRequest {
    module: "CONVERSATION" | "USER" | "POST";
    targetId: string;
    files: Array<{
        type: "IMAGE" | "VIDEO" | "FILE" | "AUDIO";
        fileName: string;
        contentType: string;
    }>;
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

export interface CreateGroupRequest {
    name?: string;
    imageUrl?: string;
    memberIds: number[];
}

export interface AddGroupMembersRequest {
    newMemberIds: number[];
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

function unwrapApiData<T>(payload: ApiResponse<T> | T): T {
    if (
        payload &&
        typeof payload === "object" &&
        "data" in (payload as Record<string, unknown>)
    ) {
        const wrapped = payload as ApiResponse<T>;
        if (wrapped.data != null) {
            return wrapped.data;
        }
    }
    return payload as T;
}

const chatService = {
    async getConversations(
        userId: number,
    ): Promise<ApiResponse<ConversationSidebar[]>> {
        const response = await axiosClient.get("/conversations");
        return response.data;
    },

    async getMessages(
        conversationId: number,
        userId: number,
        before?: string | null,
        limit: number = 20,
        signal?: AbortSignal,
    ): Promise<ApiResponse<CursorResponse<Message[]>>> {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });
        if (before) params.append("before", before);
        const response = await axiosClient.get(
            `/conversations/${conversationId}/messages?${params.toString()}`,
            { signal },
        );

        return response.data;
    },

    async getNewerMessages(
        conversationId: number,
        userId: number,
        after: string,
        limit: number = 20,
    ): Promise<ApiResponse<CursorResponse<Message[]>>> {
        const params = new URLSearchParams({
            limit: limit.toString(),
            after,
        });
        const response = await axiosClient.get(
            `/conversations/${conversationId}/messages/newer?${params.toString()}`,
        );
        return response.data;
    },

    async jumpToMessage(
        conversationId: number,
        targetMessageId: string,
        userId: number,
    ): Promise<ApiResponse<CursorResponse<Message[]>>> {
        const response = await axiosClient.get(
            `/conversations/${conversationId}/messages/${targetMessageId}/jump`,
        );
        return response.data;
    },

    async sendMessage(
        request: SendMessageRequest,
        userId: number,
    ): Promise<Message> {
        const response = await axiosClient.post("/messages/send", request);
        return response.data;
    },

    async sendCallMessage(
        request: SendCallMessageRequest,
        userId: number,
    ): Promise<Message> {
        const response = await axiosClient.post("/messages/call", request);
        return response.data;
    },

    async getConversation(
        conversationId: number,
        userId: number,
    ): Promise<ApiResponse<Conversation>> {
        const response = await axiosClient.get(
            `/conversations/${conversationId}`,
        );
        return response.data;
    },

    async markAsRead(
        conversationId: number,
        userId: number,
        lastMessageId: string,
    ): Promise<void> {
        await axiosClient.put(
            `/conversations/${conversationId}/read?lastMessageId=${lastMessageId}`,
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

    async createGroupConversation(
        request: CreateGroupRequest,
    ): Promise<Conversation> {
        const response = await axiosClient.post(
            "/conversations/group",
            request,
        );
        return unwrapApiData(
            response.data as ApiResponse<Conversation> | Conversation,
        );
    },

    async addMembersToGroup(
        conversationId: number,
        request: AddGroupMembersRequest,
    ): Promise<Conversation> {
        const response = await axiosClient.post(
            `/conversations/${conversationId}/members`,
            request,
        );
        return unwrapApiData(
            response.data as ApiResponse<Conversation> | Conversation,
        );
    },

    async leaveGroup(conversationId: number): Promise<Conversation> {
        const response = await axiosClient.delete(
            `/conversations/${conversationId}/leave`,
        );
        return unwrapApiData(
            response.data as ApiResponse<Conversation> | Conversation,
        );
    },

    async kickGroupMember(
        conversationId: number,
        targetUserId: number,
    ): Promise<Conversation> {
        const response = await axiosClient.delete(
            `/conversations/${conversationId}/members/${targetUserId}`,
        );
        return unwrapApiData(
            response.data as ApiResponse<Conversation> | Conversation,
        );
    },

    async updateGroupMemberRole(
        conversationId: number,
        targetUserId: number,
        newRole: MemberRole,
    ): Promise<Conversation> {
        const response = await axiosClient.patch(
            `/conversations/${conversationId}/members/${targetUserId}/role`,
            null,
            {
                params: {
                    newRole,
                },
            },
        );
        return unwrapApiData(
            response.data as ApiResponse<Conversation> | Conversation,
        );
    },

    async disbandGroup(conversationId: number): Promise<void> {
        await axiosClient.delete(`/conversations/${conversationId}/disband`);
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
        await axiosClient.delete(`/messages/${messageId}/recall`);
    },

    async pinMessage(messageId: string, userId: number): Promise<void> {
        await axiosClient.post(`/messages/${messageId}/pin`);
    },

    async unpinMessage(messageId: string, userId: number): Promise<void> {
        await axiosClient.delete(`/messages/${messageId}/pin`);
    },

    // Bước 1: Xin presigned URL từ BE để upload file lên S3
    async getPresignedUrl(
        module: string,
        targetId: string, // Đổi từ number sang string để match với backend
        type: string,
        fileName: string,
        contentType: string,
    ): Promise<PresignedUrlResponse> {
        const list = await this.getBulkPresignedUrls({
            module: module as BulkPresignedRequest["module"],
            targetId,
            files: [
                {
                    type: type as BulkPresignedRequest["files"][number]["type"],
                    fileName,
                    contentType,
                },
            ],
        });

        if (list.length === 0) {
            throw new Error("Không lấy được presigned URL");
        }

        return list[0];
    },

    async getBulkPresignedUrls(
        request: BulkPresignedRequest,
    ): Promise<PresignedUrlResponse[]> {
        const response = await axiosClient.request({
            url: "/files/presigned-url",
            method: "post",
            data: request,
        });

        // Backend có thể trả list raw hoặc dạng bọc { data: [...] }.
        const payload = response.data as
            | PresignedUrlResponse[]
            | { data?: PresignedUrlResponse[] };
        if (Array.isArray(payload)) return payload;
        return Array.isArray(payload?.data) ? payload.data : [];
    },

    // Bước 2a: Upload file thẳng lên S3 bằng presigned PUT URL (không qua BE, không cần auth header)
    async uploadToS3(
        presignedUrl: string,
        file: File,
        onProgress?: (loaded: number, total: number) => void,
    ): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", presignedUrl, true);
            xhr.setRequestHeader(
                "Content-Type",
                file.type || "application/octet-stream",
            );

            xhr.upload.onprogress = (event) => {
                if (!onProgress) return;
                const total = event.lengthComputable ? event.total : file.size;
                onProgress(event.loaded, total || file.size);
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    onProgress?.(file.size, file.size);
                    resolve();
                } else {
                    reject(new Error(`S3 upload failed: ${xhr.status}`));
                }
            };

            xhr.onerror = () => reject(new Error("S3 upload failed"));
            xhr.onabort = () => reject(new Error("S3 upload aborted"));
            xhr.send(file);
        });
    },

    // Xóa tin nhắn ở phía tôi (chỉ user hiện tại không thấy, người khác vẫn thấy)
    async deleteMessageForMe(messageId: string, userId: number): Promise<void> {
        await axiosClient.delete(`/messages/${messageId}/delete-for-me`);
    },

    // Xóa cuộc trò chuyện ở phía tôi (xóa lịch sử chat cho user hiện tại)
    async deleteConversationForMe(
        conversationId: number,
        userId: number,
    ): Promise<void> {
        await axiosClient.delete(
            `/conversations/${conversationId}/delete-for-me`,
        );
    },
};

export default chatService;
