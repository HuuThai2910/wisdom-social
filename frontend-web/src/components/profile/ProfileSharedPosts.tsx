import { useState, useEffect } from "react";
import { Share2, Loader2, AlertCircle } from "lucide-react";
import PostGrid from "./PostGrid";
import type { User } from "../../types";

interface ProfileSharedPostsProps {
  userId: string | number;
  isOwnProfile: boolean;
}

export default function ProfileSharedPosts({
  userId,
  isOwnProfile,
}: ProfileSharedPostsProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOwnProfile) {
      setLoading(false);
      return;
    }

    const loadSharedPosts = async () => {
      setLoading(true);
      setError("");
      try {
        // TODO: Implement backend endpoint to fetch shared posts
        // const sharedPost = await postService.getSharedPosts(userId);
        // setPosts(sharedPosts || []);
        setPosts([]);
      } catch (err) {
        console.error("Error loading shared posts:", err);
        setError("Không thể tải danh sách bài viết đã chia sẽ");
      } finally {
        setLoading(false);
      }
    };

    loadSharedPosts();
  }, [userId, isOwnProfile]);

  if (!isOwnProfile) {
    return (
      <div className="text-center py-24">
        <Share2 size={64} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold dark:text-white mb-2">
          Danh sách chia sẻ
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Những bài viết được chia sẻ là riêng tư
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-24">
        <Loader2
          size={48}
          className="mx-auto text-gray-400 animate-spin mb-4"
        />
        <p className="text-gray-600 dark:text-gray-400">
          Đang tải danh sách...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h3 className="text-lg font-semibold dark:text-white mb-2">Lỗi</h3>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-24">
        <Share2 size={64} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold dark:text-white mb-2">
          Chưa có bài viết nào được chia sẻ
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Các bài viết bạn chia sẻ sẽ xuất hiện ở đây
        </p>
      </div>
    );
  }

  return <PostGrid posts={posts} isOwnProfile={isOwnProfile} />;
}
