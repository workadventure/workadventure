import { describe, expect, it } from "vitest";
import {
    getTileLayerStats,
    isWorthRenderingOnGpu,
} from "../../../../src/front/Phaser/Game/GameMap/TilemapGpuLayerEligibility";

/**
 * Builds the raw data of a tile layer of `cellCount` cells, of which the first `filledCellCount`
 * hold `tileId` and the rest are empty.
 */
const createLayerData = (cellCount: number, filledCellCount: number, tileId = 42): number[] =>
    Array.from({ length: cellCount }, (_, index) => (index < filledCellCount ? tileId : 0));

describe("TilemapGpuLayerEligibility", () => {
    describe("getTileLayerStats", () => {
        it("should count the non-empty cells and collect their distinct tile indices", () => {
            const stats = getTileLayerStats([0, 7, 7, 9, 0, 0]);

            expect(stats).toBeDefined();
            expect(stats?.cellCount).toBe(6);
            expect(stats?.filledCellCount).toBe(3);
            expect([...(stats?.tileIndices ?? [])]).toEqual([7, 9]);
        });

        it("should strip the Tiled flip flags from the tile indices", () => {
            const horizontallyFlipped = 0x80000000 | 12;
            const verticallyFlipped = 0x40000000 | 12;

            const stats = getTileLayerStats([horizontallyFlipped, verticallyFlipped]);

            expect([...(stats?.tileIndices ?? [])]).toEqual([12]);
            expect(stats?.filledCellCount).toBe(2);
        });

        it("should return undefined for encoded layer data", () => {
            expect(getTileLayerStats("H4sIAAAAAAAAA2NgGAWjYBSMglEwCkYBAA==")).toBeUndefined();
        });
    });

    describe("isWorthRenderingOnGpu", () => {
        it("should reject a sparse overlay layer covering a whole map", () => {
            // Regression test for https://github.com/workadventure/workadventure/issues/6399: the
            // "dampsoft" map carries ten door layers of four tiles each over a 98x70 map. Rendered on
            // the GPU, each one costs a full-viewport shader pass on every frame.
            const stats = getTileLayerStats(createLayerData(98 * 70, 4));

            expect(stats && isWorthRenderingOnGpu(stats)).toBe(false);
        });

        it("should reject a layer that fills a large but minor part of the map", () => {
            const stats = getTileLayerStats(createLayerData(98 * 70, 1021));

            expect(stats && isWorthRenderingOnGpu(stats)).toBe(false);
        });

        it("should accept a moderately filled layer such as the walls of an office map", () => {
            const stats = getTileLayerStats(createLayerData(98 * 70, Math.round(98 * 70 * 0.42)));

            expect(stats && isWorthRenderingOnGpu(stats)).toBe(true);
        });

        it("should accept a densely filled floor layer", () => {
            const stats = getTileLayerStats(createLayerData(98 * 70, Math.round(98 * 70 * 0.98)));

            expect(stats && isWorthRenderingOnGpu(stats)).toBe(true);
        });

        it("should reject a densely filled layer holding too few tiles to be worth a shader pass", () => {
            const stats = getTileLayerStats(createLayerData(100, 100));

            expect(stats && isWorthRenderingOnGpu(stats)).toBe(false);
        });

        it("should reject an empty layer", () => {
            const stats = getTileLayerStats(createLayerData(98 * 70, 0));

            expect(stats && isWorthRenderingOnGpu(stats)).toBe(false);
        });
    });
});
