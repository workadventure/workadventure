import { describe, expect, it, vi } from "vitest";
import { MatrixEvent } from "matrix-js-sdk";
import {
    buildThreadRelationContent,
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
    } as never);

    vi.spyOn(event, "threadRootId", "get").mockReturnValue("$root");
    vi.spyOn(event, "replyEventId", "get").mockReturnValue(options?.replyTargetId ?? "$root");

    return event;
}
