export interface ApiResponse<T> {
    status: number;
    success: boolean;
    message: string;
    data: T | null;
    errors?: unknown;
    timestamp: string;
}

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
    | "SYSTEM_DISBAND_GROUP"
    | "SYSTEM_UPDATE_SETTING"
    | "SYSTEM_REQUIRE_APPROVAL";

export type MemberRole = "OWNER" | "DEPUTY" | "MEMBER";

export type MemberStatus = "ACTIVE" | "LEFT" | "KICKED" | "GROUP_DISBANDED";

export interface ReplyInfo {
    messageId: string;
    senderId?: number;
    type?: MessageType;
    content?: string;
}

export interface MessageAttachment {
    url: string;
    type?: string;
    fileName?: string;
    fileSize?: number;
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

export interface ConversationMember {
    id?: number;
    userId: number;
    username: string;
    nickname: string;
    avatar?: string;
    unreadCount?: number;
    clearedAt?: string;
    lastReadMessageId?: string;
    role?: MemberRole;
    status?: MemberStatus;
    joinedAt?: string;
    leftAt?: string;
}

export interface ConversationSidebar {
    id: number;
    name?: string;
    type: "DIRECT" | "GROUP";
    imageUrl?: string;
    updatedAt: string;
    lastMessage?: LastMessage;
    unreadCount?: number;
    isMessageRestricted?: boolean;
    isJoinApprovalRequired?: boolean;
    pendingRequests?: JoinRequest[] | null;
}

export interface Conversation extends ConversationSidebar {
    members?: ConversationMember[];
    pinnedMessages?: PinnedMessageDetail[];
}

export type JoinRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface JoinRequest {
    id: number;
    conversationId: number;
    userId: number;
    userName: string;
    userAvatar?: string | null;
    username?: string | null;
    nickname?: string | null;
    avatar?: string | null;
    avatarUrl?: string | null;
    inviterId?: number | null;
    inviterName?: string | null;
    status: JoinRequestStatus;
    content?: string | null;
    createdAt: string;
}

export type GroupJoinRequest = JoinRequest;

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

export interface LocalUploadFile {
    uri: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
}

export interface MessageCreatedEvent {
    domainEventType: "MESSAGE_CREATED";
    messageResponse: Message;
}

export interface MessageRecalledEvent {
    domainEventType: "MESSAGE_RECALLED";
    messageRecalledResponse: {
        messageId: string;
        conversationId: number;
        createdAt: string;
    };
}

export interface MessageSeenEvent {
    domainEventType: "MESSAGE_SEEN";
    messageSeenResponse: {
        conversationId: number;
        userId: number;
        lastMessageId: string;
        seenAt: string;
    };
}

export interface TypingEvent {
    domainEventType: "TYPING";
    typingResponse: {
        conversationId: number;
        userId: number;
        isTyping: boolean;
    };
}

export interface PinUpdatedEvent {
    domainEventType: "PIN_MESSAGE" | "UPIN_MESSAGE";
    conversationId: number;
    currentPins: PinnedMessageDetail[];
}

export interface MemberUpdatedEvent {
    domainEventType: "MEMBER_UPDATED";
    conversationId: number;
    userId: number;
    newNickname: string;
    newAvatar?: string;
}

export interface ConversationUpdatedEvent {
    domainEventType?: "ROOM_UPDATED";
    type?: "ROOM_UPDATED";
    conversationId: number;
    lastMessage: LastMessage;
}

export interface ConversationCreatedEvent {
    domainEventType?: "ROOM_CREATED";
    type?: "ROOM_CREATED";
    conversationResponse?: Conversation | ConversationSidebar;
}

export interface ConversationMembershipEvent {
    domainEventType?:
        | "MEMBER_ADDED"
        | "MEMBER_ROLE_UPDATED"
        | "MEMBER_LEFT"
        | "MEMBER_KICKED";
    conversationResponse?: Conversation | ConversationSidebar;
}

export interface GroupDisbandedEvent {
    domainEventType?: "GROUP_DISBANDED";
    conversationId?: number;
}

export interface NewJoinRequestEvent {
    domainEventType: "NEW_JOIN_REQUEST";
    conversationId: number;
    requestData: JoinRequest;
}
