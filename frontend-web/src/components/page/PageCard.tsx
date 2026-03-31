import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, MapPin, Users } from "lucide-react";
import type { Page } from "../../types";
import { formatCount } from "../../utils/format";

interface PageCardProps {
    page: Page;
}

export default function PageCard({ page }: PageCardProps) {
    const [isFollowed, setIsFollowed] = useState(page.isFollowed ?? false);

    return (
        <div className="bg-white dark:bg-[#262626] border border-gray-200 dark:border-[#363636] rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            {/* Cover Image */}
            <Link to={`/pages/${page.id}`}>
                <div className="h-28 bg-gray-200 dark:bg-[#363636] overflow-hidden">
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
            </Link>

            <div className="p-4">
                {/* Avatar + Name */}
                <div className="flex items-start gap-3 mb-3">
                    <Link to={`/pages/${page.id}`} className="-mt-8 flex-shrink-0">
                        <img
                            src={page.avatar}
                            alt={page.name}
                            className="w-14 h-14 rounded-full border-2 border-white dark:border-[#262626] object-cover"
                        />
                    </Link>
                    <div className="flex-1 min-w-0 pt-1">
                        <Link to={`/pages/${page.id}`} className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold dark:text-white truncate">
                                {page.name}
                            </span>
                            {page.isVerified && (
                                <CheckCircle
                                    size={14}
                                    className="text-[#0095f6] flex-shrink-0"
                                    fill="#0095f6"
                                    stroke="white"
                                />
                            )}
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {page.category}
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 mb-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                        <Users size={12} />
                        {formatCount(page.followersCount)} followers
                    </span>
                    {page.location && (
                        <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {page.location}
                        </span>
                    )}
                </div>

                {/* Description */}
                {page.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {page.description}
                    </p>
                )}

                {/* Follow Button */}
                <button
                    onClick={() => setIsFollowed(!isFollowed)}
                    className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                        isFollowed
                            ? "bg-gray-100 dark:bg-[#363636] text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#404040]"
                            : "bg-[#0095f6] hover:bg-[#1877f2] text-white"
                    }`}
                >
                    {isFollowed ? "Following" : "Follow"}
                </button>
            </div>
        </div>
    );
}
