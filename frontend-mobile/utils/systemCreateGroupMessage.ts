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

function formatCommaNameList(names: string[]): string {
    return names.join(", ");
}

interface MemberSnapshot {
    id?: number;
    name?: string;
}

function safeParseMemberEntries(content: string): MemberSnapshot[] {
    if (!content?.trim()) return [];

    try {
        const parsed = JSON.parse(content) as unknown;
        if (Array.isArray(parsed)) {
            return parsed
                .map((value) => {
                    if (typeof value === "number") {
                        return Number.isFinite(value) ? { id: value } : null;
                    }

                    if (typeof value === "string") {
                        const numericValue = Number(value);
                        if (Number.isFinite(numericValue)) {
                            return { id: numericValue };
                        }

                        return { name: value };
                    }

                    if (value && typeof value === "object") {
                        const record = value as Record<string, unknown>;
                        const numericId = Number(record.id);
                        const rawName =
                            typeof record.name === "string"
                                ? record.name
                                : typeof record.nickname === "string"
                                  ? record.nickname
                                  : typeof record.username === "string"
                                    ? record.username
                                    : undefined;

                        return {
                            id: Number.isFinite(numericId)
                                ? numericId
                                : undefined,
                            name: rawName,
                        };
                    }

                    return null;
                })
                .filter((value): value is MemberSnapshot => Boolean(value));
        }
    } catch {
        // Fallback parse bang regex ben duoi.
    }

    const extracted = content.match(/\d+/g) ?? [];
    return extracted
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
        .map((id) => ({ id }));
}

function safeParseRolePayload(content: string): {
    targetId?: number;
    targetName?: string;
    newRole?: string;
} {
    if (!content?.trim()) return {};

    try {
        const parsed = JSON.parse(content) as Record<string, unknown>;
        const targetId = Number(parsed.targetId);
        const targetName =
            typeof parsed.targetName === "string"
                ? parsed.targetName
                : typeof parsed.name === "string"
                  ? parsed.name
                  : undefined;
        const newRole =
            typeof parsed.newRole === "string" ? parsed.newRole : undefined;

        return {
            targetId: Number.isFinite(targetId) ? targetId : undefined,
            targetName,
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

    return "Nguoi dung";
}

function resolveMemberLabelFromSnapshot(
    snapshot: MemberSnapshot,
    membersById: Record<number, MemberLookup>,
): string | null {
    const rawName = snapshot.name?.trim();
    if (rawName && rawName !== "Nguoi dung") {
        return rawName;
    }

    if (typeof snapshot.id === "number" && Number.isFinite(snapshot.id)) {
        const label = resolveMemberLabel(snapshot.id, membersById);
        return label === "Nguoi dung" ? null : label;
    }

    return null;
}

function resolveMemberUsername(
    memberId: number,
    membersById: Record<number, MemberLookup>,
): string | null {
    const member = membersById[memberId];
    const username = member?.username?.trim();
    return username || null;
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

    const memberEntries = safeParseMemberEntries(content);
    const memberIds = Array.from(
        new Set(
            memberEntries
                .map((entry) => entry.id)
                .filter((value): value is number => typeof value === "number"),
        ),
    );

    if (isOwn) {
        const memberNames = memberEntries
            .map((entry) => resolveMemberLabelFromSnapshot(entry, membersById))
            .filter((name): name is string => Boolean(name));
        const joinedNames = formatCommaNameList(memberNames);
        if (!joinedNames) return "Ban da them thanh vien vao nhom";
        return `Ban da them ${joinedNames} vao nhom`;
    }

    const hasCurrentUser = memberIds.includes(currentUserId);
    const otherEntries = memberEntries.filter(
        (entry) => entry.id !== currentUserId,
    );
    const otherNames = otherEntries
        .map((entry) => resolveMemberLabelFromSnapshot(entry, membersById))
        .filter((name): name is string => Boolean(name));
    const joinedOtherNames = formatCommaNameList(otherNames);

    if (hasCurrentUser && joinedOtherNames) {
        return `${actorLabel} da them ban, ${joinedOtherNames} vao nhom`;
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
                : payload.targetName?.trim() ||
                  resolveMemberLabel(payload.targetId, membersById)
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
    const targetEntry = safeParseMemberEntries(content)[0];
    const targetId = targetEntry?.id;
    const targetName = targetEntry?.name?.trim();

    if (typeof targetId !== "number") {
        return isOwn
            ? "Ban da xoa mot thanh vien khoi nhom"
            : `${actorLabel} da xoa mot thanh vien khoi nhom`;
    }

    const targetLabel =
        targetId === currentUserId
            ? "ban"
            : targetName && targetName !== "Nguoi dung"
              ? targetName
              : resolveMemberLabel(targetId, membersById);

    if (isOwn) {
        return `Ban da xoa ${targetLabel} khoi nhom`;
    }

    return `${actorLabel} da xoa ${targetLabel} khoi nhom`;
}

function buildSystemLeaveGroupMessage(params: {
    isOwn: boolean;
    actorLabel: string;
    senderId?: number;
    membersById: Record<number, MemberLookup>;
}): string {
    const { isOwn, actorLabel, senderId, membersById } = params;
    if (isOwn) return "Ban da roi khoi nhom";

    if (typeof senderId === "number" && Number.isFinite(senderId)) {
        const username = resolveMemberUsername(senderId, membersById);
        if (username) {
            return `${username} da roi khoi nhom`;
        }
    }

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
            senderId,
            membersById,
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
