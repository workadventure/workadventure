import { describe, expect, it } from "vitest";
import {
    findBiggestFreeBox,
    getAllFreeBoxes,
    getBoxArea,
} from "../../../../src/front/Stores/BiggestAvailableAreaStore";
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

        const freeBoxes: Box[] = getAllFreeBoxes(occupiedGrid);

        const biggestFreeBox = findBiggestFreeBox(freeBoxes, verticesX, verticesY);

        expect(biggestFreeBox).toEqual({ xStart: 0, yStart: 4, xEnd: 3, yEnd: 6 });
    });
});

describe("getBoxArea", () => {
    it("Should return the area of the box (1x1)", () => {
        const box: Box = { xStart: 0, yStart: 0, xEnd: 0, yEnd: 0 };
        const verticesX = [0, 1];
        const verticesY = [0, 1];
        expect(getBoxArea(box, verticesX, verticesY)).toBe(1);
    });

    it("Should return the area of the box (8x8)", () => {
        const box: Box = { xStart: 0, yStart: 4, xEnd: 3, yEnd: 6 };
        const verticesX = [0, 50, 150, 200, 400, 600, 650, 700];
        const verticesY = [0, 50, 100, 300, 350, 400, 600, 650];
        expect(getBoxArea(box, verticesX, verticesY)).toBe(120000);
    });
});

