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
  Instagram,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useCurrentUser } from "../../hooks/useCurrentUser";

export default function Sidebar() {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const currentUser = useCurrentUser();

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
    <aside
      className={`fixed left-0 top-0 h-screen border-r border-gray-200 dark:border-[#262626] bg-white dark:bg-black hidden md:flex flex-col py-8 px-3 z-50 transition-[width] duration-300 ease-in-out ${
        isExpanded ? "w-[245px]" : "w-[72px]"
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        setIsExpanded(false);
        setShowMoreMenu(false);
      }}
    >
      {/* Logo */}
      <div className="px-3 mb-8 h-[29px] flex items-center relative">
        <div
          className={`absolute inset-0 flex items-center transition-opacity duration-200 ${
            isExpanded ? "opacity-100 delay-100" : "opacity-0"
          }`}
        >
          <h1 className="text-2xl font-semibold font-serif dark:text-white whitespace-nowrap">
            Wisdom Social
          </h1>
        </div>
        <div
          className={`absolute inset-0 flex items-center transition-opacity duration-200 ${
            isExpanded ? "opacity-0" : "opacity-100 delay-100"
          }`}
        >
          <Instagram size={29} className="dark:text-white" strokeWidth={1.5} />
        </div>
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
                  className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-[#1a1a1a] overflow-hidden ${
                    active ? "font-bold" : "font-normal"
                  } dark:text-white group relative`}
                >
                  <div className="w-[26px] h-[26px] flex items-center justify-center shrink-0">
                    <Icon
                      className={active ? "fill-current" : ""}
                      size={26}
                      strokeWidth={active ? 2.5 : 1.5}
                    />
                  </div>
                  <span
                    className={`text-[16px] whitespace-nowrap transition-all duration-200 ${
                      isExpanded
                        ? "opacity-100 delay-75"
                        : "opacity-0 w-0 invisible"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}

          {/* Profile */}
          <li>
            {currentUser && (
              <Link
                to={`/profile/${currentUser.username}`}
                className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-[#1a1a1a] overflow-hidden ${
                  location.pathname.includes(`/profile/${currentUser.username}`)
                    ? "font-bold"
                    : "font-normal"
                } dark:text-white relative`}
              >
                <div className="w-[26px] h-[26px] shrink-0">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.username}
                    className={`w-full h-full rounded-full object-cover ${
                      location.pathname.includes(
                        `/profile/${currentUser.username}`
                      )
                        ? "ring-2 ring-black dark:ring-white"
                        : ""
                    }`}
                  />
                </div>
                <span
                  className={`text-[16px] whitespace-nowrap transition-all duration-200 ${
                    isExpanded
                      ? "opacity-100 delay-75"
                      : "opacity-0 w-0 invisible"
                  }`}
                >
                  Profile
                </span>
              </Link>
            )}
          </li>
        </ul>
      </nav>

      {/* More menu at Bottom */}
      <div className="mt-auto relative">
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors w-full dark:text-white relative overflow-hidden"
        >
          <div className="w-[26px] h-[26px] flex items-center justify-center shrink-0">
            <Menu size={26} strokeWidth={1.5} />
          </div>
          <span
            className={`text-[16px] whitespace-nowrap transition-all duration-200 ${
              isExpanded ? "opacity-100 delay-75" : "opacity-0 w-0 invisible"
            }`}
          >
            More
          </span>
        </button>

        {/* More Menu Popup */}
        {showMoreMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMoreMenu(false)}
            />
            <div className="absolute bottom-full left-3 mb-2 w-[266px] bg-white dark:bg-[#262626] rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] overflow-hidden z-50">
              <Link
                to="/settings"
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] dark:text-white transition-colors"
                onClick={() => setShowMoreMenu(false)}
              >
                <Settings size={18} />
                <span className="text-[14px]">Settings</span>
              </Link>
              <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] dark:text-white transition-colors">
                <RefreshCw size={18} />
                <span className="text-[14px]">Your activity</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] dark:text-white transition-colors">
                <Bookmark size={18} />
                <span className="text-[14px]">Saved</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTheme();
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] dark:text-white transition-colors"
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
                <span className="text-[14px]">Switch appearance</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] dark:text-white transition-colors">
                <RefreshCw size={18} />
                <span className="text-[14px]">Report a problem</span>
              </button>

              <div className="h-[1px] bg-gray-200 dark:bg-[#363636] my-1" />

              <button className="w-full text-left px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] dark:text-white transition-colors">
                <span className="text-[14px]">Switch accounts</span>
              </button>

              <div className="h-[6px] bg-gray-100 dark:bg-black" />

              <button className="w-full text-left px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] dark:text-white transition-colors">
                <span className="text-[14px]">Log out</span>
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
