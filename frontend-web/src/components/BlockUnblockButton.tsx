import { useState, useEffect } from "react";
import { Ban, Loader2 } from "lucide-react";
import userService from "../services/userService";
import { getCurrentUser } from "../utils/auth";

interface BlockUnblockButtonProps {
    userId: string;
    username: string;
}

export default function BlockUnblockButton({ userId, username }: BlockUnblockButtonProps) {
    const currentUser = getCurrentUser();
    const [isBlocked, setIsBlocked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        checkBlockStatus();
    }, [userId, currentUser]);

    const checkBlockStatus = async () => {
        if (!currentUser) {
            setChecking(false);
            return;
        }

        setChecking(true);
        try {
            // Get list of blocked users and check if this user is in it
            const blockedUsers = await userService.getBlockedUsers(currentUser.id);
            const blocked = blockedUsers.some((u) => u.id === userId);
            setIsBlocked(blocked);
        } catch (error) {
            console.error("Error checking block status:", error);
        } finally {
            setChecking(false);
        }
    };

    const handleBlockUnblock = async () => {
        if (!currentUser) {
            alert("Vui lòng đăng nhập để thực hiện hành động này");
            return;
        }

        const action = isBlocked ? "bỏ chặn" : "chặn";
        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn ${action} "${username}"?`
        );

        if (!confirmed) return;

        setLoading(true);
        try {
            const requestData = {
                senderId: currentUser.id,
                receiverId: userId,
            };

            if (isBlocked) {
                await userService.cancelBlockUser(requestData);
                setIsBlocked(false);
                alert(`Đã bỏ chặn "${username}" thành công!`);
            } else {
                await userService.blockUser(requestData);
                setIsBlocked(true);
                alert(`Đã chặn "${username}" thành công!`);
            }
        } catch (error: any) {
            console.error("Error block/unblock user:", error);
            alert(`Không thể ${action} user. Vui lòng thử lại.`);
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser) {
        return null;
    }

    if (checking) {
        return (
            <div className="px-4 py-[7px] bg-gray-200 dark:bg-[#363636] rounded-lg">
                <Loader2 className="animate-spin" size={16} />
            </div>
        );
    }

    return (
        <button
            onClick={handleBlockUnblock}
            disabled={loading}
            className={`px-4 py-[7px] rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 ${
                isBlocked
                    ? "bg-gray-500 hover:bg-gray-600 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
            }`}
        >
            {loading ? (
                <Loader2 className="animate-spin" size={16} />
            ) : (
                <Ban size={16} />
            )}
            {isBlocked ? "Unblock" : "Block"}
        </button>
    );
}
