import React, { useState, useEffect, useRef } from "react";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    View,
    Text,
    Pressable,
    TextInput,
    ActivityIndicator,
    Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppHeader } from "@/components";
import { colors, spacing } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import {
    validateUsername,
    validateFullName,
    validateBirthday,
    validateGender,
} from "@/utils/validation";
import userService from "@/services/userService";

type FormState = {
    name: string;
    username: string;
    bio: string;
    birthday: string;
    gender: "MALE" | "FEMALE" | "HIDDEN";
    website: string;
    avatarUrl: string;
};

type FormErrors = {
    name: string;
    username: string;
    birthday: string;
    gender: string;
};

export default function InstagramProfileEditScreen() {
    const router = useRouter();
    const { currentUser } = useAppContext();
    const fileInputRef = useRef<any>(null);

    const [formData, setFormData] = useState<FormState>({
        name: "",
        username: "",
        bio: "",
        birthday: "",
        gender: "HIDDEN",
        website: "",
        avatarUrl: "",
    });

    const [formErrors, setFormErrors] = useState<FormErrors>({
        name: "",
        username: "",
        birthday: "",
        gender: "",
    });

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewAvatar, setPreviewAvatar] = useState("");
    const [message, setMessage] = useState<{ type: "success" | "error" | "loading"; text: string } | null>(null);

    useEffect(() => {
        if (currentUser) {
            setFormData({
                name: currentUser.fullName ?? "",
                username: currentUser.username ?? "",
                bio: currentUser.bio ?? "",
                birthday: currentUser.birthday ?? "",
                gender: (currentUser.gender as "MALE" | "FEMALE" | "HIDDEN") || "HIDDEN",
                website: currentUser.website ?? "",
                avatarUrl: currentUser.avatar ?? "",
            });
            setPreviewAvatar(currentUser.avatar ?? "");
        }
    }, [currentUser]);

    const validateField = (field: keyof FormState, value: string) => {
        let error = "";

        if (field === "name") {
            const validation = validateFullName(value);
            error = validation.error || "";
        } else if (field === "birthday") {
            if (value) {
                const validation = validateBirthday(value);
                error = validation.error || "";
            }
        } else if (field === "gender") {
            const validation = validateGender(value);
            error = validation.error || "";
        }

        setFormErrors((prev) => ({ ...prev, [field]: error }));
        return error === "";
    };

    const validateUsernameAsync = async (value: string) => {
        if (!value) {
            setFormErrors((prev) => ({ ...prev, username: "Tên người dùng không được để trống" }));
            return false;
        }

        const basicValidation = validateUsername(value);
        if (!basicValidation.isValid) {
            setFormErrors((prev) => ({ ...prev, username: basicValidation.error || "" }));
            return false;
        }

        if (value === currentUser?.username) {
            setFormErrors((prev) => ({ ...prev, username: "" }));
            return true;
        }

        try {
            const users = await userService.searchUserByUsername(value);
            if (users && users.length > 0) {
                setFormErrors((prev) => ({ ...prev, username: "Tên người dùng này đã tồn tại" }));
                return false;
            }
        } catch (error) {
            console.error("Error checking username:", error);
        }

        setFormErrors((prev) => ({ ...prev, username: "" }));
        return true;
    };

    const handleSubmit = async () => {
        if (!currentUser) return;

        const nameValid = validateField("name", formData.name);
        const birthdayValid = formData.birthday ? validateField("birthday", formData.birthday) : true;
        const genderValid = validateField("gender", formData.gender);

        if (!nameValid || !birthdayValid || !genderValid) {
            setMessage({ type: "error", text: "Vui lòng kiểm tra thông tin form" });
            return;
        }

        const usernameChanged = formData.username !== currentUser.username;
        if (usernameChanged) {
            const usernameValid = await validateUsernameAsync(formData.username);
            if (!usernameValid) {
                setMessage({ type: "error", text: "Tên người dùng không hợp lệ" });
                return;
            }
        }

        setLoading(true);
        setMessage({ type: "loading", text: "Đang lưu thông tin..." });

        try {
            const updateData = {
                name: formData.name,
                username: formData.username,
                bio: formData.bio,
                birthday: formData.birthday,
                gender: formData.gender,
                website: formData.website,
            };

            await userService.updateUser(currentUser.id, updateData);

            setMessage({ type: "success", text: "Cập nhật hồ sơ thành công!" });

            setTimeout(() => {
                router.back();
            }, 800);
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage({ type: "error", text: "Không thể cập nhật hồ sơ. Vui lòng thử lại." });
            setLoading(false);
        }
    };

    if (!currentUser) {
        return null;
    }

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title="Chỉnh sửa hồ sơ"
                leftAction={{
                    icon: "arrow-back",
                    onPress: () => router.back(),
                }}
            />

            {/* Message Banner */}
            {message && (
                <View
                    style={[
                        styles.messageBanner,
                        message.type === "error" && styles.messageBannerError,
                        message.type === "success" && styles.messageBannerSuccess,
                        message.type === "loading" && styles.messageBannerLoading,
                    ]}
                >
                    <View style={styles.messageContent}>
                        {message.type === "loading" && (
                            <ActivityIndicator size="small" color={colors.primary} />
                        )}
                        {message.type === "error" && (
                            <Ionicons name="alert-circle" size={18} color="#dc2626" />
                        )}
                        {message.type === "success" && (
                            <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                        )}
                        <Text style={styles.messageText}>{message.text}</Text>
                    </View>
                </View>
            )}

            <ScrollView style={styles.scrollView}>
                <View style={styles.content}>
                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        <Image
                            source={{ uri: previewAvatar || "https://i.pravatar.cc/150" }}
                            style={styles.avatar}
                        />
                        {uploading && (
                            <View style={styles.uploadingOverlay}>
                                <ActivityIndicator size="large" color={colors.white} />
                            </View>
                        )}
                        <View>
                            <Text style={styles.avatarUsername}>{currentUser.username}</Text>
                            <Text style={styles.avatarName}>{formData.name || currentUser.username}</Text>
                        </View>
                    </View>

                    {/* Full Name */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Họ và tên</Text>
                        <TextInput
                            style={[styles.input, formErrors.name && styles.inputError]}
                            value={formData.name}
                            onChangeText={(value) => {
                                setFormData((prev) => ({ ...prev, name: value }));
                                validateField("name", value);
                            }}
                            placeholder="Nhập họ tên"
                            placeholderTextColor={colors.textMuted}
                        />
                        {formErrors.name && <Text style={styles.errorText}>{formErrors.name}</Text>}
                    </View>

                    {/* Username */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Tên người dùng</Text>
                        <TextInput
                            style={[styles.input, formErrors.username && styles.inputError]}
                            value={formData.username}
                            onChangeText={(value) => {
                                setFormData((prev) => ({ ...prev, username: value }));
                                validateField("username", value);
                            }}
                            placeholder="@username"
                            placeholderTextColor={colors.textMuted}
                        />
                        {formErrors.username && <Text style={styles.errorText}>{formErrors.username}</Text>}
                    </View>

                    {/* Bio */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Tiểu sử</Text>
                        <TextInput
                            style={[styles.input, styles.bioInput]}
                            value={formData.bio}
                            onChangeText={(value) => setFormData((prev) => ({ ...prev, bio: value }))}
                            placeholder="Giới thiệu bản thân..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    {/* Website */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Website</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.website}
                            onChangeText={(value) => setFormData((prev) => ({ ...prev, website: value }))}
                            placeholder="https://example.com"
                            placeholderTextColor={colors.textMuted}
                        />
                    </View>

                    {/* Birthday */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Ngày sinh</Text>
                        <TextInput
                            style={[styles.input, formErrors.birthday && styles.inputError]}
                            value={formData.birthday}
                            onChangeText={(value) => {
                                setFormData((prev) => ({ ...prev, birthday: value }));
                                if (value) validateField("birthday", value);
                            }}
                            placeholder="DD/MM/YYYY"
                            placeholderTextColor={colors.textMuted}
                        />
                        {formErrors.birthday && <Text style={styles.errorText}>{formErrors.birthday}</Text>}
                    </View>

                    {/* Gender */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Giới tính</Text>
                        <View style={styles.genderButtons}>
                            {(["MALE", "FEMALE", "HIDDEN"] as const).map((option) => (
                                <Pressable
                                    key={option}
                                    style={[
                                        styles.genderButton,
                                        formData.gender === option && styles.genderButtonActive,
                                    ]}
                                    onPress={() => {
                                        setFormData((prev) => ({ ...prev, gender: option }));
                                        validateField("gender", option);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.genderButtonText,
                                            formData.gender === option && styles.genderButtonTextActive,
                                        ]}
                                    >
                                        {option === "MALE" ? "Nam" : option === "FEMALE" ? "Nữ" : "Ẩn"}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        {formErrors.gender && <Text style={styles.errorText}>{formErrors.gender}</Text>}
                    </View>

                    {/* Submit Button */}
                    <Pressable
                        style={[styles.submitButton, (loading || uploading) && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading || uploading}
                    >
                        <Text style={styles.submitButtonText}>
                            {loading ? "Đang lưu..." : "Lưu thay đổi"}
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    messageBanner: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    messageBannerError: {
        backgroundColor: "#fee2e2",
        borderBottomColor: "#dc2626",
    },
    messageBannerSuccess: {
        backgroundColor: "#f0fdf4",
        borderBottomColor: "#16a34a",
    },
    messageBannerLoading: {
        backgroundColor: "#eff6ff",
        borderBottomColor: colors.primary,
    },
    messageContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    messageText: {
        flex: 1,
        color: colors.text,
        fontWeight: "500",
        fontSize: 14,
    },
    avatarSection: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    uploadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarUsername: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: spacing.xs,
    },
    avatarName: {
        fontSize: 12,
        color: colors.textMuted,
    },
    formGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: spacing.sm,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: 14,
        color: colors.text,
        backgroundColor: colors.white,
    },
    inputError: {
        borderColor: "#dc2626",
    },
    bioInput: {
        textAlignVertical: "top",
        paddingTop: spacing.md,
        height: 100,
    },
    errorText: {
        color: "#dc2626",
        fontSize: 12,
        marginTop: spacing.xs,
    },
    genderButtons: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    genderButton: {
        flex: 1,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: 8,
        paddingVertical: spacing.md,
        alignItems: "center",
        backgroundColor: colors.white,
    },
    genderButtonActive: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}15`,
    },
    genderButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.textMuted,
    },
    genderButtonTextActive: {
        color: colors.primary,
    },
    submitButton: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        paddingVertical: spacing.md,
        alignItems: "center",
        justifyContent: "center",
        marginTop: spacing.lg,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.white,
    },
});
