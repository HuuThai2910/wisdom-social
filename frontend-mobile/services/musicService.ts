import { Audio } from "expo-av";
import apiClient from "@/api/apiClient";
import { buildS3Url } from "@/utils/s3";

export type MusicMetadata = {
    id: string;
    title: string;
    artist: string;
    duration: number;
    imageUrl?: string;
    audioUrl: string;
    createdAt?: string;
};

type MusicPage = {
    content?: MusicMetadata[];
    totalElements?: number;
    totalPages?: number;
    currentPage?: number;
};

const unwrap = (payload: any) => payload?.data ?? payload;

const normalizeMusic = (item: any): MusicMetadata => ({
    id: String(item?.id ?? item?.trackId ?? ""),
    title: item?.title || "Không rõ tên bài hát",
    artist: item?.artist || "Không rõ nghệ sĩ",
    duration: Number(item?.duration ?? 0),
    imageUrl: buildS3Url(item?.imageUrl || item?.coverUrl || item?.thumbnail) || item?.imageUrl || item?.coverUrl || item?.thumbnail,
    audioUrl: buildS3Url(item?.audioUrl) || item?.audioUrl || "",
    createdAt: item?.createdAt,
});

const extractMusicArray = (payload: any): any[] => {
    const raw = unwrap(payload) as MusicPage | MusicMetadata[];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.content)) return raw.content;
    return [];
};

export const getAllMusic = async (page = 0, size = 20): Promise<MusicMetadata[]> => {
    try {
        const response = await apiClient.get("/music", { params: { page, size } });
        return extractMusicArray(response.data).map(normalizeMusic).filter((track) => track.id && track.audioUrl);
    } catch {
        return [];
    }
};

export const searchMusicByTitle = async (title: string): Promise<MusicMetadata[]> => {
    const query = title.trim();
    if (!query) return [];
    try {
        const response = await apiClient.get("/music/search/title", { params: { title: query } });
        return extractMusicArray(response.data).map(normalizeMusic).filter((track) => track.id && track.audioUrl);
    } catch {
        return [];
    }
};

export const searchMusicByArtist = async (artist: string): Promise<MusicMetadata[]> => {
    const query = artist.trim();
    if (!query) return [];
    try {
        const response = await apiClient.get("/music/search/artist", { params: { artist: query } });
        return extractMusicArray(response.data).map(normalizeMusic).filter((track) => track.id && track.audioUrl);
    } catch {
        return [];
    }
};

export const getMusicById = async (musicId: string): Promise<MusicMetadata | null> => {
    try {
        const response = await apiClient.get(`/music/${musicId}`);
        const data = unwrap(response.data);
        return data ? normalizeMusic(data) : null;
    } catch {
        return null;
    }
};

export const formatDuration = (seconds?: number): string => {
    const total = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const resolveMusicMediaUrl = (mediaPath?: string | null): string => buildS3Url(mediaPath) || "";

let currentSound: Audio.Sound | null = null;
let currentUrl: string | null = null;
const listeners = new Set<(url: string | null) => void>();

const notifyListeners = () => listeners.forEach((callback) => callback(currentUrl));

export const subscribeToPlayback = (callback: (url: string | null) => void) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
};

export const stopAudioPreview = async (): Promise<void> => {
    if (!currentSound) return;
    const sound = currentSound;
    currentSound = null;
    currentUrl = null;
    notifyListeners();
    await sound.stopAsync().catch(() => undefined);
    await sound.unloadAsync().catch(() => undefined);
};

export const playAudioPreview = async (
    url: string,
    options?: { onEnded?: () => void },
): Promise<Audio.Sound | null> => {
    if (!url) return null;
    await stopAudioPreview();
    const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true, volume: 0.8 });
    currentSound = sound;
    currentUrl = url;
    notifyListeners();
    sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
            if (currentSound === sound) {
                currentSound = null;
                currentUrl = null;
                notifyListeners();
            }
            options?.onEnded?.();
            void sound.unloadAsync().catch(() => undefined);
        }
    });
    return sound;
};
