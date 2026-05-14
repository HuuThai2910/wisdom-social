import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import chatService from "@/services/chatService";
import chatWebsocketService from "@/services/chatWebsocketService";
import chatRuntimeStore, { type MembersByUserId } from "@/stores/chatRuntimeStore";
import type { Conversation, ConversationMember, Message } from "@/types/chat";

const GROUP_SYSTEM_SYNC_TYPES = new Set<Message["type"]>([
    "SYSTEM_CREATE_GROUP",
    "SYSTEM_ADD_MEMBER",
    "SYSTEM_UPDATE_ROLE",
    "SYSTEM_KICK_MEMBER",
    "SYSTEM_LEAVE_GROUP",
    "SYSTEM_DISBAND_GROUP",
    "SYSTEM_UPDATE_SETTING",
    "SYSTEM_REQUIRE_APPROVAL",
]);

const PRESERVE_EMPTY_PENDING_REQUEST_TYPES = new Set<Message["type"]>([
    "SYSTEM_ADD_MEMBER",
    "SYSTEM_KICK_MEMBER",
    "SYSTEM_UPDATE_ROLE",
    "SYSTEM_UPDATE_SETTING",
]);

function toMembersByUserId(
    members: Record<string, ConversationMember>,
): MembersByUserId {
    const normalized: MembersByUserId = {};

    for (const [rawUserId, member] of Object.entries(members)) {
        const userId = Number(member?.userId ?? rawUserId);
        if (!Number.isFinite(userId) || !member) continue;

        normalized[userId] = {
            ...member,
            userId,
        };
    }

    return normalized;
}

function safeParseMemberIds(content: string): number[] {
    if (!content) return [];

    try {
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map((value: unknown) => {
                if (typeof value === "object" && value !== null && "id" in value) {
                    return Number((value as { id?: unknown }).id);
                }
                return Number(value);
            })
            .filter((value) => Number.isFinite(value));
    } catch {
        return [];
    }
}

function isCurrentUserRemovedByMessage(
    message: Message,
    currentUserId: number,
): boolean {
    if (message.type === "SYSTEM_DISBAND_GROUP") return true;

    if (message.type === "SYSTEM_LEAVE_GROUP") {
        return Number(message.senderId) === Number(currentUserId);
    }

    if (message.type === "SYSTEM_KICK_MEMBER") {
        return safeParseMemberIds(message.content).some(
            (memberId) => Number(memberId) === Number(currentUserId),
        );
    }

    return false;
}

function isActiveMember(member?: ConversationMember): boolean {
    return Boolean(member && (!member.status || member.status === "ACTIVE"));
}

interface UseGroupConversationRealtimeParams {
    conversationId: number;
    currentUserId: number;
    reloadConversations?: () => Promise<void>;
}

export function useGroupConversationRealtime({
    conversationId,
    currentUserId,
    reloadConversations,
}: UseGroupConversationRealtimeParams): void {
    const router = useRouter();
    const hasNavigatedAwayRef = useRef(false);

    useEffect(() => {
        if (!conversationId || !currentUserId) return;

        let disposed = false;
        let unsubscribe: (() => void) | undefined;

        const navigateAway = () => {
            if (hasNavigatedAwayRef.current) return;
            hasNavigatedAwayRef.current = true;
            router.replace("/(tabs)/activity");
        };

        const refreshSnapshot = async (message: Message) => {
            const memberSnapshotVersion =
                chatRuntimeStore.markMembersChanging(conversationId);

            try {
                const [conversationResponse, membersResponse] = await Promise.all([
                    chatService.getConversation(conversationId, currentUserId),
                    chatService.getConversationMembers(conversationId),
                ]);

                if (disposed) return;

                const membersById = toMembersByUserId(membersResponse);
                const acceptedMembers = chatRuntimeStore.setMembers(
                    conversationId,
                    membersById,
                    { memberSnapshotVersion },
                );

                if (conversationResponse.success && conversationResponse.data) {
                    const previousConversation =
                        chatRuntimeStore.getConversation(conversationId);
                    const shouldPreservePendingRequests =
                        PRESERVE_EMPTY_PENDING_REQUEST_TYPES.has(message.type) &&
                        Array.isArray(conversationResponse.data.pendingRequests) &&
                        conversationResponse.data.pendingRequests.length === 0;
                    const nextConversation: Conversation = {
                        ...conversationResponse.data,
                        pendingRequests: shouldPreservePendingRequests
                            ? previousConversation?.pendingRequests ??
                              conversationResponse.data.pendingRequests
                            : conversationResponse.data.pendingRequests,
                        members: Object.values(acceptedMembers),
                    };

                    chatRuntimeStore.setConversation(
                        conversationId,
                        nextConversation,
                        { memberSnapshotVersion },
                    );
                }

                if (!isActiveMember(acceptedMembers[currentUserId])) {
                    navigateAway();
                    return;
                }

                await reloadConversations?.();
            } catch {
                if (isCurrentUserRemovedByMessage(message, currentUserId)) {
                    navigateAway();
                }
            }
        };

        const setup = async () => {
            try {
                if (!chatWebsocketService.isConnected()) {
                    await chatWebsocketService.connect();
                }

                if (disposed) return;

                unsubscribe = chatWebsocketService.subscribeToConversationMessages(
                    conversationId,
                    (message) => {
                        if (!GROUP_SYSTEM_SYNC_TYPES.has(message.type)) return;

                        if (isCurrentUserRemovedByMessage(message, currentUserId)) {
                            navigateAway();
                            return;
                        }

                        void refreshSnapshot(message);
                    },
                );
            } catch {
                // The screen still has the normal conversation-list subscription as fallback.
            }
        };

        void setup();

        return () => {
            disposed = true;
            unsubscribe?.();
        };
    }, [conversationId, currentUserId, reloadConversations, router]);
}
