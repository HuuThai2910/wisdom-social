import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    SafeAreaView,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import {
    cancelAccountDeletion,
    logoutAllDevices,
    requestAccountDeletion,
} from "@/services/securityService";

export default function SecuritySettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { logout, deletionPending, deletionRemainingDays, clearDeletionPending } = useAppContext();

    const [loadingLogoutAll, setLoadingLogoutAll] = useState(false);
    const [loadingDelete, setLoadingDelete] = useState(false);
    const [loadingCancel, setLoadingCancel] = useState(false);

    const handleLogoutAll = useCallback(async () => {
        Alert.alert(
            "Đăng xuất tất cả thiết bị",
            "Tất cả các phiên đăng nhập sẽ bị hủy, bao gồm cả thiết bị này. Bạn sẽ cần đăng nhập lại.",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Đăng xuất tất cả",
                    style: "destructive",
                    onPress: async () => {
                        setLoadingLogoutAll(true);
                        const result = await logoutAllDevices();
                        setLoadingLogoutAll(false);
                        if (result.success) {
                            await logout();
                            router.replace("/(auth)/login");
                        } else {
                            Alert.alert("Lỗi", result.message || "Không thể đăng xuất tất cả thiết bị.");
                        }
                    },
                },
            ],
        );
    }, [logout, router]);

    const handleDeleteAccount = useCallback(async () => {
        Alert.alert(
            "Xóa tài khoản",
            "Tài khoản của bạn sẽ bị xóa vĩnh viễn sau 30 ngày. Trong thời gian này bạn có thể đăng nhập lại để hủy yêu cầu xóa.\n\nBạn có chắc chắn muốn xóa tài khoản?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa tài khoản",
                    style: "destructive",
                    onPress: async () => {
                        setLoadingDelete(true);
                        const result = await requestAccountDeletion();
                        setLoadingDelete(false);
                        if (result.success) {
                            await logout();
                            router.replace("/(auth)/login");
                        } else {
                            Alert.alert("Lỗi", result.message || "Không thể yêu cầu xóa tài khoản.");
                        }
                    },
                },
            ],
        );
    }, [logout, router]);

    const handleCancelDelete = useCallback(async () => {
        Alert.alert(
            "Hủy xóa tài khoản",
            `Tài khoản của bạn đang được lên lịch xóa sau ${deletionRemainingDays ?? 30} ngày nữa. Bạn có muốn hủy yêu cầu xóa?`,
            [
                { text: "Không", style: "cancel" },
                {
                    text: "Hủy xóa tài khoản",
                    style: "default",
                    onPress: async () => {
                        setLoadingCancel(true);
                        const result = await cancelAccountDeletion();
                        setLoadingCancel(false);
                        if (result.success) {
                            clearDeletionPending();
                            Alert.alert(
                                "Đã hủy thành công",
                                "Yêu cầu xóa tài khoản đã được hủy. Tài khoản của bạn sẽ không bị xóa.",
                                [{ text: "OK" }],
                            );
                        } else {
                            Alert.alert("Lỗi", result.message || "Không thể hủy yêu cầu xóa tài khoản.");
                        }
                    },
                },
            ],
        );
    }, [deletionRemainingDays, clearDeletionPending]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bảo mật</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.sectionTitle}>Phiên đăng nhập</Text>
                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleLogoutAll}
                        disabled={loadingLogoutAll}
                        activeOpacity={0.7}
                    >
                        <View style={styles.settingInfo}>
                            <View style={[styles.iconWrap, { backgroundColor: "#FFF3E0" }]}>
                                {loadingLogoutAll ? (
                                    <ActivityIndicator size="small" color="#F59E0B" />
                                ) : (
                                    <Ionicons name="log-out" size={20} color="#F59E0B" />
                                )}
                            </View>
                            <View>
                                <Text style={styles.settingLabel}>Đăng xuất tất cả thiết bị</Text>
                                <Text style={styles.settingDesc}>
                                    Hủy tất cả phiên đăng nhập trên các thiết bị khác
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Tài khoản</Text>
                <View style={styles.card}>
                    <View style={styles.policySection}>
                        <Text style={styles.policyTitle}>Chính sách xóa tài khoản</Text>
                        <Text style={styles.policyText}>
                            Khi yêu cầu xóa tài khoản, bạn sẽ có 30 ngày để hủy yêu cầu bằng cách đăng nhập lại.
                            Sau 30 ngày, tài khoản và toàn bộ dữ liệu sẽ bị xóa vĩnh viễn và không thể khôi phục.
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    {deletionPending ? (
                        <>
                            {/* Banner cảnh báo trạng thái đang chờ xóa */}
                            <View style={styles.deletionWarningBanner}>
                                <Ionicons name="warning" size={16} color="#B45309" />
                                <Text style={styles.deletionWarningText}>
                                    Tài khoản sẽ bị xóa sau {deletionRemainingDays ?? 30} ngày nữa
                                </Text>
                            </View>

                            <View style={styles.divider} />

                            {/* Nút hủy xóa tài khoản */}
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={handleCancelDelete}
                                disabled={loadingCancel}
                                activeOpacity={0.7}
                            >
                                <View style={styles.settingInfo}>
                                    <View style={[styles.iconWrap, { backgroundColor: "#E8F5E9" }]}>
                                        {loadingCancel ? (
                                            <ActivityIndicator size="small" color="#22C55E" />
                                        ) : (
                                            <Ionicons name="shield-checkmark" size={20} color="#22C55E" />
                                        )}
                                    </View>
                                    <View>
                                        <Text style={[styles.settingLabel, { color: "#22C55E" }]}>
                                            Hủy xóa tài khoản
                                        </Text>
                                        <Text style={styles.settingDesc}>
                                            Giữ lại tài khoản và toàn bộ dữ liệu
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </>
                    ) : (
                        /* Nút xóa tài khoản bình thường */
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={handleDeleteAccount}
                            disabled={loadingDelete}
                            activeOpacity={0.7}
                        >
                            <View style={styles.settingInfo}>
                                <View style={[styles.iconWrap, { backgroundColor: "#FFE5E5" }]}>
                                    {loadingDelete ? (
                                        <ActivityIndicator size="small" color={colors.danger} />
                                    ) : (
                                        <Ionicons name="trash" size={20} color={colors.danger} />
                                    )}
                                </View>
                                <View>
                                    <Text style={[styles.settingLabel, { color: colors.danger }]}>
                                        Xóa tài khoản
                                    </Text>
                                    <Text style={styles.settingDesc}>
                                        Tài khoản sẽ bị xóa sau 30 ngày
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
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
        paddingVertical: 14,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
    },
    scrollView: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginHorizontal: 20,
        marginTop: 24,
        marginBottom: 10,
    },
    card: {
        backgroundColor: colors.background,
        marginHorizontal: 14,
        borderRadius: 16,
        paddingVertical: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.border,
    },
    settingInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: colors.text,
    },
    settingDesc: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginLeft: 66,
    },
    policySection: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    policyTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 8,
    },
    policyText: {
        fontSize: 13,
        color: colors.textMuted,
        lineHeight: 20,
    },
    deletionWarningBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#FFFBEB",
        marginHorizontal: 16,
        marginVertical: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FDE68A",
    },
    deletionWarningText: {
        fontSize: 13,
        color: "#B45309",
        fontWeight: "500",
        flex: 1,
    },
});
