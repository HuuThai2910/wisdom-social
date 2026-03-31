import { createContext, useContext, ReactNode, useRef, useEffect } from "react";
import { useFriendNotifications, type FriendNotificationPayload } from "../hooks/useFriendNotifications";

interface FriendNotificationContextType {
    currentUserPhone?: string;
    isConnected: boolean;
}

const FriendNotificationContext = createContext<FriendNotificationContextType>({
    isConnected: false,
});

interface FriendNotificationProviderProps {
    children: ReactNode;
    onFriendRequest?: (payload: FriendNotificationPayload) => void;
    onFriendAccept?: (payload: FriendNotificationPayload) => void;
    onFriendReject?: (payload: FriendNotificationPayload) => void;
    onFriendCancel?: (payload: FriendNotificationPayload) => void;
}

export function FriendNotificationProvider({
    children,
    onFriendRequest,
    onFriendAccept,
    onFriendReject,
    onFriendCancel,
}: FriendNotificationProviderProps) {
    // Use refs to always have the latest callbacks
    const callbacksRef = useRef({
        onFriendRequest,
        onFriendAccept,
        onFriendReject,
        onFriendCancel,
    });

    // Update refs when callbacks change
    useEffect(() => {
        callbacksRef.current = {
            onFriendRequest,
            onFriendAccept,
            onFriendReject,
            onFriendCancel,
        };
    }, [onFriendRequest, onFriendAccept, onFriendReject, onFriendCancel]);

    // Wrapper callbacks that use refs
    const handleFriendRequest = (payload: FriendNotificationPayload) => {
        console.log("🔔 FriendNotificationProvider: onFriendRequest triggered");
        callbacksRef.current.onFriendRequest?.(payload);
    };

    const handleFriendAccept = (payload: FriendNotificationPayload) => {
        console.log("🔔 FriendNotificationProvider: onFriendAccept triggered");
        callbacksRef.current.onFriendAccept?.(payload);
    };

    const handleFriendReject = (payload: FriendNotificationPayload) => {
        console.log("🔔 FriendNotificationProvider: onFriendReject triggered");
        callbacksRef.current.onFriendReject?.(payload);
    };

    const handleFriendCancel = (payload: FriendNotificationPayload) => {
        console.log("🔔 FriendNotificationProvider: onFriendCancel triggered");
        callbacksRef.current.onFriendCancel?.(payload);
    };

    const { currentUserPhone, isConnected } = useFriendNotifications({
        onFriendRequest: handleFriendRequest,
        onFriendAccept: handleFriendAccept,
        onFriendReject: handleFriendReject,
        onFriendCancel: handleFriendCancel,
        showToasts: true,
    });

    return (
        <FriendNotificationContext.Provider value={{ currentUserPhone, isConnected }}>
            {children}
        </FriendNotificationContext.Provider>
    );
}

export function useFriendNotificationContext() {
    return useContext(FriendNotificationContext);
}

export default FriendNotificationProvider;
