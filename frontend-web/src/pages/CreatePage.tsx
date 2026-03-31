import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImagePlus, Loader2, X } from "lucide-react";
import type { PageCategory } from "../types";
import { createPage } from "../api/pageApi";

const categories: PageCategory[] = [
    "Business",
    "Brand",
    "Artist",
    "Entertainment",
    "Education",
    "Community",
    "Technology",
    "Sports",
    "Food",
    "Travel",
];

export default function CreatePage() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [category, setCategory] = useState<PageCategory | "">("");
    const [description, setDescription] = useState("");
    const [website, setWebsite] = useState("");
    const [location, setLocation] = useState("");
    const [avatar, setAvatar] = useState<string | null>(null);
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleImageUpload = (
        e: React.ChangeEvent<HTMLInputElement>,
        type: "avatar" | "cover",
    ) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === "avatar") setAvatar(reader.result as string);
                else setCoverImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!category) return;

        setSubmitting(true);
        setSubmitError(null);
        try {
            await createPage({
                name: name.trim(),
                username: username.trim(),
                category,
                description: description.trim() || undefined,
                website: website.trim() || undefined,
                location: location.trim() || undefined,
                avatar: avatar ?? undefined,
                coverImage: coverImage ?? undefined,
            });
            navigate("/pages");
        } catch {
            setSubmitError("Failed to create page. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const isValid = name.trim() && username.trim() && category;

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#000] py-8">
            <div className="max-w-2xl mx-auto px-4">
                {/* Header */}
                <div className="bg-white dark:bg-[#262626] rounded-t-xl border border-gray-200 dark:border-[#363636]">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#363636]">
                        <button
                            onClick={() => navigate(-1)}
                            className="text-sm font-semibold hover:text-gray-600 dark:text-white dark:hover:text-gray-300"
                        >
                            Cancel
                        </button>
                        <h2 className="text-base font-semibold dark:text-white">
                            Create Page
                        </h2>
                        <button
                            onClick={handleSubmit}
                            disabled={!isValid || submitting}
                            className={`text-sm font-semibold flex items-center gap-1 ${
                                isValid && !submitting
                                    ? "text-[#0095f6] hover:text-[#00376b]"
                                    : "text-[#0095f6] opacity-30 cursor-not-allowed"
                            }`}
                        >
                            {submitting && (
                                <Loader2 size={14} className="animate-spin" />
                            )}
                            Create
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Cover Image */}
                        <div>
                            <label className="block text-sm font-semibold dark:text-white mb-2">
                                Cover Image
                            </label>
                            <div className="relative h-36 bg-gray-100 dark:bg-[#363636] rounded-xl overflow-hidden">
                                {coverImage ? (
                                    <>
                                        <img
                                            src={coverImage}
                                            alt="Cover"
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setCoverImage(null)}
                                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white"
                                        >
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <label
                                        htmlFor="cover-upload"
                                        className="flex flex-col items-center justify-center h-full cursor-pointer"
                                    >
                                        <ImagePlus
                                            size={32}
                                            className="text-gray-400 mb-2"
                                        />
                                        <span className="text-sm text-gray-500">
                                            Add cover image
                                        </span>
                                        <input
                                            id="cover-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) =>
                                                handleImageUpload(e, "cover")
                                            }
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Avatar */}
                        <div>
                            <label className="block text-sm font-semibold dark:text-white mb-2">
                                Page Avatar
                            </label>
                            <div className="flex items-center gap-4">
                                <div className="relative w-20 h-20 rounded-full bg-gray-100 dark:bg-[#363636] overflow-hidden flex-shrink-0">
                                    {avatar ? (
                                        <>
                                            <img
                                                src={avatar}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setAvatar(null)}
                                                className="absolute top-0 right-0 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white"
                                            >
                                                <X size={12} />
                                            </button>
                                        </>
                                    ) : (
                                        <label
                                            htmlFor="avatar-upload"
                                            className="flex items-center justify-center h-full cursor-pointer"
                                        >
                                            <ImagePlus
                                                size={24}
                                                className="text-gray-400"
                                            />
                                            <input
                                                id="avatar-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) =>
                                                    handleImageUpload(
                                                        e,
                                                        "avatar",
                                                    )
                                                }
                                            />
                                        </label>
                                    )}
                                </div>
                                <label
                                    htmlFor="avatar-upload"
                                    className="px-4 py-2 bg-gray-100 dark:bg-[#363636] hover:bg-gray-200 dark:hover:bg-[#404040] rounded-lg text-sm font-semibold dark:text-white cursor-pointer"
                                >
                                    Upload avatar
                                </label>
                            </div>
                        </div>

                        {/* Page Name */}
                        <div>
                            <label className="block text-sm font-semibold dark:text-white mb-1.5">
                                Page Name{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter page name"
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#363636] rounded-lg outline-none focus:border-gray-400 dark:focus:border-gray-500 dark:bg-[#000] dark:text-white dark:placeholder-gray-600 text-sm"
                                maxLength={100}
                            />
                        </div>

                        {/* Username */}
                        <div>
                            <label className="block text-sm font-semibold dark:text-white mb-1.5">
                                Username{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                    @
                                </span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => {
                                        const raw = e.target.value
                                            .toLowerCase()
                                            .replace(/[^a-z0-9_.]/g, "");
                                        // Remove leading/trailing special chars and consecutive special chars
                                        const sanitized = raw
                                            .replace(/^[_.]+/, "")
                                            .replace(/[_.]{2,}/g, (m) => m[0]);
                                        setUsername(sanitized);
                                    }}
                                    placeholder="page_username"
                                    className="w-full pl-7 pr-4 py-2.5 border border-gray-200 dark:border-[#363636] rounded-lg outline-none focus:border-gray-400 dark:focus:border-gray-500 dark:bg-[#000] dark:text-white dark:placeholder-gray-600 text-sm"
                                    maxLength={50}
                                />
                            </div>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-semibold dark:text-white mb-1.5">
                                Category{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={category}
                                onChange={(e) =>
                                    setCategory(e.target.value as PageCategory)
                                }
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#363636] rounded-lg outline-none focus:border-gray-400 dark:focus:border-gray-500 dark:bg-[#000] dark:text-white text-sm appearance-none"
                            >
                                <option value="">Select a category</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-semibold dark:text-white mb-1.5">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Tell people what this page is about..."
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#363636] rounded-lg outline-none focus:border-gray-400 dark:focus:border-gray-500 resize-none dark:bg-[#000] dark:text-white dark:placeholder-gray-600 text-sm"
                                rows={3}
                                maxLength={500}
                            />
                            <p className="text-xs text-gray-400 mt-1 text-right">
                                {description.length}/500
                            </p>
                        </div>

                        {/* Website */}
                        <div>
                            <label className="block text-sm font-semibold dark:text-white mb-1.5">
                                Website
                            </label>
                            <input
                                type="url"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                placeholder="https://your-website.com"
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#363636] rounded-lg outline-none focus:border-gray-400 dark:focus:border-gray-500 dark:bg-[#000] dark:text-white dark:placeholder-gray-600 text-sm"
                            />
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-sm font-semibold dark:text-white mb-1.5">
                                Location
                            </label>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="City, Country"
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#363636] rounded-lg outline-none focus:border-gray-400 dark:focus:border-gray-500 dark:bg-[#000] dark:text-white dark:placeholder-gray-600 text-sm"
                            />
                        </div>
                    </form>
                </div>

                {/* Helper */}
                <div className="mt-4 text-center">
                    {submitError && (
                        <p className="text-sm text-red-500 dark:text-red-400 mb-2">
                            {submitError}
                        </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Fields marked with{" "}
                        <span className="text-red-500">*</span> are required.
                        Your page will be visible to everyone.
                    </p>
                </div>
            </div>
        </div>
    );
}
