import { Link } from "react-router-dom";
import type { User } from "../../types";
import { MoreHorizontal } from "lucide-react";

interface ProfileHeaderProps {
    user: User;
    isOwnProfile?: boolean;
}

export default function ProfileHeader({
    user,
    isOwnProfile = false,
}: ProfileHeaderProps) {
    return (
        <div className="bg-white dark:bg-[#000] px-5 py-8 md:px-16 md:py-12 border-b border-gray-200 dark:border-[#262626]">
            <div className="max-w-[935px] mx-auto">
                <div className="flex gap-7 md:gap-[75px] mb-11">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        <img
                            src={user.avatar}
                            alt={user.username}
                            className="w-[77px] h-[77px] md:w-[150px] md:h-[150px] rounded-full object-cover"
                        />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-5 mb-5">
                            <h1 className="text-xl font-normal dark:text-white">
                                {user.username}
                            </h1>
                            {isOwnProfile ? (
                                <>
                                    <Link
                                        to={`/profile/${user.username}/general`}
                                        className="px-4 py-[7px] bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] rounded-lg text-sm font-semibold dark:text-white"
                                    >
                                        Edit profile
                                    </Link>
                                    <Link
                                        to="/settings"
                                        className="px-4 py-[7px] bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] rounded-lg text-sm font-semibold dark:text-white"
                                    >
                                        View archive
                                    </Link>
                                    <button className="text-gray-900 dark:text-gray-200 hover:text-gray-500 dark:hover:text-gray-400">
                                        <MoreHorizontal size={24} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className="px-6 py-[7px] bg-[#0095f6] hover:bg-[#1877f2] text-white rounded-lg text-sm font-semibold">
                                        Follow
                                    </button>
                                    <button className="px-6 py-[7px] bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] rounded-lg text-sm font-semibold dark:text-white">
                                        Message
                                    </button>
                                    <button className="text-gray-900 dark:text-gray-200 hover:text-gray-500 dark:hover:text-gray-400">
                                        <MoreHorizontal size={24} />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-10 mb-5">
                            <div className="text-base dark:text-white">
                                <span className="font-semibold">
                                    {user.postsCount}
                                </span>{" "}
                                <span className="text-gray-900 dark:text-gray-300">
                                    posts
                                </span>
                            </div>
                            <button className="hover:text-gray-500 dark:hover:text-gray-400 text-base dark:text-white">
                                <span className="font-semibold">
                                    {user.followersCount?.toLocaleString()}
                                </span>{" "}
                                <span className="text-gray-900 dark:text-gray-300">
                                    followers
                                </span>
                            </button>
                            <button className="hover:text-gray-500 dark:hover:text-gray-400 text-base dark:text-white">
                                <span className="font-semibold">
                                    {user.followingCount}
                                </span>{" "}
                                <span className="text-gray-900 dark:text-gray-300">
                                    following
                                </span>
                            </button>
                        </div>

                        {/* Bio */}
                        <div className="text-sm dark:text-white">
                            <p className="font-semibold">{user.fullName}</p>
                            {user.bio && (
                                <p className="whitespace-pre-line dark:text-gray-300">
                                    {user.bio}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
