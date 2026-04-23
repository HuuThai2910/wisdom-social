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
    if (names.length === 2) return `${names[0]} va ${names[1]}`;

    return `${names.slice(0, -1).join(", ")} va ${names[names.length - 1]}`;
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
        // Fallback parse bang regex ben duoi.
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
    if (role === "OWNER") return "Truong nhom";
    if (role === "DEPUTY") return "Pho nhom";
    if (role === "MEMBER") return "Thanh vien";
    return "vai tro moi";
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

    return `Nguoi dung ${memberId}`;
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

    return "Nguoi dung";
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
        if (!joinedNames) return "Ban da cap nhat thanh vien nhom";
        return `Ban da them ${joinedNames} vao nhom`;
    }

    const hasCurrentUser = memberIds.includes(currentUserId);
    const otherMemberIds = memberIds.filter((id) => id !== currentUserId);
    const otherNames = otherMemberIds.map((id) =>
        resolveMemberLabel(id, membersById),
    );
    const joinedOtherNames = formatNameList(otherNames);

    if (hasCurrentUser && joinedOtherNames) {
        return `${actorLabel} da them ban va ${joinedOtherNames} vao nhom`;
    }

    if (hasCurrentUser) {
        return `${actorLabel} da them ban vao nhom`;
    }

    if (joinedOtherNames) {
        return `${actorLabel} da them ${joinedOtherNames} vao nhom`;
    }

    return `${actorLabel} da cap nhat thanh vien nhom`;
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
                ? "ban"
                : resolveMemberLabel(payload.targetId, membersById)
            : "mot thanh vien";
    const roleLabel = formatRoleLabel(payload.newRole);

    if (isOwn) {
        return `Ban da cap nhat ${targetLabel} thanh ${roleLabel}`;
    }

    return `${actorLabel} da cap nhat ${targetLabel} thanh ${roleLabel}`;
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
            ? "Ban da xoa mot thanh vien khoi nhom"
            : `${actorLabel} da xoa mot thanh vien khoi nhom`;
    }

    const targetLabel =
        targetId === currentUserId
            ? "ban"
            : resolveMemberLabel(targetId, membersById);

    if (isOwn) {
        return `Ban da xoa ${targetLabel} khoi nhom`;
    }

    return `${actorLabel} da xoa ${targetLabel} khoi nhom`;
}

function buildSystemLeaveGroupMessage(params: {
    isOwn: boolean;
    actorLabel: string;
}): string {
    const { isOwn, actorLabel } = params;
    if (isOwn) return "Ban da roi khoi nhom";
    if (actorLabel === "Nguoi dung") return "Mot thanh vien da roi khoi nhom";
    return `${actorLabel} da roi khoi nhom`;
}

function buildSystemDisbandGroupMessage(params: {
    isOwn: boolean;
    actorLabel: string;
}): string {
    const { isOwn, actorLabel } = params;
    if (isOwn) return "Ban da giai tan nhom";
    if (actorLabel === "Nguoi dung") return "Nhom da duoc giai tan";
    return `${actorLabel} da giai tan nhom`;
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
