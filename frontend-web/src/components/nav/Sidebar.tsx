import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
    Home,
    Search,
    Compass,
    Clapperboard,
    MessageCircle,
    Heart,
    PlusSquare,
    Menu,
    Moon,
    Sun,
    Settings,
    Bookmark,
    RefreshCw,
} from "lucide-react";
import { currentUser } from "../../api/mockData";
import { useTheme } from "../../contexts/ThemeContext";

export default function Sidebar() {
    const location = useLocation();
    const { isDark, toggleTheme } = useTheme();
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    const navItems = [
        { icon: Home, label: "Home", path: "/" },
        { icon: Search, label: "Search", path: "/search" },
        { icon: Compass, label: "Explore", path: "/explore" },
        { icon: Clapperboard, label: "Reels", path: "/reels" },
        { icon: MessageCircle, label: "Messages", path: "/messages" },
        { icon: Heart, label: "Notifications", path: "/notifications" },
        { icon: PlusSquare, label: "Create", path: "/create" },
    ];

    const isActive = (path: string) => {
        if (path === "/")
            return location.pathname === "/" || location.pathname === "/feed";
        return location.pathname.startsWith(path);
    };

    return (
        <aside className="fixed left-0 top-0 h-screen w-[245px] lg:w-[335px] border-r border-gray-200 dark:border-[#262626] bg-white dark:bg-[#000] hidden md:flex flex-col py-8 px-3 z-50">
            {/* Logo */}
            <div className="px-3 mb-8 mt-2">
                <h1 className="text-2xl font-semibold font-serif dark:text-white">
                    Instagram
                </h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);

                        return (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-[#262626] ${
                                        active ? "font-bold" : "font-normal"
                                    } dark:text-white`}
                                >
                                    <Icon
                                        className={active ? "fill-current" : ""}
                                        size={26}
                                        strokeWidth={active ? 2.5 : 1.5}
                                    />
                                    <span className="text-[16px]">
                                        {item.label}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}

                    {/* Profile */}
                    <li>
                        <Link
                            to={`/profile/${currentUser.username}`}
                            className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-[#262626] ${
                                location.pathname.includes(
                                    `/profile/${currentUser.username}`,
                                )
                                    ? "font-bold"
                                    : "font-normal"
                            } dark:text-white`}
                        >
                            <img
                                src={currentUser.avatar}
                                alt={currentUser.username}
                                className="w-[26px] h-[26px] rounded-full"
                            />
                            <span className="text-[16px]">Profile</span>
                        </Link>
                    </li>
                </ul>
            </nav>

            {/* More menu at Bottom */}
            <div className="mt-auto relative">
                <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-[#262626] transition-all w-full dark:text-white"
                >
                    <Menu size={26} strokeWidth={1.5} />
                    <span className="text-[16px]">More</span>
                </button>

                {/* More Menu Popup */}
                {showMoreMenu && (
                    <>
                        <div
                            className="fixed inset-0"
                            onClick={() => setShowMoreMenu(false)}
                        />
                        <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-[#262626] border border-gray-200 dark:border-[#363636] rounded-2xl shadow-xl overflow-hidden">
                            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#363636] dark:text-white">
                                <Settings size={20} />
                                <span className="text-sm">Settings</span>
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#363636] dark:text-white">
                                <Bookmark size={20} />
                                <span className="text-sm">Saved</span>
                            </button>
                            <button
                                onClick={() => {
                                    toggleTheme();
                                    setShowMoreMenu(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#363636] dark:text-white border-t border-gray-200 dark:border-[#363636]"
                            >
                                {isDark ? (
                                    <Sun size={20} />
                                ) : (
                                    <Moon size={20} />
                                )}
                                <span className="text-sm">
                                    Switch appearance
                                </span>
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#363636] dark:text-white border-t border-gray-200 dark:border-[#363636]">
                                <RefreshCw size={20} />
                                <span className="text-sm">
                                    Report a problem
                                </span>
                            </button>
                            <div className="border-t border-gray-200 dark:border-[#363636]" />
                            <button className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#363636] dark:text-white">
                                <span className="text-sm">Switch accounts</span>
                            </button>
                            <div className="border-t-8 border-gray-100 dark:border-[#000]" />
                            <button className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#363636] dark:text-white">
                                <span className="text-sm">Log out</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </aside>
    );
}
