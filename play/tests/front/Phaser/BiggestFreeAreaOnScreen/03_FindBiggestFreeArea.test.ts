import { describe, expect, it } from "vitest";
import { findAllFreeBoxes, getBoxArea } from "../../../../src/front/Stores/BiggestAvailableAreaStore";
import type { Box } from "../../../../src/front/WebRtc/LayoutManager";

describe("Biggest Area 3. Find Biggest Free Area", () => {
    it("Should find correct Box of down-left area", () => {
        const verticesX = [0, 50, 150, 200, 400, 600, 650, 700];
        const verticesY = [0, 50, 100, 300, 350, 400, 600, 650];

        const occupiedGrid = [
            [false, false, false, false, false, false, false],
            [false, false, false, true, true, true, false],
            [false, true, false, true, true, true, false],
            [false, false, false, true, true, true, false],
            [false, false, false, false, false, false, false],
            [false, false, false, false, true, false, false],
            [false, false, false, false, false, false, false],
        ];

        const freeBoxes: Box[] = [];
        for (let x = 0; x < occupiedGrid.length - 1; x += 1) {
            for (let y = 0; y < occupiedGrid[x].length - 1; y += 1) {
                freeBoxes.push(...findAllFreeBoxes(x, y, occupiedGrid));
            }
        }

        const biggestFreeArea = freeBoxes
            .map((box) => ({ box, area: getBoxArea(box, verticesX, verticesY) }))
            .sort((a, b) => b.area - a.area)[0];

        expect(biggestFreeArea.box).toEqual({ xStart: 0, yStart: 4, xEnd: 3, yEnd: 6 });
        expect(biggestFreeArea.area).toBe(120000);
    });
});
