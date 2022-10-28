import { describe, expect, it } from "vitest";
import type { Box } from "../../../../src/front/WebRtc/LayoutManager";

describe("Biggest Area 1. Create Vertices", () => {
    it("Should generate proper vertices arrays", () => {
        const canvas: Box = { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 };

        const blocker1: Box = { xStart: 50, yStart: 100, xEnd: 150, yEnd: 300 };
        const blocker2: Box = { xStart: 200, yStart: 50, xEnd: 650, yEnd: 350 };
        const blocker3: Box = { xStart: 400, yStart: 400, xEnd: 600, yEnd: 600 };

        const blockers = [blocker1, blocker2, blocker3];

        const verticesX: number[] = [];
        const verticesY: number[] = [];

        for (const box of [canvas, ...blockers]) {
            verticesX.push(box.xStart, box.xEnd);
            verticesY.push(box.yStart, box.yEnd);
        }

        verticesX.sort((a, b) => a - b);
        verticesY.sort((a, b) => a - b);

        const expectedVerticesX = [0, 50, 150, 200, 400, 600, 650, 700];
        const expectedVerticesY = [0, 50, 100, 300, 350, 400, 600, 650];

        expect(verticesX.length).toBe(expectedVerticesX.length);
        expect(verticesY.length).toBe(expectedVerticesY.length);

        for (let i = 0; i < expectedVerticesX.length; i += 1) {
            expect(verticesX[i]).toBe(expectedVerticesX[i]);
        }
        for (let i = 0; i < expectedVerticesY.length; i += 1) {
            expect(verticesY[i]).toBe(expectedVerticesY[i]);
        }
    });
});
