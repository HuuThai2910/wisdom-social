import {
    Archive,
    Ban,
    Bell,
    BellOff,
    ChevronDown,
    ChevronUp,
    CircleUserRound,
    EyeOff,
    FileText,
    Flag,
    Images,
    Link2,
    Lock,
    LogOut,
    LucideUserPlus2,
    Pin,
    MoreHorizontal,
    Search,
    Settings,
    Trash2,
    User,
    X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ChatWindow from "../components/message/ChatWindow";
import ConfirmModal from "../components/message/ConfirmModal";
import ConversationAvatar from "../components/message/ConversationAvatar";
import CreateGroupModal from "../components/message/CreateGroupModal";
import GroupConversationPanel from "../components/message/GroupConversationPanel";
import GroupSettingsModal from "../components/message/GroupSettingsModal";
import InviteLinkModal from "../components/message/InviteLinkModal";
import SelectGroupMembersModal from "../components/message/SelectGroupMembersModal";
import { useGroupManagement } from "../hooks/useGroupManagement";
import { useMessagesController } from "../hooks/useMessagesController";
import { useSidebarLayout } from "../hooks/useSidebarLayout";
import chatService from "../services/chatService";
import { buildConversationLastMessagePreview } from "../utils/conversationLastMessagePreview";

type DetailSectionKey = "chatInfo" | "customize" | "media" | "privacy";

export default function Messages() {
    const INFO_PANEL_WIDTH = 352;
    const { sidebarWidth } = useSidebarLayout();
    const {
        searchQuery,
        setSearchQuery,
        loading,
        error,
        selectedConversationId,
        currentUserId,
        conversations,
        pinnedConversations,
        isPinLimitReached,
        filteredConversations,
        handleSelectConversation,
        clearSelectedConversation,
        handleDeleteConversationForMe,
        pinConversation,
        unpinConversation,
        replacePinnedConversation,
        getDisplayInfo,
        formatTime,
        clearUnreadCount,
        selectedConversationReadOnlyNotice,
        reload,
    } = useMessagesController();

    const [openMenuConvId, setOpenMenuConvId] = useState<number | null>(null);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [isInfoPanelRendered, setIsInfoPanelRendered] = useState(false);
    const [isGroupSettingsModalOpen, setIsGroupSettingsModalOpen] =
        useState(false);
    const [isInviteLinkModalOpen, setIsInviteLinkModalOpen] = useState(false);
    const [pendingPinConversationId, setPendingPinConversationId] = useState<
        number | null
    >(null);
    const [selectedUnpinConversationId, setSelectedUnpinConversationId] =
        useState<number | null>(null);
    const [isReplacingPin, setIsReplacingPin] = useState(false);
    const [expandedSections, setExpandedSections] = useState<
        Record<DetailSectionKey, boolean>
    >({
        chatInfo: true,
        customize: true,
        media: true,
        privacy: true,
    });
    const menuRef = useRef<HTMLDivElement>(null);

    const selectedConversation =
        conversations.find((conv) => conv.id === selectedConversationId) ||
        null;
    const isGroupConversation = selectedConversation?.type === "GROUP";

    const {
        selectedGroupConversation,
        canManageMembers,
        canKickMembers,
        canUpdateRole,
        canManageSettings,
        canDisbandGroup,
        groupMemberIds,
        friendsForCreateGroup,
        friendsForAddMembers,
        friendsLoading,
        friendsError,
        isCreateGroupModalOpen,
        isAddMembersModalOpen,
        isCreatingGroup,
        isAddingMembers,
        isLeavingGroup,
        isDisbandingGroup,
        isUpdatingMessageRestriction,
        isUpdatingJoinApproval,
        isTransferOwnerModalOpen,
        pendingKickUserId,
        pendingRoleUserId,
        pendingJoinRequestId,
        pendingTransferOwnerUserId,
        ownerTransferCandidates,
        actionError,
        joinApprovalToast,
        clearJoinApprovalToast,
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
        executeLeaveGroup,
        disbandGroup,
        updateMessageRestriction,
        updateJoinApproval,
        processJoinRequest,
        isConfirmLeaveModalOpen,
        setIsConfirmLeaveModalOpen,
        isConfirmDisbandModalOpen,
        setIsConfirmDisbandModalOpen,
        isConfirmKickModalOpen,
        kickTargetUserId,
        openConfirmKick,
        closeConfirmKick,
    } = useGroupManagement({
        currentUserId,
        selectedConversation,
        selectedConversationId,
        reloadConversations: reload,
        onSelectConversation: handleSelectConversation,
        onClearSelection: clearSelectedConversation,
    });

    useEffect(() => {
        if (!joinApprovalToast) return;
        const timer = window.setTimeout(clearJoinApprovalToast, 2600);
        return () => window.clearTimeout(timer);
    }, [clearJoinApprovalToast, joinApprovalToast]);

    const selectedDisplayInfo = selectedConversation
        ? getDisplayInfo(selectedConversation)
        : null;

    const selectedStatus = selectedConversation?.lastMessage?.lastMessageAt
        ? `Hoạt động ${formatTime(selectedConversation.lastMessage.lastMessageAt)} trước`
        : "Đang hoạt động gần đây";
    const pendingPinConversation =
        pendingPinConversationId != null
            ? conversations.find((conv) => conv.id === pendingPinConversationId)
            : null;
    const pendingPinDisplayInfo = pendingPinConversation
        ? getDisplayInfo(pendingPinConversation)
        : null;

    const toggleDetailSection = useCallback((key: DetailSectionKey) => {
        setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const handleChangeNickname = useCallback(async () => {
        if (!selectedConversationId || !selectedConversation) return;
        if (selectedConversation.type === "GROUP") return;

        const targetMember = (selectedConversation.members ?? []).find(
            (member) => member.userId !== currentUserId,
        );

        if (!targetMember) {
            return;
        }

        const newNickname = window.prompt(
            "Nhập biệt danh mới",
            targetMember.nickname || "",
        );

        if (!newNickname || !newNickname.trim()) {
            return;
        }

        try {
            await chatService.updateConversationMemberNickname({
                conversationId: selectedConversationId,
                targetUserId: targetMember.userId,
                nickname: newNickname.trim(),
            });
        } catch {
            // noop: tên sẽ được đồng bộ lại qua websocket MEMBER_UPDATED
        }
    }, [currentUserId, selectedConversation, selectedConversationId]);

    // Click outside để đóng menu
    useEffect(() => {
        if (!openMenuConvId) return;
        function handleOutside(e: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setOpenMenuConvId(null);
            }
        }
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [openMenuConvId]);

    useEffect(() => {
        if (showInfoPanel) {
            setIsInfoPanelRendered(true);
            return;
        }

        const timer = window.setTimeout(() => {
            setIsInfoPanelRendered(false);
        }, 260);

        return () => window.clearTimeout(timer);
    }, [showInfoPanel]);

    useEffect(() => {
        if (!selectedConversationId) {
            setShowInfoPanel(false);
        }
    }, [selectedConversationId]);

    const closeGroupDetailSurfaces = useCallback(() => {
        setShowInfoPanel(false);
        setIsGroupSettingsModalOpen(false);
        setIsInviteLinkModalOpen(false);
        closeAddMembersModal();
        closeTransferOwnerModal();
        setIsConfirmLeaveModalOpen(false);
        setIsConfirmDisbandModalOpen(false);
        closeConfirmKick();
    }, [
        closeAddMembersModal,
        closeConfirmKick,
        closeTransferOwnerModal,
        setIsConfirmDisbandModalOpen,
        setIsConfirmLeaveModalOpen,
    ]);

    const handleConversationForbidden = useCallback(() => {
        closeGroupDetailSurfaces();
    }, [closeGroupDetailSurfaces]);

    useEffect(() => {
        if (!selectedConversationReadOnlyNotice) return;
        closeGroupDetailSurfaces();
    }, [closeGroupDetailSurfaces, selectedConversationReadOnlyNotice]);

    const handleDeleteConversation = useCallback(
        (convId: number) => {
            setOpenMenuConvId(null);
            void handleDeleteConversationForMe(convId);
        },
        [handleDeleteConversationForMe],
    );

    const openReplacePinModal = useCallback((conversationId: number) => {
        setPendingPinConversationId(conversationId);
        setSelectedUnpinConversationId(null);
    }, []);

    const closeReplacePinModal = useCallback(() => {
        if (isReplacingPin) return;
        setPendingPinConversationId(null);
        setSelectedUnpinConversationId(null);
    }, [isReplacingPin]);

    const handleToggleConversationPin = useCallback(
        (conversationId: number, isPinnedConversation: boolean) => {
            setOpenMenuConvId(null);

            if (isPinnedConversation) {
                void unpinConversation(conversationId);
                return;
            }

            if (isPinLimitReached) {
                openReplacePinModal(conversationId);
                return;
            }

            void pinConversation(conversationId);
        },
        [
            isPinLimitReached,
            openReplacePinModal,
            pinConversation,
            unpinConversation,
        ],
    );

    const handleConfirmReplacePin = useCallback(async () => {
        if (!pendingPinConversationId || !selectedUnpinConversationId) return;

        setIsReplacingPin(true);
        const success = await replacePinnedConversation(
            selectedUnpinConversationId,
            pendingPinConversationId,
        );
        setIsReplacingPin(false);

        if (success) {
            setPendingPinConversationId(null);
            setSelectedUnpinConversationId(null);
        }
    }, [
        pendingPinConversationId,
        replacePinnedConversation,
        selectedUnpinConversationId,
    ]);

    const handleToggleInfoPanel = useCallback(() => {
        if (!selectedConversationId) {
            return;
        }
        setShowInfoPanel((prev) => !prev);
    }, [selectedConversationId]);

    const handleCloseInfoPanel = useCallback(() => {
        setShowInfoPanel(false);
    }, []);

    const menuItemBase =
        "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-[#363636]";

    const detailSectionButtonClass =
        "flex w-full items-center justify-between rounded-md px-1.5 py-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800";

    const detailActionButtonClass =
        "flex w-full items-center gap-3 rounded-md px-1.5 py-3 text-left text-gray-800 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800";

    const infoPanelContent = (
        <>
            <div className="flex items-center justify-between border-b border-gray-200/90 px-5 py-4 dark:border-[#262626]">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Chi tiết đoạn chat
                </p>
                <button
                    type="button"
                    onClick={handleCloseInfoPanel}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                    title="Đóng bảng thông tin"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="flex flex-col items-center pb-4 text-center">
                    {selectedConversation && selectedDisplayInfo && (
                        <ConversationAvatar
                            name={selectedDisplayInfo.name}
                            avatarUrl={selectedDisplayInfo.avatar}
                            compositeAvatarUrls={
                                selectedDisplayInfo.hasCompositeAvatar
                                    ? selectedDisplayInfo.compositeAvatars
                                    : undefined
                            }
                            fallbackAvatarUrl={
                                selectedDisplayInfo.fallbackAvatar
                            }
                            sizeClassName="mb-3 h-20 w-20"
                            ringClassName="ring-1 ring-gray-200 dark:ring-[#242424]"
                        />
                    )}
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {selectedDisplayInfo?.name || "Không xác định"}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {selectedStatus}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                        <Lock size={12} />
                        Được mã hóa đầu cuối
                    </span>

                    <div className="mt-5 grid w-full grid-cols-3 gap-2">
                        {!isGroupConversation && (
                            <button className="flex flex-col items-center gap-1.5 rounded-md px-2 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white">
                                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-900">
                                    <CircleUserRound size={16} />
                                </span>
                                Trang cá nhân
                            </button>
                        )}
                        <button className="flex flex-col items-center gap-1.5 rounded-md px-2 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white">
                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-900">
                                <Bell size={16} />
                            </span>
                            Tắt thông báo
                        </button>
                        <button className="flex flex-col items-center gap-1.5 rounded-md px-2 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white">
                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-900">
                                <Search size={16} />
                            </span>
                            Tìm kiếm
                        </button>
                        {isGroupConversation && (
                            <button
                                type="button"
                                onClick={() =>
                                    setIsGroupSettingsModalOpen(true)
                                }
                                className="flex flex-col items-center gap-1.5 rounded-md px-2 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white"
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-900">
                                    <Settings size={16} />
                                </span>
                                Quản lý nhóm
                            </button>
                        )}
                    </div>
                </div>

                <div className="h-px bg-gray-300 dark:bg-[#262626]" />

                {selectedGroupConversation && (
                    <>
                        <GroupConversationPanel
                            conversation={selectedGroupConversation}
                            currentUserId={currentUserId}
                            canManageMembers={canManageMembers}
                            canKickMembers={canKickMembers}
                            canUpdateRole={canUpdateRole}
                            pendingJoinRequestId={pendingJoinRequestId}
                            isLeavingGroup={isLeavingGroup}
                            isTransferOwnerModalOpen={isTransferOwnerModalOpen}
                            pendingKickUserId={pendingKickUserId}
                            pendingRoleUserId={pendingRoleUserId}
                            pendingTransferOwnerUserId={
                                pendingTransferOwnerUserId
                            }
                            ownerTransferCandidates={ownerTransferCandidates}
                            actionError={actionError}
                            onOpenAddMembersModal={openAddMembersModal}
                            onLeaveGroup={leaveGroup}
                            onCloseTransferOwnerModal={closeTransferOwnerModal}
                            onTransferOwnershipAndLeave={
                                transferOwnershipAndLeave
                            }
                            onKickMember={kickMember}
                            onUpdateMemberRole={updateMemberRole}
                            onProcessJoinRequest={processJoinRequest}
                            isConfirmLeaveModalOpen={isConfirmLeaveModalOpen}
                            onSetConfirmLeaveModalOpen={
                                setIsConfirmLeaveModalOpen
                            }
                            isConfirmKickModalOpen={isConfirmKickModalOpen}
                            kickTargetUserId={kickTargetUserId}
                            onOpenConfirmKick={openConfirmKick}
                            onCloseConfirmKick={closeConfirmKick}
                        />
                        <div className="h-px bg-gray-300 dark:bg-[#262626]" />
                    </>
                )}

                <div className="space-y-0">
                    {selectedGroupConversation && (
                        <>
                            <section className="py-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsInviteLinkModalOpen(true)
                                    }
                                    className={detailActionButtonClass}
                                >
                                    <Link2 size={18} />
                                    <span>Link tham gia nhóm</span>
                                </button>
                            </section>
                            <div className="h-px bg-gray-300 dark:bg-[#262626]" />
                        </>
                    )}

                    <div className="h-px bg-gray-300 dark:bg-[#262626]" />

                    <section className="py-2">
                        <button
                            type="button"
                            onClick={() => toggleDetailSection("media")}
                            className={detailSectionButtonClass}
                        >
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                File phương tiện, File & Link
                            </span>
                            {expandedSections.media ? (
                                <ChevronUp
                                    size={18}
                                    className="text-gray-600 dark:text-gray-300"
                                />
                            ) : (
                                <ChevronDown
                                    size={18}
                                    className="text-gray-600 dark:text-gray-300"
                                />
                            )}
                        </button>
                        {expandedSections.media && (
                            <div className="pb-1">
                                <button className={detailActionButtonClass}>
                                    <Images size={18} />
                                    <span>File phương tiện</span>
                                </button>
                                <button className={detailActionButtonClass}>
                                    <FileText size={18} />
                                    <span>File</span>
                                </button>
                                <button className={detailActionButtonClass}>
                                    <Link2 size={18} />
                                    <span>Link</span>
                                </button>
                            </div>
                        )}
                    </section>

                    <div className="h-px bg-gray-400 dark:bg-[#262626]" />

                    <section className="py-2">
                        <button
                            type="button"
                            onClick={() => toggleDetailSection("privacy")}
                            className={detailSectionButtonClass}
                        >
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                Quyền riêng tư và hỗ trợ
                            </span>
                            {expandedSections.privacy ? (
                                <ChevronUp
                                    size={18}
                                    className="text-gray-600 dark:text-gray-300"
                                />
                            ) : (
                                <ChevronDown
                                    size={18}
                                    className="text-gray-600 dark:text-gray-300"
                                />
                            )}
                        </button>
                        {expandedSections.privacy && (
                            <div className="pb-1">
                                <button className={detailActionButtonClass}>
                                    <BellOff size={18} />
                                    <span>Tắt thông báo</span>
                                </button>

                                <button className={detailActionButtonClass}>
                                    <EyeOff size={18} />
                                    <span>Hạn chế</span>
                                </button>
                                <button className={detailActionButtonClass}>
                                    <Ban size={18} />
                                    <span>Chặn</span>
                                </button>
                                <button className="flex w-full items-start justify-between gap-3 rounded-md px-1.5 py-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                                    <div className="flex items-start gap-3">
                                        <Flag
                                            size={18}
                                            className="mt-0.5 text-black dark:text-white"
                                        />
                                        <div>
                                            <p className="text-gray-900 dark:text-white">
                                                Báo cáo
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Đóng góp ý kiến và báo cáo cuộc
                                                trò chuyện
                                            </p>
                                        </div>
                                    </div>
                                </button>
                                {isGroupConversation && (
                                    <button
                                        type="button"
                                        onClick={() => void leaveGroup()}
                                        className="flex w-full items-start gap-3 rounded-md px-1.5 py-2 text-left transition-colors hover:bg-red-50 dark:hover:bg-red-900/10 group"
                                    >
                                        <LogOut
                                            size={18}
                                            className="mt-0.5 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform"
                                        />
                                        <div>
                                            <p className="text-red-600 dark:text-red-400 font-medium">
                                                Rời khỏi nhóm
                                            </p>
                                        </div>
                                    </button>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>
            {selectedGroupConversation && (
                <GroupSettingsModal
                    isOpen={isGroupSettingsModalOpen}
                    onClose={() => setIsGroupSettingsModalOpen(false)}
                    conversation={selectedGroupConversation}
                    canManageSettings={canManageSettings}
                    canDisbandGroup={canDisbandGroup}
                    isDisbandingGroup={isDisbandingGroup}
                    isLeavingGroup={isLeavingGroup}
                    isUpdatingMessageRestriction={isUpdatingMessageRestriction}
                    isUpdatingJoinApproval={isUpdatingJoinApproval}
                    onSetConfirmDisbandModalOpen={setIsConfirmDisbandModalOpen}
                    onUpdateMessageRestriction={updateMessageRestriction}
                    onUpdateJoinApproval={updateJoinApproval}
                />
            )}
            {selectedGroupConversation && (
                <InviteLinkModal
                    key={selectedGroupConversation.id}
                    open={isInviteLinkModalOpen}
                    conversation={selectedGroupConversation}
                    canManageInviteLink={canManageSettings}
                    onClose={() => setIsInviteLinkModalOpen(false)}
                    onChanged={reload}
                />
            )}
        </>
    );

    return (
        <>
            <div
                className="fixed inset-0 bottom-16 left-0 flex overflow-hidden border-r border-gray-200/80 bg-linear-to-b from-[#f8fafd] to-[#f2f5fa] dark:border-[#262626] dark:from-black dark:to-black md:bottom-0"
                style={{ left: `${sidebarWidth}px` }}
            >
                {/* Left Sidebar - Chat List */}
                <div
                    className={`flex w-full flex-col border-r border-gray-200/80 bg-white/95 backdrop-blur-sm transition-[width] duration-300 ease-out dark:border-[#262626] dark:bg-black ${
                        selectedConversationId
                            ? "md:w-66 lg:w-71"
                            : "md:w-75 lg:w-80"
                    }`}
                >
                    {/* Header */}
                    <div className="border-b border-gray-200/80 p-4 dark:border-[#262626]">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                                    Messages
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={openCreateGroupModal}
                                title="Tạo nhóm mới"
                                className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-[#262626] dark:hover:text-white"
                            >
                                <LucideUserPlus2 size={20} />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Tìm kiếm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-xl border border-transparent bg-gray-100 py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-200 focus:bg-white dark:bg-gray-900 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-900 dark:focus:bg-black"
                            />
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                        </div>
                    </div>

                    {/* Chat List */}
                    <div className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <p className="text-gray-500">Đang tải...</p>
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center py-8 px-4">
                                <p className="text-gray-500 text-sm text-center">
                                    {error}
                                </p>
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                                <p className="text-gray-500">
                                    Không có cuộc trò chuyện nào
                                </p>
                            </div>
                        ) : (
                            filteredConversations.map((conv) => {
                                const displayInfo = getDisplayInfo(conv);
                                const isActive =
                                    selectedConversationId === conv.id;
                                const isMenuOpen = openMenuConvId === conv.id;
                                const isPinnedConversation =
                                    pinnedConversations.some(
                                        (pin) =>
                                            pin.conversationId === conv.id,
                                    );
                                const messagePreview =
                                    buildConversationLastMessagePreview({
                                        conversation: conv,
                                        currentUserId,
                                    });

                                return (
                                    <div
                                        key={conv.id}
                                        className="group/item relative"
                                    >
                                        <div
                                            onClick={() =>
                                                handleSelectConversation(
                                                    conv.id,
                                                )
                                            }
                                            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 transition-colors ${
                                                isActive
                                                    ? "border-blue-100 bg-blue-50/90 shadow-sm dark:border-[#262626] dark:bg-gray-900"
                                                    : "border-transparent hover:border-gray-200 hover:bg-gray-50 dark:hover:border-[#242424] dark:hover:bg-[#131313]"
                                            }`}
                                        >
                                            <div className="relative">
                                                <ConversationAvatar
                                                    name={displayInfo.name}
                                                    avatarUrl={
                                                        displayInfo.avatar
                                                    }
                                                    compositeAvatarUrls={
                                                        displayInfo.hasCompositeAvatar
                                                            ? displayInfo.compositeAvatars
                                                            : undefined
                                                    }
                                                    fallbackAvatarUrl={
                                                        displayInfo.fallbackAvatar
                                                    }
                                                    sizeClassName="h-14 w-14"
                                                    ringClassName="ring-1 ring-gray-200 dark:ring-[#2a2a2a]"
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex min-w-0 items-center gap-1.5">
                                                    {isPinnedConversation && (
                                                        <Pin
                                                            size={13}
                                                            className="shrink-0 fill-red-500 text-red-500"
                                                            aria-label="Đã ghim"
                                                        />
                                                    )}
                                                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                                        {displayInfo.name}
                                                    </p>
                                                </div>
                                                <p
                                                    className={`truncate text-sm ${
                                                        conv.unreadCount &&
                                                        conv.unreadCount > 0
                                                            ? "font-semibold text-gray-900 dark:text-white"
                                                            : "text-gray-500 dark:text-gray-400"
                                                    }`}
                                                >
                                                    {messagePreview.showSenderPrefix && (
                                                        <>
                                                            <span>
                                                                {
                                                                    messagePreview.senderLabel
                                                                }
                                                            </span>
                                                            {" : "}
                                                        </>
                                                    )}
                                                    {messagePreview.text}
                                                </p>
                                            </div>

                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                                    {conv.lastMessage
                                                        ?.lastMessageAt
                                                        ? formatTime(
                                                              conv.lastMessage
                                                                  .lastMessageAt,
                                                          )
                                                        : ""}
                                                </span>
                                                {(conv.unreadCount ?? 0) >
                                                    0 && (
                                                    <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5">
                                                        <span className="text-xs text-white font-semibold">
                                                            {conv.unreadCount! >
                                                            99
                                                                ? "99+"
                                                                : conv.unreadCount}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Button "..." - hiện khi hover, đặt bên ngoài conversation row */}
                                        <div
                                            ref={isMenuOpen ? menuRef : null}
                                            className="absolute right-3 top-1/2 z-50 -translate-y-1/2"
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuConvId(
                                                        isMenuOpen
                                                            ? null
                                                            : conv.id,
                                                    );
                                                }}
                                                className={`flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm transition-all hover:bg-gray-100 dark:bg-[#262626] dark:text-gray-300 dark:hover:bg-[#363636] ${
                                                    isMenuOpen
                                                        ? "opacity-100"
                                                        : "opacity-0 group-hover/item:opacity-100"
                                                }`}
                                            >
                                                <MoreHorizontal
                                                    size={18}
                                                    className="text-gray-700 dark:text-gray-300"
                                                />
                                            </button>

                                            {/* Context Menu */}
                                            {isMenuOpen && (
                                                <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white py-2 shadow-2xl dark:border-[#363636] dark:bg-[#262626]">
                                                    {/* Mũi tên chỉ lên */}
                                                    <div className="absolute -top-2 right-2 h-4 w-4 rotate-45 border-l border-t border-gray-200 bg-white dark:border-[#363636] dark:bg-[#262626]" />

                                                    <button
                                                        onClick={() =>
                                                            handleToggleConversationPin(
                                                                conv.id,
                                                                isPinnedConversation,
                                                            )
                                                        }
                                                        className={menuItemBase}
                                                    >
                                                        <Pin
                                                            size={20}
                                                            className="text-gray-700 dark:text-gray-300"
                                                        />
                                                        <span className="dark:text-white">
                                                            {isPinnedConversation
                                                                ? "Bỏ ghim cuộc trò chuyện"
                                                                : "Ghim cuộc trò chuyện"}
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setOpenMenuConvId(
                                                                null,
                                                            )
                                                        }
                                                        className={menuItemBase}
                                                    >
                                                        <BellOff
                                                            size={20}
                                                            className="text-gray-700 dark:text-gray-300"
                                                        />
                                                        <span className="dark:text-white">
                                                            Tắt thông báo
                                                        </span>
                                                    </button>
                                                    {conv.type === "DIRECT" && (
                                                        <button
                                                            onClick={() =>
                                                                setOpenMenuConvId(
                                                                    null,
                                                                )
                                                            }
                                                            className={
                                                                menuItemBase
                                                            }
                                                        >
                                                            <User
                                                                size={20}
                                                                className="text-gray-700 dark:text-gray-300"
                                                            />
                                                            <span className="dark:text-white">
                                                                Xem trang cá
                                                                nhân
                                                            </span>
                                                        </button>
                                                    )}

                                                    {/* Separator */}
                                                    <div className="my-1 border-t border-gray-200 dark:border-[#363636]" />

                                                    <button
                                                        onClick={() =>
                                                            setOpenMenuConvId(
                                                                null,
                                                            )
                                                        }
                                                        className={menuItemBase}
                                                    >
                                                        <Ban
                                                            size={20}
                                                            className="text-gray-700 dark:text-gray-300"
                                                        />
                                                        <span className="dark:text-white">
                                                            Chặn
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setOpenMenuConvId(
                                                                null,
                                                            )
                                                        }
                                                        className={menuItemBase}
                                                    >
                                                        <Archive
                                                            size={20}
                                                            className="text-gray-700 dark:text-gray-300"
                                                        />
                                                        <span className="dark:text-white">
                                                            Lưu trữ đoạn chat
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleDeleteConversation(
                                                                conv.id,
                                                            )
                                                        }
                                                        className={menuItemBase}
                                                    >
                                                        <Trash2
                                                            size={20}
                                                            className="text-red-500"
                                                        />
                                                        <span className="text-red-500">
                                                            Xóa đoạn chat
                                                        </span>
                                                    </button>

                                                    {/* Separator */}
                                                    <div className="my-1 border-t border-gray-200 dark:border-[#363636]" />

                                                    <button
                                                        onClick={() =>
                                                            setOpenMenuConvId(
                                                                null,
                                                            )
                                                        }
                                                        className={menuItemBase}
                                                    >
                                                        <Flag
                                                            size={20}
                                                            className="text-gray-700 dark:text-gray-300"
                                                        />
                                                        <span className="dark:text-white">
                                                            Báo cáo
                                                        </span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Side - Chat Window or Empty State */}
                <div className="hidden min-w-0 flex-1 bg-white dark:bg-black md:flex">
                    {selectedConversationId ? (
                        <div className="relative flex min-w-0 flex-1">
                            <div
                                className={`flex-1 min-w-0 transition-[margin] duration-300 ease-out ${showInfoPanel ? "xl:mr-88" : "xl:mr-0"}`}
                            >
                                <ChatWindow
                                    key={selectedConversationId}
                                    conversationId={selectedConversationId}
                                    onMarkAsRead={clearUnreadCount}
                                    onToggleInfoPanel={handleToggleInfoPanel}
                                    showInfoPanel={showInfoPanel}
                                    forcedReadOnlyNotice={
                                        selectedConversationReadOnlyNotice
                                    }
                                    onForbidden={handleConversationForbidden}
                                    name={selectedDisplayInfo?.name}
                                    avatarUrl={
                                        selectedDisplayInfo?.avatar ?? undefined
                                    }
                                    compositeAvatarUrls={
                                        selectedDisplayInfo?.hasCompositeAvatar
                                            ? selectedDisplayInfo.compositeAvatars
                                            : undefined
                                    }
                                />
                            </div>

                            {isInfoPanelRendered && (
                                <button
                                    type="button"
                                    aria-label="Đóng bảng thông tin"
                                    onClick={handleCloseInfoPanel}
                                    className={`absolute inset-0 z-20 bg-black/20 transition-opacity duration-300 xl:hidden ${showInfoPanel ? "opacity-100" : "pointer-events-none opacity-0"}`}
                                />
                            )}

                            {isInfoPanelRendered && (
                                <aside
                                    className={`absolute inset-y-0 right-0 z-30 hidden shrink-0 overflow-hidden border-l border-gray-200 bg-[#fbfcfe] transition-[transform,opacity] duration-300 ease-out dark:border-[#262626] dark:bg-black xl:flex ${showInfoPanel ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}
                                    style={{ width: `${INFO_PANEL_WIDTH}px` }}
                                >
                                    <div className="flex h-full min-h-0 flex-1 flex-col">
                                        {infoPanelContent}
                                    </div>
                                </aside>
                            )}

                            {isInfoPanelRendered && (
                                <aside
                                    className={`absolute inset-y-0 right-0 z-30 flex w-full max-w-88 flex-col overflow-hidden border-l border-gray-200 bg-[#fbfcfe] shadow-2xl transition-[transform,opacity] duration-300 ease-out dark:border-[#262626] dark:bg-black xl:hidden ${showInfoPanel ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}
                                >
                                    {infoPanelContent}
                                </aside>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-black">
                                    <svg
                                        width="48"
                                        height="48"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        className="dark:stroke-white"
                                    >
                                        <path
                                            d="M12 21L3 13V3h18v10l-9 8z"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        />
                                    </svg>
                                </div>
                                <h3 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                                    Tin nhắn của bạn
                                </h3>
                                <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
                                    Gửi ảnh và tin nhắn riêng tư cho bạn bè hoặc
                                    nhóm.
                                </p>
                                <button className="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
                                    Gửi tin nhắn
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {pendingPinConversationId && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 py-6">
                    <div className="w-full max-w-lg overflow-hidden rounded-md border border-gray-200 bg-white shadow-2xl dark:border-[#303030] dark:bg-[#111111]">
                        <div className="border-b border-gray-200 px-5 py-4 dark:border-[#2a2a2a]">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                Ghim hội thoại
                            </h2>
                        </div>

                        <div className="px-5 py-5">
                            <p className="text-sm leading-6 text-gray-700 dark:text-gray-200">
                                Bạn chỉ được ghim tối đa 4 trò chuyện.
                                <br />
                                Để ghim trò chuyện{" "}
                                <span className="font-semibold">
                                    {pendingPinDisplayInfo?.name ||
                                        "này"}
                                </span>
                                , vui lòng bỏ ghim ít nhất 1 trò chuyện bên
                                dưới.
                            </p>

                            <div className="mt-6 space-y-3">
                                {pinnedConversations.map((pin) => {
                                    const pinnedConversation =
                                        conversations.find(
                                            (conv) =>
                                                conv.id ===
                                                pin.conversationId,
                                        ) ?? pin.conversation;
                                    const pinnedDisplayInfo = pinnedConversation
                                        ? getDisplayInfo(
                                              pinnedConversation as Parameters<
                                                  typeof getDisplayInfo
                                              >[0],
                                          )
                                        : null;
                                    const isSelected =
                                        selectedUnpinConversationId ===
                                        pin.conversationId;

                                    return (
                                        <div
                                            key={pin.conversationId}
                                            className={`flex items-center gap-3 rounded-md border px-1 py-2 transition-colors ${
                                                isSelected
                                                    ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30"
                                                    : "border-transparent"
                                            }`}
                                        >
                                            {pinnedDisplayInfo && (
                                                <ConversationAvatar
                                                    name={
                                                        pinnedDisplayInfo.name
                                                    }
                                                    avatarUrl={
                                                        pinnedDisplayInfo.avatar
                                                    }
                                                    compositeAvatarUrls={
                                                        pinnedDisplayInfo.hasCompositeAvatar
                                                            ? pinnedDisplayInfo.compositeAvatars
                                                            : undefined
                                                    }
                                                    fallbackAvatarUrl={
                                                        pinnedDisplayInfo.fallbackAvatar
                                                    }
                                                    sizeClassName="h-11 w-11"
                                                    ringClassName="ring-1 ring-gray-200 dark:ring-[#2a2a2a]"
                                                />
                                            )}
                                            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                                                {pinnedDisplayInfo?.name ||
                                                    `Hội thoại ${pin.conversationId}`}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedUnpinConversationId(
                                                        pin.conversationId,
                                                    )
                                                }
                                                disabled={isReplacingPin}
                                                className={`rounded px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                                                    isSelected
                                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                                        : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-[#2a2a2a] dark:text-gray-100 dark:hover:bg-[#363636]"
                                                }`}
                                            >
                                                {isSelected
                                                    ? "Đã chọn"
                                                    : "Bỏ ghim"}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-[#2a2a2a]">
                            <button
                                type="button"
                                onClick={closeReplacePinModal}
                                disabled={isReplacingPin}
                                className="rounded-md bg-gray-200 px-5 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-300 disabled:opacity-60 dark:bg-[#2a2a2a] dark:text-gray-100 dark:hover:bg-[#363636]"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleConfirmReplacePin()}
                                disabled={
                                    isReplacingPin ||
                                    !selectedUnpinConversationId
                                }
                                className="rounded-md bg-blue-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
                            >
                                {isReplacingPin
                                    ? "Đang ghim..."
                                    : "Ghim hội thoại"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CreateGroupModal
                open={isCreateGroupModalOpen}
                friends={friendsForCreateGroup}
                loadingFriends={friendsLoading}
                friendsError={friendsError}
                submitting={isCreatingGroup}
                error={actionError}
                onClose={closeCreateGroupModal}
                onSubmit={createGroup}
            />

            {joinApprovalToast && (
                <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-gray-700">
                    {joinApprovalToast}
                </div>
            )}

            <SelectGroupMembersModal
                open={isAddMembersModalOpen}
                friends={friendsForAddMembers}
                existingMemberIds={groupMemberIds}
                loadingFriends={friendsLoading}
                friendsError={friendsError}
                submitting={isAddingMembers}
                error={actionError}
                onClose={closeAddMembersModal}
                onSubmit={addMembersToGroup}
            />
            <ConfirmModal
                open={isConfirmLeaveModalOpen}
                title="Rời khỏi nhóm?"
                description={`Bạn có chắc chắn muốn rời khỏi nhóm "${selectedGroupConversation?.name || "này"}"? Hành động này không thể hoàn tác.`}
                confirmLabel="Rời nhóm"
                loading={isLeavingGroup}
                isDanger={true}
                onClose={() => setIsConfirmLeaveModalOpen(false)}
                onConfirm={() => {
                    void executeLeaveGroup().then((success) => {
                        if (success) setIsConfirmLeaveModalOpen(false);
                    });
                }}
            />

            <ConfirmModal
                open={isConfirmDisbandModalOpen}
                title="Giải tán nhóm?"
                description={`Giải tán nhóm "${selectedGroupConversation?.name || "này"}" sẽ kết thúc cuộc trò chuyện cho tất cả thành viên. Mọi tin nhắn sẽ bị xóa đối với mọi người.`}
                confirmLabel="Giải tán"
                loading={isDisbandingGroup}
                isDanger={true}
                onClose={() => setIsConfirmDisbandModalOpen(false)}
                onConfirm={() => {
                    void disbandGroup().then((success) => {
                        if (success) setIsConfirmDisbandModalOpen(false);
                    });
                }}
            />

            <ConfirmModal
                open={isConfirmKickModalOpen}
                title="Đuổi thành viên?"
                description={`Bạn có chắc chắn muốn mời ${
                    kickTargetUserId && selectedGroupConversation?.members
                        ? selectedGroupConversation.members.find(
                              (m) => m.userId === kickTargetUserId,
                          )?.nickname || "thành viên này"
                        : "thành viên"
                } khỏi nhóm?`}
                confirmLabel="Đuổi khỏi nhóm"
                isDanger={true}
                onClose={closeConfirmKick}
                onConfirm={() => {
                    if (kickTargetUserId) {
                        void kickMember(kickTargetUserId).then((success) => {
                            if (success) closeConfirmKick();
                        });
                    }
                }}
            />
        </>
    );
}
