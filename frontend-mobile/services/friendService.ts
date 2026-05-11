import apiClient from "@/api/apiClient";

export type FriendUser = {
    id: number;
    name?: string;
    username?: string;
    avatar?: string;
    avatarUrl?: string;
    phone?: string;
    bio?: string;
    mutualFriendsCount?: number;
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
    async getFriends(userId: number): Promise<FriendUser[]> {
        try {
            const response = await apiClient.get(`/friends/${userId}`);
            const data = response.data?.data ?? [];
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    async getSentRequests(userId: number): Promise<FriendUser[]> {
        try {
            const response = await apiClient.get(`/friends/sent-requests/${userId}`);
            const data = response.data?.data ?? [];
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    async getFriendRequests(userId: number): Promise<FriendUser[]> {
        try {
            const response = await apiClient.get(`/friends/requests/${userId}`);
            const data = response.data?.data ?? [];
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    async sendFriendRequest(senderId: number, receivedId: number): Promise<boolean> {
        try {
            await apiClient.post("/friends/request", { senderId, receivedId });
            return true;
        } catch {
            return false;
        }
    }

    async acceptFriendRequest(senderId: number, receivedId: number): Promise<boolean> {
        try {
            await apiClient.post("/friends/accept", { senderId, receivedId });
            return true;
        } catch {
            return false;
        }
    }

    async rejectFriendRequest(senderId: number, receivedId: number): Promise<boolean> {
        try {
            await apiClient.post("/friends/reject", { senderId, receivedId });
            return true;
        } catch {
            return false;
        }
    }

    async cancelFriendRequest(senderId: number, receivedId: number): Promise<boolean> {
        try {
            await apiClient.post("/friends/cancel", { senderId, receivedId });
            return true;
        } catch {
            return false;
        }
    }

    async getFriendSuggestions(userId: number, limit = 20): Promise<FriendUser[]> {
        try {
            const response = await apiClient.get(`/friends/suggestions/${userId}`, {
                params: { limit },
            });
            const data = response.data?.data ?? [];
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    async getFriendStatus(myId: number, targetId: number): Promise<"NONE" | "SENT" | "RECEIVED" | "FRIEND" | "BLOCKED"> {
        try {
            const [blockedList, myFriends, receivedRequests, sentRequests] = await Promise.all([
                apiClient.get(`/auth/users/blocked/${myId}`).then((r) => r.data?.data ?? []).catch(() => []),
                apiClient.get(`/friends/${myId}`).then((r) => r.data?.data ?? []).catch(() => []),
                apiClient.get(`/friends/requests/${myId}`).then((r) => r.data?.data ?? []).catch(() => []),
                apiClient.get(`/friends/sent-requests/${myId}`).then((r) => r.data?.data ?? []).catch(() => []),
            ]);

            const hasId = (list: Array<{ id?: number }>, id: number) => list.some((u) => Number(u.id) === id);

            if (hasId(blockedList, targetId)) return "BLOCKED";
            if (hasId(myFriends, targetId)) return "FRIEND";
            if (hasId(receivedRequests, targetId)) return "RECEIVED";
            if (hasId(sentRequests, targetId)) return "SENT";
            return "NONE";
        } catch {
            return "NONE";
        }
    }
}

export default new FriendService();
