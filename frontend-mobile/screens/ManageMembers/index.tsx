import React, { useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    Alert,
    SafeAreaView,
    ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants";
import { UserAvatar, SelectGroupMembersModal } from "@/components";
import { useMessagesController } from "@/hooks/useMessagesController";
import { useGroupManagement } from "@/hooks/useGroupManagement";
import type { ConversationMember, MemberRole } from "@/types/chat";

export function ManageMembersScreen() {
    const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
    const router = useRouter();
    const id = Number(conversationId);

    const {
        conversations,
        currentUserId,
        reload,
    } = useMessagesController();

    const selectedConversation = useMemo(
        () => conversations.find((c) => c.id === id) || null,
        [conversations, id]
    );

    const groupManagement = useGroupManagement({
        currentUserId,
        selectedConversation,
        selectedConversationId: id,
        reloadConversations: reload,
    });

    const members = useMemo(() => {
        const list = (selectedConversation?.members ?? []).filter(
            (m) => !m.status || m.status === "ACTIVE"
        );
        return sortMembers(list);
    }, [selectedConversation?.members]);

    if (!selectedConversation) return null;

    const isOwner = groupManagement.currentMemberRole === "OWNER";

    const handleDisbandGroup = () => {
        Alert.alert(
            "Giải tán nhóm?",
            "Tất cả thành viên sẽ bị xóa khỏi nhóm và cuộc trò chuyện này sẽ kết thúc. Hành động này không thể hoàn tác.",
            [
                { text: "Hủy", style: "cancel" },
                { 
                    text: "Giải tán", 
                    style: "destructive", 
                    onPress: async () => {
                        const success = await groupManagement.disbandGroup();
                        if (success) router.dismissAll();
                    } 
                }
            ]
        );
    };

    const handleHeaderMenu = () => {
        const options: { text: string; style?: "cancel" | "destructive"; onPress: () => void }[] = [
            { text: "Hủy", style: "cancel", onPress: () => {} }
        ];

        if (isOwner) {
            options.push({
                text: "Giải tán nhóm",
                style: "destructive",
                onPress: handleDisbandGroup
            });
        }

        Alert.alert("Tùy chọn danh sách", undefined, options);
    };

    const handleMemberPress = (member: ConversationMember) => {
        if (Number(member.userId) === Number(currentUserId)) return;
        if (!isOwner && groupManagement.currentMemberRole !== "DEPUTY") return;

        const label = member.nickname || member.username || "Thành viên";
        
        const options: { text: string; style?: "cancel" | "destructive"; onPress: () => void }[] = [
            { text: "Hủy", style: "cancel", onPress: () => {} }
        ];

        if (isOwner) {
            if (member.role === "MEMBER") {
                options.push({
                    text: "Chỉ định Phó nhóm",
                    onPress: () => groupManagement.updateMemberRole(member.userId, "DEPUTY"),
                });
            } else if (member.role === "DEPUTY") {
                options.push({
                    text: "Gỡ quyền Phó nhóm",
                    onPress: () => groupManagement.updateMemberRole(member.userId, "MEMBER"),
                });
            }
        }

        if (isOwner || (groupManagement.currentMemberRole === "DEPUTY" && member.role === "MEMBER")) {
            options.push({
                text: "Xóa khỏi nhóm",
                style: "destructive",
                onPress: () => {
                    Alert.alert(
                        "Xóa thành viên",
                        `Bạn có chắc muốn xóa ${label} khỏi nhóm?`,
                        [
                            { text: "Hủy", style: "cancel" },
                            {
                                text: "Xóa",
                                style: "destructive",
                                onPress: () => groupManagement.kickMember(member.userId),
                            },
                        ]
                    );
                },
            });
        }

        if (options.length > 1) {
            Alert.alert(label, "Chọn hành động", options);
        }
    };

    return (
        <SafeAreaView style={styles.root}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Thành viên</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={members}
                keyExtractor={(item) => String(item.userId)}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={() => (
                    <View>
                        {groupManagement.canAddMembers && (
                            <View style={styles.topActionSection}>
                                <Pressable 
                                    style={styles.addMemberBtn} 
                                    onPress={groupManagement.openAddMembersModal}
                                >
                                    <View style={styles.addIconWrap}>
                                        <Ionicons name="person-add" size={20} color={colors.text} />
                                    </View>
                                    <Text style={styles.addMemberText}>Thêm thành viên</Text>
                                </Pressable>
                            </View>
                        )}
                        <View style={styles.listHeaderRow}>
                            <Text style={styles.listHeaderTitle}>
                                Danh sách thành viên ({members.length})
                            </Text>
                            <Pressable onPress={handleHeaderMenu} style={styles.headerActionBtn}>
                                <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
                            </Pressable>
                        </View>
                    </View>
                )}
                renderItem={({ item }) => (
                    <MemberItem
                        member={item}
                        isMe={Number(item.userId) === Number(currentUserId)}
                        onPress={() => handleMemberPress(item)}
                        isPending={
                            groupManagement.pendingKickUserId === item.userId ||
                            groupManagement.pendingRoleUserId === item.userId
                        }
                    />
                )}
            />

            <SelectGroupMembersModal
                open={groupManagement.isAddMembersModalOpen}
                onClose={groupManagement.closeAddMembersModal}
                onSubmit={groupManagement.addMembersToGroup}
                friends={groupManagement.availableFriends}
                existingMemberIds={groupManagement.groupMemberIds}
                loadingFriends={groupManagement.friendsLoading}
                friendsError={groupManagement.friendsError}
                submitting={groupManagement.isAddingMembers}
                error={groupManagement.actionError}
            />
        </SafeAreaView>
    );
}

function MemberItem({
    member,
    isMe,
    onPress,
    isPending,
}: {
    member: ConversationMember;
    isMe: boolean;
    onPress: () => void;
    isPending: boolean;
}) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.memberItem,
                pressed && styles.memberItemPressed,
            ]}
            onPress={onPress}
        >
            <View style={styles.memberLeft}>
                <View>
                    <UserAvatar
                        uri={member.avatar}
                        name={member.nickname || member.username || "?"}
                        size={44}
                    />
                    {member.role === "OWNER" && (
                        <View style={styles.ownerIcon}>
                            <Ionicons name="bookmark" size={10} color="#fbbf24" />
                        </View>
                    )}
                </View>
                <View style={styles.memberInfo}>
                    <Text style={styles.memberName} numberOfLines={1}>
                        {isMe ? "Bạn" : member.nickname || member.username || "Người dùng"}
                    </Text>
                    {member.role !== "MEMBER" && (
                        <Text style={styles.roleLabel}>
                            {member.role === "OWNER" ? "Trưởng nhóm" : "Phó nhóm"}
                        </Text>
                    )}
                </View>
            </View>
            {isPending && <ActivityIndicator size="small" color={colors.primary} />}
        </Pressable>
    );
}

