import type { Story } from "../../types";

interface StoriesBarProps {
    stories: Story[];
}

export default function StoriesBar({ stories }: StoriesBarProps) {
    return (
        <div className="bg-white dark:bg-[#000] border-b border-gray-200 dark:border-[#262626] py-4 mb-4">
            <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4">
                {stories.map((story) => (
                    <button
                        key={story.id}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                    >
                        <div
                            className={`p-[2.5px] rounded-full ${
                                story.isViewed
                                    ? "bg-gradient-to-tr from-gray-300 to-gray-300"
                                    : "bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] via-[#8134af] to-[#515bd4]"
                            }`}
                        >
                            <div className="bg-white p-[2.5px] rounded-full">
                                <img
                                    src={story.user.avatar}
                                    alt={story.user.username}
                                    className="w-[66px] h-[66px] rounded-full object-cover"
                                />
                            </div>
                        </div>
                        <span className="text-[12px] truncate max-w-[74px] text-center text-gray-900 dark:text-white">
                            {story.user.username}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
