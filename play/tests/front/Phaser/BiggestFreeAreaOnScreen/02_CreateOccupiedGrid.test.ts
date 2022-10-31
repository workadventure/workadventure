import { describe, expect, it } from "vitest";
import { getGridCoordinates } from "../../../../src/front/Stores/BiggestAvailableAreaStore";
import type { Box } from "../../../../src/front/WebRtc/LayoutManager";

describe("Biggest Area 2. Create Occupied Grid", () => {
    it("Should be exact as predefined occupied grid", () => {
        const blocker1: Box = { xStart: 50, yStart: 100, xEnd: 150, yEnd: 300 };
        const blocker2: Box = { xStart: 200, yStart: 50, xEnd: 650, yEnd: 350 };
        const blocker3: Box = { xStart: 400, yStart: 400, xEnd: 600, yEnd: 600 };

        const blockers = [blocker1, blocker2, blocker3];

        const verticesX = [0, 50, 150, 200, 400, 600, 650, 700];
        const verticesY = [0, 50, 100, 300, 350, 400, 600, 650];

        const occupiedGrid: boolean[][] = new Array(verticesY.length - 1);
        for (let j = 0; j < verticesY.length - 1; j += 1) {
            occupiedGrid[j] = new Array(verticesX.length - 1).fill(false);
        }

        for (const blocker of blockers) {
            const [left, top] = getGridCoordinates(blocker.xStart, blocker.yStart, verticesX, verticesY);
            const [right, bottom] = getGridCoordinates(blocker.xEnd, blocker.yEnd, verticesX, verticesY);
            for (let j = top; j < bottom; j += 1) {
                for (let i = left; i < right; i += 1) {
                    occupiedGrid[j][i] = true;
                }
            }
        }

        // See ../BiggetsFreeAreaOnScreen/4_classify_rectangles_as_free_or_occupied.png
        const expectedOccupiedGrid = [
            [false, false, false, false, false, false, false],
            [false, false, false, true, true, true, false],
            [false, true, false, true, true, true, false],
            [false, false, false, true, true, true, false],
            [false, false, false, false, false, false, false],
            [false, false, false, false, true, false, false],
            [false, false, false, false, false, false, false],
        ];

        for (let j = 0; j < expectedOccupiedGrid.length; j += 1) {
            for (let i = 0; i < expectedOccupiedGrid[j].length; i += 1) {
                expect(occupiedGrid[j][i]).toBe(expectedOccupiedGrid[j][i]);
            }
        }
    });
});
