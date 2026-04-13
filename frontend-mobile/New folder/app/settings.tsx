import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import type { ThemeColors } from '../contexts/ThemeContext';

type ThemeMode = 'light' | 'dark' | 'system';

export default function SettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDark, themeMode, colors, setThemeMode } = useTheme();
    const { notificationSettings, updateNotificationSetting } = useNotifications();
    const { user, logout } = useAuth();
    const styles = createStyles(colors);

    const handleLogout = async () => {
        Alert.alert(
            'Đăng xuất',
            'Bạn có chắc chắn muốn đăng xuất?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Đăng xuất',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/login');
                    },
                },
            ]
        );
    };

    const themeModes: { label: string; value: ThemeMode; icon: string }[] = [
        { label: 'Sáng', value: 'light', icon: 'sunny-outline' },
        { label: 'Tối', value: 'dark', icon: 'moon-outline' },
        { label: 'Hệ thống', value: 'system', icon: 'phone-portrait-outline' },
    ];

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.replace('/(tabs)/profile' as any)} hitSlop={12}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cài đặt</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.sectionTitle}>Giao diện</Text>
                <View style={styles.card}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <View style={[styles.iconWrap, { backgroundColor: isDark ? '#312E81' : '#EEF2FF' }]}>
                                <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={isDark ? '#A5B4FC' : '#6366F1'} />
                            </View>
                            <View>
                                <Text style={styles.settingLabel}>Chế độ hiển thị</Text>
                                <Text style={styles.settingDesc}>
                                    {themeMode === 'system' ? 'Theo hệ thống' : themeMode === 'dark' ? 'Chế độ tối' : 'Chế độ sáng'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.themeModeRow}>
                        {themeModes.map((mode) => {
                            const isActive = themeMode === mode.value;
                            return (
                                <TouchableOpacity
                                    key={mode.value}
                                    style={[styles.themeModeBtn, isActive && styles.themeModeBtnActive]}
                                    onPress={() => setThemeMode(mode.value)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={mode.icon as any}
                                        size={20}
                                        color={isActive ? colors.primaryText : colors.textSecondary}
                                    />
                                    <Text style={[styles.themeModeBtnText, isActive && styles.themeModeBtnTextActive]}>
                                        {mode.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Thông báo</Text>
                <View style={styles.card}>
                    <NotificationSwitch
                        icon="notifications"
                        iconBg={isDark ? '#1E3A2F' : '#ECFDF5'}
                        iconColor={isDark ? '#6EE7B7' : '#10B981'}
                        label="Thông báo đẩy"
                        description="Bật/tắt tất cả thông báo"
                        value={notificationSettings.pushEnabled}
                        onValueChange={(v) => updateNotificationSetting('pushEnabled', v)}
                        colors={colors}
                        styles={styles}
                    />

                    <View style={styles.divider} />

                    <NotificationSwitch
                        icon="heart"
                        iconBg={isDark ? '#3B1323' : '#FFF1F2'}
                        iconColor={isDark ? '#FDA4AF' : '#F43F5E'}
                        label="Lượt thích"
                        description="Thông báo khi bài viết được thích"
                        value={notificationSettings.likesEnabled}
                        onValueChange={(v) => updateNotificationSetting('likesEnabled', v)}
                        disabled={!notificationSettings.pushEnabled}
                        colors={colors}
                        styles={styles}
                    />

                    <View style={styles.divider} />

                    <NotificationSwitch
                        icon="chatbubble"
                        iconBg={isDark ? '#1E293B' : '#EFF6FF'}
                        iconColor={isDark ? '#93C5FD' : '#3B82F6'}
                        label="Bình luận"
                        description="Thông báo khi có bình luận mới"
                        value={notificationSettings.commentsEnabled}
                        onValueChange={(v) => updateNotificationSetting('commentsEnabled', v)}
                        disabled={!notificationSettings.pushEnabled}
                        colors={colors}
                        styles={styles}
                    />

                    <View style={styles.divider} />

                    <NotificationSwitch
                        icon="person-add"
                        iconBg={isDark ? '#312E81' : '#EEF2FF'}
                        iconColor={isDark ? '#A5B4FC' : '#6366F1'}
                        label="Theo dõi"
                        description="Thông báo khi có người theo dõi mới"
                        value={notificationSettings.followsEnabled}
                        onValueChange={(v) => updateNotificationSetting('followsEnabled', v)}
                        disabled={!notificationSettings.pushEnabled}
                        colors={colors}
                        styles={styles}
                    />

                    <View style={styles.divider} />

                    <NotificationSwitch
                        icon="mail"
                        iconBg={isDark ? '#1A2E35' : '#F0FDFA'}
                        iconColor={isDark ? '#5EEAD4' : '#14B8A6'}
                        label="Tin nhắn"
                        description="Thông báo khi có tin nhắn mới"
                        value={notificationSettings.messagesEnabled}
                        onValueChange={(v) => updateNotificationSetting('messagesEnabled', v)}
                        disabled={!notificationSettings.pushEnabled}
                        colors={colors}
                        styles={styles}
                    />

                    <View style={styles.divider} />

                    <NotificationSwitch
                        icon="flag"
                        iconBg={isDark ? '#2D1B30' : '#FDF4FF'}
                        iconColor={isDark ? '#D8B4FE' : '#A855F7'}
                        label="Cập nhật trang"
                        description="Thông báo từ các trang bạn theo dõi"
                        value={notificationSettings.pageUpdatesEnabled}
                        onValueChange={(v) => updateNotificationSetting('pageUpdatesEnabled', v)}
                        disabled={!notificationSettings.pushEnabled}
                        colors={colors}
                        styles={styles}
                    />
                </View>

                <Text style={styles.sectionTitle}>Tài khoản</Text>
                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/qr-scanner' as any)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.settingInfo}>
                            <View style={[styles.iconWrap, { backgroundColor: isDark ? '#2D1B30' : '#F3E8FF' }]}>
                                <Ionicons name="qr-code" size={20} color={isDark ? '#D8B4FE' : '#9333EA'} />
                            </View>
                            <View>
                                <Text style={styles.settingLabel}>Quét mã QR</Text>
                                <Text style={styles.settingDesc}>Đăng nhập trên thiết bị khác</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
                        <View style={styles.settingInfo}>
                            <View style={[styles.iconWrap, { backgroundColor: isDark ? '#1E293B' : '#F0F9FF' }]}>
                                <Ionicons name="shield-checkmark" size={20} color={isDark ? '#93C5FD' : '#3B82F6'} />
                            </View>
                            <View>
                                <Text style={styles.settingLabel}>Quyền riêng tư</Text>
                                <Text style={styles.settingDesc}>Quản lý quyền riêng tư</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
                        <View style={styles.settingInfo}>
                            <View style={[styles.iconWrap, { backgroundColor: isDark ? '#1E3A2F' : '#F0FDF4' }]}>
                                <Ionicons name="lock-closed" size={20} color={isDark ? '#6EE7B7' : '#22C55E'} />
                            </View>
                            <View>
                                <Text style={styles.settingLabel}>Bảo mật</Text>
                                <Text style={styles.settingDesc}>Mật khẩu và xác minh</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.menuItem} onPress={handleLogout} activeOpacity={0.7}>
                        <View style={styles.settingInfo}>
                            <View style={[styles.iconWrap, { backgroundColor: isDark ? '#3B1323' : '#FEF2F2' }]}>
                                <Ionicons name="log-out" size={20} color={colors.danger} />
                            </View>
                            <View>
                                <Text style={[styles.settingLabel, { color: colors.danger }]}>Đăng xuất</Text>
                                <Text style={styles.settingDesc}>Thoát khỏi tài khoản</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.versionText}>Wisdom Social v1.0.0</Text>
            </ScrollView>
        </View>
    );
}

function NotificationSwitch({
    icon, iconBg, iconColor, label, description, value, onValueChange, disabled, colors, styles,
}: {
    icon: string; iconBg: string; iconColor: string;
    label: string; description: string;
    value: boolean; onValueChange: (v: boolean) => void;
    disabled?: boolean; colors: ThemeColors; styles: any;
}) {
    return (
        <View style={[styles.settingRow, disabled && { opacity: 0.5 }]}>
            <View style={styles.settingInfo}>
                <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                    <Ionicons name={icon as any} size={20} color={iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>{label}</Text>
                    <Text style={styles.settingDesc}>{description}</Text>
                </View>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                disabled={disabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={value ? colors.primaryText : colors.textTertiary}
                ios_backgroundColor={colors.border}
            />
        </View>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: colors.card,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: '700',
            color: colors.text,
        },
        scrollView: {
            flex: 1,
        },
        sectionTitle: {
            fontSize: 13,
            fontWeight: '600',
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginHorizontal: 20,
            marginTop: 24,
            marginBottom: 10,
        },
        card: {
            backgroundColor: colors.card,
            marginHorizontal: 14,
            borderRadius: 16,
            paddingVertical: 4,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
        },
        settingRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
        },
        settingInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            flex: 1,
        },
        iconWrap: {
            width: 38,
            height: 38,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
        },
        settingLabel: {
            fontSize: 15,
            fontWeight: '600',
            color: colors.text,
        },
        settingDesc: {
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 2,
        },
        divider: {
            height: 1,
            backgroundColor: colors.border,
            marginLeft: 66,
        },
        themeModeRow: {
            flexDirection: 'row',
            gap: 10,
            paddingHorizontal: 16,
            paddingBottom: 16,
        },
        themeModeBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 11,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: colors.border,
            backgroundColor: colors.inputBg,
        },
        themeModeBtnActive: {
            borderColor: colors.primary,
            backgroundColor: colors.primary,
        },
        themeModeBtnText: {
            fontSize: 13,
            fontWeight: '500',
            color: colors.textSecondary,
        },
        themeModeBtnTextActive: {
            color: colors.primaryText,
            fontWeight: '600',
        },
        menuItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
        },
        versionText: {
            textAlign: 'center',
            fontSize: 12,
            color: colors.textTertiary,
            marginTop: 30,
        },
    });
