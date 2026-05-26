import StoryMusicPickerModal from "@/components/story/StoryMusicPickerModal";
import { useAppContext } from "@/context/AppContext";
import type { MusicMetadata } from "@/services/musicService";
import { createStory, uploadStoryMediaAndGetFormat } from "@/services/storyService";
import { PrivacyType } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Video, ResizeMode } from "expo-av";
import { colors, spacing } from "@/constants";

const BG_GRADIENTS: readonly [string, string][] = [
    ["#7C3AED", "#EF4444"],
    ["#2563EB", "#14B8A6"],
    ["#F97316", "#FACC15"],
    ["#059669", "#84CC16"],
    ["#4F46E5", "#EC4899"],
    ["#E11D48", "#FB923C"],
    ["#1F2937", "#71717A"],
    ["#38BDF8", "#4F46E5"],
];

const privacyOptions: Array<{ value: PrivacyType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { value: "PUBLIC", label: "Công khai", icon: "earth-outline" },
    { value: "FRIENDS", label: "Bạn bè", icon: "people-outline" },
    { value: "ONLY_ME", label: "Chỉ mình tôi", icon: "lock-closed-outline" },
];

export default function CreateStoryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { currentUser } = useAppContext();
    const [content, setContent] = useState("");
    const [selectedBgIndex, setSelectedBgIndex] = useState(0);
    const [media, setMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [privacy, setPrivacy] = useState<PrivacyType>("PUBLIC");
    const [allowReplies, setAllowReplies] = useState(true);
    const [allowReactions, setAllowReactions] = useState(true);
    const [allowSharing, setAllowSharing] = useState(true);
    const [muteOriginal, setMuteOriginal] = useState(false);
    const [selectedMusic, setSelectedMusic] = useState<MusicMetadata | null>(null);
    const [musicPickerOpen, setMusicPickerOpen] = useState(false);
    const [posting, setPosting] = useState(false);
 
   const isVideo = media?.type === "video";
   const canSubmit = useMemo(
       () => Boolean(content.trim() || media || selectedMusic) && !posting,
       [content, media, posting, selectedMusic],
   );

    const pickMedia = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Quyền truy cập", "Bạn cần cấp quyền thư viện ảnh để chọn ảnh/video.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: false,
            quality: 0.9,
            videoMaxDuration: 60,
        });
        if (!result.canceled && result.assets[0]) setMedia(result.assets[0]);
    };

    const handlePost = async () => {
        if (!canSubmit) return;
        setPosting(true);
        try {
            let mediaUrls: string[] = [];
            if (media) {
                const name = media.fileName || media.uri.split("/").pop() || `story-${Date.now()}.${isVideo ? "mp4" : "jpg"}`;
                const type = media.mimeType || (isVideo ? "video/mp4" : "image/jpeg");
                const key = await uploadStoryMediaAndGetFormat({ uri: media.uri, name, type });
                mediaUrls = [key];
            }
            const textPayload = content.trim()
                ? `${content.trim()}${!media ? ` [bg:${selectedBgIndex}]` : ""}`
                : !media
                  ? `[bg:${selectedBgIndex}]`
                  : undefined;
            await createStory({
                content: textPayload,
                privacy,
                mediaUrls,
                musicId: selectedMusic?.id,
                musicStartTime: selectedMusic ? 0 : undefined,
                muteOriginal,
                allowReplies,
                allowReactions,
                allowSharing,
            });
            router.back();
        } catch (error: any) {
            Alert.alert("Lỗi", error?.response?.data?.message || error?.message || "Không thể tạo story");
        } finally {
            setPosting(false);
        }
    };

    return (
        <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                    <Ionicons name="close" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tạo tin</Text>
                <TouchableOpacity style={[styles.shareButton, !canSubmit && styles.shareButtonDisabled]} disabled={!canSubmit} onPress={handlePost}>
                    <Text style={[styles.shareText, !canSubmit && styles.shareTextDisabled]}>{posting ? "Đang chia sẻ..." : "Chia sẻ"}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.previewFrame}>
                    {media ? (
                        isVideo ? (
                            <Video source={{ uri: media.uri }} style={styles.previewMedia} resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted={muteOriginal} />
                        ) : (
                            <Image source={{ uri: media.uri }} style={styles.previewMedia} resizeMode="cover" />
                        )
                    ) : (
                        <LinearGradient colors={BG_GRADIENTS[selectedBgIndex]} style={styles.previewMedia}>
                            <Text style={styles.previewText}>{content.trim() || "Nhập nội dung story"}</Text>
                        </LinearGradient>
                    )}
                    {media && content.trim() ? (
                        <View style={styles.textSticker}>
                            <Text style={styles.textStickerText}>{content.trim()}</Text>
                        </View>
                    ) : null}
                    <View style={styles.userChip}>
                        <Text style={styles.userChipText}>{currentUser?.username || "Bạn"}</Text>
                    </View>
                    {selectedMusic ? (
                        <View style={styles.musicSticker}>
                            <Text style={styles.musicIcon}>🎵</Text>
                            <View style={styles.musicTextWrap}>
                                <Text style={styles.musicTitle} numberOfLines={1}>{selectedMusic.title}</Text>
                                <Text style={styles.musicArtist} numberOfLines={1}>{selectedMusic.artist}</Text>
                            </View>
                        </View>
                    ) : null}
                </View>
 
               <View style={styles.panel}>
                    <Text style={styles.label}>Nội dung</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Bạn đang nghĩ gì?"
                        placeholderTextColor="rgba(255,255,255,0.35)"
                        value={content}
                        onChangeText={setContent}
                        multiline
                        editable={!posting}
                    />
                </View>

                {!media ? (
                    <View style={styles.panel}>
                        <Text style={styles.label}>Nền</Text>
                        <View style={styles.gradientRow}>
                            {BG_GRADIENTS.map((gradient, index) => (
                                <TouchableOpacity key={index} onPress={() => setSelectedBgIndex(index)} style={[styles.gradientDotWrap, selectedBgIndex === index && styles.gradientDotActive]}>
                                    <LinearGradient colors={gradient} style={styles.gradientDot} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : null}

                <View style={styles.panel}>
                    <Text style={styles.label}>Ảnh / Video</Text>
                    <TouchableOpacity style={styles.mediaButton} onPress={pickMedia} disabled={posting}>
                        <Ionicons name="image-outline" size={20} color={colors.white} />
                        <Text style={styles.mediaButtonText}>{media ? media.fileName || "Đổi ảnh/video" : "Tải lên ảnh hoặc video"}</Text>
                    </TouchableOpacity>
                    {media ? (
                        <TouchableOpacity style={styles.removeMediaButton} onPress={() => setMedia(null)}>
                            <Ionicons name="trash-outline" size={16} color="#F87171" />
                            <Text style={styles.removeMediaText}>Xóa media</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                <View style={styles.panel}>
                    <Text style={styles.label}>Âm nhạc</Text>
                    <TouchableOpacity style={styles.musicButton} onPress={() => setMusicPickerOpen(true)} disabled={posting}>
                        <Ionicons name="musical-notes-outline" size={20} color={colors.white} />
                        <View style={styles.musicButtonTextWrap}>
                            <Text style={styles.musicButtonText}>{selectedMusic ? selectedMusic.title : "Chọn nhạc cho story"}</Text>
                            {selectedMusic ? <Text style={styles.musicButtonSubText}>{selectedMusic.artist}</Text> : null}
                        </View>
                    </TouchableOpacity>
                    {selectedMusic ? (
                        <TouchableOpacity style={styles.removeMusicButton} onPress={() => setSelectedMusic(null)} disabled={posting}>
                            <Ionicons name="close-circle-outline" size={16} color="#F87171" />
                            <Text style={styles.removeMediaText}>Gỡ nhạc</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                {(isVideo || selectedMusic) ? (
                    <View style={styles.panel}>
                        <View style={styles.settingRow}>
                            <Text style={styles.settingText}>Tắt tiếng video gốc</Text>
                            <Switch value={muteOriginal} onValueChange={setMuteOriginal} disabled={!isVideo} />
                        </View>
                    </View>
                ) : null}

                <View style={styles.panel}>
                    <Text style={styles.label}>Quyền riêng tư</Text>
                    {privacyOptions.map((item) => {
                        const active = privacy === item.value;
                        return (
                            <TouchableOpacity key={item.value} style={[styles.optionRow, active && styles.optionRowActive]} onPress={() => setPrivacy(item.value)}>
                                <Ionicons name={item.icon} size={19} color={active ? "#60A5FA" : colors.white} />
                                <Text style={styles.optionText}>{item.label}</Text>
                                {active ? <View style={styles.selectedDot} /> : null}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.panel}>
                    <Text style={styles.label}>Cài đặt nâng cao</Text>
                    <View style={styles.settingRow}>
                        <Text style={styles.settingText}>Cho phép reply story</Text>
                        <Switch value={allowReplies} onValueChange={setAllowReplies} />
                    </View>
                    <View style={styles.settingRow}>
                        <Text style={styles.settingText}>Cho phép bày tỏ cảm xúc</Text>
                        <Switch value={allowReactions} onValueChange={setAllowReactions} />
                    </View>
                    <View style={styles.settingRow}>
                        <Text style={styles.settingText}>Cho phép chia sẻ</Text>
                        <Switch value={allowSharing} onValueChange={setAllowSharing} />
                    </View>
                </View>
            </ScrollView>
            <StoryMusicPickerModal
                visible={musicPickerOpen}
                onClose={() => setMusicPickerOpen(false)}
                onSelect={setSelectedMusic}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#111111" },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
    headerBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
    headerTitle: { color: colors.white, fontSize: 16, fontWeight: "800" },
    shareButton: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.primary },
    shareButtonDisabled: { backgroundColor: "rgba(255,255,255,0.1)" },
    shareText: { color: colors.white, fontSize: 13, fontWeight: "800" },
    shareTextDisabled: { color: "rgba(255,255,255,0.35)" },
    content: { padding: spacing.md, paddingBottom: 40 },
    previewFrame: { alignSelf: "center", width: "78%", maxWidth: 340, aspectRatio: 9 / 16, borderRadius: 24, overflow: "hidden", backgroundColor: "#09090B", marginBottom: spacing.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
    previewMedia: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    previewText: { color: colors.white, fontSize: 22, fontWeight: "800", textAlign: "center", lineHeight: 32 },
    textSticker: { position: "absolute", left: 16, right: 16, bottom: 44, padding: 12, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.45)" },
    textStickerText: { color: colors.white, fontWeight: "700", textAlign: "center" },
    userChip: { position: "absolute", top: 14, left: 14, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.45)" },
    userChipText: { color: colors.white, fontSize: 11, fontWeight: "800" },
    musicSticker: { position: "absolute", top: 58, left: 14, right: 14, flexDirection: "row", alignItems: "center", gap: 9, padding: 10, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.48)" },
    musicIcon: { fontSize: 20 },
    musicTextWrap: { flex: 1 },
    musicTitle: { color: colors.white, fontSize: 12, fontWeight: "800" },
    musicArtist: { color: "rgba(255,255,255,0.62)", fontSize: 10, marginTop: 2 },
    panel: { padding: 14, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", marginBottom: spacing.md, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
    label: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginBottom: 10 },
    textArea: { minHeight: 82, color: colors.white, textAlignVertical: "top", fontSize: 15, lineHeight: 21 },
    gradientRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    gradientDotWrap: { padding: 3, borderRadius: 999, borderWidth: 2, borderColor: "transparent" },
    gradientDotActive: { borderColor: "#60A5FA" },
    gradientDot: { width: 36, height: 36, borderRadius: 18 },
    mediaButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.24)", backgroundColor: "rgba(255,255,255,0.06)" },
    mediaButtonText: { color: colors.white, fontWeight: "700", flexShrink: 1 },
    removeMediaButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, padding: 10 },
    removeMediaText: { color: "#F87171", fontWeight: "700" },
    musicButton: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(168,85,247,0.12)" },
    musicButtonTextWrap: { flex: 1, minWidth: 0 },
    musicButtonText: { color: colors.white, fontWeight: "800" },
    musicButtonSubText: { color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 },
    removeMusicButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, padding: 10 },
    optionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.05)", marginBottom: 8 },
    optionRowActive: { backgroundColor: "rgba(59,130,246,0.16)", borderWidth: 1, borderColor: "rgba(96,165,250,0.5)" },
    optionText: { color: colors.white, fontWeight: "700", flex: 1 },
    selectedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#60A5FA" },
    settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, gap: 12 },
    settingText: { color: colors.white, fontSize: 14, fontWeight: "600", flex: 1 },
});
