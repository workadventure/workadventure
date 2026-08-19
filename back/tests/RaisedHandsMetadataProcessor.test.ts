import { describe, expect, it, vi } from "vitest";
import { processFloorHoldersMetadata, processRaisedHandsMetadata } from "../src/Model/RaisedHandsMetadataProcessor";

// The payload shape is checked upstream by MetadataProcessor against the shared catalogue (see
// libs/shared-utils/tests/SpaceMetadataCatalog.spec.ts). What is left to verify here is that the processor
// forwards the intent to the space, which owns the queue.
function createSpace() {
    return {
        applyRaisedHand: vi.fn().mockReturnValue([{ spaceUserId: "space-user-1", name: "Alice", at: 10 }]),
        applyFloorHolder: vi.fn().mockReturnValue([{ spaceUserId: "space-user-1", name: "Alice" }]),
    };
}

describe("RaisedHandsMetadataProcessor", () => {
    it("should raise the sender's hand and return the queue the space computed", async () => {
        const space = createSpace();

        await expect(processRaisedHandsMetadata({ raised: true }, "space-user-1", space)).resolves.toEqual([
            { spaceUserId: "space-user-1", name: "Alice", at: 10 },
        ]);
        expect(space.applyRaisedHand).toHaveBeenCalledWith("space-user-1", true);
    });

    it("should lower the sender's hand on an explicit false", async () => {
        const space = createSpace();

        await processRaisedHandsMetadata({ raised: false }, "space-user-1", space);

        expect(space.applyRaisedHand).toHaveBeenCalledWith("space-user-1", false);
    });

    it("should forward the floor-holder intent and return the list the space computed", async () => {
        const space = createSpace();

        await expect(processFloorHoldersMetadata({ holds: true }, "space-user-1", space)).resolves.toEqual([
            { spaceUserId: "space-user-1", name: "Alice" },
        ]);
        expect(space.applyFloorHolder).toHaveBeenCalledWith("space-user-1", true);
    });

    it("should drop the sender from the floor holders on an explicit false", async () => {
        const space = createSpace();

        await processFloorHoldersMetadata({ holds: false }, "space-user-1", space);

        expect(space.applyFloorHolder).toHaveBeenCalledWith("space-user-1", false);
    });
});
