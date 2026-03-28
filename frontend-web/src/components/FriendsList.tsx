import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, Loader2, AlertCircle } from "lucide-react";
import userService from "../services/userService";
import type { User } from "../types";

interface FriendsListProps {
    userId: string;
}

export default function FriendsList({ userId }: FriendsListProps) {
    const [friends, setFriends] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadFriends();
    }, [userId]);

    const loadFriends = async () => {
        setLoading(true);
        setError("");
        try {
            const friendsList = await userService.getAllForUser(userId);
            setFriends(friendsList);
        } catch (err: any) {
            console.error("Error loading friends:", err);
            setError("Không thể tải danh sách bạn bè. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle size={20} />
                <span>{error}</span>
            </div>
        );
    }

    if (friends.length === 0) {
        return (
            <div className="bg-white dark:bg-[#121212] rounded-lg border border-gray-200 dark:border-[#262626] p-8 text-center">
                <Users size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold dark:text-white mb-2">
                    Chưa có bạn bè
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    User này chưa có bạn bè nào
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#121212] rounded-lg border border-gray-200 dark:border-[#262626]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#262626]">
                <h2 className="text-lg font-semibold dark:text-white">
                    Bạn bè ({friends.length})
                </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-6">
                {friends.map((friend) => (
                    <Link
                        key={friend.id}
                        to={`/profile/${friend.username}`}
                        className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors border border-gray-200 dark:border-[#262626]"
                    >
                        <img
                            src={friend.avatar || "https://i.pravatar.cc/150"}
                            alt={friend.username}
                            className="w-20 h-20 rounded-full object-cover mb-3"
                        />
                        <p className="font-semibold dark:text-white text-center truncate w-full">
                            {friend.username}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center truncate w-full">
                            {friend.fullName || friend.name}
                        </p>
                        {friend.followersCount !== undefined && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {friend.followersCount} followers
                            </p>
                        )}
                    </Link>
                ))}
            </div>
        </div>
    );
}
