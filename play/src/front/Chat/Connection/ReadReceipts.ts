import type { ChatReader, ChatReadReceipts, ChatReadState } from "./ChatConnection";

/** Above this many other members, "read by everyone" never happens: we only count readers. */
export const MAX_OTHERS_FOR_READ_BY_EVERYONE = 50;

export type ReceiptTimelineEvent = { id: string | undefined; sender: string | undefined; timestamp: number };
export type ReadReceipt = { userId: string; eventId: string; timestamp: number | undefined };

/**
 * One pass over the loaded timeline: each person has read up to their receipt, or up to the last
 * thing they wrote, whichever is later. A receipt on an event that is not loaded is older than
 * everything loaded, since the live timeline always holds the latest events.
 */
export function computeReadReceipts(
    events: readonly ReceiptTimelineEvent[],
    receipts: readonly ReadReceipt[],
    myUserId: string,
    otherMemberIds: readonly string[],
): ChatReadReceipts {
    const indexById = new Map<string, number>();
    const furthest = new Map<string, { index: number; readAt: number | undefined }>();
    const reach = (userId: string, index: number, readAt: number | undefined) => {
        if (userId === myUserId) return;
        const current = furthest.get(userId);
        if (!current || index > current.index) furthest.set(userId, { index, readAt });
    };

    events.forEach((event, index) => {
        if (event.id) indexById.set(event.id, index);
        if (event.sender) reach(event.sender, index, event.timestamp);
    });
    for (const receipt of receipts) {
        const index = indexById.get(receipt.eventId);
        if (index !== undefined) reach(receipt.userId, index, receipt.timestamp);
    }

    const readers = Array.from(furthest, ([userId, reader]) => ({ userId, ...reader }));

    return {
        readersOf: (messageId: string): ChatReader[] => {
            const index = indexById.get(messageId);
            if (index === undefined) return [];
            return readers
                .filter((reader) => reader.index >= index)
                .map(({ userId, readAt }) => ({ userId, readAt }))
                .sort((a, b) => (b.readAt ?? 0) - (a.readAt ?? 0));
        },
        otherMemberIds:
            otherMemberIds.length > 0 && otherMemberIds.length <= MAX_OTHERS_FOR_READ_BY_EVERYONE
                ? otherMemberIds
                : undefined,
    };
}

export function getReadState(receipts: ChatReadReceipts, messageId: string): ChatReadState {
    const others = receipts.otherMemberIds;
    if (!others) return "sent";
    const readers = new Set(receipts.readersOf(messageId).map((reader) => reader.userId));
    return others.every((userId) => readers.has(userId)) ? "read" : "sent";
}
