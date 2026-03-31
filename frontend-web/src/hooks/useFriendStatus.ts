import { useState, useLayoutEffect, useCallback } from "react";
import friendService from "../services/friendService";
import { useCurrentUser } from "./useCurrentUser";
import { useFriendDataOptional } from "./useFriendDataOptional";
import type { User } from "../types";

export type FriendshipStatus = "loading" | "none" | "pending_sent" | "pending_received" | "friends";

interface UseFriendStatusResult {
    status: FriendshipStatus;
    loading: boolean;
    error: string | null;
    sendRequest: () => Promise<boolean>;
    acceptRequest: () => Promise<boolean>;
    rejectRequest: () => Promise<boolean>;
    cancelRequest: () => Promise<boolean>;
    unfriend: () => Promise<boolean>;
    refresh: () => Promise<void>;
}

export function useFriendStatus(targetUserId: number | undefined): UseFriendStatusResult {
    const currentUser = useCurrentUser();
    const [status, setStatus] = useState<FriendshipStatus>("loading");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [manualRefreshCount, setManualRefreshCount] = useState(0);
    const [hasCompletedInitialCheck, setHasCompletedInitialCheck] = useState(false);
    
    // Only get refreshTrigger from context for WebSocket updates
    const { refreshTrigger } = useFriendDataOptional();

    // Check friendship status by loading ALL data from API first
    useLayoutEffect(() => {
        let cancelled = false;
        
        const checkStatus = async () => {
            // Reset to loading state when starting a new check
            if (!cancelled) {
                setStatus("loading");
                setHasCompletedInitialCheck(false);
            }
            
            console.log(`🔍 [useFriendStatus] Starting check for user ${targetUserId}`);
            
            if (!currentUser?.id || !targetUserId) {
                if (!cancelled) {
                    console.log(`🔍 [useFriendStatus] No user IDs, setting status to "none"`);
                    setStatus("none");
                    setHasCompletedInitialCheck(true);
                }
                return;
            }

            // Don't check if viewing own profile
            if (currentUser.id === targetUserId) {
                if (!cancelled) {
                    console.log(`🔍 [useFriendStatus] Viewing own profile, setting status to "none"`);
                    setStatus("none");
                    setHasCompletedInitialCheck(true);
                }
                return;
            }

            try {
                console.log(`🔍 [useFriendStatus] Loading data from API...`);
                // Load ALL data in parallel - this prevents flicker
                const [friends, receivedRequests, sentRequests] = await Promise.all([
                    friendService.getFriends(currentUser.id),
                    friendService.getFriendRequests(currentUser.id),
                    friendService.getSentRequests(currentUser.id),
                ]);
                
                if (cancelled) {
                    console.log(`🔍 [useFriendStatus] Effect cancelled, not updating state`);
                    return;
                }
                
                console.log(`🔍 [useFriendStatus] API data loaded:`, {
                    friendsCount: friends.length,
                    receivedRequestsCount: receivedRequests.length,
                    sentRequestsCount: sentRequests.length,
                });
                
                // Now check in order of priority
                
                // 1. Check if they are friends
                const isFriend = friends.some((f: User) => f.id === targetUserId);
                if (isFriend) {
                    console.log(`🔍 [useFriendStatus] ✅ Found in friends list, setting status to "friends"`);
                    setStatus("friends");
                    setHasCompletedInitialCheck(true);
                    return;
                }
                
                // 2. Check if they sent us a request
                const hasReceivedRequest = receivedRequests.some((u: User) => u.id === targetUserId);
                if (hasReceivedRequest) {
                    console.log(`🔍 [useFriendStatus] ✅ Found in received requests, setting status to "pending_received"`);
                    setStatus("pending_received");
                    setHasCompletedInitialCheck(true);
                    return;
                }

                // 3. Check if WE sent a request to them
                const hasSentRequest = sentRequests.some((u: User) => u.id === targetUserId);
                if (hasSentRequest) {
                    console.log(`🔍 [useFriendStatus] ✅ Found in sent requests, setting status to "pending_sent"`);
                    setStatus("pending_sent");
                    setHasCompletedInitialCheck(true);
                    return;
                }

                // 4. No relationship found
                console.log(`🔍 [useFriendStatus] ❌ No relationship found, setting status to "none"`);
                setStatus("none");
                setHasCompletedInitialCheck(true);
            } catch (err) {
                console.error("Error checking friendship status:", err);
                if (!cancelled) {
                    setError("Không thể kiểm tra trạng thái bạn bè");
                    setStatus("none");
                    setHasCompletedInitialCheck(true);
                }
            }
        };

        checkStatus();
        
        return () => {
            cancelled = true;
        };
    }, [currentUser?.id, targetUserId, refreshTrigger, manualRefreshCount]);

    // Send friend request
    const sendRequest = useCallback(async (): Promise<boolean> => {
        if (!currentUser?.id || !targetUserId) return false;

        setLoading(true);
        setError(null);
        try {
            await friendService.sendFriendRequest({
                senderId: currentUser.id,
                receivedId: targetUserId,
            });
            setStatus("pending_sent");
            return true;
        } catch (err: any) {
            console.error("Error sending friend request:", err);
            setError("Không thể gửi lời mời kết bạn");
            return false;
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id, targetUserId]);

    // Accept friend request
    const acceptRequest = useCallback(async (): Promise<boolean> => {
        if (!currentUser?.id || !targetUserId) return false;

        setLoading(true);
        setError(null);
        try {
            await friendService.acceptFriendRequest({
                senderId: targetUserId,
                receivedId: currentUser.id,
            });
            setStatus("friends");
            return true;
        } catch (err: any) {
            console.error("Error accepting friend request:", err);
            setError("Không thể chấp nhận lời mời");
            return false;
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id, targetUserId]);

    // Reject friend request
    const rejectRequest = useCallback(async (): Promise<boolean> => {
        if (!currentUser?.id || !targetUserId) return false;

        setLoading(true);
        setError(null);
        try {
            await friendService.rejectFriendRequest({
                senderId: targetUserId,
                receivedId: currentUser.id,
            });
            setStatus("none");
            return true;
        } catch (err: any) {
            console.error("Error rejecting friend request:", err);
            setError("Không thể từ chối lời mời");
            return false;
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id, targetUserId]);

    // Cancel sent request
    const cancelRequest = useCallback(async (): Promise<boolean> => {
        if (!currentUser?.id || !targetUserId) return false;

        setLoading(true);
        setError(null);
        try {
            await friendService.cancelFriendRequest({
                senderId: currentUser.id,
                receivedId: targetUserId,
            });
            setStatus("none");
            return true;
        } catch (err: any) {
            console.error("Error canceling friend request:", err);
            setError("Không thể hủy lời mời");
            return false;
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id, targetUserId]);

    // Unfriend
    const unfriend = useCallback(async (): Promise<boolean> => {
        if (!currentUser?.id || !targetUserId) return false;

        setLoading(true);
        setError(null);
        try {
            await friendService.cancelFriendRequest({
                senderId: currentUser.id,
                receivedId: targetUserId,
            });
            setStatus("none");
            return true;
        } catch (err: any) {
            console.error("Error unfriending:", err);
            setError("Không thể hủy kết bạn");
            return false;
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id, targetUserId]);

    // Refresh status - triggers re-run of useEffect
    const refresh = useCallback(async () => {
        setStatus("loading");
        setManualRefreshCount(c => c + 1);
    }, []);

    return {
        status,
        loading,
        error,
        sendRequest,
        acceptRequest,
        rejectRequest,
        cancelRequest,
        unfriend,
        refresh,
    };
}

export default useFriendStatus;
