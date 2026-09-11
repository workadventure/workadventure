import { describe, expect, it, vi } from "vitest";
import type { GameMap } from "@workadventure/map-editor";
import type { ITiledMapObject } from "@workadventure/tiled-map-type-guard";

import {
    buildDynamicAreas,
    randomPositionFromLayer,
} from "../../../../../src/front/Phaser/Game/GameMap/GameMapLookups";

function gameMapWith(tiledObjects: Partial<ITiledMapObject>[]): GameMap {
    return { tiledObjects } as unknown as GameMap;
}

function area(overrides: Partial<ITiledMapObject>): Partial<ITiledMapObject> {
    return { class: "area", x: 0, y: 0, width: 32, height: 32, ...overrides };
}

describe("buildDynamicAreas", () => {
    it("keeps Tiled zone and area objects, and nothing else", () => {
        const areas = buildDynamicAreas(
            gameMapWith([
                area({ name: "meeting" }),
                // "zone" is the legacy spelling and must keep working.
                area({ name: "legacy", class: "zone" }),
                area({ name: "not-an-area", class: "chair" }),
            ]),
        );

        expect([...areas.keys()]).toEqual(["meeting", "legacy"]);
    });

    it("names the unnamed ones so they stay addressable", () => {
        const areas = buildDynamicAreas(gameMapWith([area({ name: "" }), area({ name: "" })]));

        expect([...areas.keys()]).toEqual(["unnamed_tiled_area_0", "unnamed_tiled_area_1"]);
    });

    it("renames a duplicate instead of dropping the first one", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        const areas = buildDynamicAreas(gameMapWith([area({ name: "twice" }), area({ name: "twice" })]));

        expect([...areas.keys()]).toEqual(["twice", "unnamed_tiled_area_0"]);
        warn.mockRestore();
    });

    it("skips an object that is not square", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        const areas = buildDynamicAreas(gameMapWith([area({ name: "flat", width: undefined })]));

        expect(areas.size).toBe(0);
        warn.mockRestore();
    });

    it("flattens Tiled properties into a plain object", () => {
        const areas = buildDynamicAreas(
            gameMapWith([area({ name: "focus", properties: [{ name: "start", type: "bool", value: true }] })]),
        );

        expect(areas.get("focus")?.properties).toEqual({ start: true });
    });
});

describe("randomPositionFromLayer", () => {
    function gameMapWithLayer(data: number[], width: number): GameMap {
        return {
            findLayer: () => ({ name: "start", data, width }),
        } as unknown as GameMap;
    }

    it("only ever returns a non-empty tile", () => {
        // Tile 0 means "no tile": picking one would drop the player outside the start area.
        const position = randomPositionFromLayer(gameMapWithLayer([0, 0, 0, 7], 2), "start");

        expect(position).toEqual({ x: 1, y: 1 });
    });

    it("refuses an empty layer rather than returning a wrong position", () => {
        expect(() => randomPositionFromLayer(gameMapWithLayer([0, 0], 2), "start")).toThrow(/is empty/);
    });

    it("refuses a missing layer", () => {
        expect(() => randomPositionFromLayer({ findLayer: () => undefined } as unknown as GameMap, "nope")).toThrow(
            /was found/,
        );
    });
});
