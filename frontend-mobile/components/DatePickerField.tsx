import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '../contexts/ThemeContext';

interface DatePickerFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    colors: ThemeColors;
    error?: string;
}

export default function DatePickerField({
    label,
    value,
    onChange,
    placeholder = 'DD/MM/YYYY',
    colors,
    error,
}: DatePickerFieldProps) {
    const [showPicker, setShowPicker] = useState(false);

    // Extract current date from value
    const parseDate = (dateStr: string) => {
        if (!dateStr) {
            const today = new Date();
            return {
                day: today.getDate(),
                month: today.getMonth() + 1,
                year: today.getFullYear(),
            };
        }
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return {
                day: parseInt(parts[0], 10) || 1,
                month: parseInt(parts[1], 10) || 1,
                year: parseInt(parts[2], 10) || new Date().getFullYear(),
            };
        }
        const today = new Date();
        return {
            day: today.getDate(),
            month: today.getMonth() + 1,
            year: today.getFullYear(),
        };
    };

    const { day, month, year } = parseDate(value);

    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

    const today = new Date();
    const disabledDays = new Set<number>();

    // Disable dates in the future
    if (month === today.getMonth() + 1 && year === today.getFullYear()) {
        for (let d = today.getDate() + 1; d <= 31; d++) {
            disabledDays.add(d);
        }
    }

    const handleDateSelect = (newDay: number, newMonth: number, newYear: number) => {
        // Check if date is in the future
        const selectedDate = new Date(newYear, newMonth - 1, newDay);
        if (selectedDate > today) {
            return;
        }
        const formattedDay = newDay.toString().padStart(2, '0');
        const formattedMonth = newMonth.toString().padStart(2, '0');
        onChange(`${formattedDay}/${formattedMonth}/${newYear}`);
        setShowPicker(false);
    };

    return (
        <>
            <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
                <TouchableOpacity
                    style={[styles.input, { borderColor: error ? colors.danger : colors.border, backgroundColor: colors.inputBg }]}
                    onPress={() => setShowPicker(true)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.inputText, { color: value ? colors.text : colors.textTertiary }]}>
                        {value || placeholder}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
                {error && (
                    <Text style={{ fontSize: 12, color: colors.danger, marginTop: 6 }}>{error}</Text>
                )}
            </View>

            <Modal visible={showPicker} transparent animationType="fade">
                <View style={styles.overlay}>
                    <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
                        <View style={styles.pickerHeader}>
                            <Text style={[styles.pickerTitle, { color: colors.text }]}>Chọn ngày sinh</Text>
                            <TouchableOpacity
                                onPress={() => setShowPicker(false)}
                                hitSlop={12}
                            >
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.pickerContent}>
                            <PickerColumn
                                title="Ngày"
                                items={days}
                                selectedIndex={day - 1}
                                onSelect={(d) => handleDateSelect(d, month, year)}
                                colors={colors}
                                disabledItems={disabledDays}
                            />
                            <PickerColumn
                                title="Tháng"
                                items={months}
                                selectedIndex={month - 1}
                                onSelect={(m) => handleDateSelect(day, m, year)}
                                colors={colors}
                            />
                            <PickerColumn
                                title="Năm"
                                items={years}
                                selectedIndex={years.indexOf(year)}
                                onSelect={(y) => handleDateSelect(day, month, y)}
                                colors={colors}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                            onPress={() => setShowPicker(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.confirmBtnText}>Xác nhận</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}

function PickerColumn({
    title,
    items,
    selectedIndex,
    onSelect,
    colors,
    disabledItems,
}: {
    title: string;
    items: number[];
    selectedIndex: number;
    onSelect: (item: number) => void;
    colors: ThemeColors;
    disabledItems?: Set<number>;
}) {
    const [scrollPosition, setScrollPosition] = useState(selectedIndex * 50);

    return (
        <View style={styles.column}>
            <Text style={[styles.columnTitle, { color: colors.textSecondary }]}>{title}</Text>
            <ScrollView
                horizontal={false}
                style={styles.columnScroll}
                onContentSizeChange={() => {
                    if (selectedIndex >= 0) {
                        // Auto scroll to selected item
                    }
                }}
                scrollEventThrottle={16}
            >
                {items.map((item, index) => {
                    const isDisabled = disabledItems?.has(item) ?? false;
                    const isSelected = selectedIndex === index;
                    return (
                        <TouchableOpacity
                            key={item}
                            style={[
                                styles.columnItem,
                                isSelected && [styles.columnItemActive, { backgroundColor: colors.primary }],
                                isDisabled && styles.columnItemDisabled,
                            ]}
                            onPress={() => !isDisabled && onSelect(item)}
                            activeOpacity={isDisabled ? 0.5 : 0.7}
                            disabled={isDisabled}
                        >
                            <Text
                                style={[
                                    styles.columnItemText,
                                    { color: isSelected ? '#fff' : isDisabled ? colors.textTertiary : colors.text },
                                ]}
                            >
                                {item.toString().padStart(2, '0')}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    fieldGroup: {
        marginTop: 16,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
    },
    input: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 8,
    },
    inputText: {
        flex: 1,
        fontSize: 15,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    pickerContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
    },
    pickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    pickerTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    pickerContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 20,
        gap: 10,
    },
    column: {
        flex: 1,
        alignItems: 'center',
    },
    columnTitle: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 8,
    },
    columnScroll: {
        maxHeight: 200,
    },
    columnItem: {
        width: '100%',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    columnItemActive: {
        borderRadius: 8,
    },
    columnItemDisabled: {
        opacity: 0.4,
    },
    columnItemText: {
        fontSize: 16,
        fontWeight: '500',
    },
    confirmBtn: {
        marginHorizontal: 16,
        marginTop: 10,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
