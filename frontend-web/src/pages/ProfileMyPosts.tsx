import { useParams } from "react-router-dom";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileTabs from "../components/profile/ProfileTabs";
import PostGrid from "../components/profile/PostGrid";
import { mockUsers, mockPosts } from "../api/mockData";

export default function ProfileMyPosts() {
    const { username } = useParams();
    const user = mockUsers.find((u) => u.username === username);

    if (!user) {
        return <div className="p-4 text-center">User not found</div>;
    }

    const userPosts = mockPosts.filter((p) => p.user.username === username);

    return (
        <div className="max-w-4xl mx-auto">
            <ProfileHeader user={user} />
            <ProfileTabs username={username!} />
            <PostGrid posts={userPosts} />
        </div>
    );
}
