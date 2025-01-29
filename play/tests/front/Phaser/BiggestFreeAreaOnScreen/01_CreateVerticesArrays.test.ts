import { describe, expect, it } from "vitest";
import type { Box } from "../../../../src/front/WebRtc/LayoutManager";
import {
    clampAllBoxesToScreen,
    clampBoxToScreen,
    createVerticesArrays,
    isBoxTakingWholeScreen,
} from "../../../../src/front/Stores/BiggestAvailableAreaStore";

describe("Biggest Area 1. Create Vertices Arrays", () => {
    it("Should generate proper vertices arrays", () => {
        //  arrange
        const canvas: Box = { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 };

        const blocker1: Box = { xStart: 50, yStart: 100, xEnd: 150, yEnd: 300 };
        const blocker2: Box = { xStart: 200, yStart: 50, xEnd: 650, yEnd: 350 };
        const blocker3: Box = { xStart: 400, yStart: 400, xEnd: 600, yEnd: 600 };

        const blockers = [blocker1, blocker2, blocker3];

        const expectedVerticesX = [0, 50, 150, 200, 400, 600, 650, 700];
        const expectedVerticesY = [0, 50, 100, 300, 350, 400, 600, 650];

        // act
        const [verticesX, verticesY] = createVerticesArrays(canvas, blockers);

        // assert
        expect(verticesX).toEqual(expectedVerticesX);
        expect(verticesY).toEqual(expectedVerticesY);
    });

    it("should not include blockers who is not in the canvas", () => {
        //  arrange
        const canvas: Box = { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 };

        const blocker1: Box = { xStart: 50, yStart: 100, xEnd: 150, yEnd: 300 };
        const blocker2: Box = { xStart: 200, yStart: 50, xEnd: 650, yEnd: 350 };
        const blocker3: Box = { xStart: 400, yStart: 400, xEnd: 600, yEnd: 600 };
        const blockerTotallyOutside: Box = { xStart: 1000, yStart: 1200, xEnd: 1200, yEnd: 1400 };

        const blockers = [blocker1, blocker2, blocker3, blockerTotallyOutside];

        const expectedVerticesX = [0, 50, 150, 200, 400, 600, 650, 700];
        const expectedVerticesY = [0, 50, 100, 300, 350, 400, 600, 650];

        const clampedBlockers = clampAllBoxesToScreen(blockers, canvas);
        // act
        const [verticesX, verticesY] = createVerticesArrays(canvas, clampedBlockers);

        // assert
        expect(verticesX).toEqual(expectedVerticesX);
        expect(verticesY).toEqual(expectedVerticesY);
    });

    it("should include blockers who is partially outside of the canvas , take only the part that is in the canvas", () => {
        //  arrange
        const canvas: Box = { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 };

        const blocker1: Box = { xStart: 50, yStart: 100, xEnd: 150, yEnd: 300 };
        const blocker2: Box = { xStart: 200, yStart: 50, xEnd: 650, yEnd: 350 };
        const blocker3: Box = { xStart: 400, yStart: 400, xEnd: 600, yEnd: 600 };
        const blockerPartiallyOutside: Box = { xStart: 500, yStart: 500, xEnd: 1200, yEnd: 1400 };

        const blockers = [blocker1, blocker2, blocker3, blockerPartiallyOutside];

        const expectedVerticesX = [0, 50, 150, 200, 400, 500, 600, 650, 700];
        const expectedVerticesY = [0, 50, 100, 300, 350, 400, 500, 600, 650];

        const clampedBlockers = clampAllBoxesToScreen(blockers, canvas);
        // act
        const [verticesX, verticesY] = createVerticesArrays(canvas, clampedBlockers);

        // assert
        expect(verticesX).toEqual(expectedVerticesX);
        expect(verticesY).toEqual(expectedVerticesY);
    });

    it("should not include blockers who take the whole screen", () => {
        //  arrange
        const canvas: Box = { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 };

        const blocker1: Box = { xStart: 50, yStart: 100, xEnd: 150, yEnd: 300 };
        const blocker2: Box = { xStart: 200, yStart: 50, xEnd: 650, yEnd: 350 };
        const blocker3: Box = { xStart: 400, yStart: 400, xEnd: 600, yEnd: 600 };
        const blockerTakeWholeScreen: Box = { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 };

        const blockers = [blocker1, blocker2, blocker3, blockerTakeWholeScreen];

        const expectedVerticesX = [0, 50, 150, 200, 400, 600, 650, 700];
        const expectedVerticesY = [0, 50, 100, 300, 350, 400, 600, 650];

        const clampedBlockers = clampAllBoxesToScreen(blockers, canvas);
        // act
        const [verticesX, verticesY] = createVerticesArrays(canvas, clampedBlockers);

        // assert
        expect(verticesX).toEqual(expectedVerticesX);
        expect(verticesY).toEqual(expectedVerticesY);
    });
});

