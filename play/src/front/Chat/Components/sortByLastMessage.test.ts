import { describe, expect, it } from "vitest";
import { get, writable } from "svelte/store";
import { sortByLastMessage } from "./sortByLastMessage";

describe("sortByLastMessage", () => {
    it("moves a conversation up when a message arrives in it", () => {
        const older = { name: "older", lastMessageTimestamp: 1, lastMessageTimestampStore: writable(1) };
        const newer = { name: "newer", lastMessageTimestamp: 2, lastMessageTimestampStore: writable(2) };
        const sorted = sortByLastMessage([older, newer]);

        expect(get(sorted).map(({ name }) => name)).toEqual(["newer", "older"]);

        older.lastMessageTimestampStore.set(3);
        expect(get(sorted).map(({ name }) => name)).toEqual(["older", "newer"]);
    });

    it("falls back on the bare timestamp for a room without a store", () => {
        const sorted = sortByLastMessage([
            { name: "a", lastMessageTimestamp: 1 },
            { name: "b", lastMessageTimestamp: 5 },
        ]);
        expect(get(sorted).map(({ name }) => name)).toEqual(["b", "a"]);
        expect(get(sortByLastMessage([]))).toEqual([]);
    });
});
