import NotificationItem from "../components/notification/NotificationItem";
import { mockNotifications } from "../api/mockData";

export default function Notifications() {
    return (
        <div className="max-w-[600px] mx-auto bg-white dark:bg-[#000] border border-gray-200 dark:border-[#262626] rounded-lg">
            <div className="p-6">
                <h1 className="text-xl font-semibold mb-6 dark:text-white">
                    Notifications
                </h1>
                <div className="space-y-1">
                    {mockNotifications.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
