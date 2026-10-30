import { describe, expect, it } from "vitest";
import { CHAT_SIDEBAR_MAX_WIDTH } from "../ChatSidebarWidth";
import {
    clampRoomListWidth,
    getRoomSidePanelPlacement,
    ROOM_LIST_MAX_WIDTH,
    ROOM_LIST_MIN_WIDTH,
    showsRoomRowPreview,
    threeColumnLayoutLimit,
} from "./RoomListLayout";

describe("showsRoomRowPreview", () => {
    it("shows the last message on a wide room list, alone or beside a conversation", () => {
        expect(showsRoomRowPreview({ besideConversation: false, roomListWidth: 260, sideBarWidth: 500 })).toBe(true);
        expect(showsRoomRowPreview({ besideConversation: true, roomListWidth: 335, sideBarWidth: 900 })).toBe(true);
    });

    it("keeps the rows compact on a narrow room list, even in a wide chat", () => {
        expect(showsRoomRowPreview({ besideConversation: false, roomListWidth: 400, sideBarWidth: 280 })).toBe(false);
        expect(showsRoomRowPreview({ besideConversation: true, roomListWidth: 260, sideBarWidth: 1200 })).toBe(false);
    });
});

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
