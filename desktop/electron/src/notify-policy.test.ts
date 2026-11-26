import { describe, expect, it } from "vitest";
import { createNotificationDeduper } from "./notify-policy";

describe("createNotificationDeduper", () => {
    const message = { title: "General", body: "Alice: hi", tag: "!room:matrix" };

    function deduper() {
        let time = 0;
        const isDuplicate = createNotificationDeduper(2000, () => time);
        return {
            isDuplicate,
            at: (ms: number) => {
                time = ms;
            },
        };
    }

    it("drops the same message from another tab within the window", () => {
        const { isDuplicate, at } = deduper();
        expect(isDuplicate(message)).toBe(false);
        at(500);
        expect(isDuplicate(message)).toBe(true);
    });

    it("shows the same message again once the window is over", () => {
        const { isDuplicate, at } = deduper();
        expect(isDuplicate(message)).toBe(false);
        at(2500);
        expect(isDuplicate(message)).toBe(false);
    });

    it("shows another message from the same room", () => {
        const { isDuplicate } = deduper();
        expect(isDuplicate(message)).toBe(false);
        expect(isDuplicate({ ...message, body: "Alice: still there?" })).toBe(false);
    });

    it("never drops a notification without a tag", () => {
        const { isDuplicate } = deduper();
        const bubble = { title: "Bob", body: "wants to talk" };
        expect(isDuplicate(bubble)).toBe(false);
        expect(isDuplicate(bubble)).toBe(false);
    });
});
