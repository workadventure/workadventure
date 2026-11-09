import { describe, expect, it } from "vitest";
import { computeReadReceipts, getReadState, MAX_OTHERS_FOR_READ_BY_EVERYONE } from "./ReadReceipts";

const ME = "@me:hs";
const events = [
    { id: "$1", sender: ME, timestamp: 100 },
    { id: "$2", sender: ME, timestamp: 200 },
    { id: "$3", sender: "@bob:hs", timestamp: 300 },
    { id: "$4", sender: ME, timestamp: 400 },
];

describe("computeReadReceipts", () => {
    it("counts a reader for every message up to their receipt", () => {
        const receipts = computeReadReceipts(events, [{ userId: "@ann:hs", eventId: "$2", timestamp: 250 }], ME, [
            "@ann:hs",
            "@bob:hs",
        ]);
        expect(receipts.readersOf("$1").map((r) => r.userId)).toContain("@ann:hs");
        expect(receipts.readersOf("$2").map((r) => r.userId)).toContain("@ann:hs");
        expect(receipts.readersOf("$4").map((r) => r.userId)).toEqual([]);
    });

    it("takes writing after a message as reading it, even with an older receipt", () => {
        const receipts = computeReadReceipts(events, [{ userId: "@bob:hs", eventId: "$1", timestamp: 150 }], ME, [
            "@bob:hs",
        ]);
        expect(receipts.readersOf("$2")).toEqual([{ userId: "@bob:hs", readAt: 300 }]);
        expect(getReadState(receipts, "$2")).toBe("read");
        expect(getReadState(receipts, "$4")).toBe("sent");
    });

    it("ignores my own receipts and receipts on events that are not loaded", () => {
        const receipts = computeReadReceipts(
            events,
            [
                { userId: ME, eventId: "$4", timestamp: 400 },
                { userId: "@ann:hs", eventId: "$older", timestamp: 50 },
            ],
            ME,
            ["@ann:hs"],
        );
        expect(receipts.readersOf("$1").map((r) => r.userId)).toEqual(["@bob:hs"]);
    });

    it("lists the most recent reader first", () => {
        const receipts = computeReadReceipts(
            events,
            [
                { userId: "@ann:hs", eventId: "$4", timestamp: 500 },
                { userId: "@cid:hs", eventId: "$4", timestamp: 600 },
            ],
            ME,
            ["@ann:hs", "@cid:hs"],
        );
        expect(receipts.readersOf("$4").map((r) => r.userId)).toEqual(["@cid:hs", "@ann:hs"]);
        expect(getReadState(receipts, "$4")).toBe("read");
    });

    it("never says everyone has read in a big room, or when members are unknown", () => {
        const crowd = Array.from({ length: MAX_OTHERS_FOR_READ_BY_EVERYONE + 1 }, (_, i) => `@u${i}:hs`);
        const all = crowd.map((userId) => ({ userId, eventId: "$4", timestamp: 500 }));
        const big = computeReadReceipts(events, all, ME, crowd);
        expect(big.readersOf("$4")).toHaveLength(crowd.length);
        expect(getReadState(big, "$4")).toBe("sent");
        expect(getReadState(computeReadReceipts(events, all, ME, []), "$4")).toBe("sent");
    });
});
