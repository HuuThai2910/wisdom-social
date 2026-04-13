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
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import authService from '../services/authService';
import Logo from '../components/Logo';
import SuccessModal from '../components/SuccessModal';
import { validateSignupForm } from '../utils/validation';

export default function SignUpScreen() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
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

    const handleSignUp = async () => {
        // Validate form
        const validation = validateSignupForm(phone, password, confirmPassword);
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
            console.log('Attempting to register with:', { phone, password, confirmPassword });
            const result = await authService.register({ phone, password, confirmPassword });
            if (result) {
                setModalData({
                    type: 'success',
                    title: 'Đăng ký thành công',
                    message: 'Vui lòng xác nhận OTP được gửi tới số điện thoại của bạn',
                });
                setModalVisible(true);
            } else {
                setModalData({
                    type: 'error',
                    title: 'Đăng ký thất bại',
                    message: 'Số điện thoại này đã được đăng ký hoặc có lỗi xảy ra',
                });
                setModalVisible(true);
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error && error.message
                    ? error.message
                    : 'Có lỗi xảy ra, vui lòng thử lại';
            setModalData({
                type: 'error',
                title: 'Lỗi',
                message: errorMessage,
            });
            setModalVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const handleModalConfirm = () => {
        if (modalData.type === 'success') {
            setModalVisible(false);
            router.push({
                pathname: '/verify-otp',
                params: { phone, type: 'register' },
            });
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
                        showsVerticalScrollIndicator={false}
                    >
                        <Logo showSubtitle />

                        <Text style={styles.welcomeText}>Tạo tài khoản mới</Text>
                        <Text style={styles.subtitle}>Đăng ký bằng số điện thoại để bắt đầu</Text>

                        <View style={styles.form}>
                            <View style={styles.inputWrapper}>
                                <View style={styles.inputIconContainer}>
                                    <Ionicons name="call-outline" size={20} color="#3B82F6" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Số điện thoại"
                                    placeholderTextColor="#9CA3AF"
                                    value={phone}
                                    onChangeText={setPhone}
                                    autoCapitalize="none"
                                    keyboardType="phone-pad"
                                />
                            </View>

                            <View style={styles.inputWrapper}>
                                <View style={styles.inputIconContainer}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#3B82F6" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Mật khẩu"
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
                                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                        size={20}
                                        color="#6B7280"
                                    />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputWrapper}>
                                <View style={styles.inputIconContainer}>
                                    <Ionicons name="shield-checkmark-outline" size={20} color="#3B82F6" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập lại mật khẩu"
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
                                        name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                                        size={20}
                                        color="#6B7280"
                                    />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.signUpButton, loading && styles.disabledButton]}
                                onPress={handleSignUp}
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={loading ? ['#93C5FD', '#93C5FD'] : ['#3B82F6', '#2563EB']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.signUpButtonGradient}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <View style={styles.buttonContent}>
                                            <Text style={styles.signUpButtonText}>Đăng ký</Text>
                                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                        </View>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.terms}>
                            Khi đăng ký, bạn đồng ý với{' '}
                            <Text style={styles.termsLink}>Điều khoản sử dụng</Text>,{' '}
                            <Text style={styles.termsLink}>Chính sách bảo mật</Text> và{' '}
                            <Text style={styles.termsLink}>Chính sách cookie</Text>.
                        </Text>

                        <View style={styles.loginContainer}>
                            <Text style={styles.loginText}>Bạn đã có tài khoản? </Text>
                            <Link href="/login" asChild>
                                <TouchableOpacity>
                                    <Text style={styles.loginLink}>Đăng nhập</Text>
                                </TouchableOpacity>
                            </Link>
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
        paddingTop: 60,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1F2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 40,
        paddingHorizontal: 24,
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
        paddingRight: 16,
        paddingLeft: 12,
    },
    signUpButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 8,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    signUpButtonGradient: {
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
    signUpButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    terms: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 24,
        marginBottom: 24,
        paddingHorizontal: 16,
        lineHeight: 18,
    },
    termsLink: {
        color: '#3B82F6',
        fontWeight: '600',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    loginText: {
        color: '#6B7280',
        fontSize: 15,
    },
    loginLink: {
        color: '#3B82F6',
        fontSize: 15,
        fontWeight: '700',
    },
});
