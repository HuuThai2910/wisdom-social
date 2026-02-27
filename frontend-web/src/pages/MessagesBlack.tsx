import { mockChats, currentUser } from "../api/mockData";
import ChatList from "../components/message/ChatList";
import { MessageCircle } from "lucide-react";

export default function MessagesBlack() {
    return (
        <div className="py-6">
            <div className="bg-white border border-gray-200 rounded-lg h-[calc(100vh-120px)] flex">
                {/* Left Sidebar - Chat List */}
                <div className="w-full md:w-96 border-r border-gray-200 flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">
                                {currentUser.username}
                            </h2>
                            <button className="hover:text-gray-600">
                                <MessageCircle size={24} />
                            </button>
                        </div>

                        {/* Search */}
                        <input
                            type="text"
                            placeholder="Search messages..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400"
                        />
                    </div>

                    {/* Chat List */}
                    <div className="flex-1 overflow-y-auto">
                        <ChatList chats={mockChats} />
                    </div>
                </div>

                {/* Right Side - Empty State */}
                <div className="hidden md:flex flex-1 items-center justify-center">
                    <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-4 rounded-full border-2 border-black flex items-center justify-center">
                            <MessageCircle size={48} />
                        </div>
                        <h3 className="text-2xl font-light mb-2">
                            Your Messages
                        </h3>
                        <p className="text-gray-500 mb-6">
                            Send private photos and messages to a friend or
                            group
                        </p>
                        <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold">
                            Send Message
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
