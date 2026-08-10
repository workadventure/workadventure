import { describe, expect, it } from "vitest";
import type { AreaData, WAMFileFormat } from "../../src/types";
import { GameMapAreas } from "../../src/GameMap/GameMapAreas";

function createWam(areas: AreaData[]): WAMFileFormat {
    return {
        version: "1",
        mapUrl: "https://example.com/maps/test.tmj",
        entities: {},
        areas,
        entityCollections: [],
        settings: {},
    };
}

/**
 * Area occupying x ∈ [100, 200], y ∈ [100, 200].
 * `getForbiddenAreasOnPosition` applies the Woka Y offset (16), so a position is considered
 * "inside" when `y + 16` falls within the rectangle.
 */
function createRestrictedArea(writeTags: string[], readTags: string[]): AreaData {
    return {
        id: "restricted-area",
        name: "Restricted Area",
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        visible: true,
        properties: [
            {
                id: "rights-1",
                type: "restrictedRightsPropertyData",
                writeTags,
                readTags,
            },
        ],
    };
}

function createOpenArea(): AreaData {
    return {
        id: "open-area",
        name: "Open Area",
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        visible: true,
        properties: [],
    };
}

const INSIDE = { x: 150, y: 150 };
const OUTSIDE = { x: 400, y: 400 };

describe("GameMapAreas access enforcement helpers", () => {
    describe("getForbiddenAreasOnPosition", () => {
        it("denies a user without the required tags inside a restricted area", () => {
            const areas = new GameMapAreas(createWam([createRestrictedArea(["admin"], ["member"])]));
            const forbidden = areas.getForbiddenAreasOnPosition(INSIDE, ["guest"]);
            expect(forbidden.map((a) => a.id)).toEqual(["restricted-area"]);
        });

        it("allows a user holding a matching writeTag", () => {
            const areas = new GameMapAreas(createWam([createRestrictedArea(["admin"], ["member"])]));
            expect(areas.getForbiddenAreasOnPosition(INSIDE, ["admin"])).toHaveLength(0);
        });

        it("allows a user holding a matching readTag (read access is enough to enter)", () => {
            const areas = new GameMapAreas(createWam([createRestrictedArea(["admin"], ["member"])]));
            expect(areas.getForbiddenAreasOnPosition(INSIDE, ["member"])).toHaveLength(0);
        });

        it("allows any user when the position is outside the restricted area", () => {
            const areas = new GameMapAreas(createWam([createRestrictedArea(["admin"], ["member"])]));
            expect(areas.getForbiddenAreasOnPosition(OUTSIDE, ["guest"])).toHaveLength(0);
        });

        it("allows any user in an area without a rights restriction", () => {
            const areas = new GameMapAreas(createWam([createOpenArea()]));
            expect(areas.getForbiddenAreasOnPosition(INSIDE, [])).toHaveLength(0);
        });

        it("treats a restriction with empty tag lists as unrestricted", () => {
            const areas = new GameMapAreas(createWam([createRestrictedArea([], [])]));
            expect(areas.getForbiddenAreasOnPosition(INSIDE, [])).toHaveLength(0);
        });

        it("applies the Woka Y offset when determining if the position is inside", () => {
            const areas = new GameMapAreas(createWam([createRestrictedArea(["admin"], [])]));
            // Actual y = 90 is above the rectangle top (100), but y + 16 = 106 lands inside.
            expect(areas.getForbiddenAreasOnPosition({ x: 150, y: 90 }, ["guest"])).toHaveLength(1);
        });
    });

    describe("hasRestrictedAreas", () => {
        it("returns true when at least one area has an active restriction", () => {
            const areas = new GameMapAreas(createWam([createOpenArea(), createRestrictedArea(["admin"], [])]));
            expect(areas.hasRestrictedAreas()).toBe(true);
        });

        it("returns false when no area is restricted", () => {
            const areas = new GameMapAreas(createWam([createOpenArea()]));
            expect(areas.hasRestrictedAreas()).toBe(false);
        });

        it("returns false when the only restriction has empty tag lists", () => {
            const areas = new GameMapAreas(createWam([createRestrictedArea([], [])]));
            expect(areas.hasRestrictedAreas()).toBe(false);
        });
    });

    describe("getPlayerAreasOnPosition", () => {
        it("returns the area when the (offset) position is inside", () => {
            const areas = new GameMapAreas(createWam([createOpenArea()]));
            expect(areas.getPlayerAreasOnPosition(INSIDE).map((a) => a.id)).toEqual(["open-area"]);
        });

        it("returns nothing when the position is outside", () => {
            const areas = new GameMapAreas(createWam([createOpenArea()]));
            expect(areas.getPlayerAreasOnPosition(OUTSIDE)).toHaveLength(0);
        });
    });

    describe("findNearestAllowedPosition", () => {
        it("moves a user inside a forbidden area to a position that is no longer forbidden", () => {
            const areas = new GameMapAreas(createWam([createRestrictedArea(["admin"], [])]));
            const safe = areas.findNearestAllowedPosition(INSIDE, ["guest"]);
            expect(safe).not.toEqual(INSIDE);
            expect(safe && areas.getForbiddenAreasOnPosition(safe, ["guest"])).toEqual([]);
        });

        it("leaves an already-allowed position unchanged (user has the tag)", () => {
            const areas = new GameMapAreas(createWam([createRestrictedArea(["admin"], [])]));
            expect(areas.findNearestAllowedPosition(INSIDE, ["admin"])).toEqual(INSIDE);
        });

        it("leaves a position outside any restricted area unchanged", () => {
            const areas = new GameMapAreas(createWam([createRestrictedArea(["admin"], [])]));
            expect(areas.findNearestAllowedPosition(OUTSIDE, ["guest"])).toEqual(OUTSIDE);
        });

        it("escapes overlapping restricted areas, where exiting one lands inside the other", () => {
            // The restricted area spans x ∈ [100, 200]; this second one overlaps its right edge and
            // extends further right. From x = 195 the closest exit of each area is on the X axis and
            // lands inside the other one, so exiting them one at a time never converges.
            const areas = new GameMapAreas(
                createWam([
                    createRestrictedArea(["admin"], []),
                    { ...createRestrictedArea(["admin"], []), id: "restricted-area-2", x: 190, width: 100 },
                ]),
            );
            const safe = areas.findNearestAllowedPosition({ x: 195, y: 150 }, ["guest"]);
            expect(safe && areas.getForbiddenAreasOnPosition(safe, ["guest"])).toEqual([]);
        });

        it("returns undefined rather than a forbidden position when restricted areas enclose the player", () => {
            // Four restricted areas sealing every exit of the central one, on both axes.
            const areas = new GameMapAreas(
                createWam([
                    createRestrictedArea(["admin"], []),
                    { ...createRestrictedArea(["admin"], []), id: "left", x: 0, width: 100 },
                    { ...createRestrictedArea(["admin"], []), id: "right", x: 200, width: 100 },
                    { ...createRestrictedArea(["admin"], []), id: "top", y: 0, height: 100 },
                    { ...createRestrictedArea(["admin"], []), id: "bottom", y: 200, height: 100 },
                ]),
            );
            expect(areas.findNearestAllowedPosition(INSIDE, ["guest"])).toBeUndefined();
        });
    });
});
