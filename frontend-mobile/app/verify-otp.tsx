import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import authService from '../services/authService';
import Logo from '../components/Logo';

export default function VerifyOTPScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const phone = params.phone as string;
    const type = params.type as 'register' | 'reset-password';

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const inputRefs = useRef<Array<TextInput | null>>([]);

    const handleOtpChange = (value: string, index: number) => {
        if (value.length > 1) {
            value = value[0];
        }

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            return;
        }

        setLoading(true);
        try {
            if (type === 'register') {
                const result = await authService.confirmRegister({ phone, OTP: otpCode });
                if (result) {
                    router.replace('/login');
                }
            } else if (type === 'reset-password') {
                router.push({
                    pathname: '/reset-password',
                    params: { phone, otp: otpCode },
                });
            }
        } catch {
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setLoading(true);
        try {
            if (type === 'reset-password') {
                await authService.forgotPassword({ phone });
            }
        } catch {
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#EFF6FF', '#FFFFFF', '#F9FAFB']}
            style={styles.gradient}
        >
            <View style={styles.container}>
                <View style={styles.logoContainer}>
                    <Logo size="medium" showSubtitle={false} />
                </View>

                <View style={styles.iconContainer}>
                    <View style={styles.iconBackground}>
                        <Ionicons name="shield-checkmark" size={48} color="#3B82F6" />
                    </View>
                </View>

                <Text style={styles.title}>Verify OTP</Text>
                <Text style={styles.subtitle}>
                    Enter the 6-digit code sent to
                </Text>
                <Text style={styles.phoneNumber}>{phone}</Text>

            <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                    <TextInput
                        key={index}
                        ref={(ref) => {
                            inputRefs.current[index] = ref;
                        }}
                        style={styles.otpInput}
                        value={digit}
                        onChangeText={(value) => handleOtpChange(value, index)}
                        onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(key, index)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                    />
                ))}
            </View>

                <TouchableOpacity
                    style={[styles.verifyButton, loading && styles.disabledButton]}
                    onPress={handleVerify}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={loading ? ['#93C5FD', '#93C5FD'] : ['#3B82F6', '#2563EB']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.verifyButtonGradient}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <View style={styles.buttonContent}>
                                <Text style={styles.verifyButtonText}>Verify Code</Text>
                                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            </View>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.resendButton}
                    onPress={handleResend} 
                    disabled={loading}
                >
                    <Text style={styles.resendText}>
                        Didn't receive code? <Text style={styles.resendLink}>Resend</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        padding: 24,
        justifyContent: 'center',
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
        lineHeight: 22,
    },
    phoneNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: '#3B82F6',
        textAlign: 'center',
        marginBottom: 48,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
        paddingHorizontal: 4,
    },
    otpInput: {
        width: 50,
        height: 60,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        fontSize: 24,
        textAlign: 'center',
        fontWeight: '700',
        color: '#1F2937',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    verifyButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    verifyButtonGradient: {
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
    verifyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    resendButton: {
        padding: 12,
        alignItems: 'center',
    },
    resendText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    resendLink: {
        color: '#3B82F6',
        fontWeight: '600',
    },
});
