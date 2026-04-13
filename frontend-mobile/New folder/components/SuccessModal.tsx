import React from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface SuccessModalProps {
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'loading';
    onClose?: () => void;
    onConfirm?: () => void;
    confirmText?: string;
}

export default function SuccessModal({
    visible,
    title,
    message,
    type,
    onClose,
    onConfirm,
    confirmText = 'OK',
}: SuccessModalProps) {
    const isSuccess = type === 'success';
    const isError = type === 'error';
    const isLoading = type === 'loading';

    const getIcon = () => {
        if (isSuccess) return 'checkmark-circle';
        if (isError) return 'close-circle';
        return 'cog';
    };

    const getColors = () => {
        if (isSuccess) return ['#10B981', '#059669'];
        if (isError) return ['#EF4444', '#DC2626'];
        return ['#3B82F6', '#2563EB'];
    };

    const getBackgroundColor = () => {
        if (isSuccess) return '#ECFDF5';
        if (isError) return '#FEF2F2';
        return '#EFF6FF';
    };

    const getIconColor = () => {
        if (isSuccess) return '#10B981';
        if (isError) return '#EF4444';
        return '#3B82F6';
    };

    const handleClose = () => {
        if (onConfirm && isSuccess) {
            onConfirm();
        } else if (onClose) {
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={styles.centeredView}>
                    <View style={[styles.modalView, { backgroundColor: getBackgroundColor() }]}>
                        {isLoading ? (
                            <ActivityIndicator size="large" color={getIconColor()} />
                        ) : (
                            <View style={styles.iconContainer}>
                                <View
                                    style={[
                                        styles.iconBackground,
                                        { backgroundColor: `${getIconColor()}20` },
                                    ]}
                                >
                                    <Ionicons
                                        name={getIcon()}
                                        size={56}
                                        color={getIconColor()}
                                    />
                                </View>
                            </View>
                        )}

                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>

                        {!isLoading && (
                            <TouchableOpacity
                                onPress={handleClose}
                                style={styles.button}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={getColors()}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.buttonGradient}
                                >
                                    <Text style={styles.buttonText}>{confirmText}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    modalView: {
        margin: 20,
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        maxWidth: 320,
        width: '100%',
    },
    iconContainer: {
        marginBottom: 20,
    },
    iconBackground: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
        color: '#1F2937',
    },
    message: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    button: {
        borderRadius: 12,
        overflow: 'hidden',
        width: '100%',
    },
    buttonGradient: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
