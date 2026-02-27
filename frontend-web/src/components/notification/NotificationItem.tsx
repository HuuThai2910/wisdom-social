import { Link } from "react-router-dom";
import type { Notification } from "../../types";

interface NotificationItemProps {
    notification: Notification;
}

export default function NotificationItem({
    notification,
}: NotificationItemProps) {
    return (
        <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#262626] rounded-lg">
            <Link
                to={`/profile/${notification.user.username}`}
                className="flex-shrink-0"
            >
                <img
                    src={notification.user.avatar}
                    alt={notification.user.username}
                    className="w-11 h-11 rounded-full object-cover"
                />
            </Link>

            <div className="flex-1 min-w-0">
                <p className="text-[14px] leading-[18px]">
                    <Link
                        to={`/profile/${notification.user.username}`}
                        className="font-semibold hover:opacity-50 dark:text-white"
                    >
                        {notification.user.username}
                    </Link>{" "}
                    <span className="text-gray-900 dark:text-white">
                        {notification.text}
                    </span>{" "}
                    <span className="text-gray-500 dark:text-gray-400">
                        {notification.createdAt}
                    </span>
                </p>
            </div>

            {notification.post && (
                <Link
                    to={`/post/${notification.post.id}`}
                    className="flex-shrink-0"
                >
                    <img
                        src={notification.post.images[0]}
                        alt="Post"
                        className="w-11 h-11 object-cover"
                    />
                </Link>
            )}

            {notification.type === "follow" && (
                <button className="px-6 py-[7px] bg-[#0095f6] hover:bg-[#1877f2] text-white rounded-lg text-sm font-semibold flex-shrink-0">
                    Follow
                </button>
            )}
        </div>
    );
}
