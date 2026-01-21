import { useState } from "react";
import { Link } from "react-router-dom";
import { mockUsers } from "../api/mockData";
import { Search as SearchIcon, X } from "lucide-react";

export default function Search() {
    const [query, setQuery] = useState("");
    const [recentSearches] = useState([
        "john_doe",
        "jane_smith",
        "photography",
    ]);

    const filteredUsers = query
        ? mockUsers.filter(
              (user) =>
                  user.username.toLowerCase().includes(query.toLowerCase()) ||
                  user.fullName.toLowerCase().includes(query.toLowerCase()),
          )
        : [];

    return (
        <div className="max-w-[600px] mx-auto bg-white dark:bg-[#000] border-r border-gray-200 dark:border-[#262626] min-h-screen">
            {/* Search Header */}
            <div className="sticky top-0 bg-white dark:bg-[#000] border-b border-gray-200 dark:border-[#262626] p-4 z-10">
                <h1 className="text-2xl font-semibold mb-6 dark:text-white">
                    Search
                </h1>

                {/* Search Input */}
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <SearchIcon size={16} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 bg-gray-100 dark:bg-[#262626] rounded-lg outline-none text-sm dark:text-white placeholder-gray-500"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {!query ? (
                    <>
                        {/* Recent Searches */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-semibold dark:text-white">
                                    Recent
                                </h2>
                                <button className="text-sm text-[#0095f6] hover:text-[#00376b] font-semibold">
                                    Clear all
                                </button>
                            </div>

                            {recentSearches.map((search, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between py-2 hover:bg-gray-50 dark:hover:bg-[#262626] rounded px-2 -mx-2"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 bg-gray-200 dark:bg-[#262626] rounded-full flex items-center justify-center">
                                            <SearchIcon
                                                size={18}
                                                className="text-gray-500"
                                            />
                                        </div>
                                        <span className="text-sm font-semibold dark:text-white">
                                            {search}
                                        </span>
                                    </div>
                                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                        <X size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Search Results */}
                        {filteredUsers.length > 0 ? (
                            <div>
                                {filteredUsers.map((user) => (
                                    <Link
                                        key={user.id}
                                        to={`/profile/${user.username}`}
                                        className="flex items-center gap-3 py-2 hover:bg-gray-50 dark:hover:bg-[#262626] rounded px-2 -mx-2"
                                    >
                                        <img
                                            src={user.avatar}
                                            alt={user.username}
                                            className="w-11 h-11 rounded-full object-cover"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate dark:text-white">
                                                {user.username}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {user.fullName}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    No results found.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
