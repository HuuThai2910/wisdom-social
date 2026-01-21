import { useState } from "react";
import { useParams } from "react-router-dom";
import { Send, Phone, Video, Info } from "lucide-react";
import { mockChats, getMessagesForChat, currentUser } from "../../api/mockData";

export default function ChatWindow() {
    const { chatId } = useParams();
    const [messageText, setMessageText] = useState("");

    const chat = mockChats.find((c) => c.id === chatId);
    const messages = chatId ? getMessagesForChat(chatId) : [];

    if (!chat)
        return (
            <div className="flex items-center justify-center h-full">
                Chat not found
            </div>
        );

    const handleSend = () => {
        if (messageText.trim()) {
            // In real app, would send to backend
            console.log("Sending message:", messageText);
            setMessageText("");
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <img
                        src={chat.user.avatar}
                        alt={chat.user.username}
                        className="w-10 h-10 rounded-full"
                    />
                    <div>
                        <p className="font-semibold text-sm">
                            {chat.user.username}
                        </p>
                        <p className="text-xs text-gray-500">Active now</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button className="hover:text-gray-600">
                        <Phone size={20} />
                    </button>
                    <button className="hover:text-gray-600">
                        <Video size={20} />
                    </button>
                    <button className="hover:text-gray-600">
                        <Info size={20} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                    const isOwn = message.senderId === currentUser.id;

                    return (
                        <div
                            key={message.id}
                            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                                    isOwn
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-200 text-black"
                                }`}
                            >
                                <p className="text-sm">{message.text}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-gray-400"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!messageText.trim()}
                        className="text-blue-500 font-semibold disabled:text-blue-300"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
