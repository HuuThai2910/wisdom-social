import { useParams, useOutletContext } from "react-router-dom";
import { useState, useEffect } from "react";
import PostGrid from "../components/profile/PostGrid";
import axiosClient from "../api/axiosClient";
import { buildS3Url } from "../utils/s3";
import type { User, Post } from "../types";

interface Post {
  id: string;
  authorId: string;
  content: string;
  privacy: string;
  media: Array<{
    url: string;
    type: string;
  }>;
  location?: {
    name: string;
  };
  hashtags: string[];
  mentions: string[];
  stats: {
    reactCount: number;
    commentCount: number;
    shareCount: number;
    viewCount: number;
  };
  createdAt: string;
}

interface ApiResponse<T> {
  status: number;
  success: boolean;
  message: string;
  data: T;
}

interface OutletContext {
  user: User;
  isOwnProfile: boolean;
}

export default function ProfileMyPosts() {
  const { username } = useParams();
  const { user, isOwnProfile } = useOutletContext<OutletContext>();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        if (!user) return;

        setLoading(true);
        setError(null);

        // Fetch user's posts
        const postsResponse = await axiosClient.get<ApiResponse<Post[]>>(
          `/posts/user/${user.id}`
        );

        const postsData = postsResponse.data?.data || [];

        // Transform posts to match PostGrid expected format
        const transformedPosts = postsData.map((post: Post) => {
          const firstImage =
            post.media && post.media.length > 0 ? post.media[0].url : null;
          return {
            id: post.id,
            imageUrl: firstImage ? buildS3Url(firstImage) : null,
            likes: post.stats?.reactCount || 0,
            comments: post.stats?.commentCount || 0,
            caption: post.content,
            privacy: post.privacy,
            images: firstImage ? [buildS3Url(firstImage)] : [],
            user: {
              id: user.id,
              username: user.username,
              fullName: user.fullName,
              avatar: user.avatar,
            },
          };
        });

        setPosts(transformedPosts);
      } catch (err: any) {
        console.error("Error fetching posts:", err);
        setError(err.message || "Failed to load posts");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [user]);

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

  return <PostGrid posts={posts} isOwnProfile={isOwnProfile} />;
}