describe("clampBoxToScreen", () => {
    it.each([
        {
            title: "Box entirely inside screen bounds",
            box: { xStart: 100, yStart: 100, xEnd: 650, yEnd: 600 },
            screen: { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 },
            expectedBox: { xStart: 100, yStart: 100, xEnd: 650, yEnd: 600 },
        },
        {
            title: "Box entirely outside screen bounds",
            box: { xStart: -100, yStart: -100, xEnd: -50, yEnd: -50 },
            screen: { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 },
            expectedBox: { xStart: 0, yStart: 0, xEnd: 0, yEnd: 0 },
        },
        {
            title: "Box partially outside left and top",
            box: { xStart: -100, yStart: -100, xEnd: 300, yEnd: 300 },
            screen: { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 },
            expectedBox: { xStart: 0, yStart: 0, xEnd: 300, yEnd: 300 },
        },
        {
            title: "Box partially outside right and bottom",
            box: { xStart: 500, yStart: 500, xEnd: 800, yEnd: 800 },
            screen: { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 },
            expectedBox: { xStart: 500, yStart: 500, xEnd: 700, yEnd: 650 },
        },
        {
            title: "Box larger than screen on all sides",
            box: { xStart: -100, yStart: -100, xEnd: 800, yEnd: 800 },
            screen: { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 },
            expectedBox: { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 },
        },
        {
            title: "Box exactly matching screen bounds",
            box: { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 },
            screen: { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 },
            expectedBox: { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 },
        },
        {
            title: "Box with zero width/height",
            box: { xStart: 100, yStart: 100, xEnd: 100, yEnd: 100 },
            screen: { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 },
            expectedBox: { xStart: 100, yStart: 100, xEnd: 100, yEnd: 100 },
        },
    ])("$title", ({ box, screen, expectedBox }) => {
        const clampedBox = clampBoxToScreen(box, screen);
        expect(clampedBox).toEqual(expectedBox);
    });
});

describe("isBoxTakingWholeScreen", () => {
    it.each([
        {
            title: "Box exactly matching screen bounds",
            box: { xStart: 0, yStart: 0, xEnd: 700, yEnd: 650 },
            expected: true,
        },
        {
            title: "Box larger than screen on all sides",
            box: { xStart: -100, yStart: -100, xEnd: 800, yEnd: 800 },
            expected: true,
        },
        {
            title: "Box smaller than screen",
            box: { xStart: 100, yStart: 100, xEnd: 200, yEnd: 200 },
            expected: false,
        },
        {
            title: "Box partially outside left side",
            box: { xStart: -100, yStart: 0, xEnd: 200, yEnd: 650 },
            expected: false,
        },
        {
            title: "Box partially outside right side",
            box: { xStart: 500, yStart: 0, xEnd: 800, yEnd: 650 },
            expected: false,
        },
        {
            title: "Box partially outside top",
            box: { xStart: 0, yStart: -100, xEnd: 700, yEnd: 200 },
            expected: false,
        },
        {
            title: "Box partially outside bottom",
            box: { xStart: 0, yStart: 500, xEnd: 700, yEnd: 800 },
            expected: false,
        },
        {
            title: "Box with zero dimensions",
            box: { xStart: 100, yStart: 100, xEnd: 100, yEnd: 100 },
            expected: false,
        },
        {
            title: "Box entirely outside screen",
            box: { xStart: -200, yStart: -200, xEnd: -100, yEnd: -100 },
            expected: false,
        },
    ])("$title", ({ box, expected }) => {
        const gameSize = { width: 700, height: 650 };
        const result = isBoxTakingWholeScreen(box, gameSize);

        expect(result).toBe(expected);
    });
});
