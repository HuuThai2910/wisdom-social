import { Link, useLocation } from "react-router-dom";
import { Grid, Bookmark, Tag } from "lucide-react";

interface ProfileTabsProps {
    username: string;
}

export default function ProfileTabs({ username }: ProfileTabsProps) {
    const location = useLocation();
    const basePath = `/profile/${username}`;

    const tabs = [
        { icon: Grid, label: "POSTS", path: `${basePath}/posts` },
        { icon: Bookmark, label: "SAVED", path: `${basePath}/saved` },
        { icon: Tag, label: "TAGGED", path: `${basePath}/tagged` },
    ];

    return (
        <div className="border-t border-gray-200 dark:border-[#262626] bg-white dark:bg-[#000]">
            <div className="flex justify-center gap-16">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = location.pathname === tab.path;

                    return (
                        <Link
                            key={tab.path}
                            to={tab.path}
                            className={`flex items-center gap-1.5 py-[14px] border-t transition-colors ${
                                isActive
                                    ? "border-black dark:border-white text-black dark:text-white"
                                    : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            }`}
                        >
                            <Icon size={12} strokeWidth={isActive ? 2 : 1.5} />
                            <span className="text-[12px] font-semibold tracking-wide">
                                {tab.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
