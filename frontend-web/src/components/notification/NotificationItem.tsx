import { Link } from "react-router-dom";
import type { Notification } from "../../types";
import { buildS3Url } from "../../utils/s3";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: () => void;
}

export default function NotificationItem({
  notification,
  onMarkAsRead
}: NotificationItemProps) {
  const primaryActorId = notification.actorIds && notification.actorIds.length > 0 ? notification.actorIds[0] : "";
  const avatarUrl = notification.metadata?.imageUrl || "/default-avatar.png";
  
  return (
    <div 
      onClick={() => {
        if (!notification.isRead && onMarkAsRead) {
          onMarkAsRead();
        }
      }}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer rounded-lg transition-colors ${
        !notification.isRead 
          ? "bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-50 dark:hover:bg-blue-900/30" 
          : "hover:bg-gray-50 dark:hover:bg-[#262626]"
      }`}
    >
      <Link
        to={`/profile/${primaryActorId}`}
        className="flex-shrink-0"
        onClick={(e) => e.stopPropagation()} 
      >
        <img
          src={avatarUrl.startsWith("http") ? avatarUrl : buildS3Url(avatarUrl)}
          alt="Avatar"
          className="w-11 h-11 rounded-full object-cover"
        />
      </Link>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] leading-[18px]">
          <span className="text-gray-900 dark:text-white">
            {notification.content || getNotificationText(notification.type)}
          </span>
          <br/>
          <span className={`text-xs ${!notification.isRead ? "text-blue-600 font-medium" : "text-gray-500"}`}>
            {formatDate(notification.createdAt)}
          </span>
        </p>
      </div>

      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0"></div>
      )}

      {notification.metadata?.deepLink && (
        <Link to={notification.metadata.deepLink} className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded text-xs font-medium">
            Xem
          </div>
        </Link>
      )}
    </div>
  );
}

function getNotificationText(type: string): string {
  switch (type) {
    case 'REACTION_POST': return 'Đã thích bài viết của bạn';
    case 'COMMENT_POST': return 'Đã bình luận bài viết của bạn';
    case 'FRIEND_REQUEST': return 'Đã gửi lời mời kết bạn';
    case 'FRIEND_ACCEPT': return 'Đã chấp nhận lời mời kết bạn';
    default: return 'Có thông báo mới';
  }
}

function formatDate(isoString: string): string {
  try {
    if (!isoString) return 'Gần đây';
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  } catch {
    return 'Gần đây';
  }
}
