import { NavLink } from "react-router-dom";
import { Grid, Bookmark, Share2, UserSquare2 } from "lucide-react";

interface ProfileTabsProps {
  username: string;
}

export default function ProfileTabs({ username }: ProfileTabsProps) {
  const basePath = `/profile/${username}`;
  const tabs = [
    { icon: Grid, label: "Post", path: basePath, end: true },
    { icon: Bookmark, label: "Saved", path: `${basePath}/saved` },
    { icon: UserSquare2, label: "Tagged", path: `${basePath}/tagged` },
    { icon: Share2, label: "Shared", path: `${basePath}/shared` },
  ];

  return (
    <div className="border-t border-gray-200 dark:border-[#262626] bg-white dark:bg-black">
      <div className="max-w-6xl mx-auto px-6 md:px-8 flex gap-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `flex items-center gap-2 py-4 border-t-2 -mt-[1px] transition-colors uppercase tracking-wider text-xs ${
                  isActive
                    ? "border-black dark:border-white text-black dark:text-white font-bold"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-normal"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                  <span>{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
