import { useState, useEffect, useCallback } from "react";
import { useCurrentUser } from "./useCurrentUser";
import websocketService from "../services/websocket";
import { getNotifications, getUnreadCount, markAsRead as markAsReadApi } from "../services/notificationService";
import type { Notification } from "../types";

export function useNotifications() {
  const currentUser = useCurrentUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!currentUser?.id) return;
      
      setLoading(true);
      try {
        const [fetchedNotifications, count] = await Promise.all([
          getNotifications(0, 20),
          getUnreadCount()
        ]);
        
        setNotifications(fetchedNotifications);
        setUnreadCount(count);
      } catch (error) {
        console.error("Failed to fetch initial notifications data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [currentUser?.id]);

  // Handle WebSocket subscription
  useEffect(() => {
    if (!currentUser?.id) return;

    // Use string representation of ID for topics as backend uses ID in topic
    const userId = currentUser.id.toString();
    const destination = `/topic/user/${userId}/notifications`;

    const handleNewNotification = (notification: Notification) => {
      console.log("Received new notification:", notification);
      
      // Update state
      setNotifications((prev) => {
        // Prevent duplicates
        if (prev.some(n => n.id === notification.id)) return prev;
        return [notification, ...prev].slice(0, 50); // Keep max 50 items in state to match ZSET limit
      });
      
      // Increase unread count
      if (!notification.isRead) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    // Ensure websocket is connected before subscribing
    const setupWebSocket = async () => {
      try {
        if (!websocketService.isConnected()) {
          await websocketService.connect();
        }
        websocketService.subscribeToTopic(destination, handleNewNotification);
      } catch (error) {
        console.error("Error setting up WebSocket for notifications:", error);
      }
    };

    setupWebSocket();

    // Cleanup
    return () => {
      websocketService.unsubscribeFromTopic(destination);
    };
  }, [currentUser?.id]);

  // Mark a single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistic update
    setNotifications((prev) => 
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    
    setUnreadCount((prev) => Math.max(0, prev - 1));

    // API Call
    const success = await markAsReadApi(notificationId);
    if (!success) {
      // Revert if failed (optional, depending on UX strictness)
      console.error("Failed to mark notification as read");
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
  };
}

export default useNotifications;
