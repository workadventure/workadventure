import { describe, expect, it, vi } from "vitest";

import { SingleUseSlot } from "../../../src/front/Connection/SingleUseSlot";

const ROOM = "http://play.example.com/@/team/world/room";
const OTHER_ROOM = "http://play.example.com/@/team/world/other";

describe("SingleUseSlot", () => {
    it("hands its content over once", () => {
        const slot = new SingleUseSlot<string>(vi.fn());
        slot.fill(ROOM, "connection");

        expect(slot.take(ROOM)).toBe("connection");
        // A scene re-created on a portal or a reconnection must build its own.
        expect(slot.take(ROOM)).toBeUndefined();
    });

    it("refuses to hand its content to another room", () => {
        const slot = new SingleUseSlot<string>(vi.fn());
        slot.fill(ROOM, "connection");

        expect(slot.take(OTHER_ROOM)).toBeUndefined();
        expect(slot.take(ROOM)).toBe("connection");
    });

    it("discards what it still holds when filled again", () => {
        const onDiscard = vi.fn();
        const slot = new SingleUseSlot<string>(onDiscard);

        slot.fill(ROOM, "first");
        slot.fill(ROOM, "second");

        // The first boot never reached a scene: its connection is stale and must be closed, not
        // handed to the boot that replaced it.
        expect(onDiscard).toHaveBeenCalledWith("first");
        expect(slot.take(ROOM)).toBe("second");
    });

    it("does not discard what was already taken", () => {
        const onDiscard = vi.fn();
        const slot = new SingleUseSlot<string>(onDiscard);

        slot.fill(ROOM, "claimed");
        slot.take(ROOM);
        slot.fill(ROOM, "next");

        expect(onDiscard).not.toHaveBeenCalled();
    });

    it("peeks without depriving the taker", () => {
        const slot = new SingleUseSlot<string>(vi.fn());
        slot.fill(ROOM, "map");

        expect(slot.peek()).toBe("map");
        expect(slot.take(ROOM)).toBe("map");
    });

    it("discards nothing when empty", () => {
        const onDiscard = vi.fn();
        new SingleUseSlot<string>(onDiscard).discard();

        expect(onDiscard).not.toHaveBeenCalled();
    });
});
