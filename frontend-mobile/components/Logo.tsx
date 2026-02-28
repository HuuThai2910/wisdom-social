import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LogoProps {
    size?: 'small' | 'medium' | 'large';
    showSubtitle?: boolean;
}

export default function Logo({ size = 'large', showSubtitle = false }: LogoProps) {
    const iconSize = size === 'large' ? 60 : size === 'medium' ? 48 : 36;
    const titleSize = size === 'large' ? 42 : size === 'medium' ? 32 : 24;

    return (
        <View style={styles.container}>
            {/* Logo Icon */}
            <View style={styles.iconContainer}>
                <View style={styles.iconBackground}>
                    <Ionicons name="bulb" size={iconSize} color="#3B82F6" />
                </View>
            </View>

            {/* App Name */}
            <View style={styles.textContainer}>
                <Text style={[styles.title, { fontSize: titleSize }]}>
                    Wisdom
                    <Text style={styles.titleAccent}> Social</Text>
                </Text>
            </View>

            {/* Subtitle/Tagline */}
            {showSubtitle && (
                <Text style={styles.subtitle}>Connect. Share. Inspire.</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconContainer: {
        marginBottom: 16,
    },
    iconBackground: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    textContainer: {
        marginBottom: 8,
    },
    title: {
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1F2937',
        letterSpacing: 0.5,
    },
    titleAccent: {
        color: '#3B82F6',
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        fontStyle: 'italic',
        letterSpacing: 1,
    },
});
