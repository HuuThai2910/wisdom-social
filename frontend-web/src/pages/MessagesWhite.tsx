import { mockChats, currentUser } from "../api/mockData";
import ChatList from "../components/message/ChatList";
import ChatWindow from "../components/message/ChatWindow";

export default function MessagesWhite() {
    return (
        <div className="py-6">
            <div className="bg-white border border-gray-200 rounded-lg h-[calc(100vh-120px)] flex">
                {/* Left Sidebar - Chat List */}
                <div className="hidden md:block w-96 border-r border-gray-200">
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">
                                {currentUser.username}
                            </h2>
                        </div>

                        <input
                            type="text"
                            placeholder="Search messages..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400"
                        />
                    </div>

                    <div className="overflow-y-auto h-[calc(100%-100px)]">
                        <ChatList chats={mockChats} />
                    </div>
                </div>

                {/* Right Side - Chat Window */}
                <div className="flex-1">
                    <ChatWindow />
                </div>
            </div>
        </div>
    );
}
