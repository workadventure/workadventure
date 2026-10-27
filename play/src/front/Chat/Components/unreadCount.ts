export const MAX_DISPLAYED_UNREAD_COUNT = 99;

export function formatUnreadCount(count: number): string {
    return count > MAX_DISPLAYED_UNREAD_COUNT ? `${MAX_DISPLAYED_UNREAD_COUNT}+` : String(count);
}

export interface UnreadConversationCount {
    id: string;
    count: number;
    muted: boolean;
}

export function sumUnmutedUnreadCounts(conversations: readonly UnreadConversationCount[]): number {
    return conversations.reduce((total, { count, muted }) => (muted ? total : total + count), 0);
}

export interface UnreadSummary {
    count: number;
    // True when every unread message is in a muted conversation: the pill is then grey.
    muted: boolean;
}

/** What a collapsed list shows: its unmuted unread messages, or, if there are none, its muted ones in grey. */
export function summarizeUnreadCounts(conversations: readonly UnreadConversationCount[]): UnreadSummary {
    const unmuted = sumUnmutedUnreadCounts(conversations);
    if (unmuted > 0) {
        return { count: unmuted, muted: false };
    }
    return { count: conversations.reduce((total, { count }) => total + count, 0), muted: true };
}

/**
 * Unread messages in every conversation but the open one, muted ones excluded.
 * The Matrix total comes from the connection's aggregates, which already leave muted rooms out.
 */
export function countUnreadElsewhere(
    matrixTotal: number,
    proximityRooms: readonly UnreadConversationCount[],
    openConversation: UnreadConversationCount | undefined,
): number {
    const others = proximityRooms.filter((room) => room.id !== openConversation?.id);
    const openMatrixCount =
        openConversation && !openConversation.muted && !proximityRooms.some((room) => room.id === openConversation.id)
            ? openConversation.count
            : 0;
    return Math.max(0, matrixTotal - openMatrixCount) + sumUnmutedUnreadCounts(others);
}

/** Unread, unmuted conversations, the most recently active first. */
export function listUnreadConversations<T extends UnreadConversationCount & { lastMessageTimestamp: number }>(
    conversations: readonly T[],
): T[] {
    return conversations
        .filter(({ count, muted }) => count > 0 && !muted)
        .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
}
