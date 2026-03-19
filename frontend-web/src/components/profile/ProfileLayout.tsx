import { useParams, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import ProfileHeader from "./ProfileHeader";
import ProfileTabs from "./ProfileTabs";
import axios from "axios";
import type { User } from "../../types";
import { getCurrentUser } from "../../utils/auth";

const API_BASE_URL = "http://localhost:8080/api";

export default function ProfileLayout() {
  const { username } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
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

          // Check if this is the current user's profile
          const currentUser = getCurrentUser();
          if (currentUser && currentUser.username === userData.username) {
            setIsOwnProfile(true);
          } else {
            setIsOwnProfile(false);
          }
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">User not found</h2>
          <p className="text-gray-500">
            The user you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <ProfileHeader user={user} isOwnProfile={isOwnProfile} />
      <ProfileTabs username={user.username} />
      <Outlet context={{ user, isOwnProfile }} />
    </div>
  );
}
