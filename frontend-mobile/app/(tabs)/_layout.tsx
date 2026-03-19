import React, { useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemeColors } from '../../contexts/ThemeContext';

export default function TabsLayout() {
    const router = useRouter();
    const { colors } = useTheme();
    const [showCreateMenu, setShowCreateMenu] = useState(false);

    const menuStyles = createMenuStyles(colors);
    
    return (
        <>
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: colors.tabActive,
                tabBarInactiveTintColor: colors.tabInactive,
                tabBarShowLabel: false,
                headerShown: true,
                headerStyle: {
                    backgroundColor: colors.card,
                },
                headerTitleStyle: {
                    fontWeight: '600',
                    fontSize: 20,
                    color: colors.text,
                },
                tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopColor: colors.border,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Wisdom Social',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => router.push('/pages' as any)}
                            style={{ marginLeft: 16 }}
                        >
                            <Ionicons name="flag-outline" size={24} color={colors.text} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() => setShowCreateMenu(true)}
                            style={{ marginRight: 16 }}
                        >
                            <Ionicons name="add-circle-outline" size={28} color={colors.text} />
                        </TouchableOpacity>
                    ),
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    title: 'Search',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="search" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: 'Notifications',
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="heart" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>

        <Modal visible={showCreateMenu} transparent animationType="fade" onRequestClose={() => setShowCreateMenu(false)}>
            <Pressable style={menuStyles.backdrop} onPress={() => setShowCreateMenu(false)}>
                <View style={menuStyles.menu}>
                    <Text style={menuStyles.menuTitle}>Tạo mới</Text>

                    <TouchableOpacity
                        style={menuStyles.menuItem}
                        activeOpacity={0.7}
                        onPress={() => { setShowCreateMenu(false); router.push('/create-post'); }}
                    >
                        <View style={[menuStyles.menuIcon, { backgroundColor: colors.primary + '18' }]}>
                            <Ionicons name="create-outline" size={22} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={menuStyles.menuItemTitle}>Bài viết mới</Text>
                            <Text style={menuStyles.menuItemSub}>Chia sẻ khoảnh khắc với bạn bè</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>

                    <View style={menuStyles.divider} />

                    <TouchableOpacity
                        style={menuStyles.menuItem}
                        activeOpacity={0.7}
                        onPress={() => { setShowCreateMenu(false); router.push('/create-page' as any); }}
                    >
                        <View style={[menuStyles.menuIcon, { backgroundColor: colors.danger + '18' }]}>
                            <Ionicons name="flag-outline" size={22} color={colors.danger} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={menuStyles.menuItemTitle}>Trang mới</Text>
                            <Text style={menuStyles.menuItemSub}>Tạo trang cộng đồng hoặc thương hiệu</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
        </>
    );
}

const createMenuStyles = (colors: ThemeColors) => StyleSheet.create({
    backdrop: {
        flex: 1, backgroundColor: colors.overlay,
        justifyContent: 'center', alignItems: 'center', padding: 32,
    },
    menu: {
        backgroundColor: colors.card, borderRadius: 20, padding: 20,
        width: '100%', maxWidth: 340,
        shadowColor: colors.shadow, shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
    },
    menuTitle: {
        fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16,
    },
    menuItem: {
        flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12,
    },
    menuIcon: {
        width: 44, height: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    menuItemTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    menuItemSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
});