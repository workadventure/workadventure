import type { TranslationFunctions } from "../../../../i18n/i18n-types";

export function countOnlineMembers(memberIds: readonly string[], onlineIds: ReadonlySet<string>): number {
    return memberIds.filter((id) => onlineIds.has(id)).length;
}

export function formatRoomSubtitle(LL: TranslationFunctions, members: number, online: number): string {
    return LL.chat.conversationSubtitle.roomMembers({ members, online });
}

export function formatDirectSubtitle(statusLabel: string, place: string | undefined): string {
    return place ? `${statusLabel} · ${place}` : statusLabel;
}

/** "With A, B" for a bubble, leaving out the local user. Undefined while nobody else is in it. */
export function formatBubbleSubtitle(
    LL: TranslationFunctions,
    participants: readonly { name?: string; uuid?: string }[],
    myUuid: string | undefined,
): string | undefined {
    const names = participants
        .filter((participant) => participant.uuid === undefined || participant.uuid !== myUuid)
        .map((participant) => participant.name)
        .filter((name): name is string => !!name);
    return names.length > 0 ? LL.chat.conversationSubtitle.with({ names: names.join(", ") }) : undefined;
}
