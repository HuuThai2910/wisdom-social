import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants";

export default function CreatePostScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [caption, setCaption] = useState("");
    const [isPosting, setIsPosting] = useState(false);

    const handlePost = () => {
        setIsPosting(true);
        setTimeout(() => {
            setIsPosting(false);
            router.back();
        }, 500);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tạo bài viết</Text>
                <TouchableOpacity
                    style={[styles.postButton, !caption.trim() && styles.postButtonDisabled]}
                    onPress={handlePost}
                    disabled={!caption.trim() || isPosting}
                >
                    <Text style={[styles.postButtonText, !caption.trim() && styles.postButtonTextDisabled]}>
                        Đăng
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Image placeholder */}
                <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
                    <Ionicons name="image" size={80} color={colors.textMuted} />
                    <Text style={styles.imagePlaceholderText}>Chọn ảnh/video</Text>
                </View>

                {/* Caption input */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Mô tả</Text>
                    <TextInput
                        style={styles.captionInput}
                        placeholder="Hãy chia sẻ những điều của bạn..."
                        placeholderTextColor={colors.textMuted}
                        multiline
                        numberOfLines={4}
                        value={caption}
                        onChangeText={setCaption}
                        editable={!isPosting}
                    />
                </View>

                {/* Options */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Tùy chọn</Text>

                    <TouchableOpacity style={styles.optionItem}>
                        <Ionicons name="location-outline" size={20} color={colors.primary} />
                        <Text style={styles.optionText}>Thêm vị trí</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionItem}>
                        <Ionicons name="person-add-outline" size={20} color={colors.primary} />
                        <Text style={styles.optionText}>Gắn thẻ người dùng</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionItem}>
                        <Ionicons name="musical-note-outline" size={20} color={colors.primary} />
                        <Text style={styles.optionText}>Thêm nhạc</Text>
                    </TouchableOpacity>
                </View>

                {/* Visibility */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Hiển thị cho</Text>

                    <View style={styles.visibilityOptions}>
                        <TouchableOpacity style={[styles.visibilityBtn, styles.visibilityBtnActive]}>
                            <Ionicons name="people-outline" size={16} color={colors.primary} />
                            <Text style={styles.visibilityBtnText}>Công khai</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.visibilityBtn}>
                            <Ionicons name="people-circle-outline" size={16} color={colors.textMuted} />
                            <Text style={styles.visibilityBtnText}>Bạn bè</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.visibilityBtn}>
                            <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
                            <Text style={styles.visibilityBtnText}>Chỉ mình tôi</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: spacing.xxl }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
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
    closeButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        flex: 1,
        textAlign: "center",
    },
    postButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: colors.primary,
        borderRadius: 8,
    },
    postButtonDisabled: {
        backgroundColor: colors.surface,
    },
    postButtonText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "600",
    },
    postButtonTextDisabled: {
        color: colors.textMuted,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    imagePlaceholder: {
        height: 250,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    imagePlaceholderText: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: 8,
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    captionInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: colors.text,
        textAlignVertical: "top",
        minHeight: 100,
    },
    optionItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.surface,
    },
    optionText: {
        fontSize: 14,
        color: colors.text,
        flex: 1,
    },
    visibilityOptions: {
        flexDirection: "row",
        gap: 8,
    },
    visibilityBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    visibilityBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    visibilityBtnText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.text,
    },
});
