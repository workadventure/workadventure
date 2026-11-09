import { describe, expect, it, vi } from "vitest";
import { MapPanShortcut } from "../../../../src/front/Phaser/UserInput/MapPanShortcut";

function setup() {
    const canvas = document.createElement("canvas");
    canvas.style.cursor = "crosshair";
    const captured = new Set<number>();
    canvas.setPointerCapture = vi.fn((id) => captured.add(id));
    canvas.hasPointerCapture = (id) => captured.has(id);
    canvas.releasePointerCapture = vi.fn((id) => captured.delete(id));
    const canStart = vi.fn((event: PointerEvent) => event.button === 1);
    const start = vi.fn();
    const pan = vi.fn();
    const shortcut = new MapPanShortcut(canvas, { canStart, start, pan });
    // A later canvas listener, like the overlay capture: it must not see a press the shortcut takes.
    const otherListener = vi.fn();
    canvas.addEventListener("pointerdown", otherListener);
    const dispatch = (name: string, overrides: Record<string, unknown> = {}) => {
        const event = new Event(name, { cancelable: true });
        Object.assign(event, { pointerId: 7, pointerType: "mouse", button: 1, clientX: 100, clientY: 100 }, overrides);
        canvas.dispatchEvent(event);
        return event;
    };
    const removeOtherListener = () => canvas.removeEventListener("pointerdown", otherListener);
    return { canvas, shortcut, canStart, start, pan, otherListener, removeOtherListener, dispatch, captured };
}

describe("map pan shortcut", () => {
    it("takes a middle-button drag away from Phaser and pans by the pointer movement", () => {
        const { canvas, shortcut, start, pan, otherListener, removeOtherListener, dispatch, captured } = setup();
        const down = dispatch("pointerdown");
        // Cancelling pointerdown is what stops the browser from sending Phaser the matching mouse events.
        expect(down.defaultPrevented).toBe(true);
        expect(otherListener).not.toHaveBeenCalled();
        expect(captured.has(7)).toBe(true);
        expect(canvas.style.cursor).toBe("grabbing");
        expect(start).not.toHaveBeenCalled();

        dispatch("pointermove", { clientX: 90, clientY: 105 });
        dispatch("pointermove", { clientX: 80, clientY: 105 });
        dispatch("pointermove", { pointerId: 8, clientX: 0, clientY: 0 });
        expect(start).toHaveBeenCalledOnce();
        expect(pan.mock.calls).toEqual([
            [10, -5],
            [10, 0],
        ]);

        dispatch("pointerup", { clientX: 80, clientY: 105 });
        expect(captured.size).toBe(0);
        expect(canvas.style.cursor).toBe("crosshair");
        dispatch("pointermove", { clientX: 0, clientY: 0 });
        expect(pan).toHaveBeenCalledTimes(2);
        shortcut.destroy();
        removeOtherListener();
    });

    it("leaves other presses to Phaser, and a press without movement does nothing", () => {
        const { shortcut, canStart, start, otherListener, removeOtherListener, dispatch, captured } = setup();
        expect(dispatch("pointerdown", { button: 0 }).defaultPrevented).toBe(false);
        expect(dispatch("pointerdown", { pointerType: "touch" }).defaultPrevented).toBe(false);
        expect(otherListener).toHaveBeenCalledTimes(2);
        expect(captured.size).toBe(0);

        dispatch("pointerdown");
        dispatch("pointerup");
        expect(start).not.toHaveBeenCalled();

        canStart.mockReturnValue(false);
        expect(dispatch("pointerdown").defaultPrevented).toBe(false);
        shortcut.destroy();
        canStart.mockReturnValue(true);
        expect(dispatch("pointerdown").defaultPrevented).toBe(false);
        removeOtherListener();
    });
});
