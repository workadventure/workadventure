import { describe, expect, it } from "vitest";
import {
    computePictureInPictureGridLayout,
    pipGridTemplateColumns,
    pipGridTemplateRows,
    pipTileStyle,
} from "./pictureInPictureGridLayout";

describe("pictureInPictureGridLayout", () => {
    describe("orientation rules", () => {
        it("uses portrait mode when height > width", () => {
            const layout = computePictureInPictureGridLayout(2, 100, 200);

            expect(layout.portrait).toBe(true);
            expect(layout.columnTracks).toBe(1);
            expect(layout.rowTracks).toBe(2);
            expect(layout.description).toContain("portrait");
        });

        it("uses landscape mode when width >= height", () => {
            // Below isFullWidth (width > height × 3) so we exercise the ratio-based 2‑video row, not « plein cadre » strip.
            const layout = computePictureInPictureGridLayout(2, 300, 100);

            expect(layout.portrait).toBe(false);
            expect(layout.columnTracks).toBe(2);
            expect(layout.rowTracks).toBe(1);
            expect(layout.description).toContain("paysage");
        });

        it("is landscape when height equals width", () => {
            const layout = computePictureInPictureGridLayout(2, 200, 200);

            expect(layout.portrait).toBe(false);
            expect(layout.columnTracks).toBe(2);
            expect(layout.rowTracks).toBe(1);
        });

        it("uses full-width horizontal strip when width > height × 3", () => {
            const layout = computePictureInPictureGridLayout(5, 800, 100);

            expect(layout.portrait).toBe(false);
            expect(layout.columnTracks).toBe(5);
            expect(layout.rowTracks).toBe(1);
            expect(layout.tiles).toHaveLength(5);
            expect(layout.description).toContain("plein cadre");
        });
    });

    describe("grid formatting helpers", () => {
        it("builds CSS template strings with minimum 1 track", () => {
            expect(pipGridTemplateColumns(0)).toBe("repeat(1, minmax(0, 1fr))");
            expect(pipGridTemplateRows(0)).toBe("repeat(1, minmax(0, 1fr))");
            expect(pipGridTemplateColumns(3)).toBe("repeat(3, minmax(0, 1fr))");
            expect(pipGridTemplateRows(2)).toBe("repeat(2, minmax(0, 1fr))");
        });

        it("builds tile inline style for CSS grid placement", () => {
            expect(
                pipTileStyle({
                    columnStart: 1,
                    columnEnd: 3,
                    rowStart: 2,
                    rowEnd: 4,
                })
            ).toBe("grid-column: 1 / 3; grid-row: 2 / 4;");
        });
    });

    describe("layout snapshots by count", () => {
        it("keeps 5-video portrait mode as 3 top + 2 bottom", () => {
            const layout = computePictureInPictureGridLayout(5, 200, 300);

            expect(layout.portrait).toBe(true);
            expect(layout.columnTracks).toBe(6);
            expect(layout.rowTracks).toBe(2);
            expect(layout.tiles).toHaveLength(5);
            expect(layout.tiles[4]).toEqual({
                columnStart: 4,
                columnEnd: 7,
                rowStart: 2,
                rowEnd: 3,
            });
        });

        it("keeps 5-video landscape mode as 2 left + 3 right", () => {
            // Same: avoid isFullWidth so the 5-tile asymmetric grid is used instead of one horizontal row.
            const layout = computePictureInPictureGridLayout(5, 300, 100);

            expect(layout.portrait).toBe(false);
            expect(layout.columnTracks).toBe(2);
            expect(layout.rowTracks).toBe(3);
            expect(layout.tiles).toHaveLength(5);
            expect(layout.tiles[0]).toEqual({
                columnStart: 1,
                columnEnd: 2,
                rowStart: 1,
                rowEnd: 2,
            });
        });
    });
});