describe("getAllFreeBoxes", () => {
    it("Should return empty array when grid is empty", () => {
        const occupiedGrid: boolean[][] = [];
        expect(getAllFreeBoxes(occupiedGrid)).toEqual([]);
    });

    it("Should return empty array when grid has no rows", () => {
        const occupiedGrid: boolean[][] = [[]];
        expect(getAllFreeBoxes(occupiedGrid)).toEqual([]);
    });

    it("Should return empty array when grid has rows but no columns", () => {
        const occupiedGrid: boolean[][] = [[], []];
        expect(getAllFreeBoxes(occupiedGrid)).toEqual([]);
    });

    it("Should return single box when grid has one free cell", () => {
        const occupiedGrid: boolean[][] = [[false]];
        expect(getAllFreeBoxes(occupiedGrid)).toEqual([{ xStart: 0, yStart: 0, xEnd: 0, yEnd: 0 }]);
    });

    it("Should return empty array when grid has one occupied cell", () => {
        const occupiedGrid: boolean[][] = [[true]];
        expect(getAllFreeBoxes(occupiedGrid)).toEqual([]);
    });

    it("Should return all possible free boxes in a 2x2 grid with one occupied cell", () => {
        const occupiedGrid: boolean[][] = [
            [false, false],
            [false, true],
        ];

        const freeBoxes = getAllFreeBoxes(occupiedGrid);

        expect(freeBoxes).toEqual([
            { xStart: 0, yStart: 0, xEnd: 1, yEnd: 0 },
            { xStart: 0, yStart: 0, xEnd: 0, yEnd: 1 },
            { xStart: 1, yStart: 0, xEnd: 1, yEnd: 0 },
            { xStart: 1, yStart: 0, xEnd: 0, yEnd: 1 },
            { xStart: 0, yStart: 1, xEnd: 0, yEnd: 1 },
        ]);
    });

    it("Should return all possible free boxes in a 3x3 grid with multiple occupied cells", () => {
        const occupiedGrid: boolean[][] = [
            [false, false, true],
            [false, true, false],
            [true, false, false],
        ];

        const freeBoxes = getAllFreeBoxes(occupiedGrid);

        expect(freeBoxes).toEqual([
            { xStart: 0, yStart: 0, xEnd: 1, yEnd: 0 },
            { xStart: 0, yStart: 0, xEnd: 0, yEnd: 1 },
            { xStart: 0, yStart: 0, xEnd: -1, yEnd: 2 },
            { xStart: 1, yStart: 0, xEnd: 1, yEnd: 0 },
            { xStart: 1, yStart: 0, xEnd: 0, yEnd: 1 },
            { xStart: 0, yStart: 1, xEnd: 0, yEnd: 1 },
            { xStart: 0, yStart: 1, xEnd: -1, yEnd: 2 },
            { xStart: 2, yStart: 1, xEnd: 2, yEnd: 1 },
            { xStart: 2, yStart: 1, xEnd: 2, yEnd: 2 },
            { xStart: 1, yStart: 2, xEnd: 2, yEnd: 2 },
            { xStart: 2, yStart: 2, xEnd: 2, yEnd: 2 },
        ]);
    });

    it("Should handle grid with all cells free", () => {
        const occupiedGrid: boolean[][] = [
            [false, false],
            [false, false],
        ];

        const freeBoxes = getAllFreeBoxes(occupiedGrid);

        expect(freeBoxes).toEqual([
            { xStart: 0, yStart: 0, xEnd: 1, yEnd: 0 },
            { xStart: 0, yStart: 0, xEnd: 1, yEnd: 1 },
            { xStart: 1, yStart: 0, xEnd: 1, yEnd: 0 },
            { xStart: 1, yStart: 0, xEnd: 1, yEnd: 1 },
            { xStart: 0, yStart: 1, xEnd: 1, yEnd: 1 },
            { xStart: 1, yStart: 1, xEnd: 1, yEnd: 1 },
        ]);
    });

    it("Should handle grid with all cells occupied", () => {
        const occupiedGrid: boolean[][] = [
            [true, true],
            [true, true],
        ];
        expect(getAllFreeBoxes(occupiedGrid)).toEqual([]);
    });

    it("Should find free boxes in complex grid pattern", () => {
        const occupiedGrid: boolean[][] = [
            [false, false, false, true],
            [false, true, false, true],
            [false, false, false, false],
            [true, true, false, false],
        ];

        const freeBoxes = getAllFreeBoxes(occupiedGrid);

        expect(freeBoxes).toEqual([
            { xStart: 0, yStart: 0, xEnd: 2, yEnd: 0 },
            { xStart: 0, yStart: 0, xEnd: 0, yEnd: 1 },
            { xStart: 0, yStart: 0, xEnd: 0, yEnd: 2 },
            { xStart: 0, yStart: 0, xEnd: -1, yEnd: 3 },
            { xStart: 1, yStart: 0, xEnd: 2, yEnd: 0 },
            { xStart: 1, yStart: 0, xEnd: 0, yEnd: 1 },
            { xStart: 2, yStart: 0, xEnd: 2, yEnd: 0 },
            { xStart: 2, yStart: 0, xEnd: 2, yEnd: 1 },
            { xStart: 2, yStart: 0, xEnd: 2, yEnd: 2 },
            { xStart: 2, yStart: 0, xEnd: 2, yEnd: 3 },
            { xStart: 0, yStart: 1, xEnd: 0, yEnd: 1 },
            { xStart: 0, yStart: 1, xEnd: 0, yEnd: 2 },
            { xStart: 0, yStart: 1, xEnd: -1, yEnd: 3 },
            { xStart: 2, yStart: 1, xEnd: 2, yEnd: 1 },
            { xStart: 2, yStart: 1, xEnd: 2, yEnd: 2 },
            { xStart: 2, yStart: 1, xEnd: 2, yEnd: 3 },
            { xStart: 0, yStart: 2, xEnd: 3, yEnd: 2 },
            { xStart: 0, yStart: 2, xEnd: -1, yEnd: 3 },
            { xStart: 1, yStart: 2, xEnd: 3, yEnd: 2 },
            { xStart: 1, yStart: 2, xEnd: 0, yEnd: 3 },
            { xStart: 2, yStart: 2, xEnd: 3, yEnd: 2 },
            { xStart: 2, yStart: 2, xEnd: 3, yEnd: 3 },
            { xStart: 3, yStart: 2, xEnd: 3, yEnd: 2 },
            { xStart: 3, yStart: 2, xEnd: 3, yEnd: 3 },
            { xStart: 2, yStart: 3, xEnd: 3, yEnd: 3 },
            { xStart: 3, yStart: 3, xEnd: 3, yEnd: 3 },
        ]);
    });
});
