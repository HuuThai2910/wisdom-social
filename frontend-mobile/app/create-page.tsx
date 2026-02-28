import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import pageService from '../services/pageService';
import type { CreatePageRequest, PageStatus } from '../services/pageService';
import type { ThemeColors } from '../contexts/ThemeContext';

const STATUS_OPTIONS: { label: string; value: PageStatus; icon: string }[] = [
    { label: 'Công khai', value: 'PUBLIC', icon: 'earth-outline' },
    { label: 'Riêng tư', value: 'PRIVATE', icon: 'lock-closed-outline' },
];

const CATEGORIES = [
    'Giải trí', 'Giáo dục', 'Công nghệ', 'Thể thao',
    'Ẩm thực', 'Du lịch', 'Kinh doanh', 'Âm nhạc',
    'Nghệ thuật', 'Sức khỏe', 'Thời trang', 'Khác',
];

export default function CreatePageScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState<CreatePageRequest>({
        name: '',
        username: '',
        category: '',
        description: '',
        avatarUrl: '',
        coverUrl: '',
        phone: '',
        email: '',
        website: '',
        address: '',
        status: 'PUBLIC',
    });

    const update = (key: keyof CreatePageRequest, value: string) => {
        setForm(f => ({ ...f, [key]: value }));
    };

    const handleSubmit = async () => {
        if (!form.name?.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên trang.');
            return;
        }
        setIsSubmitting(true);
        try {
            await pageService.createPage(form);
            Alert.alert('Thành công', 'Đã tạo trang mới!', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Không thể tạo trang. Vui lòng thử lại.';
            Alert.alert('Lỗi', msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tạo trang mới</Text>
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isSubmitting || !form.name?.trim()}
                    style={[styles.submitBtn, (!form.name?.trim() || isSubmitting) && styles.submitBtnDisabled]}
                    activeOpacity={0.7}
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color={colors.primaryText} />
                    ) : (
                        <Text style={styles.submitBtnText}>Tạo</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 60 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Required */}
                <SectionLabel label="Thông tin cơ bản" colors={colors} />
                <InputField
                    label="Tên trang *"
                    value={form.name || ''}
                    onChange={v => update('name', v)}
                    placeholder="Nhập tên trang"
                    colors={colors}
                />
                <InputField
                    label="Username"
                    value={form.username || ''}
                    onChange={v => update('username', v)}
                    placeholder="VD: my-awesome-page"
                    colors={colors}
                    autoCapitalize="none"
                />

                {/* Category picker */}
                <Text style={styles.fieldLabel}>Danh mục</Text>
                <View style={styles.chipRow}>
                    {CATEGORIES.map(cat => {
                        const active = form.category === cat;
                        return (
                            <TouchableOpacity
                                key={cat}
                                onPress={() => update('category', active ? '' : cat)}
                                style={[styles.chip, active && styles.chipActive]}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <InputField
                    label="Mô tả"
                    value={form.description || ''}
                    onChange={v => update('description', v)}
                    placeholder="Mô tả ngắn về trang"
                    colors={colors}
                    multiline
                />

                {/* Status */}
                <SectionLabel label="Quyền riêng tư" colors={colors} />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    {STATUS_OPTIONS.map(opt => {
                        const active = form.status === opt.value;
                        return (
                            <TouchableOpacity
                                key={opt.value}
                                onPress={() => update('status', opt.value)}
                                style={[styles.statusCard, active && styles.statusCardActive]}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={opt.icon as any}
                                    size={24}
                                    color={active ? colors.primaryText : colors.textSecondary}
                                />
                                <Text style={[styles.statusLabel, active && styles.statusLabelActive]}>{opt.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Media */}
                <SectionLabel label="Hình ảnh" colors={colors} />
                <InputField
                    label="Avatar URL"
                    value={form.avatarUrl || ''}
                    onChange={v => update('avatarUrl', v)}
                    placeholder="https://..."
                    colors={colors}
                    autoCapitalize="none"
                />
                <InputField
                    label="Cover URL"
                    value={form.coverUrl || ''}
                    onChange={v => update('coverUrl', v)}
                    placeholder="https://..."
                    colors={colors}
                    autoCapitalize="none"
                />

                {/* Contact */}
                <SectionLabel label="Liên hệ (tùy chọn)" colors={colors} />
                <InputField label="Điện thoại" value={form.phone || ''} onChange={v => update('phone', v)} placeholder="+84..." colors={colors} />
                <InputField label="Email" value={form.email || ''} onChange={v => update('email', v)} placeholder="page@example.com" colors={colors} autoCapitalize="none" />
                <InputField label="Website" value={form.website || ''} onChange={v => update('website', v)} placeholder="https://..." colors={colors} autoCapitalize="none" />
                <InputField label="Địa chỉ" value={form.address || ''} onChange={v => update('address', v)} placeholder="Địa chỉ..." colors={colors} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

/* ─── Components ─── */
function SectionLabel({ label, colors }: { label: string; colors: ThemeColors }) {
    return (
        <Text style={{
            fontSize: 16, fontWeight: '700', color: colors.text,
            marginTop: 24, marginBottom: 12,
        }}>
            {label}
        </Text>
    );
}

function InputField({ label, value, onChange, placeholder, colors, multiline, autoCapitalize }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; colors: ThemeColors; multiline?: boolean;
    autoCapitalize?: 'none' | 'sentences';
}) {
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>{label}</Text>
            <TextInput
                style={{
                    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
                    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                    fontSize: 15, color: colors.text,
                    ...(multiline ? { minHeight: 80, textAlignVertical: 'top' as any } : {}),
                }}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor={colors.textTertiary}
                multiline={multiline}
                autoCapitalize={autoCapitalize}
            />
        </View>
    );
}

/* ═══════════ STYLES ═══════════ */
const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    submitBtn: {
        paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
        backgroundColor: colors.primary, minWidth: 60, alignItems: 'center',
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryText },

    fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
        borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBg,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
    chipTextActive: { color: colors.primaryText, fontWeight: '600' },

    statusCard: {
        flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 18, borderRadius: 14,
        borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBg,
    },
    statusCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    statusLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    statusLabelActive: { color: colors.primaryText },
});
