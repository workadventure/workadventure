import { describe, expect, it } from "vitest";
import { createOccupiedGrid } from "../../../../src/front/Stores/BiggestAvailableAreaStore";
import type { Box } from "../../../../src/front/WebRtc/LayoutManager";

describe("Biggest Area 2. Create Occupied Grid", () => {
    it("Should be exact as predefined occupied grid", () => {
        //  Arrange
        const blocker1: Box = { xStart: 50, yStart: 100, xEnd: 150, yEnd: 300 };
        const blocker2: Box = { xStart: 200, yStart: 50, xEnd: 650, yEnd: 350 };
        const blocker3: Box = { xStart: 400, yStart: 400, xEnd: 600, yEnd: 600 };

        const blockers = [blocker1, blocker2, blocker3];

        const verticesX = [0, 50, 150, 200, 400, 600, 650, 700];
        const verticesY = [0, 50, 100, 300, 350, 400, 600, 650];

        const expectedOccupiedGrid = [
            [false, false, false, false, false, false, false],
            [false, false, false, true, true, true, false],
            [false, true, false, true, true, true, false],
            [false, false, false, true, true, true, false],
            [false, false, false, false, false, false, false],
            [false, false, false, false, true, false, false],
            [false, false, false, false, false, false, false],
        ];

        //  Act
        const occupiedGrid = createOccupiedGrid(verticesX, verticesY, blockers);

        //  Assert
        expect(occupiedGrid).toEqual(expectedOccupiedGrid);
    });

    it("Should be exact as predefined occupied grid", () => {
        //  Arrange
        const blockers: Box[] = [];

        const verticesX = [0, 700];
        const verticesY = [0, 650];

        const expectedOccupiedGrid = [[false]];

        //  Act
        const occupiedGrid = createOccupiedGrid(verticesX, verticesY, blockers);

        //  Assert
        expect(occupiedGrid).toEqual(expectedOccupiedGrid);
    });

    it("Should have all grid cells occupied when blocker takes whole screen", () => {
        //this case is not possible in the game because we filter out blockers that take whole screen

        //  Arrange
        const blocker: Box = { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 };
        const blockers = [blocker];

        const verticesX = [0, 700];
        const verticesY = [0, 650];

        const expectedOccupiedGrid = [[true]];

        //  Act
        const occupiedGrid = createOccupiedGrid(verticesX, verticesY, blockers);

        //  Assert
        expect(occupiedGrid).toEqual(expectedOccupiedGrid);
    });
});
