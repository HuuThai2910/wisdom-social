import { useParams } from "react-router-dom";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileTabs from "../components/profile/ProfileTabs";
import { mockUsers } from "../api/mockData";

export default function ProfileGeneral() {
    const { username } = useParams();
    const user = mockUsers.find((u) => u.username === username);

    if (!user) {
        return <div className="p-4 text-center">User not found</div>;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <ProfileHeader user={user} />
            <ProfileTabs username={username!} />
            <div className="p-6 text-center text-gray-500">
                General profile information will be displayed here
            </div>
        </div>
    );
}
