import { describe, expect, it } from "vitest";
import { getNearbyDescriptorsMatrix } from "../src/Model/PositionNotifier";

describe("getNearbyDescriptorsMatrix", () => {
    it("should create a matrix of coordinates in a square around the parameter", () => {
        const matrix = [];
        for (const d of getNearbyDescriptorsMatrix({ i: 1, j: 1 })) {
            matrix.push(d);
        }

        expect(matrix).toEqual([
            { i: 0, j: 0 },
            { i: 1, j: 0 },
            { i: 2, j: 0 },
            { i: 0, j: 1 },
            { i: 1, j: 1 },
            { i: 2, j: 1 },
            { i: 0, j: 2 },
            { i: 1, j: 2 },
            { i: 2, j: 2 },
        ]);
    });

    it("should create a matrix of coordinates in a square around the parameter bis", () => {
        const matrix = [];
        for (const d of getNearbyDescriptorsMatrix({ i: 8, j: 3 })) {
            matrix.push(d);
        }

        expect(matrix).toEqual([
            { i: 7, j: 2 },
            { i: 8, j: 2 },
            { i: 9, j: 2 },
            { i: 7, j: 3 },
            { i: 8, j: 3 },
            { i: 9, j: 3 },
            { i: 7, j: 4 },
            { i: 8, j: 4 },
            { i: 9, j: 4 },
        ]);
    });

    it("should not create a matrix with negative coordinates", () => {
        const matrix = [];
        for (const d of getNearbyDescriptorsMatrix({ i: 0, j: 0 })) {
            matrix.push(d);
        }

        expect(matrix).toEqual([
            { i: 0, j: 0 },
            { i: 1, j: 0 },
            { i: 0, j: 1 },
            { i: 1, j: 1 },
        ]);
    });

    /*it("should not create a matrix with coordinates bigger than its dimmensions", () => {
        const matrix = getNearbyDescriptorsMatrix({i: 4, j: 4}, 5, 5);

        expect(matrix).toEqual([
            {i: 3,j: 3},
            {i: 4,j: 3},
            {i: 3,j: 4},
            {i: 4,j: 4},
        ])
    });*/
});
