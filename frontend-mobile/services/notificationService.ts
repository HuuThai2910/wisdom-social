import apiClient from "@/api/apiClient";

export type NotificationMetadata = {
    imageUrl?: string;
    actorName?: string;
    count?: number;
    deepLink?: string;
    extraData?: string;
};

// Mirrors backend NotificationType (the ones the app renders)
export type ServerNotificationType =
    | "REACTION_POST"
    | "REACTION_COMMENT"
    | "COMMENT_POST"
    | "SHARE_POST"
    | "FRIEND_REQUEST"
    | "FRIEND_ACCEPT"
    | "PAGE_JOIN_REQUEST"
    | "PAGE_POST_SUBMITTED"
    | "PAGE_LIKE"
    | "PAGE_FOLLOW"
    | "PAGE_JOIN_APPROVED"
    | "PAGE_POST_APPROVED"
    | "PAGE_MEMBER_ADDED"
    | string;

export type ServerNotification = {
    id: string;
    recipientId: string;
    actorIds: string[];
    type: ServerNotificationType;
    targetType?: string;
    targetId?: string;
    content?: string;
    metadata?: NotificationMetadata;
    isRead: boolean;
    readAt?: string;
    createdAt: string;
};

const API_PATH = "/notifications";

export const getNotifications = async (
    page = 0,
    size = 30,
): Promise<ServerNotification[]> => {
    try {
        const res = await apiClient.get(API_PATH, { params: { page, size } });
        const data = res.data?.data;
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("notificationService.getNotifications error", error);
        return [];
    }
};

export const getUnreadCount = async (): Promise<number> => {
    try {
        const res = await apiClient.get(`${API_PATH}/unread-count`);
        const v = res.data?.data;
        return typeof v === "number" ? v : 0;
    } catch (error) {
        console.error("notificationService.getUnreadCount error", error);
        return 0;
    }
};

export const markNotificationAsRead = async (id: string): Promise<boolean> => {
    try {
        const res = await apiClient.put(`${API_PATH}/${id}/read`);
        return !!res.data?.success;
    } catch (error) {
        console.error("notificationService.markNotificationAsRead error", error);
        return false;
    }
};

export const markAllNotificationsAsRead = async (): Promise<boolean> => {
    try {
        const res = await apiClient.put(`${API_PATH}/read-all`);
        return !!res.data?.success;
    } catch (error) {
        console.error("notificationService.markAllNotificationsAsRead error", error);
        return false;
    }
};

/** Default Vietnamese text per notification type (fallback when content is empty). */
export const getNotificationText = (type: string): string => {
    switch (type) {
        case "REACTION_POST":
            return "Đã thích bài viết của bạn";
        case "REACTION_COMMENT":
            return "Đã thích bình luận của bạn";
        case "COMMENT_POST":
            return "Đã bình luận bài viết của bạn";
        case "SHARE_POST":
            return "Đã chia sẻ bài viết của bạn";
        case "FRIEND_REQUEST":
            return "Đã gửi lời mời kết bạn";
        case "FRIEND_ACCEPT":
            return "Đã chấp nhận lời mời kết bạn";
        case "PAGE_JOIN_REQUEST":
            return "Đã yêu cầu tham gia trang của bạn";
        case "PAGE_POST_SUBMITTED":
            return "Đã đăng một bài viết chờ duyệt";
        case "PAGE_LIKE":
            return "Đã thích trang của bạn";
        case "PAGE_FOLLOW":
            return "Đã theo dõi trang của bạn";
        case "PAGE_JOIN_APPROVED":
            return "Yêu cầu tham gia trang của bạn đã được chấp nhận";
        case "PAGE_POST_APPROVED":
            return "Bài viết của bạn đã được duyệt";
        case "PAGE_MEMBER_ADDED":
            return "Bạn đã được thêm vào trang";
        case "PAGE_ROLE_GRANTED":
            return "Bạn đã được cấp quyền quản lý trang";
        default:
            return "Có thông báo mới";
    }
};
