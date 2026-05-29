import { useAppContext } from "@/context/AppContext";
import { colors, spacing } from "@/constants";
import { PrivacyType } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createPagePost } from "@/services/postService";
import pageService from "@/services/pageService";
import type { MusicMetadata } from "@/services/musicService";
import StoryMusicPickerModal from "@/components/story/StoryMusicPickerModal";
import FriendSelectorModal from "@/components/post/FriendSelectorModal";
import LocationSearchModal from "@/components/post/LocationSearchModal";

const CAPTION_MAX = 2200;
const MAX_MEDIA = 10;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_VIDEOS = 2;

const privacyOptions: Array<{ value: PrivacyType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { value: "PUBLIC", label: "Công khai", icon: "earth-outline" },
    { value: "FRIENDS", label: "Bạn bè", icon: "people-outline" },
    { value: "ONLY_ME", label: "Chỉ mình tôi", icon: "lock-closed-outline" },
];

const toUploadFile = (asset: ImagePicker.ImagePickerAsset) => {
    const fallbackName = asset.uri.split("/").pop() || `post-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`;
    return {
        uri: asset.uri,
        name: asset.fileName || fallbackName,
        type: asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg"),
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
    };
};

export default function CreatePostScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { createPostWithOptions, currentUser } = useAppContext();
    // Page mode: when opened with a pageId param, the post is submitted to the
    // page (with approval flow) instead of the user's wall.
    const { pageId } = useLocalSearchParams<{ pageId?: string }>();
    const numericPageId = pageId ? Number(pageId) : null;
    const isPageMode = !!numericPageId && Number.isFinite(numericPageId);
    const [pageName, setPageName] = useState("");
    const [caption, setCaption] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [location, setLocation] = useState("");
    const [privacy, setPrivacy] = useState<PrivacyType>("PUBLIC");
    const [allowComments, setAllowComments] = useState(true);
    const [allowShares, setAllowShares] = useState(true);
    const [isPosting, setIsPosting] = useState(false);

    // Music
    const [music, setMusic] = useState<MusicMetadata | null>(null);
    const [showMusicPicker, setShowMusicPicker] = useState(false);

    // Tag friends
    const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);
    const [showFriendSelector, setShowFriendSelector] = useState(false);

    // Location search
    const [showLocationSearch, setShowLocationSearch] = useState(false);

    const canPost = useMemo(
        () => Boolean(caption.trim() || imageUrl.trim() || selectedMedia.length > 0) && !isPosting,
        [caption, imageUrl, selectedMedia.length, isPosting],
    );

    const videoCount = useMemo(() => selectedMedia.filter(a => a.type === "video").length, [selectedMedia]);

    useEffect(() => {
        if (!numericPageId) return;
        let cancelled = false;
        pageService
            .findPageById(numericPageId)
            .then((p) => {
                if (!cancelled && p) setPageName(p.name || "");
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [numericPageId]);

    const pickMedia = async () => {
        if (selectedMedia.length >= MAX_MEDIA) {
            Alert.alert("Giới hạn", `Tối đa ${MAX_MEDIA} ảnh/video.`);
            return;
        }

        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Quyền truy cập", "Bạn cần cấp quyền thư viện ảnh để chọn ảnh/video.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsMultipleSelection: true,
            quality: 0.9,
            videoMaxDuration: 180,
        });

        if (!result.canceled && result.assets?.length) {
            const remaining = MAX_MEDIA - selectedMedia.length;
            const newAssets = result.assets.slice(0, remaining);

            // Validate sizes and video count
            const errors: string[] = [];
            let addedVideos = 0;
            const validated = newAssets.filter(asset => {
                if (asset.type === "video") {
                    if (videoCount + addedVideos >= MAX_VIDEOS) {
                        errors.push(`Tối đa ${MAX_VIDEOS} video.`);
                        return false;
                    }
                    if (asset.fileSize && asset.fileSize > MAX_VIDEO_SIZE) {
                        errors.push(`Video "${asset.fileName || "video"}" vượt quá 100MB.`);
                        return false;
                    }
                    addedVideos++;
                } else {
                    if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
                        errors.push(`Ảnh "${asset.fileName || "ảnh"}" vượt quá 10MB.`);
                        return false;
                    }
                }
                return true;
            });

            if (errors.length > 0) {
                Alert.alert("Lưu ý", errors.join("\n"));
            }
            if (validated.length > 0) {
                setSelectedMedia(prev => [...prev, ...validated]);
            }
        }
    };

    const removeMediaAt = (index: number) => {
        setSelectedMedia(prev => prev.filter((_, i) => i !== index));
    };

    const handlePost = async () => {
        if (!canPost) return;
        setIsPosting(true);

        // Page mode → submit to the page (with approval flow)
        if (isPageMode && numericPageId) {
            try {
                const ok = await createPagePost(
                    numericPageId,
                    { content: caption, allowComments, allowShares },
                    selectedMedia.map(toUploadFile),
                );
                setIsPosting(false);
                if (!ok) {
                    Alert.alert("Lỗi", "Không thể tạo bài viết");
                    return;
                }
                router.back();
            } catch {
                setIsPosting(false);
                Alert.alert("Lỗi", "Không thể tạo bài viết");
            }
            return;
        }

        const result = await createPostWithOptions({
            caption,
            imageUrl: imageUrl.trim() || undefined,
            mediaFiles: selectedMedia.map(toUploadFile),
            privacy,
            allowComments,
            allowShares,
            location: location.trim() || undefined,
            taggedUserIds: taggedUserIds.length > 0 ? taggedUserIds : undefined,
            music: music ? {
                trackId: music.id,
                title: music.title,
                artist: music.artist,
                thumbnail: music.imageUrl || "",
                audioUrl: music.audioUrl,
                duration: music.duration,
            } : undefined,
        });
        setIsPosting(false);

        if (!result.success) {
            Alert.alert("Lỗi", result.message || "Không thể tạo bài viết");
            return;
        }

        router.back();
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {isPageMode ? `Đăng lên ${pageName || "trang"}` : "Tạo bài viết"}
                </Text>
                <TouchableOpacity style={[styles.postButton, !canPost && styles.postButtonDisabled]} onPress={handlePost} disabled={!canPost}>
                    <Text style={[styles.postButtonText, !canPost && styles.postButtonTextDisabled]}>{isPosting ? "Đang đăng" : "Đăng"}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Caption */}
                <View style={styles.composerCard}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionLabel}>Nội dung</Text>
                        <Text style={[styles.charCount, caption.length > CAPTION_MAX && styles.charCountOver]}>
                            {caption.length}/{CAPTION_MAX}
                        </Text>
                    </View>
                    <TextInput
                        style={styles.captionInput}
                        placeholder="Hãy chia sẻ những điều của bạn..."
                        placeholderTextColor={colors.textMuted}
                        multiline
                        value={caption}
                        onChangeText={t => setCaption(t.slice(0, CAPTION_MAX))}
                        maxLength={CAPTION_MAX}
                        editable={!isPosting}
                    />
                </View>

                {/* Media */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionLabel}>Media</Text>
                        <Text style={styles.mediaBadge}>{selectedMedia.length}/{MAX_MEDIA}</Text>
                    </View>
                    <TouchableOpacity style={styles.imagePlaceholder} onPress={pickMedia} disabled={isPosting}>
                        <Ionicons name="images-outline" size={54} color={colors.primary} />
                        <Text style={styles.imagePlaceholderText}>Chọn ảnh/video (tối đa {MAX_MEDIA}, ảnh ≤10MB, video ≤100MB)</Text>
                    </TouchableOpacity>
                    {selectedMedia.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaPreviewRow}>
                            {selectedMedia.map((asset, index) => (
                                <View key={`${asset.uri}-${index}`} style={styles.mediaPreviewWrap}>
                                    <Image source={{ uri: asset.uri }} style={styles.mediaPreview} resizeMode="cover" />
                                    {asset.type === "video" ? (
                                        <View style={styles.videoBadge}>
                                            <Ionicons name="play" size={12} color={colors.white} />
                                        </View>
                                    ) : null}
                                    <TouchableOpacity style={styles.removeMediaButton} onPress={() => removeMediaAt(index)} disabled={isPosting}>
                                        <Ionicons name="close" size={14} color={colors.white} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    ) : null}
                    <TextInput
                        style={styles.singleInput}
                        placeholder="Hoặc dán URL ảnh/video đã upload hoặc S3 key"
                        placeholderTextColor={colors.textMuted}
                        value={imageUrl}
                        onChangeText={setImageUrl}
                        autoCapitalize="none"
                        editable={!isPosting}
                    />
                </View>

                {/* Options */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Tùy chọn</Text>

                    {/* Location */}
                    <TouchableOpacity style={styles.optionItem} onPress={() => setShowLocationSearch(true)}>
                        <Ionicons name="location-outline" size={20} color={colors.primary} />
                        <Text style={[styles.optionText, !location && { color: colors.textMuted }]} numberOfLines={1}>
                            {location || "Thêm vị trí"}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                    </TouchableOpacity>

                    {/* Tag friends */}
                    <TouchableOpacity style={styles.optionItem} onPress={() => setShowFriendSelector(true)}>
                        <Ionicons name="person-add-outline" size={20} color={colors.primary} />
                        <Text style={[styles.optionText, taggedUserIds.length === 0 && { color: colors.textMuted }]} numberOfLines={1}>
                            {taggedUserIds.length > 0 ? `Đã tag ${taggedUserIds.length} bạn bè` : "Tag bạn bè"}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                    </TouchableOpacity>

                    {/* Music */}
                    <TouchableOpacity style={styles.optionItem} onPress={() => setShowMusicPicker(true)}>
                        <Ionicons name="musical-note-outline" size={20} color={colors.primary} />
                        <Text style={[styles.optionText, !music && { color: colors.textMuted }]} numberOfLines={1}>
                            {music ? `${music.title} • ${music.artist}` : "Thêm nhạc"}
                        </Text>
                        {music ? (
                            <TouchableOpacity onPress={() => setMusic(null)} hitSlop={8}>
                                <Ionicons name="close-circle" size={18} color="#FF3B30" />
                            </TouchableOpacity>
                        ) : (
                            <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                        )}
                    </TouchableOpacity>

                    {/* Allow toggles */}
                    <View style={styles.optionItem}>
                        <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                        <Text style={styles.optionText}>Cho phép bình luận</Text>
                        <Switch value={allowComments} onValueChange={setAllowComments} disabled={isPosting} />
                    </View>
                    <View style={styles.optionItem}>
                        <Ionicons name="paper-plane-outline" size={20} color={colors.primary} />
                        <Text style={styles.optionText}>Cho phép chia sẻ</Text>
                        <Switch value={allowShares} onValueChange={setAllowShares} disabled={isPosting} />
                    </View>
                </View>

                {/* Privacy — page posts inherit the page's visibility */}
                {!isPageMode && (
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Hiển thị cho</Text>
                    <View style={styles.visibilityOptions}>
                        {privacyOptions.map(item => {
                            const active = privacy === item.value;
                            return (
                                <TouchableOpacity key={item.value} style={[styles.visibilityBtn, active && styles.visibilityBtnActive]} onPress={() => setPrivacy(item.value)} disabled={isPosting}>
                                    <Ionicons name={item.icon} size={16} color={active ? colors.white : colors.textMuted} />
                                    <Text style={[styles.visibilityBtnText, active && styles.visibilityBtnTextActive]}>{item.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
                )}

                <View style={{ height: spacing.xxl }} />
            </ScrollView>

            {/* Modals */}
            <StoryMusicPickerModal
                visible={showMusicPicker}
                onClose={() => setShowMusicPicker(false)}
                onSelect={setMusic}
            />
            <FriendSelectorModal
                visible={showFriendSelector}
                onClose={() => setShowFriendSelector(false)}
                onDone={setTaggedUserIds}
                currentUserId={String(currentUser?.id || "")}
                initialSelected={taggedUserIds}
            />
            <LocationSearchModal
                visible={showLocationSearch}
                onClose={() => setShowLocationSearch(false)}
                onSelect={setLocation}
                initialValue={location}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
    closeButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: colors.text, flex: 1, textAlign: "center" },
    postButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primary, borderRadius: 8 },
    postButtonDisabled: { backgroundColor: colors.surface },
    postButtonText: { color: colors.white, fontSize: 13, fontWeight: "600" },
    postButtonTextDisabled: { color: colors.textMuted },
    content: { flex: 1, padding: 16 },
    composerCard: { marginBottom: spacing.lg },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    charCount: { fontSize: 12, color: colors.textMuted },
    charCountOver: { color: "#FF3B30" },
    mediaBadge: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
    imagePlaceholder: { height: 140, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed", paddingHorizontal: 18 },
    imagePlaceholderText: { fontSize: 13, color: colors.textMuted, marginTop: 8, textAlign: "center" },
    mediaPreviewRow: { gap: 10, paddingBottom: 12 },
    mediaPreviewWrap: { width: 104, height: 104, borderRadius: 12, overflow: "hidden", backgroundColor: colors.surface },
    mediaPreview: { width: "100%", height: "100%" },
    videoBadge: { position: "absolute", left: 8, bottom: 8, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.55)" },
    removeMediaButton: { position: "absolute", right: 6, top: 6, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)" },
    section: { marginBottom: spacing.lg },
    sectionLabel: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 12 },
    captionInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 15, color: colors.text, textAlignVertical: "top", minHeight: 130, backgroundColor: colors.white },
    singleInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: colors.text, backgroundColor: colors.white },
    optionItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
    optionText: { fontSize: 14, color: colors.text, flex: 1 },
    visibilityOptions: { gap: 8 },
    visibilityBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    visibilityBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    visibilityBtnText: { fontSize: 13, fontWeight: "600", color: colors.text },
    visibilityBtnTextActive: { color: colors.white },
});
