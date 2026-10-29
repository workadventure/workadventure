import { describe, expect, it } from "vitest";
import { CHAT_SIDEBAR_MAX_WIDTH } from "../ChatSidebarWidth";
import {
    clampRoomListWidth,
    getRoomSidePanelPlacement,
    ROOM_LIST_MAX_WIDTH,
    ROOM_LIST_MIN_WIDTH,
    threeColumnLayoutLimit,
} from "./RoomListLayout";

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

describe("clampRoomListWidth", () => {
    it("keeps the room list between 260 and 400 px", () => {
        expect(clampRoomListWidth(100)).toBe(ROOM_LIST_MIN_WIDTH);
        expect(clampRoomListWidth(320)).toBe(320);
        expect(clampRoomListWidth(1000)).toBe(ROOM_LIST_MAX_WIDTH);
    });
});

describe("threeColumnLayoutLimit", () => {
    it("follows the room list width", () => {
        expect(threeColumnLayoutLimit(335)).toBe(1135);
        expect(threeColumnLayoutLimit(260)).toBe(1060);
    });

    it("still fits the widest room list in the widest chat", () => {
        expect(threeColumnLayoutLimit(ROOM_LIST_MAX_WIDTH)).toBeLessThanOrEqual(CHAT_SIDEBAR_MAX_WIDTH);
    });
});
