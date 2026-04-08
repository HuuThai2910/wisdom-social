import { useParams, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import ProfileHeader from "./ProfileHeader";
import ProfileTabs from "./ProfileTabs";
import type { User } from "../../types";
import { getCurrentUser } from "../../utils/auth";
import { fetchUserProfileByUsername } from "../../services/userProfileService";

export default function ProfileLayout() {
  const { username } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!username) return;

      try {
        setLoading(true);
        setError(null);
        const profileData = await fetchUserProfileByUsername(username);

        if (profileData) {
          // Map from profile service response to User type
          const user: User = {
            id: profileData.id,
            username: profileData.username,
            fullName: profileData.name,
            avatar: profileData.avatarUrl || "https://i.pravatar.cc/150?img=5",
            bio: profileData.bio,
            phone: profileData.phone,
            birthday: profileData.birthday,
            gender: profileData.gender as any,
            postsCount: profileData.postCount,
            friendsCount: profileData.friendCount,
            followersCount: profileData.followerCount,
            followingCount: profileData.followingCount,
          };
          setUser(user);

          // Check if this is the current user's profile
          const currentUser = getCurrentUser();
          if (currentUser && currentUser.username === user.username) {
            setIsOwnProfile(true);
          } else {
            setIsOwnProfile(false);
          }
        } else {
          setError("User not found");
        }
      } catch (err) {
        setError("Failed to load user profile");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
    // Only depend on username to avoid infinite loops
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 text-red-600">{error}</h2>
          <p className="text-gray-500">Failed to load user profile</p>
        </div>
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
