import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search as SearchIcon, X, Loader2 } from "lucide-react";
import userService from "../services/userService";
import { User } from "../types";

export default function Search() {
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [recentSearches] = useState([
        "john_doe",
        "jane_smith",
        "photography",
    ]);

    // Debounce search function
    const debounce = (func: Function, delay: number) => {
        let timeoutId: NodeJS.Timeout;
        return (...args: any[]) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    const searchUsers = useCallback(async (keyword: string) => {
        if (!keyword || keyword.trim().length === 0) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        setError("");
        try {
            const results = await userService.searchUserByUsername(keyword);
            setSearchResults(results);
        } catch (err: any) {
            console.error("Search error:", err);
            setError("Không thể tìm kiếm. Vui lòng thử lại.");
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounced search with 300ms delay
    const debouncedSearch = useCallback(
        debounce((keyword: string) => searchUsers(keyword), 300),
        [searchUsers]
    );

    useEffect(() => {
        debouncedSearch(query);
    }, [query, debouncedSearch]);

    const handleClearQuery = () => {
        setQuery("");
        setSearchResults([]);
        setError("");
    };

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
                        placeholder="Tìm kiếm username..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 bg-gray-100 dark:bg-[#262626] rounded-lg outline-none text-sm dark:text-white placeholder-gray-500"
                    />
                    {query && (
                        <button
                            onClick={handleClearQuery}
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
                        {/* Loading State */}
                        {loading && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="animate-spin text-gray-400" size={32} />
                            </div>
                        )}

                        {/* Error State */}
                        {error && !loading && (
                            <div className="text-center py-8">
                                <p className="text-sm text-red-500">{error}</p>
                            </div>
                        )}

                        {/* Search Results */}
                        {!loading && !error && searchResults.length > 0 && (
                            <div>
                                {searchResults.map((user) => (
                                    <Link
                                        key={user.id}
                                        to={`/profile/${user.username}`}
                                        className="flex items-center gap-3 py-2 hover:bg-gray-50 dark:hover:bg-[#262626] rounded px-2 -mx-2"
                                    >
                                        <img
                                            src={user.avatar || "https://i.pravatar.cc/150"}
                                            alt={user.username}
                                            className="w-11 h-11 rounded-full object-cover"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate dark:text-white">
                                                {user.username}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {user.fullName || user.name || ""}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && !error && query && searchResults.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Không tìm thấy kết quả cho "{query}"
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
