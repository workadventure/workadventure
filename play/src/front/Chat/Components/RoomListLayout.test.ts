import { describe, expect, it } from "vitest";
import { getRoomSidePanelPlacement } from "./RoomListLayout";

describe("getRoomSidePanelPlacement", () => {
    it("hides the panel when it is closed or the room has none", () => {
        expect(getRoomSidePanelPlacement({ canDisplayThirdColumn: true, hasCompatibleRoom: true, isOpen: false })).toBe(
            "hidden",
        );
        expect(getRoomSidePanelPlacement({ canDisplayThirdColumn: true, hasCompatibleRoom: false, isOpen: true })).toBe(
            "hidden",
        );
    });

    it("overlays the conversation when a third column would squeeze it", () => {
        expect(getRoomSidePanelPlacement({ canDisplayThirdColumn: false, hasCompatibleRoom: true, isOpen: true })).toBe(
            "overlay",
        );
        expect(getRoomSidePanelPlacement({ canDisplayThirdColumn: true, hasCompatibleRoom: true, isOpen: true })).toBe(
            "third-column",
        );
    });
});
