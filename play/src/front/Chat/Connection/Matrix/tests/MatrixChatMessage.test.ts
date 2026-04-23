import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatrixEvent, Room } from "matrix-js-sdk";
import { MatrixChatMessage } from "../MatrixChatMessage";

function createTextEvent(
    overrides: Partial<MatrixEvent> & {
        replyEventId?: string;
        formattedBody?: string;
    } = {}
): MatrixEvent {
    const originalContent = {
        body: "hello",
        msgtype: "m.text",
        formatted_body: overrides.formattedBody,
    };

    return {
        getId: vi.fn().mockReturnValue("event-id"),
        getDate: vi.fn().mockReturnValue(new Date("2024-01-01T00:00:00.000Z")),
        getSender: vi.fn().mockReturnValue("@alice:matrix.example"),
        getUnsigned: vi.fn().mockReturnValue({}),
        isDecryptionFailure: vi.fn().mockReturnValue(false),
        getOriginalContent: vi.fn().mockReturnValue(originalContent),
        replacingEventId: vi.fn().mockReturnValue(undefined),
        isRedacted: vi.fn().mockReturnValue(false),
        on: vi.fn(),
        off: vi.fn(),
        replyEventId: overrides.replyEventId,
        ...overrides,
    } as unknown as MatrixEvent;
}

function createRoom(replyEvents: MatrixEvent[] = []): Room {
    const findEventById = vi.fn();
    replyEvents.forEach((event) => {
        findEventById.mockReturnValueOnce(event);
    });

    return {
        client: {
            getUserId: vi.fn().mockReturnValue("@alice:matrix.example"),
            getSafeUserId: vi.fn().mockReturnValue("@alice:matrix.example"),
            getUser: vi.fn(),
            mxcUrlToHttp: vi.fn(),
        },
        roomId: "!room:matrix.example",
        myUserId: "@alice:matrix.example",
        getMember: vi.fn(),
        findEventById,
        getLiveTimeline: vi.fn().mockReturnValue({
            getState: vi.fn().mockReturnValue({
                hasSufficientPowerLevelFor: vi.fn().mockReturnValue(false),
            }),
        }),
        getUnfilteredTimelineSet: vi.fn().mockReturnValue({
            relations: {
                getChildEventsForEvent: vi.fn().mockReturnValue(undefined),
            },
        }),
    } as unknown as Room;
}

describe("MatrixChatMessage", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("destroys the previous quoted message when recomputing a different reply target", () => {
        const firstQuotedEvent = createTextEvent({
            replyEventId: undefined,
        });
        const secondQuotedEvent = createTextEvent({
            getId: vi.fn().mockReturnValue("quoted-2"),
            replyEventId: undefined,
        });
        const parentEvent = createTextEvent({
            replyEventId: "quoted-1",
            formattedBody: "<mx-reply>old</mx-reply>new body",
        });
        const room = createRoom([firstQuotedEvent, secondQuotedEvent]);

        const message = new MatrixChatMessage(parentEvent, room);
        const firstQuotedMessage = message.quotedMessage as MatrixChatMessage;
        const destroySpy = vi.spyOn(firstQuotedMessage, "destroy");

        message["updateMessageContentOnDecryptedEvent"]();

        expect(destroySpy).toHaveBeenCalledOnce();
        expect(message.quotedMessage).not.toBe(firstQuotedMessage);
    });

    it("clears and destroys the quoted message when the reply markup disappears", () => {
        const quotedEvent = createTextEvent({
            replyEventId: undefined,
        });
        const parentEvent = createTextEvent({
            replyEventId: "quoted-1",
            formattedBody: "<mx-reply>old</mx-reply>new body",
        });
        const room = createRoom([quotedEvent]);

        const message = new MatrixChatMessage(parentEvent, room);
        const quotedMessage = message.quotedMessage as MatrixChatMessage;
        const destroySpy = vi.spyOn(quotedMessage, "destroy");

        parentEvent.getOriginalContent = vi.fn().mockReturnValue({
            body: "plain body",
            msgtype: "m.text",
        });
        message["updateMessageContentOnDecryptedEvent"]();

        expect(destroySpy).toHaveBeenCalledOnce();
        expect(message.quotedMessage).toBeUndefined();
    });
});
