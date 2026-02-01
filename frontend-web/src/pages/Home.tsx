import { useState, useEffect } from "react";
import { mockStories } from "../api/mockData";
import StoriesBar from "../components/story/StoriesBar";
import PostCard from "../components/post/PostCard";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../contexts/AuthContext";
import type { Post } from "../types";

interface PostData {
  id: string;
  authorId: string;
  content: string;
  privacy?: string;
  media?: Array<{ url: string; type: string; order: number }>;
  stats?: { reactCount: number; commentCount: number; shareCount: number };
  createdAt: string;
}

export default function Home() {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPosts = async () => {
      try {
        console.log("🔄 Starting to fetch posts...");
        if (!isMounted) return;
        setLoading(true);

        if (!currentUser?.id) {
          console.log("⚠️ No current user, waiting...");
          if (isMounted) setLoading(false);
          return;
        }

        console.log("✅ Current user:", currentUser.id);
        if (isMounted) setError(null);

        let allPosts: PostData[] = [];

        try {
          // First, try to fetch from friends
          console.log("📱 Fetching friends...");
          const friendsResponse = await axiosClient.get(
            `/users/${currentUser.id}/friends`
          );

          if (!isMounted) return;

          const friendsData =
            friendsResponse.data.data || friendsResponse.data || [];

          console.log("👥 Friends found:", friendsData.length);

          const friendIds = [
            currentUser.id,
            ...friendsData.map((friend: any) => friend.userId || friend.id),
          ];

          console.log("📋 Fetching posts from", friendIds.length, "users...");

          const postsPromises = friendIds.map((id) =>
            axiosClient.get(`/posts/user/${id}`).catch((err) => {
              console.log(
                `⚠️ Failed to fetch posts for user ${id}:`,
                err.message
              );
              return { data: { data: [] } };
            })
          );

          const postsResponses = await Promise.all(postsPromises);

          if (!isMounted) return;

          allPosts = postsResponses.flatMap(
            (response) => response.data.data || []
          );

          console.log("📝 Total posts fetched:", allPosts.length);
        } catch (friendsError: any) {
          console.warn("⚠️ Could not fetch friends:", friendsError.message);

          if (!isMounted) return;

          // If friends API fails, just fetch current user's posts
          console.log("📝 Fetching own posts only...");
          const postsResponse = await axiosClient.get(
            `/posts/user/${currentUser.id}`
          );

          if (!isMounted) return;

          allPosts = postsResponse.data.data || [];
          console.log("📝 Own posts fetched:", allPosts.length);
        }

        if (!isMounted) return;

        // Sort by createdAt descending
        allPosts.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Transform posts to match PostCard format
        console.log("🔄 Transforming posts...");
        const transformedPosts = await Promise.all(
          allPosts.map(async (post) => {
            try {
              // Fetch author data
              const userResponse = await axiosClient.get(
                `/auth/user/id/${post.authorId}`
              );
              const userData = userResponse.data.data;

              return {
                id: post.id,
                user: {
                  id: userData.id.toString(),
                  username: userData.username,
                  fullName: userData.name || userData.username,
                  avatar:
                    userData.avatarUrl || "https://i.pravatar.cc/150?img=5",
                },
                images:
                  post.media && post.media.length > 0
                    ? post.media.map((m) => m.url)
                    : [],
                caption: post.content,
                privacy: post.privacy as any,
                likes: post.stats?.reactCount || 0,
                comments: [],
                createdAt: new Date(post.createdAt).toLocaleString("vi-VN"),
                isLiked: false,
                isSaved: false,
              };
            } catch (userErr: any) {
              console.error(
                "❌ Error fetching author for post",
                post.id,
                ":",
                userErr.message
              );
              // Return null for failed posts
              return null;
            }
          })
        );

        if (!isMounted) return;

        // Filter out null posts (ones that failed to fetch author)
        const validPosts = transformedPosts.filter(
          (post) => post !== null
        ) as Post[];
        console.log("✅ Successfully transformed", validPosts.length, "posts");

        if (isMounted) {
          setPosts(validPosts);
          setError(null);
        }
      } catch (err: any) {
        console.error("❌ Error fetching posts:", err);
        if (isMounted) {
          setError(err.response?.data?.message || "Failed to load posts");
        }
      } finally {
        if (isMounted) {
          console.log("✅ Finished loading posts");
          setLoading(false);
        }
      }
    };

    fetchPosts();

    return () => {
      console.log("🧹 Cleanup: component unmounting");
      isMounted = false;
    };
  }, [currentUser]);

  return (
    <div>
      {/* Stories */}
      <StoriesBar stories={mockStories} />

      {/* Posts Feed */}
      <div>
        {loading && (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              Loading posts...
            </p>
          </div>
        )}

        {!loading && !currentUser && (
          <div className="p-8 text-center text-gray-500">
            Please login to view posts
          </div>
        )}

        {error && !loading && (
          <div className="p-4 text-center text-red-500">{error}</div>
        )}

        {!loading && currentUser && !error && posts.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No posts available. Start following friends to see their posts!
          </div>
        )}

        {!loading &&
          !error &&
          posts.map((post) => <PostCard key={post.id} post={post} />)}
      </div>
    </div>
  );
}
