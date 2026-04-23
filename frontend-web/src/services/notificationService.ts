import axios from "axios";
import type { ApiResponse, Notification } from "../types";

const API_URL = "http://localhost:8080/api/notifications";

export const getNotifications = async (
  page: number = 0,
  size: number = 20
): Promise<Notification[]> => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return [];

    const response = await axios.get<ApiResponse<Notification[]>>(`${API_URL}?page=${page}&size=${size}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
};

export const getUnreadCount = async (): Promise<number> => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return 0;

    const response = await axios.get<ApiResponse<number>>(`${API_URL}/unread-count`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data.success && response.data.data !== null) {
      return response.data.data;
    }
    return 0;
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }
};

export const markAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return false;

    const response = await axios.put<ApiResponse<void>>(`${API_URL}/${notificationId}/read`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.success;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
};
