import { describe, expect, it, vi } from "vitest";
import {
    floorHoldersSchema,
    processFloorHoldersMetadata,
    processRaisedHandsMetadata,
    raisedHandsQueueSchema,
} from "../src/Model/RaisedHandsMetadataProcessor";

function createSpace() {
    return {
        applyRaisedHand: vi.fn().mockReturnValue([{ spaceUserId: "space-user-1", name: "Alice", at: 10 }]),
        applyFloorHolder: vi.fn().mockReturnValue([{ spaceUserId: "space-user-1", name: "Alice" }]),
    };
}

describe("RaisedHandsMetadataProcessor", () => {
    it("should hand the client intent over to the space, which owns the queue", async () => {
        const space = createSpace();

        await expect(processRaisedHandsMetadata({ raised: true }, "space-user-1", space)).resolves.toEqual([
            { spaceUserId: "space-user-1", name: "Alice", at: 10 },
        ]);
        expect(space.applyRaisedHand).toHaveBeenCalledWith("space-user-1", true);
    });

    it("should lower a hand on an explicit false", async () => {
        const space = createSpace();

        await processRaisedHandsMetadata({ raised: false }, "space-user-1", space);

        expect(space.applyRaisedHand).toHaveBeenCalledWith("space-user-1", false);
    });

    // A malformed payload used to be coerced to `raised: false`, which silently lowered the sender's hand.
    it.each([[undefined], [null], ["true"], [{}], [{ raised: "true" }], [{ raised: 1 }]])(
        "should reject the malformed raise-hand payload %j without touching the queue",
        async (payload) => {
            const space = createSpace();

            await expect(processRaisedHandsMetadata(payload, "space-user-1", space)).rejects.toThrow();
            expect(space.applyRaisedHand).not.toHaveBeenCalled();
        },
    );

    it("should hand the floor-holder intent over to the space", async () => {
        const space = createSpace();

        await expect(processFloorHoldersMetadata({ holds: true }, "space-user-1", space)).resolves.toEqual([
            { spaceUserId: "space-user-1", name: "Alice" },
        ]);
        expect(space.applyFloorHolder).toHaveBeenCalledWith("space-user-1", true);
    });

    it.each([[undefined], [null], ["yes"], [{}], [{ holds: "true" }]])(
        "should reject the malformed floor-holder payload %j without touching the list",
        async (payload) => {
            const space = createSpace();

            await expect(processFloorHoldersMetadata(payload, "space-user-1", space)).rejects.toThrow();
            expect(space.applyFloorHolder).not.toHaveBeenCalled();
        },
    );

    describe("stored state schemas", () => {
        it("should read back what the server stored", () => {
            const queue = [
                { spaceUserId: "space-user-1", name: "Alice", at: 10 },
                { spaceUserId: "space-user-2", name: "Bob", at: 20 },
            ];

            expect(raisedHandsQueueSchema.parse(queue)).toEqual(queue);
            expect(floorHoldersSchema.parse([{ spaceUserId: "space-user-1", name: "Alice" }])).toEqual([
                { spaceUserId: "space-user-1", name: "Alice" },
            ]);
        });

        // The lists are server-written, so anything unparseable means the map holds something we never put
        // there: start over rather than throw in the middle of a user leaving the space.
        it.each([[undefined], [null], ["nope"], [{}], [[{ spaceUserId: "" }]], [[null]]])(
            "should fall back to an empty list for %j",
            (stored) => {
                expect(raisedHandsQueueSchema.parse(stored)).toEqual([]);
                expect(floorHoldersSchema.parse(stored)).toEqual([]);
            },
        );
    });
});
