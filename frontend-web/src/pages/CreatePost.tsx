import { useState } from "react";
import { ImagePlus, MapPin, Smile, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { currentUser } from "../api/mockData";

export default function CreatePost() {
    const navigate = useNavigate();
    const [caption, setCaption] = useState("");
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
    };

    const handlePost = () => {
        // Handle post submission here
        console.log("Posting:", { caption, image: selectedImage });
        // Navigate back to home after posting
        navigate("/");
    };

    const handleCancel = () => {
        navigate(-1);
    };

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#000] py-8">
            <div className="max-w-3xl mx-auto px-4">
                {/* Header */}
                <div className="bg-white dark:bg-[#262626] rounded-t-xl border border-gray-200 dark:border-[#363636]">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#363636]">
                        <button
                            onClick={handleCancel}
                            className="text-sm font-semibold hover:text-gray-600 dark:text-white dark:hover:text-gray-300"
                        >
                            Cancel
                        </button>
                        <h2 className="text-base font-semibold dark:text-white">
                            Create new post
                        </h2>
                        <button
                            onClick={handlePost}
                            disabled={!selectedImage}
                            className={`text-sm font-semibold ${
                                selectedImage
                                    ? "text-[#0095f6] hover:text-[#00376b]"
                                    : "text-[#0095f6] opacity-30 cursor-not-allowed"
                            }`}
                        >
                            Share
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="p-4">
                        {/* User Info */}
                        <div className="flex items-center gap-3 mb-4">
                            <img
                                src={currentUser.avatar}
                                alt={currentUser.username}
                                className="w-10 h-10 rounded-full"
                            />
                            <div>
                                <p className="text-sm font-semibold dark:text-white">
                                    {currentUser.username}
                                </p>
                            </div>
                        </div>

                        {/* Image Upload Area */}
                        {!selectedImage ? (
                            <div className="border-2 border-dashed border-gray-300 dark:border-[#363636] rounded-xl p-12 text-center mb-4">
                                <label
                                    htmlFor="image-upload"
                                    className="cursor-pointer flex flex-col items-center"
                                >
                                    <ImagePlus
                                        size={64}
                                        className="text-gray-400 dark:text-gray-600 mb-4"
                                    />
                                    <p className="text-lg font-medium mb-2 dark:text-white">
                                        Select photos from your computer
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Or drag and drop them here
                                    </p>
                                    <input
                                        id="image-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageSelect}
                                    />
                                    <button className="mt-4 px-4 py-2 bg-[#0095f6] hover:bg-[#1877f2] text-white rounded-lg text-sm font-semibold">
                                        Select from computer
                                    </button>
                                </label>
                            </div>
                        ) : (
                            <div className="relative mb-4">
                                <img
                                    src={selectedImage}
                                    alt="Selected"
                                    className="w-full max-h-[500px] object-contain rounded-lg bg-black"
                                />
                                <button
                                    onClick={handleRemoveImage}
                                    className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        )}

                        {/* Caption Input */}
                        <div className="mb-4">
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Write a caption..."
                                className="w-full px-4 py-3 border border-gray-200 dark:border-[#363636] rounded-lg outline-none focus:border-gray-400 dark:focus:border-gray-500 resize-none dark:bg-[#000] dark:text-white dark:placeholder-gray-600"
                                rows={4}
                                maxLength={2200}
                            />
                            <div className="flex justify-between items-center mt-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() =>
                                            setShowEmojiPicker(!showEmojiPicker)
                                        }
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-[#363636] rounded-full"
                                    >
                                        <Smile
                                            size={20}
                                            className="text-gray-500 dark:text-gray-400"
                                        />
                                    </button>
                                </div>
                                <span className="text-xs text-gray-400 dark:text-gray-600">
                                    {caption.length}/2,200
                                </span>
                            </div>
                        </div>

                        {/* Additional Options */}
                        <div className="space-y-3 border-t border-gray-200 dark:border-[#363636] pt-4">
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm font-medium dark:text-white">
                                    Add location
                                </span>
                                <button className="p-1 hover:bg-gray-100 dark:hover:bg-[#363636] rounded">
                                    <MapPin
                                        size={20}
                                        className="text-gray-600 dark:text-gray-400"
                                    />
                                </button>
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm font-medium dark:text-white">
                                    Accessibility
                                </span>
                                <button className="text-xs text-[#0095f6] hover:text-[#00376b] font-semibold">
                                    Add
                                </button>
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm font-medium dark:text-white">
                                    Advanced settings
                                </span>
                                <button className="text-gray-600 dark:text-gray-400">
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        className="rotate-90"
                                    >
                                        <path
                                            d="M9 18l6-6-6-6"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Helper Text */}
                <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Your post will be visible to your followers and may
                        appear in Explore
                    </p>
                </div>
            </div>
        </div>
    );
}
