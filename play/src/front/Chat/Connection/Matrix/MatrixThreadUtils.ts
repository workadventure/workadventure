import type { IContent, MatrixEvent, Room } from "matrix-js-sdk";
import type { IThreadBundledRelationship } from "matrix-js-sdk/lib/models/event";
import type { Thread } from "matrix-js-sdk/lib/models/thread";
import type { ChatThreadSummary } from "../ChatConnection";

type ThreadRelationContent = {
    rel_type: "m.thread";
    event_id: string;
    is_falling_back: boolean;
    "m.in_reply_to": {
        event_id: string;
    };
};

export function isThreadReplyEvent(event: MatrixEvent): boolean {
    return !!event.threadRootId && event.threadRootId !== event.getId();
}

export function shouldDisplayEventInRoomTimeline(event: MatrixEvent): boolean {
    return !isThreadReplyEvent(event);
}

export function shouldRenderQuotedReply(event: MatrixEvent): boolean {
    const relation = event.getOriginalContent()?.["m.relates_to"];
    if (relation?.rel_type === "m.thread" && relation.is_falling_back) {
        return false;
    }

    return event.replyEventId !== undefined;
}

export function buildThreadRelationContent(
    threadRootId: string,
    fallbackEventId: string,
    replyToEventId?: string
): ThreadRelationContent {
    const replyTargetId = replyToEventId ?? fallbackEventId;

    return {
        rel_type: "m.thread",
        event_id: threadRootId,
        is_falling_back: replyToEventId === undefined,
        "m.in_reply_to": {
            event_id: replyTargetId,
        },
    };
}

export function applyThreadRelationToContent(
    content: IContent,
    threadRootId: string,
    fallbackEventId: string,
    replyToEventId?: string
): void {
    content["m.relates_to"] = buildThreadRelationContent(threadRootId, fallbackEventId, replyToEventId);
}

export function getThreadSummary(thread: Thread | null, room: Room, rootEventId: string): ChatThreadSummary | null {
    const rootEvent = thread?.rootEvent ?? room.findEventById(rootEventId) ?? undefined;

    if (thread) {
        if (thread.length <= 0) {
            return null;
        }

        const replyEvent = thread.replyToEvent ?? undefined;
        return {
            rootMessageId: rootEventId,
            rootMessagePreview: getEventPreview(rootEvent),
            rootMessageSenderName: getEventSenderName(rootEvent, room),
            replyCount: thread.length,
            lastReplyPreview: getEventPreview(replyEvent),
            lastReplySenderName: getEventSenderName(replyEvent, room),
            currentUserParticipated: thread.hasCurrentUserParticipated,
            lastActivityTimestamp: replyEvent?.getDate()?.getTime() ?? rootEvent?.getDate()?.getTime() ?? 0,
        };
    }

    const bundledThread =
        rootEvent?.getServerAggregatedRelation<IThreadBundledRelationship>("m.thread") ??
        rootEvent?.getServerAggregatedRelation<IThreadBundledRelationship>("io.element.thread");

    if (!bundledThread || bundledThread.count <= 0) {
        return null;
    }

    return {
        rootMessageId: rootEventId,
        rootMessagePreview: getEventPreview(rootEvent),
        rootMessageSenderName: getEventSenderName(rootEvent, room),
        replyCount: bundledThread.count,
        lastReplyPreview: getRawEventPreview(bundledThread.latest_event),
        lastReplySenderName: getRawEventSenderName(bundledThread.latest_event, room),
        currentUserParticipated: !!bundledThread.current_user_participated,
        lastActivityTimestamp: getRawEventTimestamp(bundledThread.latest_event) ?? rootEvent?.getDate()?.getTime() ?? 0,
    };
}

function getEventPreview(event: MatrixEvent | undefined): string | undefined {
    if (!event) {
        return undefined;
    }

    const content = event.getOriginalContent();
    return typeof content?.body === "string" && content.body.length > 0 ? content.body : undefined;
}

function getEventSenderName(event: MatrixEvent | undefined, room: Room): string | undefined {
    const senderId = event?.getSender();
    if (!senderId) {
        return undefined;
    }

    return room.getMember(senderId)?.name ?? senderId;
}

function getRawEventPreview(event: { content?: IContent } | undefined): string | undefined {
    return typeof event?.content?.body === "string" && event.content.body.length > 0 ? event.content.body : undefined;
}

function getRawEventSenderName(event: { sender?: string } | undefined, room: Room): string | undefined {
    if (!event?.sender) {
        return undefined;
    }

    return room.getMember(event.sender)?.name ?? event.sender;
}

function getRawEventTimestamp(event: { origin_server_ts?: number } | undefined): number | undefined {
    return typeof event?.origin_server_ts === "number" ? event.origin_server_ts : undefined;
}
