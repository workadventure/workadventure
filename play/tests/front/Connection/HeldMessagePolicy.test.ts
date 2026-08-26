import { describe, expect, it, vi } from "vitest";
import type { ServerToClientMessage as ServerToClientMessageTsProto } from "@workadventure/messages";

import { isNeverHeld, stripPings } from "../../../src/front/Connection/HeldMessagePolicy";

function batch(...cases: string[]): ServerToClientMessageTsProto {
    return {
        message: {
            $case: "batchMessage",
            batchMessage: {
                // Only the discriminant matters here; the payloads are never read by the policy.
                payload: cases.map(($case) => ({ message: { $case } })),
            },
        },
    } as unknown as ServerToClientMessageTsProto;
}

function topLevel($case: string): ServerToClientMessageTsProto {
    return { message: { $case } } as unknown as ServerToClientMessageTsProto;
}

function keptCases(data: ServerToClientMessageTsProto | undefined): string[] {
    const message = data?.message;
    if (message?.$case !== "batchMessage") {
        throw new Error("expected a batch");
    }
    return message.batchMessage.payload.map((wrapper) => wrapper.message?.$case ?? "");
}

describe("stripPings", () => {
    it("answers a ping and drops it from what gets replayed", () => {
        const onPing = vi.fn();

        const remaining = stripPings(batch("userMovedMessage", "pingMessage", "groupUpdateMessage"), onPing);

        expect(onPing).toHaveBeenCalledTimes(1);
        expect(keptCases(remaining)).toEqual(["userMovedMessage", "groupUpdateMessage"]);
    });

    it("answers every ping in a batch", () => {
        const onPing = vi.fn();

        stripPings(batch("pingMessage", "userMovedMessage", "pingMessage"), onPing);

        expect(onPing).toHaveBeenCalledTimes(2);
    });

    it("queues nothing when a batch was only pings", () => {
        const onPing = vi.fn();

        // Otherwise a keep-alive-only batch would sit in the queue and replay a stale pong later.
        expect(stripPings(batch("pingMessage"), onPing)).toBeUndefined();
        expect(onPing).toHaveBeenCalledTimes(1);
    });

    it("leaves a batch without pings untouched", () => {
        const onPing = vi.fn();

        const remaining = stripPings(batch("userJoinedMessage"), onPing);

        expect(onPing).not.toHaveBeenCalled();
        expect(keptCases(remaining)).toEqual(["userJoinedMessage"]);
    });

    it("passes a non-batch message straight through", () => {
        const onPing = vi.fn();
        const message = topLevel("teleportMessageMessage");

        expect(stripPings(message, onPing)).toBe(message);
        expect(onPing).not.toHaveBeenCalled();
    });
});

describe("isNeverHeld", () => {
    it.each(["roomConnectedMessage", "roomJoinedMessage"])(
        "dispatches %s immediately: its payload survives in a promise, and holding it would stall the awaiter",
        ($case) => {
            expect(isNeverHeld(topLevel($case))).toBe(true);
        },
    );

    it.each(["userMovedMessage", "batchMessage", "teleportMessageMessage"])("holds %s", ($case) => {
        expect(isNeverHeld(topLevel($case))).toBe(false);
    });
});
