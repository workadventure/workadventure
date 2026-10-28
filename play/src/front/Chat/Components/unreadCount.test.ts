import { describe, expect, it } from "vitest";
import {
    countUnreadElsewhere,
    formatLastActivity,
    formatUnreadCount,
    listUnreadConversations,
    summarizeUnreadCounts,
} from "./unreadCount";

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

describe("summarizeUnreadCounts", () => {
    it("counts only unmuted conversations when there are any", () => {
        expect(
            summarizeUnreadCounts([
                { id: "a", count: 2, muted: false },
                { id: "b", count: 12, muted: true },
                { id: "c", count: 0, muted: false },
            ]),
        ).toEqual({ count: 2, muted: false });
    });

    it("falls back to the muted count, flagged grey, when only muted conversations have unread messages", () => {
        expect(
            summarizeUnreadCounts([
                { id: "a", count: 0, muted: false },
                { id: "b", count: 12, muted: true },
            ]),
        ).toEqual({ count: 12, muted: true });
    });

    it("is empty without unread messages", () => {
        expect(summarizeUnreadCounts([])).toEqual({ count: 0, muted: true });
    });
});

describe("listUnreadConversations", () => {
    it("keeps unread, unmuted conversations, the most recent first", () => {
        const list = listUnreadConversations([
            { id: "old", count: 1, muted: false, lastMessageTimestamp: 100 },
            { id: "read", count: 0, muted: false, lastMessageTimestamp: 400 },
            { id: "muted", count: 5, muted: true, lastMessageTimestamp: 300 },
            { id: "recent", count: 2, muted: false, lastMessageTimestamp: 200 },
        ]);
        expect(list.map(({ id }) => id)).toEqual(["recent", "old"]);
    });

    it("puts the conversations that mention me first, muted or not", () => {
        const list = listUnreadConversations([
            { id: "recent", count: 2, muted: false, lastMessageTimestamp: 400 },
            { id: "mention", count: 1, muted: false, lastMessageTimestamp: 100, mention: true },
            { id: "mutedMention", count: 1, muted: true, lastMessageTimestamp: 300, mention: true },
            { id: "muted", count: 5, muted: true, lastMessageTimestamp: 500 },
        ]);
        expect(list.map(({ id }) => id)).toEqual(["mutedMention", "mention", "recent"]);
    });
});

describe("formatLastActivity", () => {
    const now = new Date(2026, 9, 28, 18, 30);

    it("shows the time for today", () => {
        expect(formatLastActivity(new Date(2026, 9, 28, 9, 5).getTime(), now, "fr-FR")).toBe("09:05");
    });

    it("shows the date before today", () => {
        expect(formatLastActivity(new Date(2026, 9, 27, 23, 59).getTime(), now, "en-US")).toBe("Oct 27");
    });
});
