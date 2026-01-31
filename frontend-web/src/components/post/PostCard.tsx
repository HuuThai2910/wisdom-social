import { Link, useLocation } from "react-router-dom";
import { Heart, MessageCircle, Bookmark, MoreHorizontal } from "lucide-react";
import type { Post } from "../../types";

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const location = useLocation();

  return (
    <article className="bg-white dark:bg-[#000] border-b border-gray-200 dark:border-[#262626] mb-5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-[14px]">
        <Link
          to={`/profile/${post.user.username}`}
          className="flex items-center gap-3"
        >
          <img
            src={post.user.avatar}
            alt={post.user.username}
            className="w-[32px] h-[32px] rounded-full object-cover"
          />
          <p className="text-sm font-semibold dark:text-white">
            {post.user.username}
          </p>
        </Link>
        <button className="text-gray-900 dark:text-white hover:text-gray-500 dark:hover:text-gray-400">
          <MoreHorizontal size={24} />
        </button>
      </div>

      {/* Image */}
      <Link
        to={`/post/${post.id}`}
        state={{ from: location.pathname }}
        className="block w-full"
      >
        <img
          src={post.images[0]}
          alt={post.caption}
          className="w-full object-cover cursor-pointer"
        />
      </Link>

      {/* Actions */}
      <div className="px-4">
        <div className="flex items-center justify-between pt-1 pb-2">
          <div className="flex items-center gap-4">
            <button
              className={`hover:opacity-50 transition-opacity ${
                post.isLiked ? "text-red-500" : ""
              }`}
            >
              <Heart
                size={27}
                fill={post.isLiked ? "currentColor" : "none"}
                strokeWidth={1.8}
              />
            </button>
            <button className="hover:opacity-50 transition-opacity">
              <MessageCircle size={27} strokeWidth={1.8} />
            </button>
            <button className="hover:opacity-50 transition-opacity">
              <svg
                width="27"
                height="27"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
          <button
            className={`hover:opacity-50 transition-opacity ${
              post.isSaved ? "" : ""
            }`}
          >
            <Bookmark
              size={26}
              fill={post.isSaved ? "currentColor" : "none"}
              strokeWidth={1.8}
            />
          </button>
        </div>

        {/* Likes */}
        <button className="text-sm font-semibold mb-2 hover:opacity-50 block dark:text-white">
          {post.likes.toLocaleString()} likes
        </button>

        {/* Caption */}
        <div className="text-sm mb-1 leading-[18px]">
          <Link
            to={`/profile/${post.user.username}`}
            className="font-semibold hover:opacity-50 mr-1 dark:text-white"
          >
            {post.user.username}
          </Link>
          <span className="text-gray-900 dark:text-white">{post.caption}</span>
        </div>

        {/* Comments */}
        {post.comments.length > 0 && (
          <Link
            to={`/post/${post.id}`}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-400 dark:hover:text-gray-300 block mb-1"
          >
            View all {post.comments.length} comments
          </Link>
        )}

        {/* Time */}
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-3">
          {post.createdAt}
        </p>
      </div>
    </article>
  );
}
