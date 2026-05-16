import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants";
import pageService from "@/services/pageService";
import { buildS3Url } from "@/utils/s3";
import type { PageStatus } from "@/services/pageService";

const STATUS_OPTIONS: { label: string; value: PageStatus; icon: string }[] = [
  { label: "Công khai", value: "PUBLIC", icon: "earth-outline" },
  { label: "Riêng tư", value: "PRIVATE", icon: "lock-closed-outline" },
];

const CATEGORIES = [
  "Giải trí",
  "Giáo dục",
  "Công nghệ",
  "Thể thao",
  "Ẩm thực",
  "Du lịch",
  "Kinh doanh",
  "Âm nhạc",
  "Nghệ thuật",
  "Sức khỏe",
  "Thời trang",
  "Khác",
];

export default function PageEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pageId } = useLocalSearchParams<{ pageId?: string }>();
  const numericPageId = Number(pageId ?? 0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<PageStatus>("PUBLIC");

  const [avatarLocalUri, setAvatarLocalUri] = useState("");
  const [coverLocalUri, setCoverLocalUri] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [pendingAvatarAsset, setPendingAvatarAsset] = useState<{
    uri: string;
    mimeType: string;
    extension: string;
  } | null>(null);
  const [pendingCoverAsset, setPendingCoverAsset] = useState<{
    uri: string;
    mimeType: string;
    extension: string;
  } | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState("");
  const [existingCoverUrl, setExistingCoverUrl] = useState("");

  useEffect(() => {
    if (!numericPageId) return;
    pageService
      .findPageById(numericPageId)
      .then((page) => {
        if (page) {
          setName(page.name ?? "");
          setUsername(page.username ?? "");
          setDescription(page.description ?? "");
          setCategory(page.category ?? "");
          setPhone(page.phone ?? "");
          setEmail(page.email ?? "");
          setWebsite(page.website ?? "");
          setAddress(page.address ?? "");
          setStatus(page.status ?? "PUBLIC");
          setExistingAvatarUrl(page.avatarUrl ?? "");
          setExistingCoverUrl(page.coverUrl ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, [numericPageId]);

  const pickAvatarImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Quyền truy cập",
        "Cần quyền truy cập thư viện ảnh để chọn ảnh.",
      );
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
      Alert.alert(
        "Quyền truy cập",
        "Cần quyền truy cập thư viện ảnh để chọn ảnh.",
      );
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

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên trang.");
      return;
    }
    setSaving(true);
    let uploadFailed = false;

    try {
      // Upload avatar if selected
      if (pendingAvatarAsset) {
        setIsUploadingAvatar(true);
        try {
          const extension = pendingAvatarAsset.extension;
          const uploadUrl = await pageService.getUploadAvatarUrl(
            "pages",
            numericPageId,
            extension,
          );

          if (!uploadUrl) {
            throw new Error("Không thể lấy URL upload ảnh đại diện.");
          }

          const blob = await fetch(pendingAvatarAsset.uri).then((r) =>
            r.blob(),
          );
          const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": pendingAvatarAsset.mimeType },
            body: blob,
          });

          if (!uploadRes.ok) {
            throw new Error("Không thể tải lên ảnh đại diện.");
          }

          setPendingAvatarAsset(null);
        } catch (err) {
          uploadFailed = true;
          throw err;
        } finally {
          setIsUploadingAvatar(false);
        }
      }

      // Upload cover if selected
      if (pendingCoverAsset) {
        setIsUploadingCover(true);
        try {
          const extension = pendingCoverAsset.extension;
          const uploadUrl = await pageService.getUploadCoverUrl(
            "pages",
            numericPageId,
            extension,
          );

          if (!uploadUrl) {
            throw new Error("Không thể lấy URL upload ảnh bìa.");
          }

          const blob = await fetch(pendingCoverAsset.uri).then((r) => r.blob());
          const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": pendingCoverAsset.mimeType },
            body: blob,
          });

          if (!uploadRes.ok) {
            throw new Error("Không thể tải lên ảnh bìa.");
          }

          setPendingCoverAsset(null);
        } catch (err) {
          uploadFailed = true;
          throw err;
        } finally {
          setIsUploadingCover(false);
        }
      }

      // Update page info (images already updated via upload)
      const ok = await pageService.updatePage(numericPageId, {
        name: name.trim(),
        username: username.trim() || undefined,
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
        address: address.trim() || undefined,
        status,
      });

      if (ok) {
        Alert.alert("Thành công", "Đã cập nhật trang.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Lỗi", "Không thể cập nhật trang. Vui lòng thử lại.");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Không thể cập nhật trang.";
      Alert.alert("Lỗi", msg);
      // Reset to old images only if upload failed, not if updatePage failed
      if (uploadFailed) {
        setAvatarLocalUri("");
        setCoverLocalUri("");
        setPendingAvatarAsset(null);
        setPendingCoverAsset(null);
        // Restore old URLs in DB if upload failed
        try {
          await pageService.updatePage(numericPageId, {
            avatarUrl: existingAvatarUrl || undefined,
            coverUrl: existingCoverUrl || undefined,
          });
        } catch {
          // Silent fail on restoration attempt
        }
      }
    } finally {
      setSaving(false);
      setIsUploadingAvatar(false);
      setIsUploadingCover(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[styles.container, styles.center, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const avatarSource = avatarLocalUri || existingAvatarUrl;
  const coverSource = coverLocalUri || existingCoverUrl;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa trang</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !name.trim()}
          style={[
            styles.saveBtn,
            (!name.trim() || saving) && styles.saveBtnDisabled,
          ]}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Lưu</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 18,
          paddingBottom: insets.bottom + 60,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel label="Thông tin cơ bản" />
        <Field
          label="Tên trang *"
          value={name}
          onChange={setName}
          placeholder="Nhập tên trang"
        />
        <Field
          label="Username"
          value={username}
          onChange={setUsername}
          placeholder="@username"
          autoCapitalize="none"
        />

        <Text style={styles.fieldLabel}>Danh mục</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(active ? "" : cat)}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Field
          label="Mô tả"
          value={description}
          onChange={setDescription}
          placeholder="Giới thiệu về trang..."
          multiline
        />

        <SectionLabel label="Quyền riêng tư" />
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 4 }}>
          {STATUS_OPTIONS.map((opt) => {
            const active = status === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setStatus(opt.value)}
                style={[styles.statusCard, active && styles.statusCardActive]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={24}
                  color={active ? colors.white : colors.textMuted}
                />
                <Text
                  style={[
                    styles.statusLabel,
                    active && styles.statusLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
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
          ) : avatarSource ? (
            <Image
              key={`avatar-${avatarSource}`}
              source={{ uri: buildS3Url(avatarSource) }}
              style={styles.avatarPreview}
            />
          ) : (
            <Ionicons
              name="camera-outline"
              size={28}
              color={colors.textMuted}
            />
          )}
          <Text
            style={[
              styles.imagePickerLabel,
              avatarSource ? { color: colors.primary } : {},
            ]}
          >
            {isUploadingAvatar
              ? "Đang tải lên..."
              : avatarSource
                ? "Đổi ảnh"
                : "Chọn ảnh"}
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
          ) : coverSource ? (
            <Image
              key={`cover-${coverSource}`}
              source={{ uri: buildS3Url(coverSource) }}
              style={styles.coverPreview}
            />
          ) : (
            <Ionicons name="image-outline" size={28} color={colors.textMuted} />
          )}
          <Text
            style={[
              styles.imagePickerLabel,
              coverSource ? { color: colors.primary } : {},
            ]}
          >
            {isUploadingCover
              ? "Đang tải lên..."
              : coverSource
                ? "Đổi ảnh bìa"
                : "Chọn ảnh bìa"}
          </Text>
        </TouchableOpacity>

        <SectionLabel label="Liên hệ (tùy chọn)" />
        <Field
          label="Số điện thoại"
          value={phone}
          onChange={setPhone}
          placeholder="0912345678"
        />
        <Field
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="contact@example.com"
          autoCapitalize="none"
        />
        <Field
          label="Website"
          value={website}
          onChange={setWebsite}
          placeholder="https://example.com"
          autoCapitalize="none"
        />
        <Field
          label="Địa chỉ"
          value={address}
          onChange={setAddress}
          placeholder="Địa chỉ trang"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontSize: 16,
        fontWeight: "700",
        color: colors.text,
        marginTop: 24,
        marginBottom: 12,
      }}
    >
      {label}
    </Text>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: colors.textMuted,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
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
          ...(multiline
            ? { minHeight: 80, textAlignVertical: "top" as any }
            : {}),
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
  center: { justifyContent: "center", alignItems: "center" },
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
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
    minWidth: 60,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: colors.white },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 8,
  },
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
  statusCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusLabel: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  statusLabelActive: { color: colors.white },

  imageSubLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 8,
  },
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
