import { useState, useEffect } from "react";
import { mockStories } from "../api/mockData";
import StoriesBar from "../components/story/StoriesBar";
import PostCard from "../components/post/PostCard";
import axiosClient from "../api/axiosClient";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { transformMediaToS3Urls } from "../services/postService";
import type { Post } from "../types";

interface PostData {
  id: string;
  authorId: string;
  content: string;
  privacy?: string;
  media?: Array<{
    url: string;
    type: string;
    order: number;
    duration?: number;
    width?: number;
    height?: number;
  }>;
  stats?: { reactCount: number; commentCount: number; shareCount: number };
  createdAt: string;
}

export default function Home() {
  const currentUser = useCurrentUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPosts = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);

        if (!currentUser?.id) {
          if (isMounted) setLoading(false);
          return;
        }

        if (isMounted) setError(null);

        let allPosts: PostData[] = [];

        try {
          // First, try to fetch from friends
          const friendsResponse = await axiosClient.get(
            `/users/${currentUser.id}/friends`
          );

          if (!isMounted) return;

          const friendsData =
            friendsResponse.data.data || friendsResponse.data || [];

          const friendIds = [
            currentUser.id,
            ...friendsData.map((friend: any) => friend.userId || friend.id),
          ];

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
        } catch (friendsError: any) {
          console.warn("⚠️ Could not fetch friends:", friendsError.message);

          if (!isMounted) return;

          // If friends API fails, just fetch current user's posts
          const postsResponse = await axiosClient.get(
            `/posts/user/${currentUser.id}`
          );

          if (!isMounted) return;

          allPosts = postsResponse.data.data || [];
        }

        if (!isMounted) return;

        // Sort by createdAt descending
        allPosts.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Transform posts to match PostCard format
        const transformedPosts = await Promise.all(
          allPosts.map(async (post) => {
            try {
              // Fetch author data
              const userResponse = await axiosClient.get(
                `/auth/user/${post.authorId}`
              );
              const userData = userResponse.data.data;

              const transformedImages = transformMediaToS3Urls(
                post.media,
                post.authorId
              );
              const transformedMedia = (post.media || []).map(
                (m, mediaIndex) => ({
                  url: transformedImages[mediaIndex] || "",
                  type: (m.type || "image").toLowerCase(),
                  duration:
                    typeof m.duration === "number" ? m.duration : undefined,
                })
              );

              return {
                id: post.id,
                user: {
                  id: userData.id,
                  username: userData.username,
                  fullName: userData.name || userData.username,
                  avatarUrl:
                    userData.avatarUrl || "https://i.pravatar.cc/150?img=5",
                },
                images: transformedImages,
                media: transformedMedia,
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
          setLoading(false);
        }
      }
    };

    fetchPosts();

    return () => {
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
