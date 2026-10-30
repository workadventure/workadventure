import { describe, expect, it, vi } from "vitest";
import type { Room } from "matrix-js-sdk";
import { MatrixEvent } from "matrix-js-sdk";
import {
    buildThreadRelationContent,
    getLastMessagePreview,
    getThreadSummary,
    isThreadReplyEvent,
    shouldDisplayEventInRoomTimeline,
    shouldRenderQuotedReply,
} from "../MatrixThreadUtils";

describe("MatrixThreadUtils", () => {
    it("marks plain thread messages as fallback thread relations", () => {
        expect(buildThreadRelationContent("$root", "$last-reply")).toEqual({
            rel_type: "m.thread",
            event_id: "$root",
            is_falling_back: true,
            "m.in_reply_to": {
                event_id: "$last-reply",
            },
        });
    });

    it("marks targeted thread replies as non-fallback replies", () => {
        expect(buildThreadRelationContent("$root", "$fallback", "$reply-target")).toEqual({
            rel_type: "m.thread",
            event_id: "$root",
            is_falling_back: false,
            "m.in_reply_to": {
                event_id: "$reply-target",
            },
        });
    });

    it("keeps thread replies out of the main room timeline", () => {
        const event = createThreadReplyEvent();

        expect(isThreadReplyEvent(event)).toBe(true);
        expect(shouldDisplayEventInRoomTimeline(event)).toBe(false);
    });

    it("does not render the thread fallback as a quoted reply", () => {
        const event = createThreadReplyEvent({
            isFallback: true,
            replyTargetId: "$root",
        });

        expect(shouldRenderQuotedReply(event)).toBe(false);
    });

    it("renders a quoted reply for targeted replies inside threads", () => {
        const event = createThreadReplyEvent({
            isFallback: false,
            replyTargetId: "$specific-reply",
        });

        expect(shouldRenderQuotedReply(event)).toBe(true);
    });

    it("includes unread metadata in thread summaries", () => {
        const rootEvent = createThreadReplyEvent();
        vi.spyOn(rootEvent, "getId").mockReturnValue("$root");
        const room = {
            findEventById: vi.fn(() => rootEvent),
            getThreadUnreadNotificationCount: vi.fn(() => 4),
            getMember: vi.fn(() => undefined),
        };
        const thread = {
            rootEvent,
            length: 1,
            replyToEvent: rootEvent,
            hasCurrentUserParticipated: true,
        };

        const summary = getThreadSummary(thread as never, room as never, "$root");

        expect(summary).toMatchObject({
            hasUnreadMessages: true,
            unreadNotificationCount: 4,
        });
    });

    it("keeps server-discovered threads visible even when the root event is missing", () => {
        const replyEvent = createThreadReplyEvent();
        vi.spyOn(replyEvent, "getId").mockReturnValue("$reply");

        const room = {
            findEventById: vi.fn(() => undefined),
            getThreadUnreadNotificationCount: vi.fn(() => 0),
            getMember: vi.fn(() => undefined),
        };
        const thread = {
            rootEvent: undefined,
            length: 2,
            replyToEvent: replyEvent,
            hasCurrentUserParticipated: false,
            id: "$root",
        };

        const summary = getThreadSummary(thread as never, room as never, "$root");

        expect(summary).toMatchObject({
            rootMessageId: "$root",
            isDegraded: true,
            degradedReason: "root_missing",
            replyCount: 2,
            lastReplyPreview: "Hello from a thread",
        });
    });
});

describe("getLastMessagePreview", () => {
    function roomWith(events: MatrixEvent[]): Room {
        return {
            getLiveTimeline: () => ({ getEvents: () => events }),
            getMember: vi.fn(() => ({ name: "Alice" })),
        } as unknown as Room;
    }

    function message(id: string, ts: number, content: Record<string, unknown>) {
        return new MatrixEvent({
            event_id: id,
            type: "m.room.message",
            room_id: "!room:server",
            sender: "@alice:server",
            origin_server_ts: ts,
            content: { msgtype: "m.text", ...content },
        });
    }

    it("skips edits, thread replies and state events", () => {
        const preview = getLastMessagePreview(
            roomWith([
                message("$hi", 1, { body: "Hi" }),
                message("$edit", 2, { body: "* Hi!", "m.relates_to": { rel_type: "m.replace", event_id: "$hi" } }),
                createThreadReplyEvent(),
                new MatrixEvent({ event_id: "$topic", type: "m.room.topic", state_key: "", origin_server_ts: 4 }),
            ]),
        );

        expect(preview).toEqual({ body: "Hi", senderName: "Alice", timestamp: 1 });
    });

    it("has nothing to show without a message", () => {
        expect(getLastMessagePreview(roomWith([]))).toBeUndefined();
    });

    it("carries the read state of my own last message only", () => {
        const room = { ...roomWith([message("$hi", 1, { body: "Hi" })]), client: { getUserId: () => "@alice:server" } };
        const readStateOf = vi.fn(() => "read" as const);

        expect(getLastMessagePreview(room as never, readStateOf)?.readState).toBe("read");
        expect(readStateOf).toHaveBeenCalledWith("$hi");

        const someoneElse = { ...room, client: { getUserId: () => "@bob:server" } };
        expect(getLastMessagePreview(someoneElse as never, readStateOf)?.readState).toBeUndefined();
    });
});

function createThreadReplyEvent(options?: { isFallback?: boolean; replyTargetId?: string }) {
    const event = new MatrixEvent({
        event_id: "$thread-reply",
        type: "m.room.message",
        room_id: "!room:server",
        sender: "@alice:server",
        origin_server_ts: 1,
        content: {
            body: "Hello from a thread",
            msgtype: "m.text",
            "m.relates_to": {
                rel_type: "m.thread",
                event_id: "$root",
                is_falling_back: options?.isFallback ?? true,
                "m.in_reply_to": {
                    event_id: options?.replyTargetId ?? "$root",
                },
            },
        },
    });

    vi.spyOn(event, "threadRootId", "get").mockReturnValue("$root");
    vi.spyOn(event, "replyEventId", "get").mockReturnValue(options?.replyTargetId ?? "$root");

    return event;
}
