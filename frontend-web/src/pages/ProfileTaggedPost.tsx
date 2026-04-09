import { useOutletContext } from "react-router-dom";
import PostGrid from "../components/profile/PostGrid";
import { useProfileTaggedPosts } from "../hooks/useProfileHooks";
import type { User } from "../types";

interface OutletContext {
  user: User;
  isOwnProfile: boolean;
}

export default function ProfileTaggedPost() {
  const { user } = useOutletContext<OutletContext>();
  const { posts, loading, error } = useProfileTaggedPosts(user);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Chưa có bài viết nào được gắn thẻ
      </div>
    );
  }

  return <PostGrid posts={posts} />;
}
