interface MemberLookup {
    nickname?: string;
    username?: string;
}

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

export function buildSystemCreateGroupMessage(params: {
    content: string;
    isOwn: boolean;
    senderName: string;
    currentUserId: number;
    membersById: Record<number, MemberLookup>;
}): string {
    const { content, isOwn, senderName, currentUserId, membersById } = params;

    const memberIds = Array.from(new Set(safeParseMemberIds(content)));
    const actorLabel = senderName?.trim() || "Người dùng";

    if (isOwn) {
        const memberNames = memberIds.map((id) =>
            resolveMemberLabel(id, membersById),
        );
        const joinedNames = formatNameList(memberNames);
        if (!joinedNames) return "Bạn đã tạo nhóm";
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

    return `${actorLabel} đã tạo nhóm`;
}
