import type { ChatReadMarker, ChatTimelineItem } from "../../Connection/ChatConnection";

type KeyedTimelineItem = { key: string; timelineItem?: ChatTimelineItem };

function isIncomingMessage({ timelineItem }: KeyedTimelineItem, myChatId: string | null): boolean {
    return timelineItem?.kind === "message" && timelineItem.message.sender?.chatId !== myChatId;
}

/**
 * Messages from other people rendered after `previousLastKey`. Returns 0 when that key is no longer
 * in the list (timeline rebuilt): no count is better than a wrong one.
 */
export function countIncomingMessagesAfter(
    items: readonly KeyedTimelineItem[],
    previousLastKey: string | undefined,
    myChatId: string | null,
): number {
    const previousLastIndex = items.findIndex((item) => item.key === previousLastKey);
    if (previousLastIndex === -1) return 0;
    return items.slice(previousLastIndex + 1).filter((item) => isIncomingMessage(item, myChatId)).length;
}

function isReadAt(timelineItem: ChatTimelineItem, timestamp: number | undefined): boolean {
    return timestamp !== undefined && timelineItem.date !== null && timelineItem.date.getTime() <= timestamp;
}

/** Whether the loaded items reach back to the read marker, so the first unread message can be placed. */
export function isReadMarkerLoaded(items: readonly KeyedTimelineItem[], marker: ChatReadMarker): boolean {
    return items.some(
        ({ timelineItem }) =>
            timelineItem !== undefined &&
            (timelineItem.id === marker.eventId || isReadAt(timelineItem, marker.timestamp)),
    );
}

/**
 * Key of the first message from someone else after the read marker: where the "New messages" line goes.
 * The marker event itself may not be displayed (reaction, membership…); the read time then decides.
 * Undefined while older pages are still missing, rather than a line on the first loaded message.
 */
export function findFirstUnreadKey(
    items: readonly KeyedTimelineItem[],
    marker: ChatReadMarker,
    myChatId: string | null,
): string | undefined {
    const markerIndex = items.findIndex(({ timelineItem }) => timelineItem?.id === marker.eventId);
    if (markerIndex !== -1) {
        return items.slice(markerIndex + 1).find((item) => isIncomingMessage(item, myChatId))?.key;
    }
    if (!isReadMarkerLoaded(items, marker)) return undefined;
    return items.find(
        (item) =>
            isIncomingMessage(item, myChatId) &&
            item.timelineItem !== undefined &&
            !isReadAt(item.timelineItem, marker.timestamp),
    )?.key;
}
