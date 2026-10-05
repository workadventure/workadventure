import { describe, expect, it } from "vitest";
import { computeSpaceUserId } from "../../src/pusher/services/SpaceUserId";

describe("computeSpaceUserId", () => {
    it("is the same for the same tab, whichever pusher computes it", () => {
        expect(computeSpaceUserId("room", "uuid", "tab-1", "secret")).toBe(
            computeSpaceUserId("room", "uuid", "tab-1", "secret"),
        );
    });

    it("differs between two tabs of the same user", () => {
        expect(computeSpaceUserId("room", "uuid", "tab-1", "secret")).not.toBe(
            computeSpaceUserId("room", "uuid", "tab-2", "secret"),
        );
    });

    it("keeps the room as a prefix and does not reveal the tab id", () => {
        const spaceUserId = computeSpaceUserId("room", "uuid", "tab-1", "secret");
        expect(spaceUserId.startsWith("room_")).toBe(true);
        expect(spaceUserId).not.toContain("tab-1");
    });

    it("cannot be reproduced without the server secret", () => {
        expect(computeSpaceUserId("room", "uuid", "tab-1", "secret")).not.toBe(
            computeSpaceUserId("room", "uuid", "tab-1", "other-secret"),
        );
    });
});
