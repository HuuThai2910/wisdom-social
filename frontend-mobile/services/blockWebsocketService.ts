import chatWebsocketService from "@/services/chatWebsocketService";

export type BlockEventType = "save-block" | "cancel-block";

export type BlockEvent = {
    eventType: BlockEventType;
    blockerId?: number;
    blockedId?: number;
    timestamp?: string;
};

/**
 * Subscribes to real-time block events for a user.
 * Reuses the existing ChatWebsocketService STOMP connection.
 *
 * Topics (keyed by phone):
 *   /topic/user/{phone}/save-block
 *   /topic/user/{phone}/cancel-block
 */
class BlockWebsocketService {
    private readonly EVENT_TYPES: BlockEventType[] = ["save-block", "cancel-block"];

    subscribeToUserBlockEvents(
        phone: string,
        onEvent: (event: BlockEvent) => void,
    ): void {
        this.EVENT_TYPES.forEach((eventType) => {
            const destination = `/topic/user/${phone}/${eventType}`;
            chatWebsocketService.subscribeToTopic(destination, (body) => {
                try {
                    const parsed = JSON.parse(body) as BlockEvent;
                    onEvent({ ...parsed, eventType });
                } catch {
                    onEvent({ eventType });
                }
            });
        });
    }

    unsubscribeFromUserBlockEvents(phone: string): void {
        this.EVENT_TYPES.forEach((eventType) => {
            chatWebsocketService.unsubscribeFromTopic(`/topic/user/${phone}/${eventType}`);
        });
    }
}

const blockWebsocketService = new BlockWebsocketService();
export default blockWebsocketService;
