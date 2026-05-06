import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Users, X } from "lucide-react";
import type { User } from "../../types";
import { DEFAULT_AVATAR_URL } from "../../constants/ui";

interface CreateGroupSubmitPayload {
    name: string;
    imageUrl?: string;
    memberIds: number[];
}

interface CreateGroupModalProps {
    open: boolean;
    friends: User[];
    loadingFriends: boolean;
    friendsError: string | null;
    submitting: boolean;
    error: string | null;
    onClose: () => void;
    onSubmit: (payload: CreateGroupSubmitPayload) => Promise<boolean>;
}

function getFriendDisplayName(friend: User): string {
    return friend.fullName || friend.name || friend.username;
}

export default function CreateGroupModal({
    open,
    friends,
    loadingFriends,
    friendsError,
    submitting,
    error,
    onClose,
    onSubmit,
}: CreateGroupModalProps) {
    const [groupName, setGroupName] = useState("");
    const [groupImageUrl, setGroupImageUrl] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        if (!open) {
            setGroupName("");
            setGroupImageUrl("");
            setSearchKeyword("");
            setSelectedIds([]);
        }
    }, [open]);

    const filteredFriends = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();
        if (!keyword) {
            return friends;
        }

        return friends.filter((friend) => {
            const searchable = [
                getFriendDisplayName(friend),
                friend.username,
            ].join(" ");
            return searchable.toLowerCase().includes(keyword);
        });
    }, [friends, searchKeyword]);

    const canSubmit = selectedIds.length >= 2 && !submitting;

    const toggleSelectedId = (userId: number) => {
        setSelectedIds((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId],
        );
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;

        // 👉 nếu không nhập tên → tự generate
        let finalName = groupName.trim();

        if (!finalName) {
            const selectedFriends = friends.filter((f) =>
                selectedIds.includes(f.id),
            );

            finalName = selectedFriends
                .map((f) => getFriendDisplayName(f))
                .join(", ");
        }

        await onSubmit({
            name: finalName,
            imageUrl: groupImageUrl,
            memberIds: selectedIds,
        });
    };
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-95 flex items-center justify-center bg-black/55 px-4 py-6">
            <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-[#303030] dark:bg-[#111111]">
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-[#2a2a2a]">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Tạo nhóm mới
                        </h2>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Chọn ít nhất 2 bạn bè để bắt đầu cuộc trò chuyện
                            nhóm.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#232323] dark:hover:text-gray-100"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-4 px-5 py-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex flex-col gap-1.5 text-sm text-gray-700 dark:text-gray-200">
                            <span className="font-medium">Tên nhóm</span>
                            <input
                                value={groupName}
                                onChange={(event) =>
                                    setGroupName(event.target.value)
                                }
                                placeholder="Ví dụ: Team UI Sprint"
                                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400 focus:bg-white dark:border-[#2f2f2f] dark:bg-[#171717] dark:text-white"
                            />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm text-gray-700 dark:text-gray-200">
                            <span className="font-medium">Ảnh nhóm (URL)</span>
                            <input
                                value={groupImageUrl}
                                onChange={(event) =>
                                    setGroupImageUrl(event.target.value)
                                }
                                placeholder="https://..."
                                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400 focus:bg-white dark:border-[#2f2f2f] dark:bg-[#171717] dark:text-white"
                            />
                        </label>
                    </div>

                    <div className="relative">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            value={searchKeyword}
                            onChange={(event) =>
                                setSearchKeyword(event.target.value)
                            }
                            placeholder="Tìm bạn bè để thêm vào nhóm"
                            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-blue-400 dark:border-[#2f2f2f] dark:bg-[#171717] dark:text-white"
                        />
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto border-y border-gray-200 px-5 py-3 dark:border-[#2a2a2a]">
                    {loadingFriends ? (
                        <div className="flex items-center justify-center py-10 text-sm text-gray-500 dark:text-gray-400">
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            Đang tải danh sách bạn bè...
                        </div>
                    ) : friendsError ? (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">
                            {friendsError}
                        </p>
                    ) : filteredFriends.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-gray-500 dark:text-gray-400">
                            <Users size={18} />
                            Không tìm thấy bạn bè phù hợp.
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {filteredFriends.map((friend) => {
                                const checked = selectedIds.includes(friend.id);
                                return (
                                    <label
                                        key={friend.id}
                                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                                            checked
                                                ? "border-blue-200 bg-blue-50 dark:border-blue-700/60 dark:bg-blue-900/20"
                                                : "border-gray-200 hover:bg-gray-50 dark:border-[#2f2f2f] dark:hover:bg-[#1a1a1a]"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() =>
                                                toggleSelectedId(friend.id)
                                            }
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <img
                                            src={
                                                friend.avatarUrl ||
                                                DEFAULT_AVATAR_URL
                                            }
                                            alt={getFriendDisplayName(friend)}
                                            className="h-9 w-9 rounded-full object-cover"
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                                {getFriendDisplayName(friend)}
                                            </p>
                                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                                @{friend.username}
                                            </p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="space-y-3 px-5 py-4">
                    {error && (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">
                            {error}
                        </p>
                    )}

                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Đã chọn {selectedIds.length} người
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#2f2f2f] dark:text-gray-200 dark:hover:bg-[#1b1b1b]"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleSubmit()}
                                disabled={!canSubmit}
                                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                            >
                                {submitting && (
                                    <Loader2
                                        size={15}
                                        className="mr-2 animate-spin"
                                    />
                                )}
                                Tạo nhóm
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
