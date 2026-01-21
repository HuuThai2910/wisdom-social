import { useParams } from "react-router-dom";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileTabs from "../components/profile/ProfileTabs";
import { mockUsers } from "../api/mockData";
import { Settings, Shield, Bell, Lock, HelpCircle, Info } from "lucide-react";

export default function ProfileAccount() {
    const { username } = useParams();
    const user = mockUsers.find((u) => u.username === username);

    if (!user) {
        return (
            <div className="p-4 text-center dark:text-white">
                User not found
            </div>
        );
    }

    const settingsOptions = [
        {
            icon: Settings,
            title: "Edit Profile",
            description: "Name, bio, avatar",
            action: "Edit",
        },
        {
            icon: Shield,
            title: "Privacy and Security",
            description: "Account privacy, blocked accounts",
            action: "Manage",
        },
        {
            icon: Bell,
            title: "Notifications",
            description: "Push, email, SMS",
            action: "Configure",
        },
        {
            icon: Lock,
            title: "Password",
            description: "Change your password",
            action: "Update",
        },
        {
            icon: HelpCircle,
            title: "Help",
            description: "Support and FAQ",
            action: "View",
        },
        {
            icon: Info,
            title: "About",
            description: "App version and terms",
            action: "View",
        },
    ];

    return (
        <div className="max-w-4xl mx-auto">
            <ProfileHeader user={user} />
            <ProfileTabs username={username!} />

            {/* Account Settings Content */}
            <div className="bg-white dark:bg-[#000] border-t border-gray-200 dark:border-[#262626]">
                <div className="p-6">
                    <h3 className="text-xl font-semibold mb-6 dark:text-white">
                        Account Settings
                    </h3>

                    <div className="space-y-1">
                        {settingsOptions.map((option, index) => {
                            const Icon = option.icon;
                            return (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-[#262626] rounded-lg transition-colors cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-[#363636]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-gray-100 dark:bg-[#262626] rounded-full">
                                            <Icon
                                                size={20}
                                                className="text-gray-700 dark:text-gray-300"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold dark:text-white">
                                                {option.title}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {option.description}
                                            </p>
                                        </div>
                                    </div>
                                    <button className="text-sm font-semibold text-[#0095f6] hover:text-[#00376b]">
                                        {option.action}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Logout Button */}
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[#262626]">
                        <button className="w-full py-3 px-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
