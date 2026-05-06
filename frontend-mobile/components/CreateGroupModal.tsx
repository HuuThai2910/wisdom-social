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

interface CreateGroupSubmitPayload {
    name: string;
    imageUrl?: string;
    memberIds: number[];
}

interface CreateGroupModalProps {
    open: boolean;
    friends: FriendUser[];
    loadingFriends: boolean;
    friendsError: string | null;
    submitting: boolean;
    error: string | null;
    onClose: () => void;
    onSubmit: (payload: CreateGroupSubmitPayload) => Promise<boolean>;
}

function getFriendDisplayName(friend: FriendUser): string {
    return friend.name || friend.username || `Nguoi dung ${friend.id}`;
}

export default function CreateGroupModal({
    open,
    friends,
    loadingFriends,
    friendsError,
    submitting,
    error,
    onClose,
    onSubmit,
}: CreateGroupModalProps) {
    const [groupName, setGroupName] = useState("");
    const [groupImageUrl, setGroupImageUrl] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        if (!open) {
            setGroupName("");
            setGroupImageUrl("");
            setSearchKeyword("");
            setSelectedIds([]);
        }
    }, [open]);

    const filteredFriends = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();
        if (!keyword) return friends;

        return friends.filter((friend) => {
            const searchable = [
                getFriendDisplayName(friend),
                friend.username,
            ].join(" ");
            return searchable.toLowerCase().includes(keyword);
        });
    }, [friends, searchKeyword]);

    const canSubmit = selectedIds.length >= 2 && !submitting;

    const toggleSelectedId = (userId: number) => {
        setSelectedIds((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId],
        );
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;

        await onSubmit({
            name: groupName,
            imageUrl: groupImageUrl,
            memberIds: selectedIds,
        });
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
                            <Text style={styles.title}>Tao nhom moi</Text>
                            <Text style={styles.subtitle}>
                                Chon it nhat 2 ban be de tao nhom.
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

                    <View style={styles.formWrap}>
                        <TextInput
                            value={groupName}
                            onChangeText={setGroupName}
                            placeholder="Ten nhom"
                            placeholderTextColor={colors.textMuted}
                            style={styles.input}
                        />
                        <TextInput
                            value={groupImageUrl}
                            onChangeText={setGroupImageUrl}
                            placeholder="Anh nhom (URL)"
                            placeholderTextColor={colors.textMuted}
                            style={styles.input}
                        />
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
                                Khong tim thay ban be phu hop.
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
                                        onPress={() =>
                                            toggleSelectedId(friend.id)
                                        }
                                    >
                                        <View style={styles.checkboxOuter}>
                                            {checked ? (
                                                <View
                                                    style={styles.checkboxInner}
                                                />
                                            ) : null}
                                        </View>
                                        <UserAvatar
                                            uri={friend.avatarUrl}
                                            name={getFriendDisplayName(friend)}
                                            size={38}
                                        />
                                        <View style={styles.memberMeta}>
                                            <Text
                                                style={styles.memberName}
                                                numberOfLines={1}
                                            >
                                                {getFriendDisplayName(friend)}
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
                                    !canSubmit && styles.confirmBtnDisabled,
                                ]}
                                onPress={() => void handleSubmit()}
                                disabled={!canSubmit}
                            >
                                <Text style={styles.confirmBtnText}>
                                    {submitting ? "Dang tao..." : "Tao nhom"}
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
        maxHeight: "90%",
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
    formWrap: {
        gap: spacing.xs,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        minHeight: 40,
        color: colors.text,
        paddingHorizontal: spacing.sm,
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
        maxHeight: 330,
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
