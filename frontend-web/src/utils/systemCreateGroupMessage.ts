interface MemberLookup {
    nickname?: string;
    username?: string;
}

type GroupSystemMessageType =
    | "SYSTEM_CREATE_GROUP"
    | "SYSTEM_ADD_MEMBER"
    | "SYSTEM_UPDATE_ROLE"
    | "SYSTEM_KICK_MEMBER"
    | "SYSTEM_LEAVE_GROUP"
    | "SYSTEM_DISBAND_GROUP";

function formatNameList(names: string[]): string {
    if (names.length === 0) return "";
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} và ${names[1]}`;

    return `${names.slice(0, -1).join(", ")} và ${names[names.length - 1]}`;
}

function safeParseMemberIds(content: string): number[] {
    if (!content?.trim()) return [];

    try {
        const parsed = JSON.parse(content) as unknown;
        if (Array.isArray(parsed)) {
            return parsed
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value));
        }
    } catch {
        // Fallback parse bằng regex phía dưới.
    }

    const extracted = content.match(/\d+/g) ?? [];
    return extracted
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
}

function safeParseRolePayload(content: string): {
    targetId?: number;
    newRole?: string;
} {
    if (!content?.trim()) return {};

    try {
        const parsed = JSON.parse(content) as Record<string, unknown>;
        const targetId = Number(parsed.targetId);
        const newRole =
            typeof parsed.newRole === "string" ? parsed.newRole : undefined;

        return {
            targetId: Number.isFinite(targetId) ? targetId : undefined,
            newRole,
        };
    } catch {
        return {};
    }
}

function formatRoleLabel(role?: string): string {
    if (role === "OWNER") return "Trưởng nhóm";
    if (role === "DEPUTY") return "Phó nhóm";
    if (role === "MEMBER") return "Thành viên";
    return "vai trò mới";
}

function resolveMemberLabel(
    memberId: number,
    membersById: Record<number, MemberLookup>,
): string {
    const member = membersById[memberId];
    const nickname = member?.nickname?.trim();
    if (nickname) return nickname;

    const username = member?.username?.trim();
    if (username) return username;

    return `Người dùng ${memberId}`;
}

function resolveActorLabel(params: {
    senderName: string;
    senderId?: number;
    membersById: Record<number, MemberLookup>;
}): string {
    const { senderName, senderId, membersById } = params;
    const normalizedSenderName = senderName?.trim();
    if (normalizedSenderName) return normalizedSenderName;

    if (typeof senderId === "number" && Number.isFinite(senderId)) {
        return resolveMemberLabel(senderId, membersById);
    }

    return "Người dùng";
}

function buildSystemAddMembersMessage(params: {
    content: string;
    isOwn: boolean;
    actorLabel: string;
    currentUserId: number;
    membersById: Record<number, MemberLookup>;
}): string {
    const { content, isOwn, actorLabel, currentUserId, membersById } = params;

    const memberIds = Array.from(new Set(safeParseMemberIds(content)));

    if (isOwn) {
        const memberNames = memberIds.map((id) =>
            resolveMemberLabel(id, membersById),
        );
        const joinedNames = formatNameList(memberNames);
        if (!joinedNames) return "Bạn đã cập nhật thành viên nhóm";
        return `Bạn đã thêm ${joinedNames} vào nhóm`;
    }

    const hasCurrentUser = memberIds.includes(currentUserId);
    const otherMemberIds = memberIds.filter((id) => id !== currentUserId);
    const otherNames = otherMemberIds.map((id) =>
        resolveMemberLabel(id, membersById),
    );
    const joinedOtherNames = formatNameList(otherNames);

    if (hasCurrentUser && joinedOtherNames) {
        return `${actorLabel} đã thêm bạn và ${joinedOtherNames} vào nhóm`;
    }

    if (hasCurrentUser) {
        return `${actorLabel} đã thêm bạn vào nhóm`;
    }

    if (joinedOtherNames) {
        return `${actorLabel} đã thêm ${joinedOtherNames} vào nhóm`;
    }

    return `${actorLabel} đã cập nhật thành viên nhóm`;
}

function buildSystemRoleUpdateMessage(params: {
    content: string;
    isOwn: boolean;
    actorLabel: string;
    currentUserId: number;
    membersById: Record<number, MemberLookup>;
}): string {
    const { content, isOwn, actorLabel, currentUserId, membersById } = params;
    const payload = safeParseRolePayload(content);

    const targetLabel =
        typeof payload.targetId === "number"
            ? payload.targetId === currentUserId
                ? "bạn"
                : resolveMemberLabel(payload.targetId, membersById)
            : "một thành viên";
    const roleLabel = formatRoleLabel(payload.newRole);

    if (isOwn) {
        return `Bạn đã cập nhật ${targetLabel} thành ${roleLabel}`;
    }

    return `${actorLabel} đã cập nhật ${targetLabel} thành ${roleLabel}`;
}

function buildSystemKickMemberMessage(params: {
    content: string;
    isOwn: boolean;
    actorLabel: string;
    currentUserId: number;
    membersById: Record<number, MemberLookup>;
}): string {
    const { content, isOwn, actorLabel, currentUserId, membersById } = params;
    const targetId = safeParseMemberIds(content)[0];

    if (typeof targetId !== "number") {
        return isOwn
            ? "Bạn đã xóa một thành viên khỏi nhóm"
            : `${actorLabel} đã xóa một thành viên khỏi nhóm`;
    }

    const targetLabel =
        targetId === currentUserId
            ? "bạn"
            : resolveMemberLabel(targetId, membersById);

    if (isOwn) {
        return `Bạn đã xóa ${targetLabel} khỏi nhóm`;
    }

    return `${actorLabel} đã xóa ${targetLabel} khỏi nhóm`;
}

function buildSystemLeaveGroupMessage(params: {
    isOwn: boolean;
    actorLabel: string;
}): string {
    const { isOwn, actorLabel } = params;
    if (isOwn) return "Bạn đã rời khỏi nhóm";
    if (actorLabel === "Người dùng") return "Một thành viên đã rời khỏi nhóm";
    return `${actorLabel} đã rời khỏi nhóm`;
}

function buildSystemDisbandGroupMessage(params: {
    isOwn: boolean;
    actorLabel: string;
}): string {
    const { isOwn, actorLabel } = params;
    if (isOwn) return "Bạn đã giải tán nhóm";
    if (actorLabel === "Người dùng") return "Nhóm đã được giải tán";
    return `${actorLabel} đã giải tán nhóm`;
}

export function buildSystemGroupMessage(params: {
    type: GroupSystemMessageType;
    content: string;
    isOwn: boolean;
    senderName: string;
    senderId?: number;
    currentUserId: number;
    membersById: Record<number, MemberLookup>;
}): string {
    const {
        type,
        content,
        isOwn,
        senderName,
        senderId,
        currentUserId,
        membersById,
    } = params;

    const actorLabel = resolveActorLabel({
        senderName,
        senderId,
        membersById,
    });

    if (type === "SYSTEM_CREATE_GROUP" || type === "SYSTEM_ADD_MEMBER") {
        return buildSystemAddMembersMessage({
            content,
            isOwn,
            actorLabel,
            currentUserId,
            membersById,
        });
    }

    if (type === "SYSTEM_UPDATE_ROLE") {
        return buildSystemRoleUpdateMessage({
            content,
            isOwn,
            actorLabel,
            currentUserId,
            membersById,
        });
    }

    if (type === "SYSTEM_KICK_MEMBER") {
        return buildSystemKickMemberMessage({
            content,
            isOwn,
            actorLabel,
            currentUserId,
            membersById,
        });
    }

    if (type === "SYSTEM_LEAVE_GROUP") {
        return buildSystemLeaveGroupMessage({
            isOwn,
            actorLabel,
        });
    }

    return buildSystemDisbandGroupMessage({
        isOwn,
        actorLabel,
    });
}

export function buildSystemCreateGroupMessage(params: {
    content: string;
    isOwn: boolean;
    senderName: string;
    senderId?: number;
    currentUserId: number;
    membersById: Record<number, MemberLookup>;
}): string {
    return buildSystemGroupMessage({
        type: "SYSTEM_CREATE_GROUP",
        content: params.content,
        isOwn: params.isOwn,
        senderName: params.senderName,
        senderId: params.senderId,
        currentUserId: params.currentUserId,
        membersById: params.membersById,
    });
}
