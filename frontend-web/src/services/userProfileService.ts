import axiosClient from "../api/axiosClient";

export interface UserProfile {
    id: string;
    username: string;
    name: string;
    avatarUrl: string;
    bio?: string;
    phone?: string;
    birthday?: string;
    gender?: string;
    friendCount: number;
    followerCount: number;
    followingCount: number;
    postCount: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface ApiResponse<T> {
    status: number;
    success: boolean;
    message: string;
    data: T;
}

/**
 * Fetch user profile by username
 * First search username, then get full profile with stats
 */
export const fetchUserProfileByUsername = async (
    username: string
): Promise<UserProfile | null> => {
    try {
        // Step 1: Search user by username
        console.log(`📱 Searching for username: ${username}`);
        const searchRes = await axiosClient.get(
            `/auth/users/username/${encodeURIComponent(username)}`
        );

        console.log("📥 Search response:", searchRes.data);

        // Handle both wrapped ApiResponse and direct array response
        const users = Array.isArray(searchRes.data)
            ? searchRes.data
            : Array.isArray(searchRes.data?.data)
                ? searchRes.data.data
                : [];

        console.log(`👥 Found ${users.length} users`);

        const userBasic = users.find((u: any) => u.username === username);
        if (!userBasic) {
            console.warn(`⚠️ Username not found in results: ${username}`);
            return null;
        }

        console.log(`✅ Found user: ${userBasic.username} (ID: ${userBasic.id})`);

        // Step 2: Get full profile with stats using user ID
        console.log(`📤 Fetching full profile for user ID: ${userBasic.id}`);
        const profileRes = await axiosClient.get(
            `/auth/user/${userBasic.id}`
        );

        console.log("📥 Profile response:", profileRes.data);

        // Handle both wrapped ApiResponse and direct object response
        const profileData = profileRes.data?.data || profileRes.data;

        if (!profileData || !profileData.id) {
            console.warn(`⚠️ No valid profile data returned for user ID: ${userBasic.id}`);
            return null;
        }

        // Map backend keys to frontend User type
        const profile: UserProfile = {
            id: String(profileData.id),
            username: profileData.username,
            name: profileData.name || profileData.username,
            avatarUrl: profileData.avatarUrl,
            bio: profileData.bio,
            phone: profileData.phone,
            birthday: profileData.birthday,
            gender: profileData.gender,
            friendCount: profileData.friendCount || 0,
            followerCount: profileData.followerCount || 0,
            followingCount: profileData.followingCount || 0,
            postCount: profileData.postCount || 0,
            createdAt: profileData.createdAt,
            updatedAt: profileData.updatedAt,
        };

        console.log("✅ Profile loaded successfully:", profile);
        return profile;
    } catch (error: any) {
        console.error("❌ Error fetching user profile:", {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
        });
        return null;
    }
};

/**
 * Fetch user profile by ID
 */
export const fetchUserProfileById = async (
    userId: string | number
): Promise<UserProfile | null> => {
    try {
        console.log(`📤 Fetching user profile by ID: ${userId}`);
        const res = await axiosClient.get(
            `/auth/user/${userId}`
        );
        console.log("📥 Profile response:", res.data);

        // Handle both wrapped ApiResponse and direct object response
        const profileData = res.data?.data || res.data;

        if (!profileData || !profileData.id) {
            console.warn(`⚠️ No valid profile data returned for user ID: ${userId}`);
            return null;
        }

        console.log(`✅ Profile loaded for user ${userId}:`, profileData);
        return {
            id: String(profileData.id),
            username: profileData.username,
            name: profileData.name || profileData.username,
            avatarUrl: profileData.avatarUrl,
            bio: profileData.bio,
            phone: profileData.phone,
            birthday: profileData.birthday,
            gender: profileData.gender,
            friendCount: profileData.friendCount || 0,
            followerCount: profileData.followerCount || 0,
            followingCount: profileData.followingCount || 0,
            postCount: profileData.postCount || 0,
            createdAt: profileData.createdAt,
            updatedAt: profileData.updatedAt,
        };
    } catch (error: any) {
        console.error("❌ Error fetching user profile by ID:", {
            userId,
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
        });
        return null;
    }
};

/**
 * Fetch user posts
 */
export const fetchUserPosts = async (userId: string | number): Promise<any[]> => {
    try {
        console.log(`📤 Fetching posts for user ID: ${userId}`);
        const res = await axiosClient.get(
            `/posts/user/${userId}`
        );
        console.log("📥 Posts response:", res.data);

        // Handle both wrapped ApiResponse and direct array response
        const posts = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data?.data)
                ? res.data.data
                : [];

        console.log(`✅ Fetched ${posts.length} posts for user ${userId}`);
        return posts;
    } catch (error: any) {
        console.error("❌ Error fetching user posts:", {
            userId,
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
        });
        return [];
    }
};
