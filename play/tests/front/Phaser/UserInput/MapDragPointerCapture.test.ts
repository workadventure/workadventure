import { describe, expect, it, vi } from "vitest";
import { MapDragPointerCapture } from "../../../../src/front/Phaser/UserInput/MapDragPointerCapture";

function setup() {
    const canvas = document.createElement("canvas");
    const captured = new Set<number>();
    canvas.setPointerCapture = vi.fn((id) => captured.add(id));
    canvas.hasPointerCapture = (id) => captured.has(id);
    canvas.releasePointerCapture = vi.fn((id) => captured.delete(id));
    const allowed = vi.fn(() => true);
    const cancel = vi.fn();
    const capture = new MapDragPointerCapture(canvas, allowed, cancel);
    cancel.mockImplementation(() => capture.release());
    const dispatch = (name: string, overrides: Record<string, unknown> = {}) => {
        const event = new Event(name);
        Object.assign(event, { pointerId: 7, pointerType: "mouse", button: 0, buttons: 1 }, overrides);
        canvas.dispatchEvent(event);
    };
    return { canvas, capture, allowed, cancel, dispatch, captured };
}

describe("map drag pointer capture", () => {
    it("captures a canvas mouse gesture until Phaser releases it, then cleans up", () => {
        const { capture, dispatch, captured } = setup();
        dispatch("pointerdown");
        expect(captured.has(7)).toBe(true);
        expect(capture.active).toBe(true);
        capture.release();
        expect(captured.size).toBe(0);
        expect(capture.active).toBe(false);
        capture.destroy();
        dispatch("pointerdown");
        expect(captured.size).toBe(0);
    });

    it("preserves normal release momentum but cancels an interrupted capture", () => {
        const { capture, dispatch, cancel } = setup();
        dispatch("pointerdown");
        dispatch("lostpointercapture", { buttons: 0 });
        expect(cancel).not.toHaveBeenCalled();
        expect(capture.active).toBe(true);
        dispatch("lostpointercapture", { buttons: 1 });
        expect(cancel).toHaveBeenCalledOnce();
        expect(capture.active).toBe(false);
        capture.destroy();
    });

    it("ignores touch, right clicks, disabled controls, and unrelated pointer cancellation", () => {
        const { capture, dispatch, allowed, cancel, captured } = setup();
        dispatch("pointerdown", { pointerType: "touch" });
        dispatch("pointerdown", { button: 2 });
        allowed.mockReturnValue(false);
        dispatch("pointerdown");
        expect(captured.size).toBe(0);
        allowed.mockReturnValue(true);
        dispatch("pointerdown");
        dispatch("pointercancel", { pointerId: 8 });
        expect(cancel).not.toHaveBeenCalled();
        dispatch("pointercancel");
        expect(cancel).toHaveBeenCalledOnce();
        expect(captured.size).toBe(0);
        capture.destroy();
    });
});
