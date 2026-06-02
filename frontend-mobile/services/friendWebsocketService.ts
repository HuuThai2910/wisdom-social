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
    private listenersByPhone = new Map<string, Set<(event: FriendEvent) => void>>();

    subscribeToUserFriendEvents(
        phone: string,
        onEvent: (event: FriendEvent) => void,
    ): void {
        const listeners = this.listenersByPhone.get(phone) ?? new Set();
        listeners.add(onEvent);
        this.listenersByPhone.set(phone, listeners);

        if (listeners.size > 1) return;

        this.EVENT_TYPES.forEach((eventType) => {
            const destination = `/topic/user/${phone}/${eventType}`;
            chatWebsocketService.subscribeToTopic(destination, (body) => {
                const phoneListeners = this.listenersByPhone.get(phone);
                if (!phoneListeners?.size) return;

                try {
                    const parsed = JSON.parse(body) as FriendEvent;
                    phoneListeners.forEach((listener) =>
                        listener({ ...parsed, eventType }),
                    );
                } catch {
                    phoneListeners.forEach((listener) => listener({ eventType }));
                }
            });
        });
    }

    unsubscribeFromUserFriendEvents(
        phone: string,
        onEvent?: (event: FriendEvent) => void,
    ): void {
        const listeners = this.listenersByPhone.get(phone);
        if (listeners && onEvent) {
            listeners.delete(onEvent);
            if (listeners.size > 0) return;
        }

        this.listenersByPhone.delete(phone);
        this.EVENT_TYPES.forEach((eventType) => {
            chatWebsocketService.unsubscribeFromTopic(`/topic/user/${phone}/${eventType}`);
        });
    }
}

const friendWebsocketService = new FriendWebsocketService();
export default friendWebsocketService;
