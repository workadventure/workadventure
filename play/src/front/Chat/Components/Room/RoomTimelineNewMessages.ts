import type { ChatTimelineItem } from "../../Connection/ChatConnection";

type KeyedTimelineItem = { key: string; timelineItem?: ChatTimelineItem };

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
    return items
        .slice(previousLastIndex + 1)
        .filter(
            ({ timelineItem }) => timelineItem?.kind === "message" && timelineItem.message.sender?.chatId !== myChatId,
        ).length;
}