function sortMembers(members: ConversationMember[]): ConversationMember[] {
    const roleOrder: Record<MemberRole, number> = {
        OWNER: 0,
        DEPUTY: 1,
        MEMBER: 2,
    };

    return [...members].sort((a, b) => {
        const firstRole = a.role ?? "MEMBER";
        const secondRole = b.role ?? "MEMBER";
        if (roleOrder[firstRole] !== roleOrder[secondRole]) {
            return roleOrder[firstRole] - roleOrder[secondRole];
        }
        return (a.nickname || "").localeCompare(b.nickname || "");
    });
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.text,
    },
    topActionSection: {
        padding: 16,
    },
    addMemberBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f3f4f6",
        padding: 12,
        borderRadius: 8,
        gap: 12,
    },
    addIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },
    addMemberText: {
        fontSize: 15,
        fontWeight: "600",
        color: colors.text,
    },
    listHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#f9fafb",
    },
    listHeaderTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.text,
    },
    headerActionBtn: {
        padding: 4,
    },
    listContent: {
        paddingBottom: 20,
    },
    memberItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    memberItemPressed: {
        backgroundColor: "#f3f4f6",
    },
    memberLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 15,
        fontWeight: "600",
        color: colors.text,
    },
    roleLabel: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    ownerIcon: {
        position: "absolute",
        bottom: -2,
        right: -2,
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 2,
        borderWidth: 1,
        borderColor: "#f3f4f6",
    },
});
