import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileTabs from "../components/profile/ProfileTabs";
import PostGrid from "../components/profile/PostGrid";
import { mockPosts } from "../api/mockData";
import axios from "axios";
import type { User } from "../types";
import { getCurrentUser } from "../utils/auth";

const API_BASE_URL = "http://localhost:8080/api";

export default function ProfileSavedPost() {
  const { username } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/auth/user/${username}`
        );
        if (response.data.success) {
          const userData = response.data.data;
          setUser({
            id: userData.id.toString(),
            username: userData.username,
            fullName: userData.name || userData.username,
            avatar: userData.avatarUrl || "https://i.pravatar.cc/150?img=5",
            bio: userData.bio,
            friendsCount: userData.friendCount || 0,
            followersCount: userData.followerCount || 0,
            followingCount: userData.followingCount || 0,
            postsCount: userData.postCount || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchUser();
    }
  }, [username]);

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (!user) {
    return <div className="p-4 text-center">User not found</div>;
  }

  const savedPosts = mockPosts.slice(0, 2);

  return (
    <div className="max-w-4xl mx-auto">
      <ProfileHeader user={user} />
      <ProfileTabs username={username!} />
      <PostGrid posts={savedPosts} />
    </div>
  );
}
