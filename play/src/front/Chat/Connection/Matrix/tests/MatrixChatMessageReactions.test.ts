import type { MatrixEvent, Room } from "matrix-js-sdk";
import { get, readable, writable } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import { MatrixChatMessage } from "../MatrixChatMessage";

vi.mock("../MatrixChatUser", () => ({
    chatUserFactoryFromEvent: (_room: Room, event: MatrixEvent) => ({
        chatId: event.getSender(),
        username: event.getSender(),
        pictureStore: readable(undefined),
        availabilityStatus: writable(0),
    }),
}));

function reactionEvent(sender: string, key: string): MatrixEvent {
    return {
        getId: () => `$reaction-${sender}-${key}`,
        getSender: () => sender,
        getRelation: () => ({ rel_type: "m.annotation", event_id: "$event", key }),
    } as unknown as MatrixEvent;
}

function createMessage(annotations: [string, Set<MatrixEvent>][]): MatrixChatMessage {
    const content = { msgtype: "m.text", body: "hello" };
    const event = {
        getId: () => "$event",
        getDate: () => new Date(0),
        getSender: () => "@alice:matrix.test",
        getContent: () => content,
        getOriginalContent: () => content,
        isDecryptionFailure: () => false,
        isRedacted: () => false,
        replacingEventId: () => undefined,
        replyEventId: undefined,
        status: null,
        on: vi.fn(),
        off: vi.fn(),
    } as unknown as MatrixEvent;
    const roomState = { maySendEvent: () => true, hasSufficientPowerLevelFor: () => true };
    const relations = { on: vi.fn(), off: vi.fn(), getSortedAnnotationsByKey: () => annotations };
    const room = {
        myUserId: "@me:matrix.test",
        client: {
            getUserId: () => "@me:matrix.test",
            getSafeUserId: () => "@me:matrix.test",
            mxcUrlToHttp: () => null,
        },
        getLiveTimeline: () => ({ getState: () => roomState }),
        getUnfilteredTimelineSet: () => ({ relations: { getChildEventsForEvent: () => relations } }),
        getMember: () => null,
    } as unknown as Room;
    return new MatrixChatMessage(event, room);
}

describe("MatrixChatMessage reactions", () => {
    it("counts every user who reacted with the same key", () => {
        const message = createMessage([
            ["👍", new Set([reactionEvent("@alice:matrix.test", "👍"), reactionEvent("@me:matrix.test", "👍")])],
            ["🎉", new Set([reactionEvent("@bob:matrix.test", "🎉")])],
        ]);

        const thumbsUp = message.reactions.get("👍")!;
        expect([...get(thumbsUp.users).keys()]).toEqual(["@alice:matrix.test", "@me:matrix.test"]);
        expect(get(thumbsUp.reacted)).toBe(true);
        expect(get(message.reactions.get("🎉")!.users).size).toBe(1);
    });
});
