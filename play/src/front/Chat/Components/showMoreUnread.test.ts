import { get, writable } from "svelte/store";
import { describe, expect, it } from "vitest";
import { hiddenUnreadCount, rowUnreadCount } from "./showMoreUnread";

describe("hiddenUnreadCount", () => {
    it("only counts the items after the first maxNumber", () => {
        expect(hiddenUnreadCount([5, 0, 1, 2, 3], 3)).toBe(5);
        expect(hiddenUnreadCount([5, 0, 1, 0, 0], 3)).toBe(0);
    });

    it("is 0 when nothing is hidden", () => {
        expect(hiddenUnreadCount([1, 2], 8)).toBe(0);
        expect(hiddenUnreadCount([], 8)).toBe(0);
    });
});

describe("rowUnreadCount", () => {
    it("follows the count while the room is unread, and is 0 once read", () => {
        const hasUnreadMessages = writable(true);
        const unreadCount = writable(3);
        const count = rowUnreadCount(hasUnreadMessages, unreadCount);

        expect(get(count)).toBe(3);
        unreadCount.set(4);
        expect(get(count)).toBe(4);
        hasUnreadMessages.set(false);
        expect(get(count)).toBe(0);
    });
});
