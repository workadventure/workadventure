/**
 * Comparator: non-muted first, then by lastMessageTimestamp descending.
 * Items without areNotificationsMuted are treated as non-muted.
 */
export function sortByMuteThenLastMessage<T extends { lastMessageTimestamp: number }>(
    a: T,
    b: T,
    aMuted: boolean,
    bMuted: boolean
): number {
    if (aMuted !== bMuted) {
        return (aMuted ? 1 : 0) - (bMuted ? 1 : 0);
    }
    return b.lastMessageTimestamp - a.lastMessageTimestamp;
}

/**
 * Same order (mute then timestamp desc) when timestamps are provided explicitly.
 */
export function sortByMuteThenTimestamp(
    aMuted: boolean,
    bMuted: boolean,
    aTimestamp: number,
    bTimestamp: number
): number {
    if (aMuted !== bMuted) {
        return (aMuted ? 1 : 0) - (bMuted ? 1 : 0);
    }
    return bTimestamp - aTimestamp;
}
