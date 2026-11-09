import { describe, expect, it } from "vitest";
import { shouldShowBackToRoomList } from "./RoomTimelineHeaderLayout";

describe("shouldShowBackToRoomList", () => {
    it("hides the arrow when the room list is beside the timeline", () => {
        expect(shouldShowBackToRoomList(true, false, false)).toBe(false);
    });

    it("keeps it on one column, in a thread, or with a custom back action", () => {
        expect(shouldShowBackToRoomList(false, false, false)).toBe(true);
        expect(shouldShowBackToRoomList(true, true, false)).toBe(true);
        expect(shouldShowBackToRoomList(true, false, true)).toBe(true);
    });
});
