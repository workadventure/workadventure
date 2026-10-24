import { afterEach, describe, expect, it, vi } from "vitest";
import { BubbleNotification } from "../../../src/front/Notification/BubbleNotification";
import { TIME_NOTIFYING_MILLISECOND } from "../../../src/front/Notification/Notification";

// A desktop app of contract 1 (the app of master) only has notify(text): giving it an object made its
// main process throw. notifyMessage, when present, takes the rich notification.
describe("notifications in the desktop app", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    async function notify() {
        vi.useFakeTimers();
        await new BubbleNotification("Alice wants to talk").sendNotification();
        // Let the next notification through.
        vi.advanceTimersByTime(TIME_NOTIFYING_MILLISECOND);
    }

    it("sends text to a desktop app of contract 1", async () => {
        const wad = { desktop: true, notify: vi.fn() };
        vi.stubGlobal("WAD", wad);
        await notify();
        expect(wad.notify).toHaveBeenCalledWith("Alice wants to talk");
    });

    it("sends the rich notification to an app that has notifyMessage", async () => {
        const wad = { desktop: true, notify: vi.fn(), notifyMessage: vi.fn() };
        vi.stubGlobal("WAD", wad);
        await notify();
        expect(wad.notifyMessage).toHaveBeenCalledWith({ title: "Alice wants to talk", body: "" });
        expect(wad.notify).not.toHaveBeenCalled();
    });
});
