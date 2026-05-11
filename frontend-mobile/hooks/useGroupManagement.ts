import { useCallback, useMemo, useRef, useState } from "react";
import chatService from "@/services/chatService";
import friendService, { type FriendUser } from "@/services/friendService";
import type { Conversation, MemberRole } from "@/types/chat";

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
    onSelectConversation?: (conversationId: number) => void;
    onClearSelection?: () => void;
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
    const [friends, setFriends] = useState<FriendUser[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [friendsError, setFriendsError] = useState<string | null>(null);
    const hasLoadedFriendsRef = useRef(false);
    const friendsLoadingRef = useRef(false);

    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
    const [isTransferOwnerModalOpen, setIsTransferOwnerModalOpen] =
        useState(false);

    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [isAddingMembers, setIsAddingMembers] = useState(false);
    const [isLeavingGroup, setIsLeavingGroup] = useState(false);
    const [isDisbandingGroup, setIsDisbandingGroup] = useState(false);
    const [isUpdatingMessageRestriction, setIsUpdatingMessageRestriction] =
        useState(false);

    const [pendingKickUserId, setPendingKickUserId] = useState<number | null>(
        null,
    );
    const [pendingRoleUserId, setPendingRoleUserId] = useState<number | null>(
        null,
    );
    const [pendingTransferOwnerUserId, setPendingTransferOwnerUserId] =
        useState<number | null>(null);

    const [actionError, setActionError] = useState<string | null>(null);

    const selectedGroupConversation = useMemo(() => {
        if (!selectedConversation || selectedConversation.type !== "GROUP") {
            return null;
        }

        return selectedConversation;
    }, [selectedConversation]);

    const groupMembers = useMemo(
        () =>
            (selectedGroupConversation?.members ?? []).filter(
                (member) => !member.status || member.status === "ACTIVE",
            ),
        [selectedGroupConversation],
    );

    const currentMemberRole = useMemo<MemberRole | null>(() => {
        const currentMember = groupMembers.find(
            (member) => Number(member.userId) === Number(currentUserId),
        );

        return currentMember?.role ?? null;
    }, [currentUserId, groupMembers]);

    const canManageMembers = currentMemberRole !== null;
    const canAddMembers = groupMembers.some(
        (member) => Number(member.userId) === Number(currentUserId),
    );
    const canUpdateRole = currentMemberRole === "OWNER";
    const canManageSettings =
        currentMemberRole === "OWNER" || currentMemberRole === "DEPUTY";
    const canDisbandGroup = currentMemberRole === "OWNER";

    const groupMemberIds = useMemo(
        () => new Set(groupMembers.map((member) => Number(member.userId))),
        [groupMembers],
    );

    const ownerTransferCandidates = useMemo(
        () =>
            groupMembers.filter(
                (member) =>
                    Number(member.userId) !== Number(currentUserId) &&
                    (!member.status || member.status === "ACTIVE"),
            ),
        [currentUserId, groupMembers],
    );

    const availableFriends = useMemo(
        () =>
            friends.filter(
                (friend) => Number(friend.id) !== Number(currentUserId),
            ),
        [currentUserId, friends],
    );

    const loadFriends = useCallback(
        async (forceRefresh = false) => {
            // Dùng ref thay vì state để tránh stale closure trong dependency array
            if (
                !forceRefresh &&
                (friendsLoadingRef.current || hasLoadedFriendsRef.current)
            ) {
                return;
            }

            if (!currentUserId) {
                return;
            }

            try {
                friendsLoadingRef.current = true;
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
                        "Khong the tai danh sach ban be.",
                    ),
                );
            } finally {
                friendsLoadingRef.current = false;
                setFriendsLoading(false);
            }
        },
        [currentUserId], // Bỏ friendsLoading khỏi deps – dùng ref để guard thay thế
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
        if (!selectedGroupConversation || !canAddMembers) return;

        setActionError(null);
        setIsAddMembersModalOpen(true);
        void loadFriends();
    }, [canAddMembers, loadFriends, selectedGroupConversation]);

    const closeAddMembersModal = useCallback(() => {
        setIsAddMembersModalOpen(false);
    }, []);

    const closeTransferOwnerModal = useCallback(() => {
        if (isLeavingGroup) return;
        setIsTransferOwnerModalOpen(false);
    }, [isLeavingGroup]);

    const createGroup = useCallback(
        async (payload: CreateGroupPayload) => {
            const memberIds = Array.from(new Set(payload.memberIds));
            if (memberIds.length < 2) {
                setActionError(
                    "Vui long chon it nhat 2 thanh vien de tao nhom.",
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
                onSelectConversation?.(createdConversation.id);
                setIsCreateGroupModalOpen(false);
                return true;
            } catch (error) {
                setActionError(
                    normalizeErrorMessage(error, "Khong the tao nhom."),
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
                setActionError("Khong tim thay cuoc tro chuyen nhom.");
                return false;
            }

            const validIds = Array.from(
                new Set(
                    memberIds.filter(
                        (memberId) =>
                            Number(memberId) !== Number(currentUserId) &&
                            !groupMemberIds.has(Number(memberId)),
                    ),
                ),
            );

            if (validIds.length === 0) {
                setActionError("Vui long chon it nhat 1 thanh vien moi.");
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
                    normalizeErrorMessage(error, "Khong the them thanh vien."),
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
                        "Khong the cap nhat quyen thanh vien.",
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
                    normalizeErrorMessage(error, "Khong the duoi thanh vien."),
                );
                return false;
            } finally {
                setPendingKickUserId(null);
            }
        },
        [canManageMembers, reloadConversations, selectedConversationId],
    );

    const leaveGroupDirectly = useCallback(async () => {
        if (!selectedConversationId || !selectedGroupConversation) {
            return false;
        }

        try {
            setIsLeavingGroup(true);
            setActionError(null);

            await chatService.leaveGroup(selectedConversationId);
            await reloadConversations();
            onClearSelection?.();
            return true;
        } catch (error) {
            setActionError(normalizeErrorMessage(error, "Khong the roi nhom."));
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

    const leaveGroup = useCallback(async () => {
        if (!selectedConversationId || !selectedGroupConversation) {
            return false;
        }

        const shouldTransferOwnerFirst =
            currentMemberRole === "OWNER" && ownerTransferCandidates.length > 0;

        if (shouldTransferOwnerFirst) {
            setActionError(null);
            setIsTransferOwnerModalOpen(true);
            return false;
        }

        return leaveGroupDirectly();
    }, [
        currentMemberRole,
        leaveGroupDirectly,
        ownerTransferCandidates.length,
        selectedConversationId,
        selectedGroupConversation,
    ]);

    const transferOwnershipAndLeave = useCallback(
        async (newOwnerUserId: number) => {
            if (!selectedConversationId || !selectedGroupConversation) {
                return false;
            }

            if (currentMemberRole !== "OWNER") {
                return leaveGroupDirectly();
            }

            if (
                !ownerTransferCandidates.some(
                    (candidate) =>
                        Number(candidate.userId) === Number(newOwnerUserId),
                )
            ) {
                setActionError("Vui long chon truong nhom moi hop le.");
                return false;
            }

            try {
                setIsLeavingGroup(true);
                setPendingTransferOwnerUserId(newOwnerUserId);
                setActionError(null);

                await chatService.updateGroupMemberRole(
                    selectedConversationId,
                    newOwnerUserId,
                    "OWNER",
                );
                await chatService.leaveGroup(selectedConversationId);

                await reloadConversations();
                setIsTransferOwnerModalOpen(false);
                onClearSelection?.();
                return true;
            } catch (error) {
                setActionError(
                    normalizeErrorMessage(
                        error,
                        "Khong the chuyen truong nhom va roi nhom.",
                    ),
                );
                return false;
            } finally {
                setIsLeavingGroup(false);
                setPendingTransferOwnerUserId(null);
            }
        },
        [
            currentMemberRole,
            leaveGroupDirectly,
            onClearSelection,
            ownerTransferCandidates,
            reloadConversations,
            selectedConversationId,
            selectedGroupConversation,
        ],
    );

    const disbandGroup = useCallback(async () => {
        if (!selectedConversationId || !canDisbandGroup) {
            return false;
        }

        try {
            setIsDisbandingGroup(true);
            setActionError(null);

            await chatService.disbandGroup(selectedConversationId);
            await reloadConversations();
            onClearSelection?.();
            return true;
        } catch (error) {
            setActionError(
                normalizeErrorMessage(error, "Khong the giai tan nhom."),
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

    const updateMessageRestriction = useCallback(
        async (isRestricted: boolean) => {
            if (!selectedConversationId || !canManageSettings) {
                return false;
            }

            try {
                setIsUpdatingMessageRestriction(true);
                setActionError(null);
                await chatService.updateMessageRestriction(
                    selectedConversationId,
                    isRestricted,
                );
                await reloadConversations();
                return true;
            } catch (error) {
                setActionError(
                    normalizeErrorMessage(error, "Khong the cap nhat cai dat."),
                );
                return false;
            } finally {
                setIsUpdatingMessageRestriction(false);
            }
        },
        [canManageSettings, reloadConversations, selectedConversationId],
    );

    const clearGroupActionError = useCallback(() => {
        setActionError(null);
    }, []);

    return {
        selectedGroupConversation,
        groupMembers,
        currentMemberRole,
        canManageMembers,
        canAddMembers,
        canUpdateRole,
        canManageSettings,
        canDisbandGroup,
        groupMemberIds,

        availableFriends,
        friendsLoading,
        friendsError,

        isCreateGroupModalOpen,
        isAddMembersModalOpen,
        isTransferOwnerModalOpen,
        isCreatingGroup,
        isAddingMembers,
        isLeavingGroup,
        isDisbandingGroup,
        isUpdatingMessageRestriction,
        pendingKickUserId,
        pendingRoleUserId,
        pendingTransferOwnerUserId,
        ownerTransferCandidates,

        actionError,
        clearGroupActionError,

        openCreateGroupModal,
        closeCreateGroupModal,
        openAddMembersModal,
        closeAddMembersModal,
        closeTransferOwnerModal,

        createGroup,
        addMembersToGroup,
        updateMemberRole,
        kickMember,
        leaveGroup,
        transferOwnershipAndLeave,
        disbandGroup,
        updateMessageRestriction,
        refreshFriends: loadFriends,
    };
}
