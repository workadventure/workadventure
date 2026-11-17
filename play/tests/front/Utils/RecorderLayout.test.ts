import { describe, expect, it } from "vitest";
import { computeRecorderLayout, parseRecorderLayoutMode, pinnedFirst } from "../../../src/front/Utils/RecorderLayout";

const W = 1280;
const H = 720;

describe("computeRecorderLayout", () => {
    it("gives the whole screen to the map without cameras", () => {
        for (const mode of ["map", "balanced", "cameras"] as const) {
            expect(computeRecorderLayout(mode, 0, W, H).map).toEqual({ left: 0, top: 0, width: W, height: H });
        }
    });

    it("leaves one row of 4 cameras over the whole-screen map in the map mode, and no more", () => {
        const layout = computeRecorderLayout("map", 16, W, H);
        expect(layout.tiles).toHaveLength(4);
        expect(new Set(layout.tiles.map((tile) => tile.rowStart))).toEqual(new Set([1]));
        expect(layout.map).toEqual({ left: 0, top: 0, width: W, height: H });
        expect(layout.grid.top + layout.grid.height).toBeLessThan(H / 3);
    });

    it("goes from a 2×2 grid to two rows of 4 in the balanced mode", () => {
        const four = computeRecorderLayout("balanced", 4, W, H);
        expect([four.grid.columns, four.grid.rows]).toEqual([2, 2]);
        const sixteen = computeRecorderLayout("balanced", 16, W, H);
        expect(sixteen.tiles).toHaveLength(8);
        expect([sixteen.grid.columns, sixteen.grid.rows]).toEqual([4, 2]);
        expect(sixteen.map.height).toBeGreaterThan(four.map.height);
        expect(sixteen.grid.width).toBeLessThanOrEqual(W);
    });

    it("makes the map a 2×2 cell of the mosaic in the cameras mode, never under a tile", () => {
        for (const count of [1, 4, 16, 30]) {
            const layout = computeRecorderLayout("cameras", count, W, H);
            expect(layout.tiles).toHaveLength(Math.min(count, 16));
            expect(layout.tiles.every((tile) => tile.columnStart > 2 || tile.rowStart > 2)).toBe(true);
            expect(layout.grid.left + layout.grid.width).toBeLessThanOrEqual(W + 0.01);
            expect(layout.grid.top + layout.grid.height).toBeLessThanOrEqual(H + 0.01);
            expect(layout.tiles.every((tile) => tile.columnEnd <= layout.grid.columns + 1)).toBe(true);
            expect(layout.tiles.every((tile) => tile.rowEnd <= layout.grid.rows + 1)).toBe(true);
        }
        expect(computeRecorderLayout("cameras", 16, W, H).grid).toMatchObject({ columns: 5, rows: 4 });
    });

    it("fills the whole video in the cameras mode, without empty bands", () => {
        for (const count of [1, 2, 5, 16]) {
            const { grid } = computeRecorderLayout("cameras", count, W, H);
            expect(grid.left).toBe(8);
            expect(grid.top).toBe(8);
            expect(grid.width).toBe(W - 16);
            expect(grid.height).toBe(H - 16);
        }
    });

    it("falls back to the balanced mode on an unknown value", () => {
        expect(parseRecorderLayoutMode("cameras")).toBe("cameras");
        expect(parseRecorderLayoutMode("whatever")).toBe("balanced");
        expect(parseRecorderLayoutMode(null)).toBe("balanced");
    });

    it("puts the pinned people first, keeping the speaking order otherwise", () => {
        const ids = (items: string[]) => pinnedFirst(items, ["d", "b"], (id) => id);
        expect(ids(["a", "b", "c", "d", "e"])).toEqual(["b", "d", "a", "c", "e"]);
        expect(pinnedFirst(["a", "c"], ["x"], (id) => id)).toEqual(["a", "c"]);
    });
});
