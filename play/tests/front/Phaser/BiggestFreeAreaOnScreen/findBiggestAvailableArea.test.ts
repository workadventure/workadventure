import { describe, expect, it } from "vitest";
import { findBiggestAvailableArea } from "../../../../src/front/Stores/BiggestAvailableAreaStore";

describe("findBiggestAvailableArea", () => {
    it("should return whole screen when no blockers", () => {
        const gameSize = { width: 100, height: 100 };
        const area = findBiggestAvailableArea(gameSize, []);
        expect(area).toEqual({ xStart: 0, yStart: 0, xEnd: 100, yEnd: 100 });
    });

    it("should handle single blocker in center", () => {
        const blocker = { xStart: 40, yStart: 40, xEnd: 60, yEnd: 60 };
        const gameSize = { width: 100, height: 100 };
        const area = findBiggestAvailableArea(gameSize, [blocker]);
        expect(area).toEqual({ xStart: 0, yStart: 0, xEnd: 100, yEnd: 40 });
    });

    it("should handle multiple blockers", () => {
        const blockers = [
            { xStart: 0, yStart: 0, xEnd: 50, yEnd: 50 },
            { xStart: 50, yStart: 50, xEnd: 100, yEnd: 100 },
        ];

        const gameSize = { width: 100, height: 100 };
        const area = findBiggestAvailableArea(gameSize, blockers);
        //could be depending on the order of the blockers or algo
        //expect(area).toEqual({ xStart: 0, yStart: 50, xEnd: 50, yEnd: 100 });
        expect(area).toEqual({ xStart: 50, yStart: 0, xEnd: 100, yEnd: 50 });
    });

    it("should handle blocker larger than screen", () => {
        const blocker = { xStart: -50, yStart: -50, xEnd: 150, yEnd: 150 };
        const gameSize = { width: 100, height: 100 };
        const area = findBiggestAvailableArea(gameSize, [blocker]);
        expect(area).toEqual({ xStart: 0, yStart: 0, xEnd: 100, yEnd: 100 });
    });

    it("should handle blockers at screen edges", () => {
        const blockers = [
            { xStart: 0, yStart: 0, xEnd: 20, yEnd: 100 },
            { xStart: 80, yStart: 0, xEnd: 100, yEnd: 100 },
        ];

        const gameSize = { width: 100, height: 100 };
        const area = findBiggestAvailableArea(gameSize, blockers);
        expect(area).toEqual({ xStart: 20, yStart: 0, xEnd: 80, yEnd: 100 });
    });
});
