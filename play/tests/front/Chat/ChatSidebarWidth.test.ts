import { describe, expect, it } from "vitest";
import { clampChatSidebarWidth, snapChatSidebarWidth } from "../../../src/front/Chat/ChatSidebarWidth";

describe("clampChatSidebarWidth", () => {
    it("never goes below 320 px", () => {
        expect(clampChatSidebarWidth(200, 1920)).toBe(320);
    });

    it("keeps 50 px of map visible", () => {
        expect(clampChatSidebarWidth(5000, 1920)).toBe(1870);
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
        expect(snapChatSidebarWidth(1200, 1920)).toBe(1200);
    });

    it("snaps to full screen near the right edge", () => {
        expect(snapChatSidebarWidth(1840, 1920)).toBe(1920);
        expect(snapChatSidebarWidth(5000, 1920)).toBe(1920);
        expect(snapChatSidebarWidth(1820, 1920)).toBe(1820);
    });

    it("clamps before snapping", () => {
        expect(snapChatSidebarWidth(100, 1920)).toBe(320);
    });
});
