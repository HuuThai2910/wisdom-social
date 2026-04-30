import apiClient from "@/api/apiClient";

export type UpdateUserPayload = {
    name?: string;
    username?: string;
    bio?: string;
    birthday?: string;
    gender?: "MALE" | "FEMALE" | "HIDDEN";
    website?: string;
};

export type User = {
    id: string;
    username: string;
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
    bio?: string;
    avatarUrl?: string;
    avatar?: string;
    birthday?: string;
    gender?: "MALE" | "FEMALE" | "HIDDEN";
    website?: string;
    followers?: number;
    following?: number;
    postsCount?: number;
};

const userService = {
    async searchUserByUsername(username: string): Promise<User[] | null> {
        try {
            const response = await apiClient.get("/users/search", {
                params: { username },
            });
            return response.data?.data ?? null;
        } catch (error) {
            console.error("Error searching user:", error);
            return null;
        }
    },

    async updateUser(userId: string, data: UpdateUserPayload): Promise<User> {
        try {
            const payload: Record<string, any> = {};

            if (data.name) payload.fullName = data.name;
            if (data.username) payload.username = data.username;
            if (data.bio) payload.bio = data.bio;
            if (data.birthday) payload.birthday = data.birthday;
            if (data.gender) payload.gender = data.gender;
            if (data.website) payload.website = data.website;

            const response = await apiClient.put(`/users/${userId}`, payload);
            return response.data?.data ?? response.data;
        } catch (error) {
            console.error("Error updating user:", error);
            throw error;
        }
    },

    async getCurrentUser(): Promise<User | null> {
        try {
            const response = await apiClient.get("/auth/me");
            return response.data?.data ?? null;
        } catch (error) {
            console.error("Error fetching current user:", error);
            return null;
        }
    },

    async getUploadAvatarUrl(folder: string, extension: string): Promise<string> {
        try {
            const response = await apiClient.get("/upload-url", {
                params: { folder, extension },
            });
            return response.data?.data?.url ?? response.data?.url ?? "";
        } catch (error) {
            console.error("Error getting upload URL:", error);
            throw error;
        }
    },

    async updateUploadAvatarUrl(
        folder: string,
        extension: string,
    ): Promise<string> {
        return this.getUploadAvatarUrl(folder, extension);
    },
};

export default userService;
