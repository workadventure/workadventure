import { describe, expect, it } from "vitest";
import { formatUnreadCount } from "./unreadCount";

describe("formatUnreadCount", () => {
    it("shows the exact count up to 99", () => {
        expect(formatUnreadCount(1)).toBe("1");
        expect(formatUnreadCount(23)).toBe("23");
        expect(formatUnreadCount(99)).toBe("99");
    });

    it("caps at 99+", () => {
        expect(formatUnreadCount(100)).toBe("99+");
        expect(formatUnreadCount(4321)).toBe("99+");
    });
});
