import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/constants";
import pageService from "@/services/pageService";
import type { CreatePageRequest, PageStatus } from "@/services/pageService";

const STATUS_OPTIONS: { label: string; value: PageStatus; icon: string }[] = [
    { label: "Công khai", value: "PUBLIC", icon: "earth-outline" },
    { label: "Riêng tư", value: "PRIVATE", icon: "lock-closed-outline" },
];

const CATEGORIES = [
    "Giải trí", "Giáo dục", "Công nghệ", "Thể thao",
    "Ẩm thực", "Du lịch", "Kinh doanh", "Âm nhạc",
    "Nghệ thuật", "Sức khỏe", "Thời trang", "Khác",
];

export default function CreatePageScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarLocalUri, setAvatarLocalUri] = useState("");
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [coverLocalUri, setCoverLocalUri] = useState("");
    const [pendingAvatarAsset, setPendingAvatarAsset] = useState<{ uri: string; mimeType: string; extension: string } | null>(null);
    const [pendingCoverAsset, setPendingCoverAsset] = useState<{ uri: string; mimeType: string; extension: string } | null>(null);
    const [form, setForm] = useState<CreatePageRequest>({
        name: "",
        username: "",
        category: "",
        description: "",
        avatarUrl: "",
        coverUrl: "",
        phone: "",
        email: "",
        website: "",
        address: "",
        status: "PUBLIC",
    });

    const update = (key: keyof CreatePageRequest, value: string) => {
        setForm(f => ({ ...f, [key]: value }));
    };

    const pickAvatarImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert("Quyền truy cập", "Cần quyền truy cập thư viện ảnh để chọn ảnh.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
        });
        if (result.canceled || !result.assets[0]) return;
        const asset = result.assets[0];
        const mimeType = asset.mimeType ?? "image/jpeg";
        const extension = mimeType.split("/")[1].replace("jpeg", "jpg");
        setAvatarLocalUri(asset.uri);
        setPendingAvatarAsset({ uri: asset.uri, mimeType, extension });
    };

    const pickCoverImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert("Quyền truy cập", "Cần quyền truy cập thư viện ảnh để chọn ảnh.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
        });
        if (result.canceled || !result.assets[0]) return;
        const asset = result.assets[0];
        const mimeType = asset.mimeType ?? "image/jpeg";
        const extension = mimeType.split("/")[1].replace("jpeg", "jpg");
        setCoverLocalUri(asset.uri);
        setPendingCoverAsset({ uri: asset.uri, mimeType, extension });
    };

    const handleSubmit = async () => {
        if (!form.name?.trim()) {
            Alert.alert("Thiếu thông tin", "Vui lòng nhập tên trang.");
            return;
        }
        setIsSubmitting(true);
        try {
            let finalAvatarUrl = form.avatarUrl;
            let finalCoverUrl = form.coverUrl;

            if (pendingAvatarAsset) {
                setIsUploadingAvatar(true);
                const urls = await pageService.getUploadUrl("pages", pendingAvatarAsset.extension);
                if (!urls) throw new Error("Không thể lấy URL upload ảnh đại diện.");
                const blob = await fetch(pendingAvatarAsset.uri).then(r => r.blob());
                const uploadRes = await fetch(urls.uploadUrl, {
                    method: "PUT",
                    headers: { "Content-Type": pendingAvatarAsset.mimeType },
                    body: blob,
                });
                if (!uploadRes.ok) throw new Error("Không thể tải lên ảnh đại diện.");
                finalAvatarUrl = urls.uuid + "." + urls.extension;
                setIsUploadingAvatar(false);
            }

            if (pendingCoverAsset) {
                setIsUploadingCover(true);
                const urls = await pageService.getUploadUrl("pages", pendingCoverAsset.extension);
                if (!urls) throw new Error("Không thể lấy URL upload ảnh bìa.");
                const blob = await fetch(pendingCoverAsset.uri).then(r => r.blob());
                const uploadRes = await fetch(urls.uploadUrl, {
                    method: "PUT",
                    headers: { "Content-Type": pendingCoverAsset.mimeType },
                    body: blob,
                });
                if (!uploadRes.ok) throw new Error("Không thể tải lên ảnh bìa.");
                finalCoverUrl = urls.uuid + "." + urls.extension;
                setIsUploadingCover(false);
            }

            await pageService.createPage({ ...form, avatarUrl: finalAvatarUrl, coverUrl: finalCoverUrl });
            Alert.alert("Thành công", "Đã tạo trang mới!", [
                { text: "OK", onPress: () => router.back() },
            ]);
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || "Không thể tạo trang. Vui lòng thử lại.";
            Alert.alert("Lỗi", msg);
        } finally {
            setIsSubmitting(false);
            setIsUploadingAvatar(false);
            setIsUploadingCover(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tạo trang mới</Text>
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isSubmitting || !form.name?.trim()}
                    style={[styles.submitBtn, (!form.name?.trim() || isSubmitting) && styles.submitBtnDisabled]}
                    activeOpacity={0.7}
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                        <Text style={styles.submitBtnText}>Tạo</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 60 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <SectionLabel label="Thông tin cơ bản" />
                <Field
                    label="Tên trang *"
                    value={form.name || ""}
                    onChange={v => update("name", v)}
                    placeholder="Nhập tên trang"
                />
                <Field
                    label="Username"
                    value={form.username || ""}
                    onChange={v => update("username", v)}
                    placeholder="VD: my-awesome-page"
                    autoCapitalize="none"
                />

                <Text style={styles.fieldLabel}>Danh mục</Text>
                <View style={styles.chipRow}>
                    {CATEGORIES.map(cat => {
                        const active = form.category === cat;
                        return (
                            <TouchableOpacity
                                key={cat}
                                onPress={() => update("category", active ? "" : cat)}
                                style={[styles.chip, active && styles.chipActive]}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Field
                    label="Mô tả"
                    value={form.description || ""}
                    onChange={v => update("description", v)}
                    placeholder="Mô tả ngắn về trang"
                    multiline
                />

                <SectionLabel label="Quyền riêng tư" />
                <View style={{ flexDirection: "row", gap: 12, marginBottom: 4 }}>
                    {STATUS_OPTIONS.map(opt => {
                        const active = form.status === opt.value;
                        return (
                            <TouchableOpacity
                                key={opt.value}
                                onPress={() => update("status", opt.value)}
                                style={[styles.statusCard, active && styles.statusCardActive]}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={opt.icon as any}
                                    size={24}
                                    color={active ? colors.white : colors.textMuted}
                                />
                                <Text style={[styles.statusLabel, active && styles.statusLabelActive]}>{opt.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <SectionLabel label="Hình ảnh" />
                <Text style={styles.imageSubLabel}>Avatar trang</Text>
                <TouchableOpacity
                    onPress={pickAvatarImage}
                    disabled={isUploadingAvatar}
                    style={styles.avatarPickerBtn}
                    activeOpacity={0.7}
                >
                    {isUploadingAvatar ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : avatarLocalUri ? (
                        <Image source={{ uri: avatarLocalUri }} style={styles.avatarPreview} />
                    ) : (
                        <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
                    )}
                    <Text style={[styles.imagePickerLabel, avatarLocalUri ? { color: colors.primary } : {}]}>
                        {isUploadingAvatar ? "Đang tải lên..." : avatarLocalUri ? "Đổi ảnh" : "Chọn ảnh"}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.imageSubLabel}>Ảnh bìa trang</Text>
                <TouchableOpacity
                    onPress={pickCoverImage}
                    disabled={isUploadingCover}
                    style={styles.coverPickerBtn}
                    activeOpacity={0.7}
                >
                    {isUploadingCover ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : coverLocalUri ? (
                        <Image source={{ uri: coverLocalUri }} style={styles.coverPreview} />
                    ) : (
                        <Ionicons name="image-outline" size={28} color={colors.textMuted} />
                    )}
                    <Text style={[styles.imagePickerLabel, coverLocalUri ? { color: colors.primary } : {}]}>
                        {isUploadingCover ? "Đang tải lên..." : coverLocalUri ? "Đổi ảnh bìa" : "Chọn ảnh bìa"}
                    </Text>
                </TouchableOpacity>

                <SectionLabel label="Liên hệ (tùy chọn)" />
                <Field label="Điện thoại" value={form.phone || ""} onChange={v => update("phone", v)} placeholder="+84..." />
                <Field label="Email" value={form.email || ""} onChange={v => update("email", v)} placeholder="page@example.com" autoCapitalize="none" />
                <Field label="Website" value={form.website || ""} onChange={v => update("website", v)} placeholder="https://..." autoCapitalize="none" />
                <Field label="Địa chỉ" value={form.address || ""} onChange={v => update("address", v)} placeholder="Địa chỉ..." />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function SectionLabel({ label }: { label: string }) {
    return (
        <Text style={{
            fontSize: 16, fontWeight: "700", color: colors.text,
            marginTop: 24, marginBottom: 12,
        }}>
            {label}
        </Text>
    );
}

function Field({ label, value, onChange, placeholder, multiline, autoCapitalize }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    multiline?: boolean;
    autoCapitalize?: "none" | "sentences";
}) {
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 6 }}>{label}</Text>
            <TextInput
                style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 15,
                    color: colors.text,
                    ...(multiline ? { minHeight: 80, textAlignVertical: "top" as any } : {}),
                }}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                multiline={multiline}
                autoCapitalize={autoCapitalize}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
    submitBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: colors.primary,
        minWidth: 60,
        alignItems: "center",
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { fontSize: 15, fontWeight: "700", color: colors.white },

    fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 8 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, fontWeight: "500", color: colors.textMuted },
    chipTextActive: { color: colors.white, fontWeight: "600" },

    statusCard: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 18,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    statusCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    statusLabel: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
    statusLabelActive: { color: colors.white },

    imageSubLabel: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 8 },
    imagePickerLabel: { fontSize: 13, color: colors.textMuted, marginTop: 6 },

    avatarPickerBtn: {
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderRadius: 16,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingVertical: 20,
        marginBottom: 14,
    },
    avatarPreview: { width: 80, height: 80, borderRadius: 16 },

    coverPickerBtn: {
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderRadius: 16,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingVertical: 20,
        marginBottom: 14,
    },
    coverPreview: { width: "100%", height: 120, borderRadius: 12 },
});
