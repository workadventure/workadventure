import { describe, expect, it } from "vitest";
import {
    deserializeError,
    serializeError,
} from "../../../../src/front/WebRtc/BackgroundProcessor/MediaPipeTasksVisionWorkerProtocol";

// structuredClone stands in for postMessage, which drops `cause` from real Error objects.
const roundTrip = (error: unknown) => deserializeError(structuredClone(serializeError(error)));

describe("worker error serialization", () => {
    it("rebuilds the cause chain with names and stacks", () => {
        const root = new TypeError("Failed to construct 'VideoFrame'");
        const error = new Error("recovery failed", { cause: new Error("frame failed", { cause: root }) });

        const rebuilt = roundTrip(error);

        expect(rebuilt).toMatchObject({ name: "Error", message: "recovery failed", stack: error.stack });
        const middle = rebuilt.cause as Error;
        expect(middle).toBeInstanceOf(Error);
        expect(middle.message).toBe("frame failed");
        expect(middle.cause).toMatchObject({ name: "TypeError", message: root.message, stack: root.stack });
        expect((middle.cause as Error).cause).toBeUndefined();
    });

    it("turns a non-Error cause into a message", () => {
        expect(roundTrip(new Error("outer", { cause: 42 })).cause).toMatchObject({ message: "42" });
    });

    it("keeps at most 5 causes", () => {
        let error = new Error("cause 7");
        for (let i = 6; i >= 0; i--) {
            error = new Error(`cause ${i}`, { cause: error });
        }

        const messages: string[] = [];
        for (let current: unknown = roundTrip(error); current instanceof Error; current = current.cause) {
            messages.push(current.message);
        }

        expect(messages).toEqual(["cause 0", "cause 1", "cause 2", "cause 3", "cause 4", "cause 5"]);
    });
});
