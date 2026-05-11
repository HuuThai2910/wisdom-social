import React, { useMemo, useState, ComponentProps } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Alert,
    SafeAreaView,
    Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants";
import { UserAvatar, TransferOwnershipModal } from "@/components";
import { useMessagesController } from "@/hooks/useMessagesController";
import { useGroupManagement } from "@/hooks/useGroupManagement";
import { formatRelativeTime } from "@/utils/format";

export function ConversationDetailsScreen() {
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

    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        media: true,
        privacy: true,
    });

    if (!selectedConversation) {
        return (
            <SafeAreaView style={styles.root}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.headerBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </Pressable>
                </View>
                <View style={styles.centered}>
                    <Text style={styles.errorText}>Khong tim thay hoi thoai</Text>
                </View>
            </SafeAreaView>
        );
    }

    const isGroup = selectedConversation.type === "GROUP";
    const memberCount = selectedConversation.members?.length || 0;

    const activityStatus = useMemo(() => {
        if (!selectedConversation.updatedAt) return "Đang hoạt động gần đây";
        return `Hoạt động ${formatRelativeTime(selectedConversation.updatedAt)} trước`;
    }, [selectedConversation.updatedAt]);

    const toggleSection = (key: string) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleLeaveGroup = () => {
        // If owner and can transfer, skip alert and open modal directly
        if (groupManagement.currentMemberRole === "OWNER" && groupManagement.ownerTransferCandidates.length > 0) {
            groupManagement.leaveGroup();
            return;
        }

        Alert.alert(
            "Roi khoi nhom?",
            `Ban co chac muon roi khoi nhom "${selectedConversation.name || "nay"}"?`,
            [
                { text: "Huy", style: "cancel" },
                {
                    text: "Roi nhom",
                    style: "destructive",
                    onPress: async () => {
                        const success = await groupManagement.leaveGroup();
                        if (success) router.replace("/(tabs)/activity");
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.root}>
            {/* Custom Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Chi tiết đoạn chat</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <UserAvatar
                        uri={selectedConversation.imageUrl}
                        name={selectedConversation.name || "?"}
                        size={80}
                    />
                    <Text style={styles.conversationName}>
                        {selectedConversation.name || "Nguoi dung"}
                    </Text>
                    <Text style={styles.activityStatus}>{activityStatus}</Text>
                    
                    <View style={styles.encryptionBadge}>
                        <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                        <Text style={styles.encryptionText}>Được mã hóa đầu cuối</Text>
                    </View>

                    {/* Quick Actions Row */}
                    <View style={styles.quickActions}>
                        {!isGroup && (
                            <QuickActionBtn
                                icon="person-circle-outline"
                                label="Trang cá nhân"
                                onPress={() => {}}
                            />
                        )}
                        <QuickActionBtn
                            icon="notifications-outline"
                            label="Tắt thông báo"
                            onPress={() => {}}
                        />
                        <QuickActionBtn
                            icon="search-outline"
                            label="Tìm kiếm"
                            onPress={() => {}}
                        />
                        {isGroup && (
                            <QuickActionBtn
                                icon="settings-outline"
                                label="Quản lý nhóm"
                                onPress={() => router.push(`/messages/details/settings/${id}`)}
                                
                            />
                        )}
                    </View>
                </View>

                {/* Sections */}
                <View style={styles.divider} />

                {/* Member Section (Groups only) */}
                {isGroup && (
                    <CollapsibleSection
                        title="Thành viên"
                        isOpen={true} // Member list usually simple link here or collapsible
                        onToggle={() => router.push(`/messages/details/members/${id}`)}
                    >
                        <Pressable 
                            style={styles.memberSummary}
                            onPress={() => router.push(`/messages/details/members/${id}`)}
                        >
                            <View style={styles.memberIconWrap}>
                                <Ionicons name="people" size={20} color={colors.textMuted} />
                            </View>
                            <Text style={styles.memberCountText}>{memberCount} thành viên</Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </Pressable>
                    </CollapsibleSection>
                )}

                <View style={styles.divider} />

                <CollapsibleSection
                    title="File phương tiện, File & Link"
                    isOpen={expandedSections.media}
                    onToggle={() => toggleSection("media")}
                >
                    <DetailItem icon="images-outline" label="File phương tiện" onPress={() => {}} />
                    <DetailItem icon="document-text-outline" label="File" onPress={() => {}} />
                    <DetailItem icon="link-outline" label="Link" onPress={() => {}} />
                </CollapsibleSection>

                <View style={styles.divider} />

                <CollapsibleSection
                    title="Quyền riêng tư và hỗ trợ"
                    isOpen={expandedSections.privacy}
                    onToggle={() => toggleSection("privacy")}
                >
                    <DetailItem icon="notifications-off-outline" label="Tắt thông báo" onPress={() => {}} />
                    <DetailItem icon="eye-off-outline" label="Hạn chế" onPress={() => {}} />
                    <DetailItem icon="ban-outline" label="Chặn" onPress={() => {}} />
                    <DetailItem 
                        icon="flag-outline" 
                        label="Báo cáo" 
                        subLabel="Đóng góp ý kiến và báo cáo cuộc trò chuyện"
                        onPress={() => {}} 
                    />
                    {isGroup && (
                        <DetailItem 
                            icon="log-out-outline" 
                            label="Rời khỏi nhóm" 
                            onPress={handleLeaveGroup} 
                            destructive 
                        />
                    )}
                </CollapsibleSection>
            </ScrollView>

            <TransferOwnershipModal
                open={groupManagement.isTransferOwnerModalOpen}
                onClose={groupManagement.closeTransferOwnerModal}
                onSubmit={async (newOwnerId) => {
                    const success = await groupManagement.transferOwnershipAndLeave(newOwnerId);
                    if (success) {
                        groupManagement.closeTransferOwnerModal();
                        router.replace("/(tabs)/activity");
                    }
                    return success;
                }}
                members={groupManagement.ownerTransferCandidates}
                submitting={groupManagement.isLeavingGroup}
                pendingUserId={groupManagement.pendingTransferOwnerUserId}
                error={groupManagement.actionError}
            />
        </SafeAreaView>
    );
}

function QuickActionBtn({ icon, label, onPress, disabled }: { icon: ComponentProps<typeof Ionicons>["name"], label: string, onPress: () => void, disabled?: boolean }) {
    return (
        <Pressable 
            style={[styles.quickActionBtn, disabled && styles.quickActionBtnDisabled]} 
            onPress={onPress}
        >
            <View style={styles.quickActionIconWrap}>
                <Ionicons name={icon} size={20} color={colors.text} />
            </View>
            <Text style={styles.quickActionLabel}>{label}</Text>
        </Pressable>
    );
}

function CollapsibleSection({ 
    title, 
    isOpen, 
    onToggle, 
    children 
}: { 
    title: string; 
    isOpen: boolean; 
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <View style={styles.collapsibleContainer}>
            <Pressable style={styles.collapsibleHeader} onPress={onToggle}>
                <Text style={styles.collapsibleTitle}>{title}</Text>
                <Ionicons 
                    name={isOpen ? "chevron-up" : "chevron-down"} 
                    size={18} 
                    color={colors.textMuted} 
                />
            </Pressable>
            {isOpen && <View style={styles.collapsibleContent}>{children}</View>}
        </View>
    );
}

function DetailItem({
    icon,
    label,
    subLabel,
    onPress,
    destructive,
}: {
    icon: ComponentProps<typeof Ionicons>["name"];
    label: string;
    subLabel?: string;
    onPress: () => void;
    destructive?: boolean;
}) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.detailItem,
                pressed && styles.detailItemPressed,
            ]}
            onPress={onPress}
        >
            <View style={styles.detailItemLeft}>
                <Ionicons
                    name={icon}
                    size={22}
                    color={destructive ? colors.danger : colors.text}
                />
                <View style={styles.detailItemText}>
                    <Text
                        style={[
                            styles.detailItemLabel,
                            destructive && styles.detailItemLabelDestructive,
                        ]}
                    >
                        {label}
                    </Text>
                    {subLabel && <Text style={styles.detailItemSubLabel}>{subLabel}</Text>}
                </View>
            </View>
        </Pressable>
    );
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
    headerBtn: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.text,
    },
    content: {
        paddingBottom: 40,
    },
    profileSection: {
        alignItems: "center",
        paddingTop: 32,
        paddingBottom: 24,
        paddingHorizontal: 16,
    },
    conversationName: {
        fontSize: 22,
        fontWeight: "700",
        color: colors.text,
        marginTop: 16,
        textAlign: "center",
    },
    activityStatus: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: 4,
    },
    encryptionBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#f3f4f6",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 16,
    },
    encryptionText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.textMuted,
    },
    quickActions: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 20,
        width: "100%",
        marginTop: 24,
    },
    quickActionBtn: {
        alignItems: "center",
        width: 80,
    },
    quickActionBtnDisabled: {
        opacity: 0.4,
    },
    quickActionIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: "#f3f4f6",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
    },
    quickActionLabel: {
        fontSize: 11,
        color: colors.text,
        textAlign: "center",
        fontWeight: "500",
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: 16,
    },
    collapsibleContainer: {
        paddingVertical: 8,
    },
    collapsibleHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    collapsibleTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.text,
    },
    collapsibleContent: {
        paddingBottom: 8,
    },
    memberSummary: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 12,
    },
    memberIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#f3f4f6",
        alignItems: "center",
        justifyContent: "center",
    },
    memberCountText: {
        flex: 1,
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    detailItemPressed: {
        backgroundColor: "#f9fafb",
    },
    detailItemLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    detailItemText: {
        flex: 1,
    },
    detailItemLabel: {
        fontSize: 15,
        color: colors.text,
        fontWeight: "500",
    },
    detailItemSubLabel: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    detailItemLabelDestructive: {
        color: colors.danger,
    },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    errorText: {
        color: colors.textMuted,
        fontSize: 16,
    },
});
