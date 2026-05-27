import { get } from "svelte/store";
import { MsgType } from "matrix-js-sdk";
import { describe, expect, it, vi } from "vitest";
import { MatrixChatMessage } from "./MatrixChatMessage";

function createMatrixEvent({
    id,
    body,
    formattedBody,
    replyEventId,
}: {
    id: string;
    body: string;
    formattedBody?: string;
    replyEventId?: string;
}) {
    const content: Record<string, unknown> = {
        body,
        msgtype: MsgType.Text,
    };

    if (formattedBody !== undefined) {
        content.formatted_body = formattedBody;
    }

    if (replyEventId !== undefined) {
        content["m.relates_to"] = {
            "m.in_reply_to": {
                event_id: replyEventId,
            },
        };
    }

    return {
        replyEventId,
        getId: () => id,
        getDate: () => new Date(0),
        getSender: () => "@alice:matrix.test",
        getOriginalContent: () => content,
        getUnsigned: () => ({}),
        isDecryptionFailure: () => false,
        isRedacted: () => false,
        replacingEventId: () => undefined,
        on: vi.fn(),
    };
}

function createMatrixRoom(events: Map<string, ReturnType<typeof createMatrixEvent>>) {
    return {
        client: {
            baseUrl: "https://matrix.test",
            getSafeUserId: () => "@me:matrix.test",
            getUserId: () => "@me:matrix.test",
            getUser: () => undefined,
            mxcUrlToHttp: () => undefined,
        },
        getMember: () => undefined,
        getLiveTimeline: () => ({
            getState: () => ({
                hasSufficientPowerLevelFor: () => false,
            }),
        }),
        getUnfilteredTimelineSet: () => ({
            relations: {
                getChildEventsForEvent: () => undefined,
            },
        }),
        findEventById: (eventId: string) => events.get(eventId),
    };
}

describe("MatrixChatMessage", () => {
    it("keeps the quoted message when a reply event has no formatted body", () => {
        const repliedEvent = createMatrixEvent({
            id: "$replied",
            body: "Original message",
        });
        const replyEvent = createMatrixEvent({
            id: "$reply",
            body: "Reply message",
            replyEventId: "$replied",
        });
        const events = new Map([
            ["$replied", repliedEvent],
            ["$reply", replyEvent],
        ]);

        const message = new MatrixChatMessage(replyEvent as never, createMatrixRoom(events) as never);

        expect(message.quotedMessage?.id).toBe("$replied");
        expect(get(message.content).body).toBe("Reply message");
    });
});
