import { useState } from "react";
import { mockChats, currentUser } from "../api/mockData";
import { Link } from "react-router-dom";
import { Search, Edit } from "lucide-react";

export default function Messages() {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredChats = searchQuery
        ? mockChats.filter((chat) =>
              chat.user.username
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()),
          )
        : mockChats;

    return (
        <div className="max-w-[935px] mx-auto px-4 py-4">
            <div className="bg-white dark:bg-[#000] border border-gray-200 dark:border-[#262626] rounded-lg h-[calc(100vh-140px)] flex overflow-hidden shadow-sm">
                {/* Left Sidebar - Chat List */}
                <div className="w-full md:w-96 border-r border-gray-200 dark:border-[#262626] flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-[#262626]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-semibold dark:text-white">
                                    {currentUser.username}
                                </h2>
                                <button className="p-1">
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        className="dark:text-white"
                                    >
                                        <path
                                            d="M7 10l5 5 5-5"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </button>
                            </div>
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-[#262626] rounded-full">
                                <Edit size={24} className="dark:text-white" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-100 dark:bg-[#262626] rounded-lg outline-none text-sm dark:text-white placeholder-gray-500"
                            />
                            <Search
                                size={16}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                        </div>
                    </div>

                    {/* Chat List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredChats.map((chat) => (
                            <Link
                                key={chat.id}
                                to={`/messages/${chat.id}`}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#262626] border-b border-gray-100 dark:border-[#262626]"
                            >
                                <div className="relative">
                                    <img
                                        src={chat.user.avatar}
                                        alt={chat.user.username}
                                        className="w-14 h-14 rounded-full object-cover"
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate dark:text-white">
                                        {chat.user.username}
                                    </p>
                                    <p
                                        className={`text-sm truncate ${
                                            chat.unreadCount > 0
                                                ? "font-semibold dark:text-white"
                                                : "text-gray-500 dark:text-gray-400"
                                        }`}
                                    >
                                        {chat.lastMessage.text}
                                    </p>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {chat.lastMessage.createdAt}
                                    </span>
                                    {chat.unreadCount > 0 && (
                                        <div className="w-2 h-2 bg-[#0095f6] rounded-full" />
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Right Side - Empty State */}
                <div className="hidden md:flex flex-1 items-center justify-center bg-white dark:bg-[#000]">
                    <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-4 border-2 border-black dark:border-white rounded-full flex items-center justify-center">
                            <svg
                                width="48"
                                height="48"
                                viewBox="0 0 24 24"
                                fill="none"
                                className="dark:stroke-white"
                            >
                                <path
                                    d="M12 21L3 13V3h18v10l-9 8z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                />
                            </svg>
                        </div>
                        <h3 className="text-xl font-light mb-2 dark:text-white">
                            Your messages
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Send private photos and messages to a friend or
                            group.
                        </p>
                        <button className="px-6 py-2 bg-[#0095f6] hover:bg-[#1877f2] text-white rounded-lg text-sm font-semibold">
                            Send message
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
