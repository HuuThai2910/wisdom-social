import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import type { User } from "../../types";
import { Settings, LogOut, QrCode } from "lucide-react";
import { logout } from "../../utils/auth";

interface ProfileHeaderProps {
  user: User;
  isOwnProfile?: boolean;
}

export default function ProfileHeader({
  user,
  isOwnProfile = false,
}: ProfileHeaderProps) {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="bg-white dark:bg-[#000] px-4 py-8 md:px-8 md:py-12 border-b border-gray-200 dark:border-[#262626]">
      <div className="max-w-[935px] mx-auto">
        <div className="flex gap-7 md:gap-[75px] mb-11">
          {/* Avatar with Note */}
          <div className="flex-shrink-0 relative">
            {isOwnProfile && (
              <div className="text-center mb-2">
                <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                  📝 Note
                </button>
              </div>
            )}
            <img
              src={user.avatar}
              alt={user.username}
              className="w-[77px] h-[77px] md:w-[150px] md:h-[150px] rounded-full object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-5">
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
                  <div className="relative">
                    <button
                      onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                      className="p-2 text-gray-900 dark:text-gray-200 hover:text-gray-500 dark:hover:text-gray-400"
                    >
                      <Settings size={24} />
                    </button>

                    {/* Settings Dropdown Menu */}
                    {showSettingsMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowSettingsMenu(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 w-[266px] bg-white dark:bg-[#262626] rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] overflow-hidden z-50">
                          {/* QR Code Button */}
                          <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] dark:text-white transition-colors">
                            <QrCode size={18} />
                            <span className="text-[14px]">QR code</span>
                          </button>

                          <div className="h-[1px] bg-gray-200 dark:bg-[#363636]" />

                          {/* Log Out Button */}
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] text-red-600 dark:text-red-400 transition-colors"
                          >
                            <LogOut size={18} />
                            <span className="text-[14px] font-semibold">
                              Log out
                            </span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button className="px-6 py-[7px] bg-[#0095f6] hover:bg-[#1877f2] text-white rounded-lg text-sm font-semibold">
                    Follow
                  </button>
                  <button className="px-6 py-[7px] bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] rounded-lg text-sm font-semibold dark:text-white">
                    Message
                  </button>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-10 mb-5">
              <div className="text-base dark:text-white">
                <span className="font-semibold">{user.postsCount}</span>{" "}
                <span className="text-gray-900 dark:text-gray-300">posts</span>
              </div>
              <button className="hover:text-gray-500 dark:hover:text-gray-400 text-base dark:text-white">
                <span className="font-semibold">
                  {user.friendsCount?.toLocaleString()}
                </span>{" "}
                <span className="text-gray-900 dark:text-gray-300">
                  friends
                </span>
              </button>
              <button className="hover:text-gray-500 dark:hover:text-gray-400 text-base dark:text-white">
                <span className="font-semibold">
                  {user.followersCount?.toLocaleString()}
                </span>{" "}
                <span className="text-gray-900 dark:text-gray-300">
                  followers
                </span>
              </button>
              <button className="hover:text-gray-500 dark:hover:text-gray-400 text-base dark:text-white">
                <span className="font-semibold">{user.followingCount}</span>{" "}
                <span className="text-gray-900 dark:text-gray-300">
                  following
                </span>
              </button>
            </div>

            {/* Bio */}
            <div className="text-sm dark:text-white">
              <p className="font-semibold mb-1">{user.fullName}</p>
              {user.bio && (
                <p className="whitespace-pre-line dark:text-gray-300 mt-1">
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
