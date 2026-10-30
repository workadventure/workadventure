import { describe, expect, it } from "vitest";
import { withUnreadCount } from "./unreadTabTitle";

describe("withUnreadCount", () => {
    it("puts the count in front of the title", () => {
        expect(withUnreadCount("WorkAdventure", 3)).toBe("(3) WorkAdventure");
    });

    it("replaces a previous count instead of stacking them", () => {
        expect(withUnreadCount("(3) WorkAdventure", 4)).toBe("(4) WorkAdventure");
        expect(withUnreadCount("(99+) WorkAdventure", 2)).toBe("(2) WorkAdventure");
    });

    it("removes the count when nothing is unread", () => {
        expect(withUnreadCount("(3) WorkAdventure", 0)).toBe("WorkAdventure");
    });

    it("caps the count like the badges", () => {
        expect(withUnreadCount("WorkAdventure", 150)).toBe("(99+) WorkAdventure");
    });
});
