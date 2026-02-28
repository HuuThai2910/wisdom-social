import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mockNotifications } from '../../constants/mockData';
import NotificationItem from '../../components/notification/NotificationItem';

export default function NotificationsScreen() {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Text style={styles.headerTitle}>Thông báo</Text>
            </View>
            <FlatList
                data={mockNotifications}
                renderItem={({ item }) => <NotificationItem notification={item} />}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
    },
    listContent: {
        paddingBottom: 24,
    },
});

