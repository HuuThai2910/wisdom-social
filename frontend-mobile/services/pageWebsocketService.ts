import chatWebsocketService from "@/services/chatWebsocketService";

export type PageEvent = {
    eventType:
        | "PAGE_MEMBER_JOINED"
        | "PAGE_MEMBER_LEFT"
        | "PAGE_MEMBER_BLOCKED"
        | "PAGE_MEMBER_UNBLOCKED"
        | "PAGE_MEMBER_ROLE_CHANGED"
        | "PAGE_JOIN_REQUESTED"
        | "PAGE_JOIN_APPROVED"
        | "PAGE_JOIN_REJECTED"
        | "PAGE_JOIN_CANCELLED";
    pageId: number;
    userId: number;
    newRole?: string;
    timestamp?: string;
};

/**
 * Subscribes to real-time page events.
 * Reuses the existing ChatWebsocketService STOMP connection via the public
 * subscribeToTopic / unsubscribeFromTopic methods.
 *
 * Topics:
 *   /topic/page/{pageId}/members   — member & join-request events for a page
 *   /topic/user/{userId}/page-events — personal notifications for the current user
 */
class PageWebsocketService {
    subscribeToPageMembers(
        pageId: number,
        onEvent: (event: PageEvent) => void,
    ): void {
        const destination = `/topic/page/${pageId}/members`;
        chatWebsocketService.subscribeToTopic(destination, (body) => {
            try { onEvent(JSON.parse(body) as PageEvent); } catch { /* ignore malformed payload */ }
        });
    }

    unsubscribeFromPageMembers(pageId: number): void {
        chatWebsocketService.unsubscribeFromTopic(`/topic/page/${pageId}/members`);
    }

    subscribeToUserPageEvents(
        userId: number,
        onEvent: (event: PageEvent) => void,
    ): void {
        const destination = `/topic/user/${userId}/page-events`;
        chatWebsocketService.subscribeToTopic(destination, (body) => {
            try { onEvent(JSON.parse(body) as PageEvent); } catch { /* ignore malformed payload */ }
        });
    }

    unsubscribeFromUserPageEvents(userId: number): void {
        chatWebsocketService.unsubscribeFromTopic(`/topic/user/${userId}/page-events`);
    }
}

const pageWebsocketService = new PageWebsocketService();
export default pageWebsocketService;
