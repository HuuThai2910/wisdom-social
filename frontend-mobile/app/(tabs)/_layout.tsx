import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export default function TabsLayout() {
    const router = useRouter();
    
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#000',
                tabBarInactiveTintColor: '#737373',
                tabBarShowLabel: false,
                headerShown: true,
                headerTitleStyle: {
                    fontWeight: '600',
                    fontSize: 20,
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
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() => router.push('/create-post')}
                            style={{ marginRight: 16 }}
                        >
                            <Ionicons name="add-circle-outline" size={28} color="#000" />
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
    );
}
