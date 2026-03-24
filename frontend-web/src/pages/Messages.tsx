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
} from "lucide-react";
import ChatWindow from "../components/message/ChatWindow";
import { useMessagesController } from "../hooks/useMessagesController";

export default function Messages() {
    const {
        searchQuery,
        setSearchQuery,
        loading,
        error,
        selectedConversationId,
        currentUserId,
        filteredConversations,
        handleSelectConversation,
        handleDeleteConversationForMe,
        getDisplayInfo,
        formatTime,
        clearUnreadCount,
    } = useMessagesController();

    // State để track conversation nào đang mở menu
    const [openMenuConvId, setOpenMenuConvId] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

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
        <div className="fixed inset-0 left-0 md:left-[245px] lg:left-[335px] xl:right-[383px] bottom-16 md:bottom-0 flex overflow-hidden bg-white dark:bg-black border-r border-gray-200 dark:border-[#262626]">
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
                                <div key={conv.id} className="relative group/item">
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
                                                        {(conv.type === "GROUP" ||
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
                                        className="absolute right-4 top-1/2 -translate-y-1/2 z-[100]"
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
            <div className="hidden md:flex flex-1 bg-white dark:bg-black">
                {selectedConversationId ? (
                    <ChatWindow
                        key={selectedConversationId}
                        conversationId={selectedConversationId}
                        userId={currentUserId}
                        onMarkAsRead={clearUnreadCount}
                    />
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
