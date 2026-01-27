import { Search, Edit } from "lucide-react";
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
        getDisplayInfo,
        formatTime,
    } = useMessagesController();

    return (
        <div className="w-full mx-auto px-4 py-4">
            <div className="bg-white dark:bg-black border border-gray-200 dark:border-[#262626] rounded-lg h-[calc(100vh-140px)] flex overflow-hidden shadow-sm">
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
                                const isActive =
                                    selectedConversationId === conv.id;

                                return (
                                    <div
                                        key={conv.id}
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
        </div>
    );
}
