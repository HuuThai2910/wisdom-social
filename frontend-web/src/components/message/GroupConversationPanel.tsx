import { useMemo } from "react";
import {
    Crown,
    ShieldCheck,
    UserMinus,
    UserPlus,
    Users,
    UserRoundX,
} from "lucide-react";
import type {
    Conversation,
    ConversationMember,
    MemberRole,
} from "../../services/chatService";
import { DEFAULT_AVATAR_URL } from "../../constants/ui";
import TransferOwnershipModal from "./TransferOwnershipModal";

interface GroupConversationPanelProps {
    conversation: Conversation;
    currentUserId: number;
    canManageMembers: boolean;
    canUpdateRole: boolean;
    canDisbandGroup: boolean;
    isLeavingGroup: boolean;
    isDisbandingGroup: boolean;
    isTransferOwnerModalOpen: boolean;
    pendingKickUserId: number | null;
    pendingRoleUserId: number | null;
    pendingTransferOwnerUserId: number | null;
    ownerTransferCandidates: ConversationMember[];
    actionError: string | null;
    onOpenAddMembersModal: () => void;
    onLeaveGroup: () => Promise<boolean>;
    onCloseTransferOwnerModal: () => void;
    onTransferOwnershipAndLeave: (newOwnerUserId: number) => Promise<boolean>;
    onDisbandGroup: () => Promise<boolean>;
    onKickMember: (targetUserId: number) => Promise<boolean>;
    onUpdateMemberRole: (
        targetUserId: number,
        nextRole: MemberRole,
    ) => Promise<boolean>;
}

function roleLabel(role?: MemberRole): string {
    if (role === "OWNER") return "Trưởng nhóm";
    if (role === "DEPUTY") return "Phó nhóm";
    return "Thành viên";
}

function roleBadgeClass(role?: MemberRole): string {
    if (role === "OWNER") {
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300";
    }
    if (role === "DEPUTY") {
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300";
    }
    return "bg-gray-100 text-gray-700 dark:bg-[#1f1f1f] dark:text-gray-300";
}

function sortMembers(members: ConversationMember[]): ConversationMember[] {
    const roleOrder: Record<MemberRole, number> = {
        OWNER: 0,
        DEPUTY: 1,
        MEMBER: 2,
    };

    return [...members].sort((a, b) => {
        const firstRole = a.role ?? "MEMBER";
        const secondRole = b.role ?? "MEMBER";

        if (roleOrder[firstRole] !== roleOrder[secondRole]) {
            return roleOrder[firstRole] - roleOrder[secondRole];
        }

        return (a.nickname || "").localeCompare(b.nickname || "");
    });
}

