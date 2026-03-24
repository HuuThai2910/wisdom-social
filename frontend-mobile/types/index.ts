export interface User {
    id: number;
    phone: string;
    name?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
    birthday?: string | null;
    bio?: string | null;
    gender?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    confirmUseAI?: boolean;
    fullName?: string;
    avatar?: string;
    isVerified?: boolean;
    followersCount?: number;
    followingCount?: number;
    postsCount?: number;
}

export type PostStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Post {
    id: string;
    authorId?: string;  // User ID as string
    content?: string;
    media?: Array<{
        url?: string;
        type?: string;
    }>;
    stats?: {
        likes?: number;
        comments?: number;
        shares?: number;
    };
    createdAt?: string;
    updatedAt?: string;
    status?: PostStatus;
    pageId?: number;
}

export interface Comment {
    id: string;
    user: User;
    text: string;
    createdAt: string;
    likes: number;
}

export interface Story {
    id: string;
    user: User;
    image: string;
    isViewed: boolean;
}

export interface Chat {
    id: string;
    participants: User[];
    lastMessage?: Message;
    unreadCount: number;
    updatedAt: string;
}

export interface Message {
    id: string;
    senderId: string;
    conversationId: string;
    content: string;
    createdAt: string;
    isRead: boolean;
}

export interface Notification {
    id: string;
    user: User;
    type: 'like' | 'comment' | 'follow' | 'mention';
    post?: Post;
    message: string;
    createdAt: string;
    isRead: boolean;
}
