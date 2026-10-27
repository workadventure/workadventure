import { describe, expect, it } from "vitest";
import { countUnreadElsewhere, formatUnreadCount } from "./unreadCount";

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

describe("countUnreadElsewhere", () => {
    const bubble = { id: "bubble", count: 2, muted: false };
    const mutedZone = { id: "zone", count: 5, muted: true };

    it("adds the Matrix total and the unmuted proximity rooms", () => {
        expect(countUnreadElsewhere(7, [bubble, mutedZone], undefined)).toBe(9);
    });

    it("leaves out the open Matrix room", () => {
        expect(countUnreadElsewhere(7, [bubble], { id: "!room", count: 3, muted: false })).toBe(6);
    });

    it("leaves out the open proximity room without touching the Matrix total", () => {
        expect(countUnreadElsewhere(7, [bubble, mutedZone], bubble)).toBe(7);
    });

    it("does not subtract an open muted room, which the Matrix total never counted", () => {
        expect(countUnreadElsewhere(7, [], { id: "!muted", count: 3, muted: true })).toBe(7);
    });

    it("never goes below zero while the aggregates catch up", () => {
        expect(countUnreadElsewhere(1, [], { id: "!room", count: 3, muted: false })).toBe(0);
    });
});
