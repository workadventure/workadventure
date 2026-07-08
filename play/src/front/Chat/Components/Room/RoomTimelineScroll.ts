export type RoomTimelineAutoScrollItem = {
    id: string;
    kind: string;
    isMyMessage?: boolean;
};

export type RoomTimelineScrollTarget = { kind: "bottom" } | { kind: "item-start"; eventId: string };

export function getAutoScrollTargetForTimelineUpdate(
    previousLastTimelineItemId: string | undefined,
    currentLastTimelineItem: RoomTimelineAutoScrollItem | undefined,
): RoomTimelineScrollTarget {
    if (
        previousLastTimelineItemId !== undefined &&
        currentLastTimelineItem !== undefined &&
        currentLastTimelineItem.id !== previousLastTimelineItemId &&
        currentLastTimelineItem.kind === "message" &&
        currentLastTimelineItem.isMyMessage === false
    ) {
        return { kind: "item-start", eventId: currentLastTimelineItem.id };
    }

    return { kind: "bottom" };
}

export function getAutoScrollTargetForMessageBodyUpdate(
    currentLastTimelineItem: RoomTimelineAutoScrollItem | undefined,
    updatedMessageId: string | undefined,
): RoomTimelineScrollTarget {
    if (
        currentLastTimelineItem !== undefined &&
        updatedMessageId !== undefined &&
        currentLastTimelineItem.id === updatedMessageId &&
        currentLastTimelineItem.kind === "message" &&
        currentLastTimelineItem.isMyMessage === false
    ) {
        return { kind: "item-start", eventId: currentLastTimelineItem.id };
    }

    return { kind: "bottom" };
}
