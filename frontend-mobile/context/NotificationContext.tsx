import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { useAppContext } from "./AppContext";
import chatWebsocketService from "@/services/chatWebsocketService";
import {
    getNotifications,
    getUnreadCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    type ServerNotification,
} from "@/services/notificationService";

type NotificationContextValue = {
    notifications: ServerNotification[];
    unreadCount: number;
    loading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    refresh: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(
    undefined,
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { currentUser } = useAppContext();
    const userId = currentUser?.id ? String(currentUser.id) : null;

    const [notifications, setNotifications] = useState<ServerNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!userId) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }
        setLoading(true);
        try {
            const [list, count] = await Promise.all([
                getNotifications(0, 50),
                getUnreadCount(),
            ]);
            setNotifications(list);
            setUnreadCount(count);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    // Realtime: subscribe to the user's notification topic (matches web)
    useEffect(() => {
        if (!userId) return;
        const destination = `/topic/user/${userId}/notifications`;
        let intervalId: ReturnType<typeof setInterval> | null = null;

        const handle = (body: string) => {
            try {
                const n: ServerNotification = JSON.parse(body);
                setNotifications((prev) =>
                    prev.some((x) => x.id === n.id)
                        ? prev
                        : [n, ...prev].slice(0, 50),
                );
                if (!n.isRead) setUnreadCount((c) => c + 1);
            } catch (e) {
                console.warn("Failed to parse notification event", e);
            }
        };

        const attempt = () => {
            if (chatWebsocketService.isConnected()) {
                chatWebsocketService.subscribeToTopic(destination, handle);
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            }
        };

        attempt();
        if (!chatWebsocketService.isConnected()) {
            intervalId = setInterval(attempt, 2000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
            chatWebsocketService.unsubscribeFromTopic(destination);
        };
    }, [userId]);

    const markAsRead = useCallback(async (id: string) => {
        const ok = await markNotificationAsRead(id);
        if (ok) {
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
            );
            setUnreadCount((c) => Math.max(0, c - 1));
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        const ok = await markAllNotificationsAsRead();
        if (ok) {
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
        }
    }, []);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                loading,
                markAsRead,
                markAllAsRead,
                refresh,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = (): NotificationContextValue => {
    const ctx = useContext(NotificationContext);
    if (!ctx) {
        throw new Error(
            "useNotifications must be used within a NotificationProvider",
        );
    }
    return ctx;
};
