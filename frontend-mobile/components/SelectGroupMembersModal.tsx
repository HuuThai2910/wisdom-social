import { colors, spacing } from "@/constants";
import type { FriendUser } from "@/services/friendService";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import UserAvatar from "@/components/UserAvatar";
import { buildS3Url } from "@/utils/s3";

interface SelectGroupMembersModalProps {
    open: boolean;
    friends: FriendUser[];
    existingMemberIds: Set<number>;
    loadingFriends: boolean;
    friendsError: string | null;
    submitting: boolean;
    error: string | null;
    onClose: () => void;
    onSubmit: (memberIds: number[]) => Promise<boolean>;
}

function getDisplayName(friend: FriendUser): string {
    return friend.name || friend.username || `Nguoi dung ${friend.id}`;
}

export default function SelectGroupMembersModal({
    open,
    friends,
    existingMemberIds,
    loadingFriends,
    friendsError,
    submitting,
    error,
    onClose,
    onSubmit,
}: SelectGroupMembersModalProps) {
    const [searchKeyword, setSearchKeyword] = useState("");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        if (!open) {
            setSearchKeyword("");
            setSelectedIds([]);
        }
    }, [open]);

    const addableFriends = useMemo(
        () => friends.filter((friend) => !existingMemberIds.has(friend.id)),
        [existingMemberIds, friends],
    );

    const filteredFriends = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();
        if (!keyword) {
            return addableFriends;
        }

        return addableFriends.filter((friend) => {
            const searchable = [getDisplayName(friend), friend.username].join(
                " ",
            );
            return searchable.toLowerCase().includes(keyword);
        });
    }, [addableFriends, searchKeyword]);

    const handleToggle = (userId: number) => {
        setSelectedIds((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId],
        );
    };

    const handleSubmit = async () => {
        if (selectedIds.length === 0 || submitting) {
            return;
        }

        await onSubmit(selectedIds);
    };

    return (
        <Modal
            visible={open}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />

                <View style={styles.card}>
                    <View style={styles.header}>
                        <View style={styles.headerTextWrap}>
                            <Text style={styles.title}>
                                Them thanh vien vao nhom
                            </Text>
                            <Text style={styles.subtitle}>
                                Chon ban be chua co trong nhom.
                            </Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Ionicons
                                name="close"
                                size={20}
                                color={colors.textMuted}
                            />
                        </Pressable>
                    </View>

                    <View style={styles.searchWrap}>
                        <Ionicons
                            name="search-outline"
                            size={16}
                            color={colors.textMuted}
                        />
                        <TextInput
                            value={searchKeyword}
                            onChangeText={setSearchKeyword}
                            placeholder="Tim ban be"
                            placeholderTextColor={colors.textMuted}
                            style={styles.searchInput}
                        />
                    </View>

                    <ScrollView style={styles.listWrap}>
                        {loadingFriends ? (
                            <Text style={styles.statusText}>
                                Dang tai danh sach ban be...
                            </Text>
                        ) : friendsError ? (
                            <Text style={styles.errorText}>{friendsError}</Text>
                        ) : filteredFriends.length === 0 ? (
                            <Text style={styles.statusText}>
                                Khong co ban be kha dung de them.
                            </Text>
                        ) : (
                            filteredFriends.map((friend) => {
                                const checked = selectedIds.includes(friend.id);

                                return (
                                    <Pressable
                                        key={friend.id}
                                        style={[
                                            styles.memberRow,
                                            checked && styles.memberRowSelected,
                                        ]}
                                        onPress={() => handleToggle(friend.id)}
                                    >
                                        <View style={styles.checkboxOuter}>
                                            {checked ? (
                                                <View
                                                    style={styles.checkboxInner}
                                                />
                                            ) : null}
                                        </View>
                                        <UserAvatar
                                            uri={buildS3Url(friend.avatarUrl)}
                                            name={getDisplayName(friend)}
                                            size={38}
                                        />
                                        <View style={styles.memberMeta}>
                                            <Text
                                                style={styles.memberName}
                                                numberOfLines={1}
                                            >
                                                {getDisplayName(friend)}
                                            </Text>
                                            {friend.username ? (
                                                <Text
                                                    style={
                                                        styles.memberUsername
                                                    }
                                                    numberOfLines={1}
                                                >
                                                    @{friend.username}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </Pressable>
                                );
                            })
                        )}
                    </ScrollView>

                    {error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : null}

                    <View style={styles.footer}>
                        <Text style={styles.selectedText}>
                            Da chon {selectedIds.length} nguoi
                        </Text>
                        <View style={styles.actions}>
                            <Pressable
                                style={styles.cancelBtn}
                                onPress={onClose}
                            >
                                <Text style={styles.cancelBtnText}>Huy</Text>
                            </Pressable>
                            <Pressable
                                style={[
                                    styles.confirmBtn,
                                    (selectedIds.length === 0 || submitting) &&
                                        styles.confirmBtnDisabled,
                                ]}
                                onPress={() => void handleSubmit()}
                                disabled={
                                    selectedIds.length === 0 || submitting
                                }
                            >
                                <Text style={styles.confirmBtnText}>
                                    {submitting
                                        ? "Dang them..."
                                        : "Them thanh vien"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: spacing.lg,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    card: {
        maxHeight: "88%",
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.md,
        gap: spacing.sm,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    headerTextWrap: {
        flex: 1,
        paddingRight: spacing.sm,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
    },
    subtitle: {
        marginTop: 2,
        fontSize: 12,
        color: colors.textMuted,
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
    },
    searchWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: spacing.sm,
    },
    searchInput: {
        flex: 1,
        minHeight: 38,
        color: colors.text,
    },
    listWrap: {
        maxHeight: 320,
    },
    statusText: {
        textAlign: "center",
        color: colors.textMuted,
        paddingVertical: spacing.lg,
    },
    errorText: {
        color: "#B91C1C",
        fontSize: 12,
    },
    memberRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: spacing.sm,
        marginBottom: spacing.xs,
    },
    memberRowSelected: {
        borderColor: "#93C5FD",
        backgroundColor: "#EFF6FF",
    },
    checkboxOuter: {
        width: 18,
        height: 18,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: "#2563EB",
        alignItems: "center",
        justifyContent: "center",
    },
    checkboxInner: {
        width: 10,
        height: 10,
        borderRadius: 2,
        backgroundColor: "#2563EB",
    },
    memberMeta: {
        flex: 1,
        minWidth: 0,
    },
    memberName: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
    },
    memberUsername: {
        marginTop: 2,
        fontSize: 12,
        color: colors.textMuted,
    },
    footer: {
        gap: spacing.sm,
    },
    selectedText: {
        fontSize: 13,
        color: colors.textMuted,
    },
    actions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: spacing.sm,
    },
    cancelBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 10,
        backgroundColor: "#E5E7EB",
    },
    cancelBtnText: {
        color: colors.text,
        fontWeight: "600",
    },
    confirmBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 10,
        backgroundColor: "#2563EB",
    },
    confirmBtnDisabled: {
        opacity: 0.5,
    },
    confirmBtnText: {
        color: colors.white,
        fontWeight: "700",
    },
});
