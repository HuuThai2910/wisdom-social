import chatWebsocketService from "@/services/chatWebsocketService";

export type FriendEventType =
    | "friend-request"
    | "friend-accept"
    | "friend-reject"
    | "friend-cancel";

export type FriendEvent = {
    eventType: FriendEventType;
    senderId?: number;
    receiverId?: number;
    timestamp?: string;
};

/**
 * Subscribes to real-time friend events for a user.
 * Reuses the existing ChatWebsocketService STOMP connection.
 *
 * Topics (keyed by phone):
 *   /topic/user/{phone}/friend-request
 *   /topic/user/{phone}/friend-accept
 *   /topic/user/{phone}/friend-reject
 *   /topic/user/{phone}/friend-cancel
 */
class FriendWebsocketService {
    private readonly EVENT_TYPES: FriendEventType[] = [
        "friend-request",
        "friend-accept",
        "friend-reject",
        "friend-cancel",
    ];

    subscribeToUserFriendEvents(
        phone: string,
        onEvent: (event: FriendEvent) => void,
    ): void {
        this.EVENT_TYPES.forEach((eventType) => {
            const destination = `/topic/user/${phone}/${eventType}`;
            chatWebsocketService.subscribeToTopic(destination, (body) => {
                try {
                    const parsed = JSON.parse(body) as FriendEvent;
                    onEvent({ ...parsed, eventType });
                } catch {
                    onEvent({ eventType });
                }
            });
        });
    }

    unsubscribeFromUserFriendEvents(phone: string): void {
        this.EVENT_TYPES.forEach((eventType) => {
            chatWebsocketService.unsubscribeFromTopic(`/topic/user/${phone}/${eventType}`);
        });
    }
}

const friendWebsocketService = new FriendWebsocketService();
export default friendWebsocketService;