export default function GroupConversationPanel({
    conversation,
    currentUserId,
    canManageMembers,
    canUpdateRole,
    canDisbandGroup,
    isLeavingGroup,
    isDisbandingGroup,
    isTransferOwnerModalOpen,
    pendingKickUserId,
    pendingRoleUserId,
    pendingTransferOwnerUserId,
    ownerTransferCandidates,
    actionError,
    onOpenAddMembersModal,
    onLeaveGroup,
    onCloseTransferOwnerModal,
    onTransferOwnershipAndLeave,
    onDisbandGroup,
    onKickMember,
    onUpdateMemberRole,
}: GroupConversationPanelProps) {
    const members = useMemo(
        () =>
            sortMembers(
                (conversation.members ?? []).filter(
                    (member) => !member.status || member.status === "ACTIVE",
                ),
            ),
        [conversation.members],
    );

    const memberCount = members.length;

    const handleLeaveGroup = async () => {
        await onLeaveGroup();
    };

    const handleDisbandGroup = async () => {
        const accepted = window.confirm(
            "Giải tán nhóm sẽ kết thúc cuộc trò chuyện cho tất cả thành viên. Tiếp tục?",
        );
        if (!accepted) return;
        await onDisbandGroup();
    };

    return (
        <section className="py-3">
            <div className="rounded-xl border border-gray-200 bg-white/80 p-3 dark:border-[#2a2a2a] dark:bg-[#111111]">
                <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            Quản lý nhóm
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <Users size={13} className="mr-1 inline-flex" />
                            {memberCount} thành viên
                        </p>
                    </div>
                    {canManageMembers && (
                        <button
                            type="button"
                            onClick={onOpenAddMembersModal}
                            className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-200 dark:hover:bg-blue-900/30"
                        >
                            <UserPlus size={14} />
                            Thêm người
                        </button>
                    )}
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void handleLeaveGroup()}
                        disabled={isLeavingGroup || isDisbandingGroup}
                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2f2f2f] dark:text-gray-200 dark:hover:bg-[#1a1a1a]"
                    >
                        <UserRoundX size={14} />
                        {isLeavingGroup ? "Đang rời nhóm..." : "Rời nhóm"}
                    </button>

                    {canDisbandGroup && (
                        <button
                            type="button"
                            onClick={() => void handleDisbandGroup()}
                            disabled={isDisbandingGroup || isLeavingGroup}
                            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                        >
                            <UserMinus size={14} />
                            {isDisbandingGroup
                                ? "Đang giải tán..."
                                : "Giải tán nhóm"}
                        </button>
                    )}
                </div>

                {actionError && (
                    <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-300">
                        {actionError}
                    </p>
                )}

                <div className="space-y-2">
                    {members.map((member) => {
                        const isCurrentUser = member.userId === currentUserId;
                        const isOwner = member.role === "OWNER";
                        const isUpdatingRole =
                            pendingRoleUserId === member.userId;
                        const isKicking = pendingKickUserId === member.userId;

                        return (
                            <div
                                key={member.userId}
                                className="rounded-lg border border-gray-200 px-3 py-2 dark:border-[#2f2f2f]"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <img
                                            src={
                                                member.avatar ||
                                                DEFAULT_AVATAR_URL
                                            }
                                            alt={member.nickname}
                                            className="h-9 w-9 rounded-full object-cover"
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                                {member.nickname ||
                                                    "Người dùng"}
                                                {isCurrentUser ? " (Bạn)" : ""}
                                            </p>
                                            {member.username && (
                                                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                                    @{member.username}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${roleBadgeClass(member.role)}`}
                                    >
                                        {member.role === "OWNER" ? (
                                            <Crown size={11} />
                                        ) : member.role === "DEPUTY" ? (
                                            <ShieldCheck size={11} />
                                        ) : null}
                                        {roleLabel(member.role)}
                                    </span>
                                </div>

                                {(canUpdateRole || canManageMembers) &&
                                    !isCurrentUser && (
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            {canUpdateRole && !isOwner && (
                                                <select
                                                    value={
                                                        member.role ?? "MEMBER"
                                                    }
                                                    onChange={(event) =>
                                                        void onUpdateMemberRole(
                                                            member.userId,
                                                            event.target
                                                                .value as MemberRole,
                                                        )
                                                    }
                                                    disabled={isUpdatingRole}
                                                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2f2f2f] dark:bg-[#1a1a1a] dark:text-gray-200"
                                                >
                                                    <option value="MEMBER">
                                                        Thành viên
                                                    </option>
                                                    <option value="DEPUTY">
                                                        Phó nhóm
                                                    </option>
                                                    <option value="OWNER">
                                                        Trưởng nhóm
                                                    </option>
                                                </select>
                                            )}
                                            {canManageMembers && !isOwner && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const accepted =
                                                            window.confirm(
                                                                `Đuổi ${member.nickname || "thành viên"} khỏi nhóm?`,
                                                            );
                                                        if (!accepted) return;
                                                        void onKickMember(
                                                            member.userId,
                                                        );
                                                    }}
                                                    disabled={isKicking}
                                                    className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                                                >
                                                    {isKicking
                                                        ? "Đang đuổi..."
                                                        : "Đuổi khỏi nhóm"}
                                                </button>
                                            )}
                                        </div>
                                    )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <TransferOwnershipModal
                open={isTransferOwnerModalOpen}
                members={ownerTransferCandidates}
                submitting={isLeavingGroup}
                pendingUserId={pendingTransferOwnerUserId}
                error={actionError}
                onClose={onCloseTransferOwnerModal}
                onSubmit={onTransferOwnershipAndLeave}
            />
        </section>
    );
}
