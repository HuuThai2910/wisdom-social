import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import PageHeader from "../components/page/PageHeader";
import PageTabs from "../components/page/PageTabs";
import PostGrid from "../components/profile/PostGrid";
import { getPageById, getPagePosts } from "../api/pageApi";
import type { Page, Post } from "../types";

function usePageData(pageId: string | undefined) {
    const [page, setPage] = useState<Page | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!pageId) return;
        getPageById(pageId)
            .then((res) => setPage(res.data.data))
            .catch(() => setError("Page not found."))
            .finally(() => setLoading(false));
    }, [pageId]);

    return { page, loading, error };
}

function PageLoadingState() {
    return (
        <div className="flex justify-center py-16">
            <Loader2 size={32} className="animate-spin text-gray-400" />
        </div>
    );
}

function PageErrorState({ message }: { message: string }) {
    return (
        <div className="p-4 text-center text-red-500 dark:text-red-400">
            {message}
        </div>
    );
}

export default function PageProfile() {
    const { pageId } = useParams();
    const { page, loading, error } = usePageData(pageId);

    if (loading) return <PageLoadingState />;
    if (error || !page)
        return (
            <PageErrorState message={error ?? "Page not found."} />
        );

    return <Navigate to={`/pages/${pageId}/posts`} replace />;
}

export function PageProfilePosts() {
    const { pageId } = useParams();
    const { page, loading: pageLoading, error: pageError } = usePageData(pageId);

    const [posts, setPosts] = useState<Post[]>([]);
    const [postsLoading, setPostsLoading] = useState(true);

    useEffect(() => {
        if (!pageId) return;
        getPagePosts(pageId)
            .then((res) => setPosts(res.data.data?.posts ?? []))
            .catch(() => setPosts([]))
            .finally(() => setPostsLoading(false));
    }, [pageId]);

    if (pageLoading) return <PageLoadingState />;
    if (pageError || !page)
        return <PageErrorState message={pageError ?? "Page not found."} />;

    return (
        <div className="max-w-4xl mx-auto">
            <PageHeader page={page} />
            <PageTabs pageId={pageId!} />
            {postsLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2
                        size={28}
                        className="animate-spin text-gray-400"
                    />
                </div>
            ) : (
                <PostGrid posts={posts} />
            )}
        </div>
    );
}

export function PageProfileAbout() {
    const { pageId } = useParams();
    const { page, loading, error } = usePageData(pageId);

    if (loading) return <PageLoadingState />;
    if (error || !page)
        return <PageErrorState message={error ?? "Page not found."} />;

    return (
        <div className="max-w-4xl mx-auto">
            <PageHeader page={page} />
            <PageTabs pageId={pageId!} />
            <div className="bg-white dark:bg-[#000] border-t border-gray-200 dark:border-[#262626]">
                <div className="p-6 space-y-6">
                    <h3 className="text-xl font-semibold dark:text-white">
                        About
                    </h3>

                    <div className="space-y-4">
                        {page.description && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                    Description
                                </h4>
                                <p className="text-sm dark:text-white">
                                    {page.description}
                                </p>
                            </div>
                        )}

                        <div>
                            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                Category
                            </h4>
                            <p className="text-sm dark:text-white">
                                {page.category}
                            </p>
                        </div>

                        {page.location && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                    Location
                                </h4>
                                <p className="text-sm dark:text-white">
                                    {page.location}
                                </p>
                            </div>
                        )}

                        {page.website && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                    Website
                                </h4>
                                <a
                                    href={page.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-[#0095f6] hover:underline"
                                >
                                    {page.website}
                                </a>
                            </div>
                        )}

                        <div>
                            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                Page Created
                            </h4>
                            <p className="text-sm dark:text-white">
                                {new Date(page.createdAt).toLocaleDateString(
                                    "en-US",
                                    {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    },
                                )}
                            </p>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                Page Owner
                            </h4>
                            <p className="text-sm dark:text-white">
                                @{page.owner.username}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
