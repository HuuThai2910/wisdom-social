import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserX, Loader2, AlertCircle } from "lucide-react";
import friendService from "../services/friendService";
import type { User } from "../types";
import { useCurrentUser } from "../hooks/useCurrentUser";

export default function BlockedUsers() {
    const currentUser = useCurrentUser();
    const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [unblockingUserId, setUnblockingUserId] = useState<Number | null>(null);

    useEffect(() => {
        if (currentUser) {
            loadBlockedUsers();
        }
    }, [currentUser]);

    const loadBlockedUsers = async () => {
        if (!currentUser) return;

        setLoading(true);
        setError("");
        try {
            const blocked = await friendService.getBlockedUsers(currentUser.id);
            setBlockedUsers(blocked);
        } catch (err: any) {
            console.error("Error loading blocked users:", err);
            setError("Không thể tải danh sách users bị chặn. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    const handleUnblockUser = async (userId: number, username: string) => {
        if (!currentUser) return;

        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn bỏ chặn "${username}"?`
        );

        if (!confirmed) return;

        setUnblockingUserId(userId);
        try {
            await friendService.unblockUser({
                senderId: currentUser.id,
                receivedId: userId,
            });

            // Remove from list
            setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
            alert(`Đã bỏ chặn "${username}" thành công!`);
        } catch (err: any) {
            console.error("Error unblocking user:", err);
            alert("Không thể bỏ chặn user. Vui lòng thử lại.");
        } finally {
            setUnblockingUserId(null);
        }
    };

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-white dark:bg-[#000] flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">
                    Vui lòng đăng nhập để xem danh sách users bị chặn
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-[#000] flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[#000]">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-[#262626] sticky top-0 bg-white dark:bg-[#000] z-10">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold dark:text-white">Blocked Users</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Quản lý danh sách users bạn đã chặn
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 py-6">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                {blockedUsers.length === 0 && !loading ? (
                    <div className="bg-white dark:bg-[#121212] rounded-lg border border-gray-200 dark:border-[#262626] p-12 text-center">
                        <UserX size={48} className="mx-auto text-gray-400 mb-4" />
                        <h2 className="text-lg font-semibold dark:text-white mb-2">
                            Không có ai bị chặn
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Bạn chưa chặn user nào
                        </p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-[#121212] rounded-lg border border-gray-200 dark:border-[#262626]">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#262626]">
                            <h2 className="text-lg font-semibold dark:text-white">
                                Users bị chặn ({blockedUsers.length})
                            </h2>
                        </div>

                        <div className="divide-y divide-gray-200 dark:divide-[#262626]">
                            {blockedUsers.map((user) => (
                                <div
                                    key={user.id.toString()}
                                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <img
                                            src={user.avatarUrl || "https://i.pravatar.cc/150"}
                                            alt={user.username}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <Link
                                                to={`/profile/${user.username}`}
                                                className="font-semibold dark:text-white hover:underline"
                                            >
                                                {user.username}
                                            </Link>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {user.fullName || user.name}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleUnblockUser(user.id, user.username)}
                                        disabled={unblockingUserId === user.id}
                                        className="ml-4 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {unblockingUserId === user.id ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="animate-spin" size={16} />
                                                Unblocking...
                                            </span>
                                        ) : (
                                            "Unblock"
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
