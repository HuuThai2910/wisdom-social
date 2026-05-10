import apiClient from "@/api/apiClient";
import { clearStorage } from "@/utils/storage";

export async function logoutAllDevices(): Promise<{ success: boolean; message?: string }> {
    try {
        await apiClient.post("/auth/logout-all");
        await clearStorage();
        return { success: true };
    } catch (error: any) {
        const msg = error?.response?.data?.message || error?.message || '';
        return { success: false, message: msg || 'Không thể đăng xuất tất cả thiết bị.' };
    }
}

export async function requestAccountDeletion(): Promise<{
    success: boolean;
    message?: string;
    scheduledFor?: string;
    remainingDays?: number;
}> {
    try {
        const response = await apiClient.post("/auth/request-deletion");
        const data = response.data?.data ?? response.data;
        return {
            success: true,
            scheduledFor: data?.scheduledFor,
            remainingDays: data?.remainingDays ?? 30,
        };
    } catch (error: any) {
        const msg = error?.response?.data?.message || error?.message || '';
        return { success: false, message: msg || 'Không thể yêu cầu xóa tài khoản.' };
    }
}

export async function cancelAccountDeletion(): Promise<{ success: boolean; message?: string }> {
    try {
        await apiClient.post("/auth/cancel-deletion");
        return { success: true };
    } catch (error: any) {
        const msg = error?.response?.data?.message || error?.message || '';
        return { success: false, message: msg || 'Không thể hủy yêu cầu xóa tài khoản.' };
    }
}
