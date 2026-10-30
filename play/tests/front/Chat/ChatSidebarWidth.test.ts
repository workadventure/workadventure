import { describe, expect, it } from "vitest";
import {
    clampChatSidebarWidth,
    maxChatSidebarWidth,
    snapChatSidebarWidth,
} from "../../../src/front/Chat/ChatSidebarWidth";

describe("clampChatSidebarWidth", () => {
    it("never goes below 320 px", () => {
        expect(clampChatSidebarWidth(200, 1920)).toBe(320);
    });

    it("keeps 50 px of map visible", () => {
        expect(clampChatSidebarWidth(5000, 1000)).toBe(950);
    });

    it("stops at 1200 px on a wide screen", () => {
        expect(clampChatSidebarWidth(5000, 1920)).toBe(1200);
    });

    it("keeps a width in range", () => {
        expect(clampChatSidebarWidth(500, 1920)).toBe(500);
    });
});

describe("snapChatSidebarWidth", () => {
    it("snaps to the two-column limit from both sides", () => {
        expect(snapChatSidebarWidth(705, 1920)).toBe(740);
        expect(snapChatSidebarWidth(775, 1920)).toBe(740);
    });

    it("leaves a free width alone between steps", () => {
        expect(snapChatSidebarWidth(600, 1920)).toBe(600);
        expect(snapChatSidebarWidth(1100, 1920)).toBe(1100);
    });

    it("snaps to the cap near the top of the range on a wide screen", () => {
        expect(snapChatSidebarWidth(1170, 1920)).toBe(1200);
        expect(snapChatSidebarWidth(5000, 1920)).toBe(1200);
        expect(snapChatSidebarWidth(1150, 1920)).toBe(1150);
    });

    it("snaps to full screen near the right edge on a narrow screen", () => {
        expect(snapChatSidebarWidth(910, 1000)).toBe(1000);
        expect(snapChatSidebarWidth(890, 1000)).toBe(890);
    });

    it("clamps before snapping", () => {
        expect(snapChatSidebarWidth(100, 1920)).toBe(320);
    });
});

describe("maxChatSidebarWidth", () => {
    it("is the whole window up to the cap, the cap beyond", () => {
        expect(maxChatSidebarWidth(1000)).toBe(1000);
        expect(maxChatSidebarWidth(1250)).toBe(1250);
        expect(maxChatSidebarWidth(1920)).toBe(1200);
    });
});
