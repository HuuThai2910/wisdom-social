import { useParams, Navigate } from "react-router-dom";
import PageHeader from "../components/page/PageHeader";
import PageTabs from "../components/page/PageTabs";
import PostGrid from "../components/profile/PostGrid";
import { mockPages, mockPagePosts } from "../api/mockData";

export default function PageProfile() {
    const { pageId } = useParams();
    const page = mockPages.find((p) => p.id === pageId);

    if (!page) {
        return (
            <div className="p-4 text-center dark:text-white">
                Page not found
            </div>
        );
    }

    // Default to posts tab when visiting /pages/:pageId
    return <Navigate to={`/pages/${pageId}/posts`} replace />;
}

export function PageProfilePosts() {
    const { pageId } = useParams();
    const page = mockPages.find((p) => p.id === pageId);

    if (!page) {
        return (
            <div className="p-4 text-center dark:text-white">
                Page not found
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <PageHeader page={page} />
            <PageTabs pageId={pageId!} />
            <PostGrid posts={mockPagePosts} />
        </div>
    );
}

export function PageProfileAbout() {
    const { pageId } = useParams();
    const page = mockPages.find((p) => p.id === pageId);

    if (!page) {
        return (
            <div className="p-4 text-center dark:text-white">
                Page not found
            </div>
        );
    }

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
