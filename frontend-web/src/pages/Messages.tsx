import { useState, useRef, useEffect, useCallback } from "react";
import {
    Search,
    Edit,
    MailOpen,
    BellOff,
    User,
    Ban,
    Archive,
    Trash2,
    Flag,
    MoreHorizontal,
    ChevronDown,
    ChevronUp,
    CircleUserRound,
    Bell,
    Pin,
    Palette,
    ThumbsUp,
    Type,
    Images,
    FileText,
    Eye,
    Lock,
    TimerReset,
    EyeOff,
} from "lucide-react";
import ChatWindow from "../components/message/ChatWindow";
import { useMessagesController } from "../hooks/useMessagesController";
import chatService from "../services/chatService";

type DetailSectionKey = "chatInfo" | "customize" | "media" | "privacy";

export default function Messages() {
    const {
        searchQuery,
        setSearchQuery,
        loading,
        error,
        selectedConversationId,
        currentUserId,
        conversations,
        filteredConversations,
        handleSelectConversation,
        handleDeleteConversationForMe,
        getDisplayInfo,
        formatTime,
        clearUnreadCount,
    } = useMessagesController();

    // State để track conversation nào đang mở menu
    const [openMenuConvId, setOpenMenuConvId] = useState<number | null>(null);
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
    const selectedDisplayInfo = selectedConversation
        ? getDisplayInfo(selectedConversation)
        : null;

    const selectedStatus = selectedConversation?.lastMessage?.lastMessageAt
        ? `Hoạt động ${formatTime(selectedConversation.lastMessage.lastMessageAt)} trước`
        : "Đang hoạt động gần đây";

    const toggleDetailSection = useCallback((key: DetailSectionKey) => {
        setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const handleChangeNickname = useCallback(async () => {
        if (!selectedConversationId || !selectedConversation) return;

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

    const handleDeleteConversation = useCallback(
        (convId: number) => {
            setOpenMenuConvId(null);
            void handleDeleteConversationForMe(convId);
        },
        [handleDeleteConversationForMe],
    );

    const menuItemBase =
        "flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-100 dark:hover:bg-[#363636] transition-colors";

    return (
        <div className="fixed inset-0 left-0 md:left-61.25 lg:left-83.75 bottom-16 md:bottom-0 flex overflow-hidden bg-white dark:bg-black border-r border-gray-200 dark:border-[#262626]">
            {/* Left Sidebar - Chat List */}
            <div className="w-full md:w-96 border-r border-gray-200 dark:border-[#262626] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-[#262626]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold dark:text-white">
                                Messages
                            </h2>
                        </div>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-[#262626] rounded-full">
                            <Edit size={24} className="dark:text-white" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Tìm kiếm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-[#262626] rounded-lg outline-none text-sm dark:text-white placeholder-gray-500"
                        />
                        <Search
                            size={16}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                    </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto">
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
                            const isActive = selectedConversationId === conv.id;
                            const isMenuOpen = openMenuConvId === conv.id;

                            return (
                                <div
                                    key={conv.id}
                                    className="relative group/item"
                                >
                                    <div
                                        onClick={() =>
                                            handleSelectConversation(conv.id)
                                        }
                                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-[#262626] transition-colors ${
                                            isActive
                                                ? "bg-gray-100 dark:bg-[#262626]"
                                                : "hover:bg-gray-50 dark:hover:bg-[#1a1a1a]"
                                        }`}
                                    >
                                        <div className="relative">
                                            <img
                                                src={displayInfo.avatar}
                                                alt={displayInfo.name}
                                                className="w-14 h-14 rounded-full object-cover"
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate dark:text-white">
                                                {displayInfo.name}
                                            </p>
                                            <p
                                                className={`text-sm truncate ${
                                                    conv.unreadCount &&
                                                    conv.unreadCount > 0
                                                        ? "font-semibold dark:text-white"
                                                        : "text-gray-500 dark:text-gray-400"
                                                }`}
                                            >
                                                {conv.lastMessage
                                                    ?.lastMessageContent ? (
                                                    <>
                                                        {(conv.type ===
                                                            "GROUP" ||
                                                            conv.lastMessage
                                                                .lastSenderId ===
                                                                currentUserId) && (
                                                            <>
                                                                <span>
                                                                    {conv
                                                                        .lastMessage
                                                                        .lastSenderId ===
                                                                    currentUserId
                                                                        ? "Bạn"
                                                                        : conv
                                                                              .lastMessage
                                                                              .lastSenderName}
                                                                </span>
                                                                {" : "}
                                                            </>
                                                        )}
                                                        {
                                                            conv.lastMessage
                                                                .lastMessageContent
                                                        }
                                                    </>
                                                ) : (
                                                    "Bắt đầu trò chuyện"
                                                )}
                                            </p>
                                        </div>

                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {conv.lastMessage
                                                    ?.lastMessageContent
                                                    ? formatTime(
                                                          conv.lastMessage
                                                              .lastMessageAt,
                                                      )
                                                    : ""}
                                            </span>
                                            {(conv.unreadCount ?? 0) > 0 && (
                                                <div className="min-w-5 h-5 px-1.5 bg-red-500 rounded-full flex items-center justify-center">
                                                    <span className="text-xs text-white font-semibold">
                                                        {conv.unreadCount! > 99
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
                                        className="absolute right-4 top-1/2 -translate-y-1/2 z-100"
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuConvId(
                                                    isMenuOpen ? null : conv.id,
                                                );
                                            }}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-[#262626] hover:bg-gray-100 dark:hover:bg-[#363636] transition-all ${
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
                                            <div className="absolute right-0 top-full mt-2 bg-white dark:bg-[#262626] border border-gray-200 dark:border-[#363636] rounded-xl shadow-2xl py-2 w-64 overflow-hidden">
                                                {/* Mũi tên chỉ lên */}
                                                <div className="absolute -top-2 right-2 w-4 h-4 bg-white dark:bg-[#262626] border-l border-t border-gray-200 dark:border-[#363636] transform rotate-45"></div>

                                                <button
                                                    onClick={() =>
                                                        setOpenMenuConvId(null)
                                                    }
                                                    className={menuItemBase}
                                                >
                                                    <MailOpen
                                                        size={20}
                                                        className="text-gray-700 dark:text-gray-300"
                                                    />
                                                    <span className="dark:text-white">
                                                        Đánh dấu là chưa đọc
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setOpenMenuConvId(null)
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
                                                <button
                                                    onClick={() =>
                                                        setOpenMenuConvId(null)
                                                    }
                                                    className={menuItemBase}
                                                >
                                                    <User
                                                        size={20}
                                                        className="text-gray-700 dark:text-gray-300"
                                                    />
                                                    <span className="dark:text-white">
                                                        Xem trang cá nhân
                                                    </span>
                                                </button>

                                                {/* Separator */}
                                                <div className="my-1 border-t border-gray-200 dark:border-[#363636]" />

                                                <button
                                                    onClick={() =>
                                                        setOpenMenuConvId(null)
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
                                                        setOpenMenuConvId(null)
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
                                                        setOpenMenuConvId(null)
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
            <div className="hidden md:flex flex-1 bg-white dark:bg-black min-w-0">
                {selectedConversationId ? (
                    <div className="flex flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                            <ChatWindow
                                key={selectedConversationId}
                                conversationId={selectedConversationId}
                                userId={currentUserId}
                                onMarkAsRead={clearUnreadCount}
                            />
                        </div>

                        <aside className="hidden xl:flex w-85 shrink-0 border-l border-gray-200 dark:border-[#262626] bg-[#fafafa] dark:bg-[#050505]">
                            <div className="flex-1 overflow-y-auto px-5 py-6">
                                <div className="flex flex-col items-center text-center pb-6 border-b border-gray-200 dark:border-[#1f1f1f]">
                                    <img
                                        src={selectedDisplayInfo?.avatar}
                                        alt={selectedDisplayInfo?.name}
                                        className="w-20 h-20 rounded-full object-cover mb-3"
                                    />
                                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                        {selectedDisplayInfo?.name ||
                                            "Không xác định"}
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {selectedStatus}
                                    </p>
                                    <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-[#1c1c1c] text-gray-700 dark:text-gray-200">
                                        <Lock size={12} />
                                        Được mã hóa đầu cuối
                                    </span>

                                    <div className="mt-5 grid grid-cols-3 gap-5 w-full">
                                        <button className="flex flex-col items-center gap-2 text-xs text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors">
                                            <span className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#1f1f1f] flex items-center justify-center">
                                                <CircleUserRound size={18} />
                                            </span>
                                            Trang cá nhân
                                        </button>
                                        <button className="flex flex-col items-center gap-2 text-xs text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors">
                                            <span className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#1f1f1f] flex items-center justify-center">
                                                <Bell size={18} />
                                            </span>
                                            Tắt thông báo
                                        </button>
                                        <button className="flex flex-col items-center gap-2 text-xs text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors">
                                            <span className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#1f1f1f] flex items-center justify-center">
                                                <Search size={18} />
                                            </span>
                                            Tìm kiếm
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 space-y-1">
                                    <div className="border-b border-gray-200 dark:border-[#1f1f1f] pb-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleDetailSection("chatInfo")
                                            }
                                            className="w-full flex items-center justify-between py-3 text-left"
                                        >
                                            <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                                Thông tin về đoạn chat
                                            </span>
                                            {expandedSections.chatInfo ? (
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
                                        {expandedSections.chatInfo && (
                                            <div className="pb-2">
                                                <button className="w-full flex items-center gap-3 py-3 text-left text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg px-2 transition-colors">
                                                    <Pin size={18} />
                                                    <span>
                                                        Xem tin nhắn đã ghim
                                                    </span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-b border-gray-200 dark:border-[#1f1f1f] pb-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleDetailSection("customize")
                                            }
                                            className="w-full flex items-center justify-between py-3 text-left"
                                        >
                                            <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                                Tùy chỉnh đoạn chat
                                            </span>
                                            {expandedSections.customize ? (
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
                                        {expandedSections.customize && (
                                            <div className="pb-2">
                                                <button className="w-full flex items-center gap-3 py-3 text-left text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg px-2 transition-colors">
                                                    <Palette size={18} />
                                                    <span>Đổi chủ đề</span>
                                                </button>
                                                <button className="w-full flex items-center gap-3 py-3 text-left text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg px-2 transition-colors">
                                                    <ThumbsUp size={18} />
                                                    <span>
                                                        Thay đổi biểu tượng cảm
                                                        xúc
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void handleChangeNickname()
                                                    }
                                                    className="w-full flex items-center gap-3 py-3 text-left text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg px-2 transition-colors"
                                                >
                                                    <Type size={18} />
                                                    <span>
                                                        Chỉnh sửa biệt danh
                                                    </span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-b border-gray-200 dark:border-[#1f1f1f] pb-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleDetailSection("media")
                                            }
                                            className="w-full flex items-center justify-between py-3 text-left"
                                        >
                                            <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                                File phương tiện & file
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
                                            <div className="pb-2">
                                                <button className="w-full flex items-center gap-3 py-3 text-left text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg px-2 transition-colors">
                                                    <Images size={18} />
                                                    <span>
                                                        File phương tiện
                                                    </span>
                                                </button>
                                                <button className="w-full flex items-center gap-3 py-3 text-left text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg px-2 transition-colors">
                                                    <FileText size={18} />
                                                    <span>File</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pb-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleDetailSection("privacy")
                                            }
                                            className="w-full flex items-center justify-between py-3 text-left"
                                        >
                                            <span className="text-lg font-semibold text-gray-900 dark:text-white">
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
                                            <div className="pb-2">
                                                <button className="w-full flex items-center gap-3 py-3 text-left text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg px-2 transition-colors">
                                                    <BellOff size={18} />
                                                    <span>Tắt thông báo</span>
                                                </button>
                                                <button className="w-full flex items-center gap-3 py-3 text-left text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg px-2 transition-colors">
                                                    <Eye size={18} />
                                                    <span>Quyền nhắn tin</span>
                                                </button>
                                                <button className="w-full flex items-center gap-3 py-3 text-left text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg px-2 transition-colors">
                                                    <TimerReset size={18} />
                                                    <span>Tin nhắn tự hủy</span>
                                                </button>
                                                <button className="w-full flex items-start justify-between gap-3 py-3 text-left text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg px-2 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <Eye size={18} />
                                                        <div>
                                                            <p>
                                                                Thông báo đã đọc
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                Bật
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                                <button className="w-full flex items-center gap-3 py-3 text-left text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg px-2 transition-colors">
                                                    <Lock size={18} />
                                                    <span>
                                                        Xác minh mã hóa đầu cuối
                                                    </span>
                                                </button>
                                                <button className="w-full flex items-center gap-3 py-3 text-left text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg px-2 transition-colors">
                                                    <EyeOff size={18} />
                                                    <span>Hạn chế</span>
                                                </button>
                                                <button className="w-full flex items-center gap-3 py-3 text-left text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg px-2 transition-colors">
                                                    <Ban size={18} />
                                                    <span>Chặn</span>
                                                </button>
                                                <button className="w-full flex items-start justify-between gap-3 py-3 text-left hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg px-2 transition-colors">
                                                    <div className="flex items-start gap-3">
                                                        <Flag
                                                            size={18}
                                                            className="text-black dark:text-white mt-0.5"
                                                        />
                                                        <div>
                                                            <p className="text-gray-900 dark:text-white">
                                                                Báo cáo
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                Đóng góp ý kiến
                                                                và báo cáo cuộc
                                                                trò chuyện
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-24 h-24 mx-auto mb-4 border-2 border-black dark:border-white rounded-full flex items-center justify-center">
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
                            <h3 className="text-xl font-light mb-2 dark:text-white">
                                Tin nhắn của bạn
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                Gửi ảnh và tin nhắn riêng tư cho bạn bè hoặc
                                nhóm.
                            </p>
                            <button className="px-6 py-2 bg-[#0095f6] hover:bg-[#1877f2] text-white rounded-lg text-sm font-semibold">
                                Gửi tin nhắn
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
