import { useMemo, useState, useEffect, useRef } from "react";
import {
    Crown,
    ShieldCheck,
    UserMinus,
    UserPlus,
    Users,
    UserRoundX,
    ChevronDown,
    ArrowLeft,
    MoreHorizontal,
    X,
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
    canKickMembers: boolean;
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
    isConfirmLeaveModalOpen: boolean;
    onSetConfirmLeaveModalOpen: (open: boolean) => void;
    isConfirmDisbandModalOpen: boolean;
    onSetConfirmDisbandModalOpen: (open: boolean) => void;
    isConfirmKickModalOpen: boolean;
    kickTargetUserId: number | null;
    onOpenConfirmKick: (userId: number) => void;
    onCloseConfirmKick: () => void;
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
    canKickMembers,
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
    isConfirmLeaveModalOpen,
    onSetConfirmLeaveModalOpen,
    isConfirmDisbandModalOpen,
    onSetConfirmDisbandModalOpen,
    isConfirmKickModalOpen,
    kickTargetUserId,
    onOpenConfirmKick,
    onCloseConfirmKick,
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

    const [isMemberListOpen, setIsMemberListOpen] = useState(false);
    const [hoveredMemberId, setHoveredMemberId] = useState<number | null>(null);
    const [activeMenuMemberId, setActiveMenuMemberId] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setActiveMenuMemberId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const memberCount = members.length;
    const currentUserMember = members.find(m => m.userId === currentUserId);
    const isOwner = currentUserMember?.role === "OWNER";

    return (
        <section className="py-3">
            {/* Summary View in Info Panel */}
            <div className="group relative rounded-xl border border-transparent px-3 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-[#1a1a1a]">
                <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
                        Thành viên
                    </h3>
                    <ChevronDown size={18} className="text-gray-500" />
                </div>

                <button
                    type="button"
                    onClick={() => setIsMemberListOpen(true)}
                    className="mt-4 flex w-full items-center gap-3 text-left"
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-[#262626]">
                        <Users size={20} className="text-gray-600 dark:text-gray-300" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {memberCount} thành viên
                    </span>
                </button>
            </div>

            {/* Member List Modal (Side Overlay style) */}
            {isMemberListOpen && (
                <div className="fixed inset-0 z-[60] flex justify-end bg-black/50 transition-opacity">
                    <div className="flex h-full w-full max-w-md flex-col bg-white animate-in slide-in-from-right duration-300 dark:bg-[#111111]">
                        {/* Modal Header */}
                        <div className="flex h-14 items-center border-b border-gray-100 px-4 dark:border-[#262626]">
                            <button
                                type="button"
                                onClick={() => setIsMemberListOpen(false)}
                                className="mr-2 rounded-full p-2 hover:bg-gray-100 dark:hover:bg-[#262626]"
                            >
                                <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
                            </button>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                Thành viên
                            </h2>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Action Buttons */}
                            <div className="space-y-2">
                                {canManageMembers && (
                                    <button
                                        type="button"
                                        onClick={onOpenAddMembersModal}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-200 dark:bg-[#262626] dark:text-white dark:hover:bg-[#333333]"
                                    >
                                        <UserPlus size={18} />
                                        Thêm thành viên
                                    </button>
                                )}

                                {canDisbandGroup && (
                                    <button
                                        type="button"
                                        onClick={() => onSetConfirmDisbandModalOpen(true)}
                                        disabled={isDisbandingGroup || isLeavingGroup}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                                    >
                                        <UserMinus size={18} />
                                        {isDisbandingGroup ? "Đang giải tán..." : "Giải tán nhóm"}
                                    </button>
                                )}
                            </div>

                            {/* Members List */}
                            <div className="mt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                        Danh sách thành viên ({memberCount})
                                    </h3>
                                    <MoreHorizontal size={18} className="text-gray-500 cursor-pointer" />
                                </div>

                                <div className="space-y-1">
                                    {members.map((member) => {
                                        const isMe = member.userId === currentUserId;
                                        const canShowMenu = isMe || isOwner;
                                        
                                        return (
                                            <div
                                                key={member.userId}
                                                onMouseEnter={() => setHoveredMemberId(member.userId)}
                                                onMouseLeave={() => setHoveredMemberId(null)}
                                                className="relative flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-[#1a1a1a]"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <img
                                                            src={member.avatar || DEFAULT_AVATAR_URL}
                                                            alt={member.nickname}
                                                            className="h-10 w-10 rounded-full object-cover"
                                                        />
                                                        {member.role === "OWNER" && (
                                                            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100 dark:bg-[#111111] dark:ring-[#262626]">
                                                                <Crown size={10} className="text-amber-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {isMe ? "Bạn" : member.nickname || "Người dùng"}
                                                        </p>
                                                        {member.role === "OWNER" && (
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                                Trưởng nhóm
                                                            </p>
                                                        )}
                                                        {member.role === "DEPUTY" && (
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                                Phó nhóm
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Triple dot menu on hover */}
                                                {canShowMenu && (hoveredMemberId === member.userId || activeMenuMemberId === member.userId) && (
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveMenuMemberId(member.userId);
                                                            }}
                                                            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#333333]"
                                                        >
                                                            <MoreHorizontal size={18} className="text-gray-600 dark:text-gray-400" />
                                                        </button>

                                                        {activeMenuMemberId === member.userId && (
                                                            <div 
                                                                ref={menuRef}
                                                                className="absolute right-0 top-full z-10 mt-1 w-40 rounded-xl bg-white p-1.5 shadow-2xl ring-1 ring-black/5 dark:bg-[#262626]"
                                                            >
                                                                {isMe ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setActiveMenuMemberId(null);
                                                                            void onLeaveGroup();
                                                                        }}
                                                                        className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg dark:text-gray-200 dark:hover:bg-[#333333]"
                                                                    >
                                                                        Rời nhóm
                                                                    </button>
                                                                ) : isOwner ? (
                                                                    <div className="flex flex-col">
                                                                        {member.role === "MEMBER" ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setActiveMenuMemberId(null);
                                                                                    void onUpdateMemberRole(member.userId, "DEPUTY");
                                                                                }}
                                                                                className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg dark:text-gray-200 dark:hover:bg-[#333333]"
                                                                            >
                                                                                Thêm phó nhóm
                                                                            </button>
                                                                        ) : member.role === "DEPUTY" ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setActiveMenuMemberId(null);
                                                                                    void onUpdateMemberRole(member.userId, "MEMBER");
                                                                                }}
                                                                                className="flex w-full items-center pl-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg dark:text-gray-200 dark:hover:bg-[#333333]"
                                                                            >
                                                                                Gỡ quyền phó nhóm
                                                                            </button>
                                                                        ) : null}
                                                                        
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setActiveMenuMemberId(null);
                                                                                void onKickMember(member.userId);
                                                                            }}
                                                                            className="flex w-full items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg dark:text-red-400 dark:hover:bg-red-900/20"
                                                                        >
                                                                            Xóa khỏi nhóm
                                                                        </button>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
