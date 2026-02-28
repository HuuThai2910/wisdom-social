import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { mockNotifications } from '../../constants/mockData';
import NotificationItem from '../../components/notification/NotificationItem';

export default function NotificationsScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notifications</Text>
            </View>
            <FlatList
                data={mockNotifications}
                renderItem={({ item }) => <NotificationItem notification={item} />}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
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
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#efefef',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
});
