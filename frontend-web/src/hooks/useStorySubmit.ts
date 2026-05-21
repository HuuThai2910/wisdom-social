import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { StoryTextManager } from "./useStoryTextManager";
import type { StoryMusicManager } from "./useStoryMusicSticker";

const BG_GRADIENTS = [
    "bg-gradient-to-br from-purple-600 via-pink-500 to-red-500",
    "bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400",
    "bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-300",
    "bg-gradient-to-br from-green-600 via-emerald-500 to-teal-400",
    "bg-gradient-to-br from-indigo-600 via-purple-500 to-pink-400",
    "bg-gradient-to-br from-rose-500 via-red-400 to-orange-400",
    "bg-gradient-to-br from-slate-800 via-gray-700 to-zinc-600",
    "bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600",
    "bg-gradient-to-br from-fuchsia-600 via-violet-500 to-indigo-400",
    "bg-gradient-to-br from-teal-600 via-emerald-400 to-lime-400",
];

interface SubmitParams {
    textManager: StoryTextManager;
    musicManager: StoryMusicManager;
    selectedMedia: File | null;
    privacy: string;
    allowReplies: boolean;
    allowSharing: boolean;
    selectedBgIndex: number;
}

export function useStorySubmit() {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePost = async (params: SubmitParams) => {
        if (!canSubmit(params)) return;
        setIsSubmitting(true);
        try {
            console.log("Creating story...", {
                layers: params.textManager.layers,
                selectedMedia: params.selectedMedia,
                privacy: params.privacy,
                music: params.musicManager.sticker?.music || null,
                musicStyle: params.musicManager.sticker?.style || null,
                allowReplies: params.allowReplies,
                allowSharing: params.allowSharing,
                bgGradient: !params.selectedMedia
                    ? BG_GRADIENTS[params.selectedBgIndex]
                    : null,
            });
            await new Promise((r) => setTimeout(r, 1000));
            navigate(-1);
        } catch (error) {
            console.error("Error creating story:", error);
            alert("Không thể tạo tin. Vui lòng thử lại.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        isSubmitting,
        handlePost,
        canSubmit,
    };
}

function canSubmit(params: SubmitParams): boolean {
    return (
        !params.textManager.layers.every((l) => !l.text.trim()) ||
        params.selectedMedia !== null ||
        params.musicManager.sticker !== null
    );
}
