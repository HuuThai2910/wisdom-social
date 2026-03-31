import { useState } from "react";
import { CheckCircle, Globe, MapPin, MoreHorizontal, Users } from "lucide-react";
import type { Page } from "../../types";
import { formatCount } from "../../utils/format";

interface PageHeaderProps {
    page: Page;
}

export default function PageHeader({ page }: PageHeaderProps) {
    const [isFollowed, setIsFollowed] = useState(page.isFollowed ?? false);

    return (
        <div className="bg-white dark:bg-[#000] border-b border-gray-200 dark:border-[#262626]">
            {/* Cover Image */}
            <div className="h-48 md:h-64 bg-gray-200 dark:bg-[#262626] overflow-hidden">
                {page.coverImage ? (
                    <img
                        src={page.coverImage}
                        alt={page.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500" />
                )}
            </div>

            {/* Page Info */}
            <div className="px-5 py-5 md:px-16">
                <div className="max-w-[935px] mx-auto">
                    <div className="flex gap-6 md:gap-10">
                        {/* Avatar */}
                        <div className="-mt-12 flex-shrink-0">
                            <img
                                src={page.avatar}
                                alt={page.name}
                                className="w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-white dark:border-[#000] object-cover"
                            />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pt-2">
                            {/* Name and Actions */}
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                <div className="flex items-center gap-1.5">
                                    <h1 className="text-xl font-semibold dark:text-white">
                                        {page.name}
                                    </h1>
                                    {page.isVerified && (
                                        <CheckCircle
                                            size={20}
                                            className="text-[#0095f6]"
                                            fill="#0095f6"
                                            stroke="white"
                                        />
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsFollowed(!isFollowed)}
                                    className={`px-6 py-[7px] rounded-lg text-sm font-semibold transition-colors ${
                                        isFollowed
                                            ? "bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] dark:text-white"
                                            : "bg-[#0095f6] hover:bg-[#1877f2] text-white"
                                    }`}
                                >
                                    {isFollowed ? "Following" : "Follow"}
                                </button>
                                <button className="px-6 py-[7px] bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] rounded-lg text-sm font-semibold dark:text-white">
                                    Message
                                </button>
                                <button className="text-gray-900 dark:text-gray-200 hover:text-gray-500">
                                    <MoreHorizontal size={24} />
                                </button>
                            </div>

                            {/* Category */}
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                {page.category}
                            </p>

                            {/* Stats */}
                            <div className="flex items-center gap-6 mb-3">
                                <div className="flex items-center gap-1.5 text-sm dark:text-white">
                                    <Users size={16} className="text-gray-500" />
                                    <span className="font-semibold">
                                        {formatCount(page.followersCount)}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                        followers
                                    </span>
                                </div>
                                <div className="text-sm dark:text-white">
                                    <span className="font-semibold">
                                        {page.postsCount.toLocaleString()}
                                    </span>{" "}
                                    <span className="text-gray-500 dark:text-gray-400">
                                        posts
                                    </span>
                                </div>
                            </div>

                            {/* Description */}
                            {page.description && (
                                <p className="text-sm dark:text-white mb-2">
                                    {page.description}
                                </p>
                            )}

                            {/* Location & Website */}
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                                {page.location && (
                                    <span className="flex items-center gap-1">
                                        <MapPin size={14} />
                                        {page.location}
                                    </span>
                                )}
                                {page.website && (
                                    <a
                                        href={page.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-[#0095f6] hover:underline"
                                    >
                                        <Globe size={14} />
                                        {page.website.replace(/^https?:\/\//, "")}
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
