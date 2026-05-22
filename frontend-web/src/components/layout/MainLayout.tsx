import { Outlet, useLocation } from "react-router-dom";
import { useState, useCallback, useEffect } from "react";
import Sidebar from "../nav/Sidebar";
import BottomNav from "../nav/BottomNav";
import { Link } from "react-router-dom";
import { Loader2, UserPlus, Check } from "lucide-react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useForceLogout } from "../../hooks/useForceLogout";
import { useAvatarBuster } from "../../context/AvatarContext";
import { FriendNotificationProvider } from "../../contexts/FriendNotificationContext";
import {
    FriendDataProvider,
    useFriendData,
} from "../../contexts/FriendDataContext";
import { buildS3Url } from "../../utils/s3";
import { useSidebarLayout } from "../../hooks/useSidebarLayout";
import friendService from "../../services/friendService";
import type { User } from "../../types";

type Suggestion = User & { mutualFriendsCount?: number };

// Inner component that uses FriendDataContext
function MainLayoutContent() {
    const location = useLocation();
    const currentUser = useCurrentUser();
    const avatarBuster = useAvatarBuster();
    const { sidebarWidth } = useSidebarLayout();
    const [isRightSidebarExpanded, setIsRightSidebarExpanded] = useState(false);
    const isMessagesRoute = location.pathname.startsWith("/messages");

    // Lắng nghe force-logout event từ backend (khi logoutAllDevices được gọi từ thiết bị khác)
    useForceLogout(currentUser?.phone);

    // Friend suggestions for the right sidebar
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [sentIds, setSentIds] = useState<Set<number>>(new Set());
    const [sendingId, setSendingId] = useState<number | null>(null);

    // Friend events trigger a refresh — keeps suggestions in sync when a
    // request is accepted/rejected/canceled by either side. Granular: we
    // only refetch this small list, never reload the page.
    const { refreshTrigger } = useFriendData();

    useEffect(() => {
        const id = currentUser?.id;
        if (!id) return;
        let cancelled = false;
        setSuggestionsLoading(true);
        friendService
            .getFriendSuggestions(id, 8)
            .then((list) => {
                if (cancelled) return;
                setSuggestions(list as Suggestion[]);
                // Drop stale "sent" marks for users no longer in the list.
                setSentIds((prev) => {
                    const valid = new Set<number>();
                    const ids = new Set(list.map((u) => u.id));
                    prev.forEach((id) => {
                        if (ids.has(id)) valid.add(id);
                    });
                    return valid;
                });
            })
            .finally(() => {
                if (!cancelled) setSuggestionsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [currentUser?.id, refreshTrigger]);

    const handleSendRequest = async (targetId: number) => {
        if (!currentUser?.id) return;
        setSendingId(targetId);
        try {
            await friendService.sendFriendRequest({
                senderId: currentUser.id,
                receivedId: targetId,
            });
            setSentIds((prev) => new Set(prev).add(targetId));
        } catch (err) {
            console.error("Error sending friend request:", err);
        } finally {
            setSendingId(null);
        }
    };

    console.log(
        "🔴 MainLayoutContent re-render with currentUser:",
        currentUser,
    );

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#000]">
            {/* Sidebar for desktop */}
            <Sidebar />

            {/* Main Content */}
            <main
                className="min-h-screen pb-16 md:pb-0 xl:mr-[72px]"
                style={{ marginLeft: `${sidebarWidth}px` }}
            >
                <div className="max-w-[975px] mx-auto pt-6 px-8 md:px-12">
                    <Outlet />
                </div>
            </main>

            {/* Right Panel for desktop - Suggestions */}
            {!isMessagesRoute && (
                <aside
                    className={`hidden xl:block fixed right-0 top-0 h-screen overflow-y-auto pt-8 bg-white dark:bg-black border-l border-gray-200 dark:border-[#262626] transition-[width] duration-300 ease-in-out z-40 ${
                        isRightSidebarExpanded
                            ? "w-[383px] px-12"
                            : "w-[72px] px-3"
                    }`}
                    onMouseEnter={() => setIsRightSidebarExpanded(true)}
                    onMouseLeave={() => setIsRightSidebarExpanded(false)}
                >
                    <div className="space-y-6 pt-2">
                        {/* Current User */}
                        {currentUser && (
                            <Link
                                to={`/profile/${currentUser.username}`}
                                className="flex items-center gap-3 py-2 overflow-hidden"
                            >
                                <img
                                    src={
                                        buildS3Url(currentUser.avatarUrl) +
                                        `?bust=${avatarBuster}`
                                    }
                                    alt={currentUser.username}
                                    className="w-11 h-11 rounded-full shrink-0"
                                />
                                <div
                                    className={`flex-1 min-w-0 transition-all duration-200 ${
                                        isRightSidebarExpanded
                                            ? "opacity-100 delay-75"
                                            : "opacity-0 w-0 invisible"
                                    }`}
                                >
                                    <p className="text-sm font-semibold truncate dark:text-white">
                                        {currentUser.username}
                                    </p>
                                    <p className="text-sm text-gray-500 truncate">
                                        {currentUser.fullName}
                                    </p>
                                </div>
                            </Link>
                        )}

                        {/* Friend suggestions */}
                        <div className={isRightSidebarExpanded ? "" : "hidden"}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                                    Gợi ý kết bạn
                                </h2>
                                <Link
                                    to="/friend-requests"
                                    className="text-xs font-semibold hover:text-gray-500 dark:text-white dark:hover:text-gray-400"
                                >
                                    Xem tất cả
                                </Link>
                            </div>

                            {suggestionsLoading ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="animate-spin text-blue-500" size={20} />
                                </div>
                            ) : suggestions.length === 0 ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400 py-4">
                                    Không có gợi ý
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {suggestions.map((user) => {
                                        const sent = sentIds.has(user.id);
                                        return (
                                            <div
                                                key={user.id}
                                                className="flex items-center justify-between gap-2"
                                            >
                                                <Link
                                                    to={`/profile/${user.username}`}
                                                    className="flex items-center gap-3 flex-1 min-w-0"
                                                >
                                                    <img
                                                        src={
                                                            buildS3Url(user.avatarUrl) ||
                                                            user.avatarUrl ||
                                                            "https://i.pravatar.cc/150"
                                                        }
                                                        alt={user.username}
                                                        className="w-11 h-11 rounded-full shrink-0 object-cover"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold truncate dark:text-white">
                                                            {user.username}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                            {user.mutualFriendsCount && user.mutualFriendsCount > 0
                                                                ? `${user.mutualFriendsCount} bạn chung`
                                                                : user.fullName || user.name || "Gợi ý cho bạn"}
                                                        </p>
                                                    </div>
                                                </Link>
                                                <button
                                                    onClick={() => handleSendRequest(user.id)}
                                                    disabled={sent || sendingId === user.id}
                                                    className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                                                        sent
                                                            ? "bg-gray-100 dark:bg-[#262626] text-green-500"
                                                            : "bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-60"
                                                    }`}
                                                    title={sent ? "Đã gửi lời mời" : "Kết bạn"}
                                                >
                                                    {sendingId === user.id ? (
                                                        <Loader2 className="animate-spin" size={14} />
                                                    ) : sent ? (
                                                        <Check size={14} />
                                                    ) : (
                                                        <UserPlus size={14} />
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer Links */}
                        <div
                            className={`pt-6 ${isRightSidebarExpanded ? "" : "hidden"}`}
                        >
                            <div className="text-xs text-gray-400 space-y-3">
                                <div className="flex flex-wrap gap-x-1 gap-y-1">
                                    <a
                                        href="#"
                                        className="hover:underline after:content-['·'] after:mx-1 last:after:content-['']"
                                    >
                                        About
                                    </a>
                                    <a
                                        href="#"
                                        className="hover:underline after:content-['·'] after:mx-1 last:after:content-['']"
                                    >
                                        Help
                                    </a>
                                    <a
                                        href="#"
                                        className="hover:underline after:content-['·'] after:mx-1 last:after:content-['']"
                                    >
                                        Press
                                    </a>
                                    <span>·</span>
                                    <a href="#" className="hover:underline">
                                        API
                                    </a>
                                    <span>·</span>
                                    <a href="#" className="hover:underline">
                                        Jobs
                                    </a>
                                    <span>·</span>
                                    <a href="#" className="hover:underline">
                                        Privacy
                                    </a>
                                    <span>·</span>
                                    <a href="#" className="hover:underline">
                                        Terms
                                    </a>
                                </div>
                                <p className="text-gray-400">© 2026 SOCIAL</p>
                            </div>
                        </div>
                    </div>
                </aside>
            )}

            {/* Bottom Navigation for mobile */}
            <BottomNav />
        </div>
    );
}

// Wrapper component that connects notifications to data refresh
function MainLayoutWithNotifications() {
    const { triggerRefreshAll } = useFriendData();

    // Callback khi nhận friend request mới - auto refresh danh sách
    const handleFriendRequest = useCallback(() => {
        console.log("📬 New friend request notification - refreshing list...");
        triggerRefreshAll();
    }, [triggerRefreshAll]);

    // Callback khi friend request được accept - refresh cả 2 list
    const handleFriendAccept = useCallback(() => {
        console.log("✅ Friend request accepted - refreshing both lists...");
        triggerRefreshAll();
    }, [triggerRefreshAll]);

    // Callback khi friend request bị reject
    const handleFriendReject = useCallback(() => {
        console.log("❌ Friend request rejected - refreshing requests...");
        triggerRefreshAll();
    }, [triggerRefreshAll]);

    // Callback khi friend request bị cancel hoặc unfriend
    const handleFriendCancel = useCallback(() => {
        console.log("🚫 Friend canceled - refreshing both lists...");
        triggerRefreshAll();
    }, [triggerRefreshAll]);

    return (
        <FriendNotificationProvider
            onFriendRequest={handleFriendRequest}
            onFriendAccept={handleFriendAccept}
            onFriendReject={handleFriendReject}
            onFriendCancel={handleFriendCancel}
        >
            <MainLayoutContent />
        </FriendNotificationProvider>
    );
}

// Main export - provides FriendDataContext first
export default function MainLayout() {
    return (
        <FriendDataProvider>
            <MainLayoutWithNotifications />
        </FriendDataProvider>
    );
}
