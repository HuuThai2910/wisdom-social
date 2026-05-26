import { useParams, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import ProfileHeader from "./ProfileHeader";
import ProfileTabs from "./ProfileTabs";
import type { User } from "../../types";
import { getCurrentUser } from "../../utils/auth";
import userService from "../../services/userService";
import friendService from "../../services/friendService";
import blockService from "../../services/blockService";
import websocketService from "../../services/websocket";
import { convertPhoneToInternational } from "../../hooks/useCurrentUser";

export default function ProfileLayout() {
  const { username } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!username) return;

      try {
        setLoading(true);
        setError("");

        const users = await userService.searchUserByUsername(username);
        if (users && users.length > 0) {
          let userData = users[0];

          // Load additional counts
          try {
            const [friends] = await Promise.all([
              friendService.getFriends(userData.id),
            ]);
            userData = {
              ...userData,
              friendsCount: friends?.length || 0,
            };
          } catch (err) {
            console.error("Error loading counts:", err);
          }

          // Check if this is the current user's profile
          const currentUser = await getCurrentUser();
          if (currentUser && currentUser.username === userData.username) {
            setIsOwnProfile(true);
            setUser(userData as any);
          } else if (currentUser) {
            // Check if this user has blocked the current user
            try {
              const blockedByThis = await blockService.getBlockedUsers(
                userData.id
              );
              const isBlockedByThisUser = blockedByThis.some(
                (u: User) => u.id === currentUser.id
              );

              if (isBlockedByThisUser) {
                setIsBlocked(true);
                setError(
                  `Bạn không thể xem hồ sơ này vì người dùng đã chặn bạn.`
                );
              } else {
                setUser(userData as any);
                setIsOwnProfile(false);
              }
            } catch (err) {
              setUser(userData as any);
              setIsOwnProfile(false);
            }
          } else {
            setUser(userData as any);
            setIsOwnProfile(false);
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setError("Không thể tải hồ sơ người dùng");
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [username]);

  // Subscribe to real-time profile updates via WebSocket
  useEffect(() => {
    if (!user?.phone) return;

    const phone = convertPhoneToInternational(user.phone);
    if (!phone) return;

    const handleProfileUpdate = (updatedData: any) => {
      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...(updatedData.username != null && {
            username: updatedData.username,
          }),
          ...(updatedData.name != null && { fullName: updatedData.name }),
          ...(updatedData.avatarUrl != null && {
            avatarUrl: updatedData.avatarUrl,
          }),
          ...(updatedData.bio != null && { bio: updatedData.bio }),
          ...(updatedData.birthday != null && {
            birthday: updatedData.birthday,
          }),
          ...(updatedData.gender != null && { gender: updatedData.gender }),
        };
      });
    };

    const setup = async () => {
      if (!websocketService.isConnected()) {
        await websocketService.connect();
      }
      websocketService.subscribeToProfileUpdates(phone, handleProfileUpdate);
    };

    setup();

    return () => {
      websocketService.unsubscribeFromProfileUpdates(
        phone,
        handleProfileUpdate
      );
    };
  }, [user?.phone]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#000]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 dark:text-white">
            Không thể xem hồ sơ
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {error || "Người dùng này đã chặn bạn."}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#000]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 dark:text-white">
            Không tìm thấy
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {error || "Người dùng không tồn tại."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black min-h-screen">
      <ProfileHeader user={user} isOwnProfile={isOwnProfile} />
      <ProfileTabs username={user.username} />
      <div className="max-w-3xl mx-auto px-1 sm:px-2 pt-1 pb-8">
        <Outlet context={{ user, isOwnProfile }} />
      </div>
    </div>
  );
}
