import { describe, expect, it } from "vitest";
import { EntityPermissions, WamFile } from "../../src";

describe("EntityPermissions", () => {
    const wamFile = new WamFile({
        version: "1.0.0",
        mapUrl: "testMapUrl",
        entities: {},
        entityCollections: [],
        areas: [
            {
                id: "zone",
                name: "zone",
                x: 0,
                y: 0,
                width: 320,
                height: 320,
                visible: true,
                properties: [
                    { id: "rights", type: "restrictedRightsPropertyData", writeTags: ["editor"], readTags: [] },
                ],
            },
        ],
    });
    const permissions = new EntityPermissions(wamFile.getGameMapAreas(), ["editor"], false);

    it("allows a wide entity fully inside the zone", () => {
        // 128x32 entity whose top-left corner is (0, 100).
        expect(permissions.canEdit({ x: 64, y: 116 }, 128, 32)).toBe(true);
    });

    it("refuses a wide entity sticking out of the zone on the left (width and height are not swapped)", () => {
        // 128x32 entity whose top-left corner is (-32, 100).
        expect(permissions.canEdit({ x: 32, y: 116 }, 128, 32)).toBe(false);
    });
});
