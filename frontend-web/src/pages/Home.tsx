import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { mockStories } from "../api/mockData";
import StoriesBar from "../components/story/StoriesBar";
import PostCard from "../components/post/post-card/PostCard";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { fetchHomeFeedPosts } from "../services/homeFeedService";
import type { Post } from "../types";

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
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

        const routeBoostPostId = (
          location.state as { boostPostId?: string } | null
        )?.boostPostId;
        const storedBoostPostId =
          sessionStorage.getItem("homeBoostPostId") || undefined;
        const boostPostId = routeBoostPostId || storedBoostPostId;

        const feedResult = await fetchHomeFeedPosts(200, {
          prioritizePostId: boostPostId,
        });

        if (!isMounted) return;

        if (isMounted) {
          const normalizedBoostPostId = boostPostId ? String(boostPostId) : "";
          const orderedPosts = [...feedResult.posts];

          if (normalizedBoostPostId) {
            const boostedIndex = orderedPosts.findIndex(
              (post) => String(post.id) === normalizedBoostPostId
            );

            if (boostedIndex > 0) {
              const [boostedPost] = orderedPosts.splice(boostedIndex, 1);
              orderedPosts.unshift(boostedPost);
            }
          }

          setPosts(orderedPosts);
          setError(null);

          if (boostPostId) {
            sessionStorage.removeItem("homeBoostPostId");
            navigate(location.pathname, { replace: true, state: null });
          }
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
  }, [currentUser, location.pathname, location.state, navigate]);

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
