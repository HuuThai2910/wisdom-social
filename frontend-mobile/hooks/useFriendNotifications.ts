import { useEffect, useRef, useState } from "react";
import type { ApiAuthUser } from "@/services/authService";
import chatWebsocketService from "@/services/chatWebsocketService";
import friendWebsocketService, { type FriendEvent } from "@/services/friendWebsocketService";
import { getUser } from "@/utils/storage";

function toInternationalPhone(phone: string): string {
    if (!phone) return phone;
    if (phone.startsWith("+84")) return phone;
    if (phone.startsWith("0")) return "+84" + phone.substring(1);
    if (/^\d{9,10}$/.test(phone)) return "+84" + phone;
    return phone;
}

/**
 * Subscribes to all friend WebSocket events for the current user.
 * Returns a refreshTrigger counter that increments on each event —
 * components depending on friend data should include it in their
 * useEffect deps to auto-reload when another platform triggers a change.
 */
export function useFriendNotifications(
    onEvent?: (event: FriendEvent) => void,
): number {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const onEventRef = useRef(onEvent);
    onEventRef.current = onEvent;

    useEffect(() => {
        let phone: string | null = null;
        let cancelled = false;

        const setup = async () => {
            const storedUser = await getUser<ApiAuthUser>();
            if (cancelled || !storedUser?.phone) return;

            phone = toInternationalPhone(storedUser.phone);

            try {
                await chatWebsocketService.connect();
            } catch {
                // connect() may throw if all candidates fail; subscriptions are
                // still registered and will be synced on the next reconnect.
            }

            friendWebsocketService.subscribeToUserFriendEvents(phone, (event) => {
                setRefreshTrigger((n) => n + 1);
                onEventRef.current?.(event);
            });
        };

        void setup();

        return () => {
            cancelled = true;
            if (phone) {
                friendWebsocketService.unsubscribeFromUserFriendEvents(phone);
            }
        };
    }, []);

    return refreshTrigger;
}
