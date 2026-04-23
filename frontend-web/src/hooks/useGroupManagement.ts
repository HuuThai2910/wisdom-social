import { useCallback, useMemo, useRef, useState } from "react";
import chatService, {
    type Conversation,
    type MemberRole,
} from "../services/chatService";
import friendService from "../services/friendService";
import type { User } from "../types";

interface CreateGroupPayload {
    name: string;
    imageUrl?: string;
    memberIds: number[];
}

interface UseGroupManagementParams {
    currentUserId: number;
    selectedConversation: Conversation | null;
    selectedConversationId: number | null;
    reloadConversations: () => Promise<void>;
    onSelectConversation: (conversationId: number) => void;
    onClearSelection: () => void;
}

function normalizeErrorMessage(error: unknown, fallback: string): string {
    if (
        error &&
        typeof error === "object" &&
        "response" in (error as Record<string, unknown>)
    ) {
        const response = (
            error as { response?: { data?: { message?: string } } }
        ).response;
        const serverMessage = response?.data?.message;
        if (serverMessage && serverMessage.trim()) {
            return serverMessage;
        }
    }
    return fallback;
}

export function useGroupManagement({
    currentUserId,
    selectedConversation,
    selectedConversationId,
    reloadConversations,
    onSelectConversation,
    onClearSelection,
}: UseGroupManagementParams) {
    const [friends, setFriends] = useState<User[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [friendsError, setFriendsError] = useState<string | null>(null);
    const hasLoadedFriendsRef = useRef(false);

    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);

    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [isAddingMembers, setIsAddingMembers] = useState(false);
    const [isLeavingGroup, setIsLeavingGroup] = useState(false);
    const [isDisbandingGroup, setIsDisbandingGroup] = useState(false);

    const [pendingKickUserId, setPendingKickUserId] = useState<number | null>(
        null,
    );
    const [pendingRoleUserId, setPendingRoleUserId] = useState<number | null>(
        null,
    );

    const [actionError, setActionError] = useState<string | null>(null);

    const selectedGroupConversation = useMemo(() => {
        if (!selectedConversation || selectedConversation.type !== "GROUP") {
            return null;
        }
        return selectedConversation;
    }, [selectedConversation]);

    const groupMembers = useMemo(
        () => selectedGroupConversation?.members ?? [],
        [selectedGroupConversation],
    );

    const currentMemberRole = useMemo<MemberRole | null>(() => {
        const currentMember = groupMembers.find(
            (member) => member.userId === currentUserId,
        );
        return currentMember?.role ?? null;
    }, [currentUserId, groupMembers]);

    const canManageMembers =
        currentMemberRole === "OWNER" || currentMemberRole === "DEPUTY";
    const canUpdateRole = currentMemberRole === "OWNER";
    const canDisbandGroup = currentMemberRole === "OWNER";

    const groupMemberIds = useMemo(
        () => new Set(groupMembers.map((member) => member.userId)),
        [groupMembers],
    );

    const availableFriends = useMemo(
        () => friends.filter((friend) => friend.id !== currentUserId),
        [currentUserId, friends],
    );

    const loadFriends = useCallback(
        async (forceRefresh: boolean = false) => {
            if (
                !forceRefresh &&
                (friendsLoading || hasLoadedFriendsRef.current)
            ) {
                return;
            }

            if (!currentUserId) {
                return;
            }

            try {
                setFriendsLoading(true);
                setFriendsError(null);

                const friendList =
                    await friendService.getFriends(currentUserId);
                setFriends(Array.isArray(friendList) ? friendList : []);
                hasLoadedFriendsRef.current = true;
            } catch (error) {
                setFriendsError(
                    normalizeErrorMessage(
                        error,
                        "Không thể tải danh sách bạn bè.",
                    ),
                );
            } finally {
                setFriendsLoading(false);
            }
        },
        [currentUserId, friendsLoading],
    );

    const openCreateGroupModal = useCallback(() => {
        setActionError(null);
        setIsCreateGroupModalOpen(true);
        void loadFriends();
    }, [loadFriends]);

    const closeCreateGroupModal = useCallback(() => {
        setIsCreateGroupModalOpen(false);
    }, []);

    const openAddMembersModal = useCallback(() => {
        if (!selectedGroupConversation || !canManageMembers) {
            return;
        }
        setActionError(null);
        setIsAddMembersModalOpen(true);
        void loadFriends();
    }, [canManageMembers, loadFriends, selectedGroupConversation]);

    const closeAddMembersModal = useCallback(() => {
        setIsAddMembersModalOpen(false);
    }, []);

    const createGroup = useCallback(
        async (payload: CreateGroupPayload) => {
            const memberIds = Array.from(new Set(payload.memberIds));
            if (memberIds.length < 2) {
                setActionError(
                    "Vui lòng chọn ít nhất 2 thành viên để tạo nhóm.",
                );
                return false;
            }

            try {
                setIsCreatingGroup(true);
                setActionError(null);

                const createdConversation =
                    await chatService.createGroupConversation({
                        name: payload.name.trim() || undefined,
                        imageUrl: payload.imageUrl?.trim() || undefined,
                        memberIds,
                    });

                await reloadConversations();
                onSelectConversation(createdConversation.id);
                setIsCreateGroupModalOpen(false);
                return true;
            } catch (error) {
                setActionError(
                    normalizeErrorMessage(error, "Không thể tạo nhóm."),
                );
                return false;
            } finally {
                setIsCreatingGroup(false);
            }
        },
        [onSelectConversation, reloadConversations],
    );

    const addMembersToGroup = useCallback(
        async (memberIds: number[]) => {
            if (!selectedConversationId || !selectedGroupConversation) {
                setActionError("Không tìm thấy cuộc trò chuyện nhóm.");
                return false;
            }

            const validIds = Array.from(
                new Set(
                    memberIds.filter(
                        (memberId) =>
                            memberId !== currentUserId &&
                            !groupMemberIds.has(memberId),
                    ),
                ),
            );

            if (validIds.length === 0) {
                setActionError("Vui lòng chọn ít nhất 1 thành viên mới.");
                return false;
            }

            try {
                setIsAddingMembers(true);
                setActionError(null);

                await chatService.addMembersToGroup(selectedConversationId, {
                    newMemberIds: validIds,
                });
                await reloadConversations();
                setIsAddMembersModalOpen(false);
                return true;
            } catch (error) {
                setActionError(
                    normalizeErrorMessage(error, "Không thể thêm thành viên."),
                );
                return false;
            } finally {
                setIsAddingMembers(false);
            }
        },
        [
            currentUserId,
            groupMemberIds,
            reloadConversations,
            selectedConversationId,
            selectedGroupConversation,
        ],
    );

    const updateMemberRole = useCallback(
        async (targetUserId: number, nextRole: MemberRole) => {
            if (!selectedConversationId || !canUpdateRole) {
                return false;
            }

            try {
                setPendingRoleUserId(targetUserId);
                setActionError(null);
                await chatService.updateGroupMemberRole(
                    selectedConversationId,
                    targetUserId,
                    nextRole,
                );
                await reloadConversations();
                return true;
            } catch (error) {
                setActionError(
                    normalizeErrorMessage(
                        error,
                        "Không thể cập nhật quyền thành viên.",
                    ),
                );
                return false;
            } finally {
                setPendingRoleUserId(null);
            }
        },
        [canUpdateRole, reloadConversations, selectedConversationId],
    );

    const kickMember = useCallback(
        async (targetUserId: number) => {
            if (!selectedConversationId || !canManageMembers) {
                return false;
            }

            try {
                setPendingKickUserId(targetUserId);
                setActionError(null);
                await chatService.kickGroupMember(
                    selectedConversationId,
                    targetUserId,
                );
                await reloadConversations();
                return true;
            } catch (error) {
                setActionError(
                    normalizeErrorMessage(error, "Không thể đuổi thành viên."),
                );
                return false;
            } finally {
                setPendingKickUserId(null);
            }
        },
        [canManageMembers, reloadConversations, selectedConversationId],
    );

    const leaveGroup = useCallback(async () => {
        if (!selectedConversationId || !selectedGroupConversation) {
            return false;
        }

        try {
            setIsLeavingGroup(true);
            setActionError(null);
            await chatService.leaveGroup(selectedConversationId);
            await reloadConversations();
            onClearSelection();
            return true;
        } catch (error) {
            setActionError(normalizeErrorMessage(error, "Không thể rời nhóm."));
            return false;
        } finally {
            setIsLeavingGroup(false);
        }
    }, [
        onClearSelection,
        reloadConversations,
        selectedConversationId,
        selectedGroupConversation,
    ]);

    const disbandGroup = useCallback(async () => {
        if (!selectedConversationId || !canDisbandGroup) {
            return false;
        }

        try {
            setIsDisbandingGroup(true);
            setActionError(null);
            await chatService.disbandGroup(selectedConversationId);
            await reloadConversations();
            onClearSelection();
            return true;
        } catch (error) {
            setActionError(
                normalizeErrorMessage(error, "Không thể giải tán nhóm."),
            );
            return false;
        } finally {
            setIsDisbandingGroup(false);
        }
    }, [
        canDisbandGroup,
        onClearSelection,
        reloadConversations,
        selectedConversationId,
    ]);

    const clearGroupActionError = useCallback(() => {
        setActionError(null);
    }, []);

    return {
        selectedGroupConversation,
        groupMembers,
        currentMemberRole,
        canManageMembers,
        canUpdateRole,
        canDisbandGroup,
        groupMemberIds,

        availableFriends,
        friendsLoading,
        friendsError,

        isCreateGroupModalOpen,
        isAddMembersModalOpen,
        isCreatingGroup,
        isAddingMembers,
        isLeavingGroup,
        isDisbandingGroup,
        pendingKickUserId,
        pendingRoleUserId,

        actionError,
        clearGroupActionError,

        openCreateGroupModal,
        closeCreateGroupModal,
        openAddMembersModal,
        closeAddMembersModal,

        createGroup,
        addMembersToGroup,
        updateMemberRole,
        kickMember,
        leaveGroup,
        disbandGroup,
        refreshFriends: loadFriends,
    };
}
