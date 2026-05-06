import apiClient from "@/api/apiClient";
import { mockFeatureFriends, mockFeatureRequests } from "@/constants";

export type FriendUser = {
    id: number;
    name?: string;
    username?: string;
    avatarUrl?: string;
    phone?: string;
};

function toFriendUsers(payload: unknown): FriendUser[] | null {
    const candidates = [
        payload,
        (payload as { data?: unknown } | null)?.data,
        (payload as { data?: { data?: unknown } } | null)?.data?.data,
    ];

    for (const candidate of candidates) {
        if (!Array.isArray(candidate)) {
            continue;
        }

        const normalized = candidate
            .map((item) => {
                if (!item || typeof item !== "object") return null;

                const raw = item as Record<string, unknown>;
                const id = Number(raw.id);
                if (!Number.isFinite(id)) return null;

                return {
                    id,
                    name:
                        (typeof raw.name === "string" && raw.name.trim()) ||
                        undefined,
                    username:
                        (typeof raw.username === "string" &&
                            raw.username.trim()) ||
                        undefined,
                    avatarUrl:
                        (typeof raw.avatarUrl === "string" &&
                            raw.avatarUrl.trim()) ||
                        undefined,
                    phone:
                        (typeof raw.phone === "string" && raw.phone.trim()) ||
                        undefined,
                } as FriendUser;
            })
            .filter((item): item is FriendUser => Boolean(item));

        return normalized;
    }

    return null;
}

class FriendService {
    private localFriends: FriendUser[] = [...mockFeatureFriends];

    private localRequests: FriendUser[] = [...mockFeatureRequests];

    async getFriends(userId: number): Promise<FriendUser[]> {
        try {
            const response = await apiClient.get(`/friends/${userId}`);
            const parsed = toFriendUsers(response.data);
            if (parsed) {
                return parsed;
            }
            return [];
        } catch {
            return [];
        }
    }

    async getFriendRequests(userId: number): Promise<FriendUser[]> {
        try {
            const response = await apiClient.get(`/friends/requests/${userId}`);
            const parsed = toFriendUsers(response.data);
            if (parsed) {
                return parsed;
            }
            return [];
        } catch {
            return [];
        }
    }

    async sendFriendRequest(senderId: number, receivedId: number): Promise<boolean> {
        try {
            await apiClient.post("/friends/request", { senderId, receivedId });
            return true;
        } catch {
            if (!this.localRequests.some((user) => user.id === receivedId)) {
                this.localRequests = [
                    ...this.localRequests,
                    {
                        id: receivedId,
                        name: `User ${receivedId}`,
                        username: `user${receivedId}`,
                    },
                ];
            }
            return false;
        }
    }

    async acceptFriendRequest(senderId: number, receivedId: number): Promise<boolean> {
        try {
            await apiClient.post("/friends/accept", { senderId, receivedId });
            return true;
        } catch {
            const accepted = this.localRequests.find((user) => user.id === senderId);
            if (accepted && !this.localFriends.some((user) => user.id === senderId)) {
                this.localFriends = [accepted, ...this.localFriends];
            }
            this.localRequests = this.localRequests.filter((user) => user.id !== senderId);
            return false;
        }
    }

    async rejectFriendRequest(senderId: number, receivedId: number): Promise<boolean> {
        try {
            await apiClient.post("/friends/reject", { senderId, receivedId });
            return true;
        } catch {
            this.localRequests = this.localRequests.filter((user) => user.id !== senderId);
            return false;
        }
    }

    async cancelFriendRequest(senderId: number, receivedId: number): Promise<boolean> {
        try {
            await apiClient.post("/friends/cancel", { senderId, receivedId });
            return true;
        } catch {
            this.localFriends = this.localFriends.filter((user) => user.id !== receivedId);
            this.localRequests = this.localRequests.filter((user) => user.id !== receivedId);
            return false;
        }
    }

    async getFriendStatus(myId: number, targetId: number): Promise<"NONE" | "SENT" | "RECEIVED" | "FRIEND" | "BLOCKED"> {
        try {
            const [blockedList, myFriends, receivedRequests, theirRequests] = await Promise.all([
                apiClient.get(`/auth/users/blocked/${myId}`).then((r) => r.data?.data ?? []).catch(() => []),
                apiClient.get(`/friends/${myId}`).then((r) => r.data?.data ?? []).catch(() => []),
                apiClient.get(`/friends/requests/${myId}`).then((r) => r.data?.data ?? []).catch(() => []),
                apiClient.get(`/friends/requests/${targetId}`).then((r) => r.data?.data ?? []).catch(() => []),
            ]);

            const hasId = (list: Array<{ id?: number }>, id: number) => list.some((u) => Number(u.id) === id);

            if (hasId(blockedList, targetId)) return "BLOCKED";
            if (hasId(myFriends, targetId)) return "FRIEND";
            if (hasId(receivedRequests, targetId)) return "RECEIVED";
            if (hasId(theirRequests, myId)) return "SENT";
            return "NONE";
        } catch {
            if (this.localFriends.some((u) => u.id === targetId)) return "FRIEND";
            if (this.localRequests.some((u) => u.id === targetId)) return "RECEIVED";
            return "NONE";
        }
    }
}

export default new FriendService();
