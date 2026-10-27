import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LONG_PRESS_DELAY_MS, LongPressGesture } from "./longPress";

describe("LongPressGesture", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it("fires once the finger has rested long enough", () => {
        const onLongPress = vi.fn(() => true);
        const gesture = new LongPressGesture(onLongPress);
        gesture.start(100, 100);
        vi.advanceTimersByTime(LONG_PRESS_DELAY_MS - 1);
        expect(onLongPress).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(onLongPress).toHaveBeenCalledTimes(1);
        expect(gesture.consumeFired()).toBe(true);
        // Consumed: the click after it is swallowed, not the next one.
        expect(gesture.consumeFired()).toBe(false);
    });

    it("does not fire when the finger lifts early", () => {
        const onLongPress = vi.fn(() => true);
        const gesture = new LongPressGesture(onLongPress);
        gesture.start(100, 100);
        vi.advanceTimersByTime(200);
        gesture.cancel();
        vi.advanceTimersByTime(LONG_PRESS_DELAY_MS);
        expect(onLongPress).not.toHaveBeenCalled();
        expect(gesture.consumeFired()).toBe(false);
    });

    it("does not fire during a scroll, but tolerates a slight wobble", () => {
        const onLongPress = vi.fn(() => true);
        const gesture = new LongPressGesture(onLongPress);
        gesture.start(100, 100);
        gesture.move(104, 105);
        expect(gesture.isPressing).toBe(true);
        gesture.move(100, 130);
        expect(gesture.isPressing).toBe(false);
        vi.advanceTimersByTime(LONG_PRESS_DELAY_MS);
        expect(onLongPress).not.toHaveBeenCalled();
    });

    it("fires right away when the browser announces the long press first", () => {
        const onLongPress = vi.fn(() => true);
        const gesture = new LongPressGesture(onLongPress);
        gesture.start(0, 0);
        gesture.fire();
        vi.advanceTimersByTime(LONG_PRESS_DELAY_MS);
        expect(onLongPress).toHaveBeenCalledTimes(1);
    });

    it("leaves the touch alone when the handler had nothing to do", () => {
        const gesture = new LongPressGesture(() => false);
        gesture.start(0, 0);
        vi.advanceTimersByTime(LONG_PRESS_DELAY_MS);
        expect(gesture.hasFired).toBe(false);
        expect(gesture.consumeFired()).toBe(false);
    });

    it("forgets a previous long press when a new press starts", () => {
        const gesture = new LongPressGesture(() => true);
        gesture.start(0, 0);
        vi.advanceTimersByTime(LONG_PRESS_DELAY_MS);
        gesture.start(0, 0);
        expect(gesture.hasFired).toBe(false);
    });
});
