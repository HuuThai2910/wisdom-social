import { useParams } from "react-router-dom";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileTabs from "../components/profile/ProfileTabs";
import { useUserProfile } from "../hooks/useProfileHooks";
import { useCurrentUser } from "../hooks/useCurrentUser";

export default function ProfileGeneral() {
  const { username } = useParams();
  const { user, loading, error } = useUserProfile(username);
  const currentUser = useCurrentUser();

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (error || !user) {
    return <div className="p-4 text-center">User not found</div>;
  }

  const isOwnProfile = currentUser?.username === username;

  return (
    <div className="max-w-4xl mx-auto">
      <ProfileHeader user={user} isOwnProfile={isOwnProfile} />
      <ProfileTabs username={username!} />
      <div className="p-6 text-center text-gray-500">
        General profile information will be displayed here
      </div>
    </div>
  );
}
