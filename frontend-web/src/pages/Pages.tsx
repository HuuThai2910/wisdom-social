import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import PageCard from "../components/page/PageCard";
import {
    getFollowedPages,
    getSuggestedPages,
    searchPages,
} from "../api/pageApi";
import type { PageCategory, Page } from "../types";
import { Link } from "react-router-dom";

const categories: PageCategory[] = [
    "Business",
    "Brand",
    "Artist",
    "Entertainment",
    "Education",
    "Community",
    "Technology",
    "Sports",
    "Food",
    "Travel",
];

export default function Pages() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<
        PageCategory | "All"
    >("All");

    const [followedPages, setFollowedPages] = useState<Page[]>([]);
    const [suggestedPages, setSuggestedPages] = useState<Page[]>([]);
    const [searchResults, setSearchResults] = useState<Page[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isFiltering = searchQuery !== "" || selectedCategory !== "All";

    // Load followed and suggested pages on mount
    useEffect(() => {
        Promise.all([getFollowedPages(), getSuggestedPages()])
            .then(([followedRes, suggestedRes]) => {
                setFollowedPages(followedRes.data.data ?? []);
                setSuggestedPages(suggestedRes.data.data ?? []);
            })
            .catch(() => setError("Failed to load pages. Please try again."))
            .finally(() => setLoading(false));
    }, []);

    // Search / filter when query or category changes
    useEffect(() => {
        if (!isFiltering) return;

        searchPages(
            searchQuery,
            selectedCategory !== "All" ? selectedCategory : undefined,
        )
            .then((res) => {
                setSearchResults(res.data.data ?? []);
                setSearchLoading(false);
            })
            .catch(() => {
                setSearchResults([]);
                setSearchLoading(false);
            });
    }, [searchQuery, selectedCategory, isFiltering]);

    // Trigger search loading from event side-effects (event handlers), not from within useEffect
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchLoading(true);
        setSearchQuery(e.target.value);
    };

    const handleCategoryChange = (cat: PageCategory | "All") => {
        if (cat !== selectedCategory) {
            if (cat !== "All" || searchQuery !== "") setSearchLoading(true);
            setSelectedCategory(cat);
        }
    };

    return (
        <div className="max-w-[935px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold dark:text-white">
                    Pages
                </h1>
                <Link
                    to="/pages/create"
                    className="px-4 py-2 bg-[#0095f6] hover:bg-[#1877f2] text-white rounded-lg text-sm font-semibold"
                >
                    + Create Page
                </Link>
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                    type="text"
                    placeholder="Search pages..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-100 dark:bg-[#262626] border border-transparent focus:border-gray-300 dark:focus:border-[#363636] rounded-xl text-sm outline-none dark:text-white dark:placeholder-gray-500"
                />
            </div>

            {/* Category Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
                <button
                    onClick={() => handleCategoryChange("All")}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedCategory === "All"
                            ? "bg-gray-900 dark:bg-white text-white dark:text-black"
                            : "bg-gray-100 dark:bg-[#262626] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#363636]"
                    }`}
                >
                    All
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            selectedCategory === cat
                                ? "bg-gray-900 dark:bg-white text-white dark:text-black"
                                : "bg-gray-100 dark:bg-[#262626] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#363636]"
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Error */}
            {error && !isFiltering && (
                <div className="text-center py-8 text-red-500 dark:text-red-400">
                    {error}
                </div>
            )}

            {isFiltering ? (
                /* Filtered / search results */
                <div>
                    {searchLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2
                                size={32}
                                className="animate-spin text-gray-400"
                            />
                        </div>
                    ) : (
                        <>
                            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">
                                {searchResults.length} result
                                {searchResults.length !== 1 ? "s" : ""}
                            </h2>
                            {searchResults.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                    <p className="text-lg font-medium">
                                        No pages found
                                    </p>
                                    <p className="text-sm mt-1">
                                        Try a different search or category
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {searchResults.map((page) => (
                                        <PageCard key={page.id} page={page} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : loading ? (
                <div className="flex justify-center py-16">
                    <Loader2
                        size={32}
                        className="animate-spin text-gray-400"
                    />
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Pages You Follow */}
                    {followedPages.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-semibold dark:text-white">
                                    Pages You Follow
                                </h2>
                                <button className="text-sm font-semibold text-[#0095f6] hover:text-[#00376b]">
                                    See All
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {followedPages.map((page) => (
                                    <PageCard key={page.id} page={page} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Suggested Pages */}
                    {suggestedPages.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-semibold dark:text-white">
                                    Suggested Pages
                                </h2>
                                <button className="text-sm font-semibold text-[#0095f6] hover:text-[#00376b]">
                                    See All
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {suggestedPages.map((page) => (
                                    <PageCard key={page.id} page={page} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Empty state when no pages at all */}
                    {followedPages.length === 0 &&
                        suggestedPages.length === 0 && (
                            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                                <p className="text-lg font-medium">
                                    No pages yet
                                </p>
                                <p className="text-sm mt-1">
                                    Be the first to create a page!
                                </p>
                            </div>
                        )}
                </div>
            )}
        </div>
    );
}
