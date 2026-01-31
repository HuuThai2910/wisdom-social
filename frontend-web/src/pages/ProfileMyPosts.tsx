import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileTabs from "../components/profile/ProfileTabs";
import PostGrid from "../components/profile/PostGrid";
import axios from "axios";
import type { User } from "../types";
import { getCurrentUser } from "../utils/auth";

const API_BASE_URL = "http://localhost:8080/api";

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

export default function ProfileMyPosts() {
  const { username } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndPosts = async () => {
      try {
        // Fetch user info
        const userResponse = await axios.get(
          `${API_BASE_URL}/auth/user/${username}`
        );

        if (userResponse.data.success) {
          const userData = userResponse.data.data;
          const userId = userData.id;

          setUser({
            id: userId.toString(),
            username: userData.username,
            fullName: userData.name || userData.username,
            avatar: userData.avatarUrl || "https://i.pravatar.cc/150?img=5",
            bio: userData.bio,
            friendsCount: userData.friendCount || 0,
            followersCount: userData.followerCount || 0,
            followingCount: userData.followingCount || 0,
            postsCount: userData.postCount || 0,
          });

          // Fetch user's posts
          const postsResponse = await axios.get(
            `${API_BASE_URL}/posts/user/${userId}`
          );

          if (postsResponse.data.success) {
            const postsData = postsResponse.data.data;
            // Transform posts to match PostGrid expected format
            const transformedPosts = postsData.map((post: Post) => {
              return {
                id: post.id, // Now it's already a String from MongoDB
                imageUrl:
                  post.media && post.media.length > 0
                    ? post.media[0].url
                    : null,
                likes: post.stats?.reactCount || 0,
                comments: post.stats?.commentCount || 0,
                caption: post.content,
                images: [
                  post.media && post.media.length > 0 ? post.media[0].url : "",
                ],
                user: {
                  id: userId.toString(),
                  username: userData.username,
                  fullName: userData.name || userData.username,
                  avatar:
                    userData.avatarUrl || "https://i.pravatar.cc/150?img=5",
                },
              };
            });
            setPosts(transformedPosts);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchUserAndPosts();
    }
  }, [username]);

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (!user) {
    return <div className="p-4 text-center">User not found</div>;
  }

  const currentUser = getCurrentUser();
  const isOwnProfile = currentUser?.username === username;

  return (
    <div className="max-w-4xl mx-auto">
      <ProfileHeader user={user} isOwnProfile={isOwnProfile} />
      <ProfileTabs username={username!} />
      <PostGrid posts={posts} isOwnProfile={isOwnProfile} />
    </div>
  );
}
