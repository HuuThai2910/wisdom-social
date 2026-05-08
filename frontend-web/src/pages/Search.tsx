import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Search as SearchIcon, X, Loader2, User, Flag, Users } from "lucide-react";
import userService from "../services/userService";
import pageService from "../services/pageService";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useBlockNotifications } from "../hooks/useBlockNotifications";
import { buildS3Url } from "../utils/s3";
import type { User as UserType } from "../types";
import type { Page } from "../services/pageService";

type SearchItem =
    | { kind: "user"; data: UserType }
    | { kind: "page"; data: Page };

export default function Search() {
    const currentUser = useCurrentUser();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [allUsers, setAllUsers] = useState<UserType[]>([]);
    const [allPages, setAllPages] = useState<Page[]>([]);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    const buildMixedList = useCallback((users: UserType[], pages: Page[]): SearchItem[] => {
        const items: SearchItem[] = [];
        const maxLen = Math.max(users.length, pages.length);
        for (let i = 0; i < maxLen; i++) {
            if (i < users.length) items.push({ kind: "user", data: users[i] });
            if (i < pages.length) items.push({ kind: "page", data: pages[i] });
        }
        return items;
    }, []);

    const loadData = useCallback(async () => {
        const userId = currentUser?.id;
        if (!userId) return;

        setLoading(true);
        try {
            const [users, pages] = await Promise.all([
                userService.getAllUsersSearch(userId),
                pageService.getAllPages(),
            ]);

            // Backend already filters blocked users — just exclude current user
            const filteredUsers = users.filter((u: UserType) => u.id !== userId);
            setAllUsers(filteredUsers);
            setAllPages(pages);
            setResults(buildMixedList(filteredUsers, pages));
        } catch (err: any) {
            console.error("Error loading data:", err);
            setError("Không thể tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id, buildMixedList]);

    useEffect(() => {
        loadData();
    }, [currentUser?.id]);

    // Reload when block/unblock events arrive (mirrors mobile's useBlockNotifications pattern)
    const blockTrigger = useBlockNotifications();
    useEffect(() => {
        if (blockTrigger > 0) void loadData();
    }, [blockTrigger]);

    const handleSearch = (text: string) => {
        setQuery(text);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            const q = text.trim().toLowerCase();

            if (!q) {
                setResults(buildMixedList(allUsers, allPages));
                setError("");
                return;
            }

            const matchedUsers = allUsers.filter(
                (u) =>
                    (u.name && u.name.toLowerCase().includes(q)) ||
                    (u.fullName && u.fullName.toLowerCase().includes(q)) ||
                    (u.username && u.username.toLowerCase().includes(q)) ||
                    (u.phone && u.phone.includes(q))
            );

            const matchedPages = allPages.filter(
                (p) =>
                    (p.name && p.name.toLowerCase().includes(q)) ||
                    (p.username && p.username?.toLowerCase().includes(q)) ||
                    (p.category && p.category.toLowerCase().includes(q))
            );

            setResults(buildMixedList(matchedUsers, matchedPages));
            setError("");
        }, 250);
    };

    const handleClearQuery = () => {
        setQuery("");
        setResults(buildMixedList(allUsers, allPages));
        setError("");
    };

    const addRecentSearch = (term: string) => {
        const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem("recentSearches", JSON.stringify(updated));
    };

    const clearAllRecent = () => {
        setRecentSearches([]);
        localStorage.removeItem("recentSearches");
    };

    const removeRecentSearch = (term: string) => {
        const updated = recentSearches.filter((s) => s !== term);
        setRecentSearches(updated);
        localStorage.setItem("recentSearches", JSON.stringify(updated));
    };

    useEffect(() => {
        const saved = localStorage.getItem("recentSearches");
        if (saved) {
            try { setRecentSearches(JSON.parse(saved)); } catch {}
        }
    }, []);

    const handleSelectRecent = (term: string) => {
        handleSearch(term);
        addRecentSearch(term);
    };

    const renderItem = (item: SearchItem) => {
        if (item.kind === "user") {
            const u = item.data;
            return (
                <Link
                    key={`user-${u.id}`}
                    to={`/profile/${u.username}`}
                    onClick={() => addRecentSearch(u.username)}
                    className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                >
                    <img
                        src={buildS3Url(u.avatarUrl) || "https://i.pravatar.cc/150"}
                        alt={u.username}
                        className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-[#363636]"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate dark:text-white">
                            {u.fullName || u.name || u.username || u.phone}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            @{u.username}
                        </p>
                        {u.bio && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">
                                {u.bio}
                            </p>
                        )}
                    </div>
                    <div className="shrink-0 w-7 h-7 bg-gray-100 dark:bg-[#262626] rounded-full flex items-center justify-center">
                        <User size={13} className="text-gray-400" />
                    </div>
                </Link>
            );
        }

        const p = item.data;
        return (
            <Link
                key={`page-${p.id}`}
                to={`/page/${p.id}`}
                onClick={() => addRecentSearch(p.name)}
                className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
            >
                <img
                    src={buildS3Url(p.avatarUrl) || "https://i.pravatar.cc/150"}
                    alt={p.name}
                    className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-[#363636]"
                />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate dark:text-white">
                        {p.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        @{p.username}
                    </p>
                    {p.category && (
                        <div className="mt-1">
                            <span className="inline-block text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                {p.category}
                            </span>
                        </div>
                    )}
                </div>
                <div className="shrink-0 w-7 h-7 bg-gray-100 dark:bg-[#262626] rounded-full flex items-center justify-center">
                    <Flag size={13} className="text-gray-400" />
                </div>
            </Link>
        );
    };

    return (
        <div className="max-w-150 mx-auto bg-white dark:bg-black border-r border-gray-200 dark:border-[#262626] min-h-screen">
            {/* Search Header */}
            <div className="sticky top-0 bg-white dark:bg-black border-b border-gray-200 dark:border-[#262626] p-4 z-10">
                <h1 className="text-2xl font-semibold mb-6 dark:text-white">
                    Tìm kiếm
                </h1>

                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <SearchIcon size={16} />
                    </div>
                    <input
                        type="text"
                        placeholder="Tìm kiếm người dùng, trang..."
                        value={query}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 bg-gray-100 dark:bg-[#262626] rounded-lg outline-none text-sm dark:text-white placeholder-gray-500 border border-gray-300 dark:border-[#363636]"
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
                {/* Recent Searches — only shown when no active query */}
                {!query && recentSearches.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="text-base font-semibold dark:text-white">
                                Tìm kiếm gần đây
                            </h2>
                            <button
                                onClick={clearAllRecent}
                                className="text-sm text-[#0095f6] hover:text-[#00376b] dark:text-[#3b82f6] dark:hover:text-[#60a5fa] font-semibold"
                            >
                                Xóa tất cả
                            </button>
                        </div>

                        <div className="space-y-1">
                            {recentSearches.map((search, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] rounded"
                                >
                                    <button
                                        onClick={() => handleSelectRecent(search)}
                                        className="flex items-center gap-3 flex-1 text-left"
                                    >
                                        <div className="w-9 h-9 bg-gray-100 dark:bg-[#262626] rounded-full flex items-center justify-center shrink-0">
                                            <SearchIcon size={16} className="text-gray-500 dark:text-gray-400" />
                                        </div>
                                        <span className="text-sm dark:text-white truncate">
                                            {search}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => removeRecentSearch(search)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Result count */}
                {!loading && results.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-2 mb-4">
                        {results.length} kết quả{query ? ` cho "${query}"` : ""}
                    </p>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="animate-spin text-gray-400 mb-2" size={32} />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Đang tải...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="text-center py-8">
                        <p className="text-sm text-red-500">{error}</p>
                    </div>
                )}

                {/* Results */}
                {!loading && !error && results.length > 0 && (
                    <div className="space-y-1">
                        {results.map((item) => renderItem(item))}
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && results.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-[#262626] rounded-full flex items-center justify-center mx-auto mb-4">
                            {query
                                ? <SearchIcon size={32} className="text-gray-400" />
                                : <Users size={32} className="text-gray-400" />
                            }
                        </div>
                        <p className="text-sm font-semibold dark:text-white mb-1">
                            {query ? "Không tìm thấy kết quả" : "Chưa có dữ liệu"}
                        </p>
                        {query && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Thử từ khóa khác
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
