import { describe, expect, it } from "vitest";
import type { ScreenAnnotationElement } from "@workadventure/messages";
import { drawElement } from "./annotationRender";

/** Draws a pointer at `x` (normalized) on a 1000x600 canvas and returns where its label text starts. */
function labelX(x: number, label?: string): number | undefined {
    let origin = 0;
    let textX: number | undefined;
    const ctx = {
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
            textX = origin + dx;
        },
    } as unknown as CanvasRenderingContext2D;
    const pointer: ScreenAnnotationElement = {
        id: "p",
        authorUserId: "bob",
        tool: "pointer",
        color: "#ff3b30",
        width: 0.005,
        points: [{ x, y: 0.5 }],
    };
    drawElement(ctx, pointer, label);
    return textX;
}

describe("drawElement", () => {
    it("shows who points to the right of the pointer, or to its left near the right edge", () => {
        expect(labelX(0.5)).toBeUndefined();
        expect(labelX(0.5, "Bob")).toBeGreaterThan(500);
        expect(labelX(0.99, "Bob")).toBeLessThan(990);
    });
});
