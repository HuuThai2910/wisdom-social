import { useParams, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import ProfileHeader from "./ProfileHeader";
import ProfileTabs from "./ProfileTabs";
import type { User } from "../../types";
import { getCurrentUser } from "../../utils/auth";
import userService from "../../services/userService";

export default function ProfileLayout() {
  const { username } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!username) return;

      try {
        setLoading(true);
        const users = await userService.searchUserByUsername(username);
        if (users && users.length > 0) {
          const userData = users[0];
          setUser(userData as any);

          // Check if this is the current user's profile
          const currentUser = await getCurrentUser();
          if (currentUser && currentUser.username === userData.username) {
            setIsOwnProfile(true);
          } else {
            setIsOwnProfile(false);
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
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
