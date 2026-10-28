import type { Readable } from "svelte/store";
import { derived } from "svelte/store";

/** Unread messages in the items that "Show more" hides (those after the first `maxNumber`). */
export function hiddenUnreadCount(counts: readonly number[], maxNumber: number): number {
    return counts.slice(maxNumber).reduce((total, count) => total + count, 0);
}

/** Item indices with the unread ones first; each group keeps its current order. */
export function unreadFirstOrder(counts: readonly number[]): number[] {
    const indices = counts.map((_, index) => index);
    return [...indices.filter((index) => counts[index] > 0), ...indices.filter((index) => !(counts[index] > 0))];
}

/** The count a room row shows: its unread count, but only while the room is marked unread. */
export function rowUnreadCount(hasUnreadMessages: Readable<boolean>, unreadCount: Readable<number>): Readable<number> {
    return derived([hasUnreadMessages, unreadCount], ([hasUnread, count]) => (hasUnread ? count : 0));
}
