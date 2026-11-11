import { describe, expect, it } from "vitest";
import type { ScreenAnnotationElement } from "@workadventure/messages";
import { drawElement } from "./annotationRender";

/** Draws a pointer at `x` (normalized) on a 1000x600 canvas and returns where its label text starts, and its color. */
function drawPointer(x: number, label?: string, color = "#ff3b30"): { x?: number; color?: unknown } {
    let origin = 0;
    const text: { x?: number; color?: unknown } = {};
    const ctx = {
        fillStyle: "" as unknown,
        canvas: { width: 1000, height: 600 },
        save() {},
        restore() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        closePath() {},
        fill() {},
        stroke() {},
        roundRect() {},
        translate(dx: number) {
            origin = dx;
        },
        measureText: (text: string) => ({ width: text.length * 10 }),
        fillText(_text: string, dx: number) {
            text.x = origin + dx;
            text.color = ctx.fillStyle;
        },
    };
    const pointer: ScreenAnnotationElement = {
        id: "p",
        authorUserId: "bob",
        tool: "pointer",
        color,
        width: 0.005,
        points: [{ x, y: 0.5 }],
    };
    drawElement(ctx as unknown as CanvasRenderingContext2D, pointer, label);
    return text;
}

describe("drawElement", () => {
    it("shows who points to the right of the pointer, or to its left near the right edge", () => {
        expect(drawPointer(0.5).x).toBeUndefined();
        expect(drawPointer(0.5, "Bob").x).toBeGreaterThan(500);
        expect(drawPointer(0.99, "Bob").x).toBeLessThan(990);
    });

    it("writes the name in black or white, whichever reads better on the pointer's color", () => {
        expect(drawPointer(0.5, "Bob", "#ff3b30").color).toBe("#ffffff");
        expect(drawPointer(0.5, "Bob", "#ffcc00").color).toBe("#000000");
        expect(drawPointer(0.5, "Bob", "not-a-hex").color).toBe("#ffffff");
    });
});
