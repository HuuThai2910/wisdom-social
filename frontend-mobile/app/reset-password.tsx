import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import authService from '../services/authService';
import Logo from '../components/Logo';
import SuccessModal from '../components/SuccessModal';
import { validateResetPasswordForm } from '../utils/validation';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const phone = params.phone as string;
    const otp = params.otp as string;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalData, setModalData] = useState({
        type: 'success' as 'success' | 'error' | 'loading',
        title: '',
        message: '',
    });

    const handleResetPassword = async () => {
        // Validate form
        const validation = validateResetPasswordForm(password, confirmPassword);
        if (!validation.isValid) {
            setModalData({
                type: 'error',
                title: 'Lỗi xác thực',
                message: validation.error || 'Vui lòng kiểm tra thông tin',
            });
            setModalVisible(true);
            return;
        }

        setLoading(true);
        setModalData({
            type: 'loading',
            title: 'Đang xử lý',
            message: 'Vui lòng chờ...',
        });
        setModalVisible(true);

        try {
            const result = await authService.resetPassword({
                phone,
                password,
                confirmPassword,
                confirmationCode: otp,
            });

            if (result) {
                setModalData({
                    type: 'success',
                    title: 'Đặt lại mật khẩu thành công',
                    message: 'Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập lại.',
                });
                setModalVisible(true);
            } else {
                setModalData({
                    type: 'error',
                    title: 'Đặt lại mật khẩu thất bại',
                    message: 'Có lỗi xảy ra, vui lòng thử lại',
                });
                setModalVisible(true);
            }
        } catch (error) {
            setModalData({
                type: 'error',
                title: 'Lỗi',
                message: 'Có lỗi xảy ra, vui lòng thử lại',
            });
            setModalVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const handleModalConfirm = () => {
        if (modalData.type === 'success') {
            setModalVisible(false);
            router.replace('/login');
        } else {
            setModalVisible(false);
        }
    };

    return (
        <>
            <LinearGradient
                colors={['#EFF6FF', '#FFFFFF', '#F9FAFB']}
                style={styles.gradient}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.container}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.logoContainer}>
                            <Logo size="medium" showSubtitle={false} />
                        </View>

                        <View style={styles.iconContainer}>
                            <View style={styles.iconBackground}>
                                <Ionicons name="lock-closed" size={48} color="#3B82F6" />
                            </View>
                        </View>

                        <Text style={styles.title}>Reset Password</Text>
                        <Text style={styles.subtitle}>Enter your new password</Text>

                        <View style={styles.form}>
                            <View style={styles.inputWrapper}>
                                <View style={styles.inputIconContainer}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="New Password"
                                    placeholderTextColor="#9CA3AF"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye' : 'eye-off'}
                                        size={20}
                                        color="#9CA3AF"
                                    />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputWrapper}>
                                <View style={styles.inputIconContainer}>
                                    <Ionicons name="shield-checkmark-outline" size={20} color="#9CA3AF" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm New Password"
                                    placeholderTextColor="#9CA3AF"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirmPassword}
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <Ionicons
                                        name={showConfirmPassword ? 'eye' : 'eye-off'}
                                        size={20}
                                        color="#9CA3AF"
                                    />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.submitButton, loading && styles.disabledButton]}
                                onPress={handleResetPassword}
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={loading ? ['#93C5FD', '#93C5FD'] : ['#3B82F6', '#2563EB']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.submitButtonGradient}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <View style={styles.buttonContent}>
                                            <Text style={styles.submitButtonText}>Reset Password</Text>
                                            <Ionicons name="checkmark-done" size={20} color="#fff" />
                                        </View>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>

            <SuccessModal
                visible={modalVisible}
                type={modalData.type}
                title={modalData.title}
                message={modalData.message}
                onConfirm={handleModalConfirm}
                onClose={() => setModalVisible(false)}
                confirmText={modalData.type === 'loading' ? undefined : 'OK'}
            />
        </>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 24,
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
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1F2937',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 22,
    },
    form: {
        marginBottom: 24,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    inputIconContainer: {
        paddingLeft: 16,
        paddingRight: 12,
    },
    input: {
        flex: 1,
        padding: 16,
        fontSize: 15,
        color: '#1F2937',
    },
    eyeIcon: {
        paddingHorizontal: 16,
    },
    submitButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 8,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    submitButtonGradient: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    disabledButton: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
