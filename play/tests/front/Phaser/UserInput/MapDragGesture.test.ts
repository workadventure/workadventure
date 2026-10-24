import { describe, expect, it } from "vitest";
import { MapDragGesture } from "../../../../src/front/Phaser/UserInput/MapDragGesture";

describe("MapDragGesture", () => {
    it("reads Phaser-style coordinates exposed through prototype getters", () => {
        class Pointer {
            public id = 0;
            public position = { x: 100, y: 100 };
            public get x() {
                return this.position.x;
            }
            public get y() {
                return this.position.y;
            }
        }
        const gesture = new MapDragGesture();
        const pointer = new Pointer();
        gesture.begin(pointer);
        pointer.position.x = 120;
        expect(gesture.move(pointer)).toEqual({ x: -20, y: 0 });
        pointer.position.x = 140;
        expect(gesture.move(pointer)).toEqual({ x: -20, y: 0 });
    });

    it("preserves clicks despite small pointer movement", () => {
        const gesture = new MapDragGesture();
        gesture.begin({ id: 0, x: 100, y: 100 });
        expect(gesture.move({ id: 0, x: 103, y: 102 })).toBeUndefined();
        expect(gesture.end(0)).toBe(false);
    });

    it("pans opposite the pointer and consumes release even when returning to the origin", () => {
        const gesture = new MapDragGesture();
        gesture.begin({ id: 0, x: 100, y: 100 });
        expect(gesture.move({ id: 0, x: 120, y: 110 })).toEqual({ x: -20, y: -10 });
        expect(gesture.move({ id: 0, x: 100, y: 100 })).toEqual({ x: 20, y: 10 });
        expect(gesture.end(0)).toBe(true);
        expect(gesture.move({ id: 0, x: 150, y: 100 })).toBeUndefined();
    });

    it("ignores unrelated pointers without ending the active drag", () => {
        const gesture = new MapDragGesture();
        gesture.begin({ id: 0, x: 100, y: 100 });
        expect(gesture.move({ id: 1, x: 140, y: 100 })).toBeUndefined();
        expect(gesture.end(1)).toBe(false);
        expect(gesture.move({ id: 0, x: 120, y: 100 })).toEqual({ x: -20, y: 0 });
        expect(gesture.end(0)).toBe(true);
    });

    it("cancels on leaving the canvas or losing focus and suppresses the pending click", () => {
        const gesture = new MapDragGesture();
        gesture.begin({ id: 0, x: 100, y: 100 });
        gesture.move({ id: 0, x: 120, y: 100 });
        gesture.cancel();
        expect(gesture.move({ id: 0, x: 150, y: 100 })).toBeUndefined();
        expect(gesture.end(0)).toBe(true);
        gesture.begin({ id: 0, x: 150, y: 100 });
        expect(gesture.end(0)).toBe(false);
    });

    it("does not activate an object when controls are disabled during a pending click", () => {
        const gesture = new MapDragGesture();
        gesture.begin({ id: 0, x: 100, y: 100 });
        gesture.cancel();
        gesture.cancel();
        expect(gesture.end(0)).toBe(true);
        expect(gesture.end(0)).toBe(false);
    });
});
