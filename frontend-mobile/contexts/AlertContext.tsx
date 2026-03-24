import React, { createContext, useContext, useState, useCallback } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Pressable,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import type { ThemeColors } from './ThemeContext';

export type AlertType = 'info' | 'success' | 'error' | 'warning' | 'confirm';

export interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
    title: string;
    message?: string;
    type?: AlertType;
    buttons?: AlertButton[];
}

interface AlertContextType {
    showAlert: (options: AlertOptions) => void;
    hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

const TYPE_CONFIG: Record<AlertType, { icon: string; color: string }> = {
    info:    { icon: 'information-circle',  color: '#3B82F6' },
    success: { icon: 'checkmark-circle',    color: '#22C55E' },
    error:   { icon: 'close-circle',        color: '#EF4444' },
    warning: { icon: 'warning',             color: '#F59E0B' },
    confirm: { icon: 'help-circle',         color: '#8B5CF6' },
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { colors } = useTheme();
    const [visible, setVisible] = useState(false);
    const [options, setOptions] = useState<AlertOptions>({ title: '' });

    const showAlert = useCallback((opts: AlertOptions) => {
        setOptions(opts);
        setVisible(true);
    }, []);

    const hideAlert = useCallback(() => {
        setVisible(false);
    }, []);

    const handleButton = (btn: AlertButton) => {
        hideAlert();
        btn.onPress?.();
    };

    const buttons: AlertButton[] = options.buttons ?? [{ text: 'OK', style: 'default' }];
    const type: AlertType = options.type ?? 'info';
    const config = TYPE_CONFIG[type];
    const styles = createStyles(colors);

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={hideAlert}
            >
                <Pressable style={styles.backdrop} onPress={() => {
                    const hasCancel = buttons.some(b => b.style === 'cancel');
                    if (hasCancel) hideAlert();
                }}>
                    <Pressable style={styles.card} onPress={() => {}}>
                        <View style={[styles.iconCircle, { backgroundColor: config.color + '18' }]}>
                            <Ionicons name={config.icon as any} size={36} color={config.color} />
                        </View>

                        <Text style={styles.title}>{options.title}</Text>

                        {options.message ? (
                            <Text style={styles.message}>{options.message}</Text>
                        ) : null}

                        <View style={[styles.btnRow, buttons.length === 1 && styles.btnRowSingle]}>
                            {buttons.map((btn, i) => {
                                const isDestructive = btn.style === 'destructive';
                                const isCancel = btn.style === 'cancel';
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={[
                                            styles.btn,
                                            buttons.length === 1 && styles.btnFull,
                                            isDestructive && styles.btnDestructive,
                                            isCancel && styles.btnCancel,
                                            !isDestructive && !isCancel && styles.btnPrimary,
                                        ]}
                                        onPress={() => handleButton(btn)}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[
                                            styles.btnText,
                                            isDestructive && styles.btnTextDestructive,
                                            isCancel && styles.btnTextCancel,
                                            !isDestructive && !isCancel && styles.btnTextPrimary,
                                        ]}>
                                            {btn.text}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </AlertContext.Provider>
    );
};

export const useAlert = (): AlertContextType => {
    const ctx = useContext(AlertContext);
    if (!ctx) throw new Error('useAlert must be used within AlertProvider');
    return ctx;
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    card: {
        width: '100%',
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 12,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 26,
    },
    message: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 4,
    },
    btnRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 22,
        width: '100%',
    },
    btnRowSingle: {
        flexDirection: 'column',
    },
    btn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 14,
        alignItems: 'center',
    },
    btnFull: {
        flex: undefined,
        width: '100%',
    },
    btnPrimary: {
        backgroundColor: colors.primary,
    },
    btnDestructive: {
        backgroundColor: colors.danger,
    },
    btnCancel: {
        backgroundColor: colors.chipBg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    btnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    btnTextPrimary: {
        color: colors.primaryText,
    },
    btnTextDestructive: {
        color: '#FFFFFF',
    },
    btnTextCancel: {
        color: colors.textSecondary,
    },
});
