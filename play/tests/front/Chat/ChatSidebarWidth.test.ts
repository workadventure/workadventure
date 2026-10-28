import { describe, expect, it } from "vitest";
import {
    clampChatSidebarWidth,
    getChatSidebarMaxWidth,
    snapChatSidebarWidth,
} from "../../../src/front/Chat/ChatSidebarWidth";

describe("getChatSidebarMaxWidth", () => {
    it("caps the chat at 1200 px on a wide screen", () => {
        expect(getChatSidebarMaxWidth(1920)).toBe(1200);
    });

    it("keeps 50 px of map visible on a narrower screen", () => {
        expect(getChatSidebarMaxWidth(1000)).toBe(950);
    });
});

describe("clampChatSidebarWidth", () => {
    it("never goes below 320 px", () => {
        expect(clampChatSidebarWidth(200, 1920)).toBe(320);
    });

    it("never goes above the max width", () => {
        expect(clampChatSidebarWidth(1920, 1920)).toBe(1200);
        expect(clampChatSidebarWidth(5000, 1000)).toBe(950);
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

    it("snaps to the max width near it, never to the full screen", () => {
        expect(snapChatSidebarWidth(1170, 1920)).toBe(1200);
        expect(snapChatSidebarWidth(1900, 1920)).toBe(1200);
        expect(snapChatSidebarWidth(920, 1000)).toBe(950);
    });

    it("clamps before snapping", () => {
        expect(snapChatSidebarWidth(100, 1920)).toBe(320);
    });
});
