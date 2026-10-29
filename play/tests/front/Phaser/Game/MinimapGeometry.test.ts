import { describe, expect, it } from "vitest";
import {
    getMinimapViewport,
    projectOnMinimap,
    groupMinimapAreas,
    getMinimapDomClipPath,
} from "../../../../src/front/Phaser/Game/MinimapGeometry";

describe("minimap geometry", () => {
    it("positions the overlay correctly with a scaled canvas offset by the sidebar", () => {
        expect(
            getMinimapViewport(
                { x: 320, y: 520, width: 240, height: 190 },
                { x: 300, y: 0, width: 1000, height: 800 },
                { width: 500, height: 400 },
            ),
        ).toEqual({ x: 10, y: 260, width: 120, height: 95 });
    });

    it("does not create invalid viewports when the canvas is hidden", () => {
        expect(
            getMinimapViewport(
                { x: 10, y: 20, width: 240, height: 190 },
                { x: 0, y: 0, width: 0, height: 0 },
                { width: 500, height: 400 },
            ),
        ).toBeUndefined();
    });

    it("projects the avatar relative to the actual bounded camera view", () => {
        const view = { x: 0, y: 0, width: 1024, height: 800 };
        expect(projectOnMinimap({ x: 512, y: 400 }, view)).toEqual({ x: 50, y: 50 });
        expect(projectOnMinimap({ x: 128, y: 200 }, view)).toEqual({ x: 12.5, y: 25 });
        expect(projectOnMinimap({ x: -128, y: 1000 }, view)).toEqual({ x: -12.5, y: 125 });
    });
});

describe("minimap markers", () => {
    it("groups overlapping markers at the displayed size without losing their names", () => {
        const areas = [
            { id: "a", name: "Kitchen", x: 50, y: 50 },
            { id: "b", name: "Coffee", x: 55, y: 50 },
            { id: "c", name: "Office", x: 80, y: 80 },
        ];
        const groups = groupMinimapAreas(areas, 240, 190);
        expect(groups[0].members.map((area) => area.id)).toEqual(["a", "b"]);
        expect(groups.map(({ members: _members, ...group }) => group)).toEqual([
            { id: "a", name: "Kitchen · Coffee", x: 50, y: 50, count: 2 },
            { id: "c", name: "Office", x: 80, y: 80, count: 1 },
        ]);
        expect(groupMinimapAreas(areas, 640, 440)).toHaveLength(3);
    });
});

describe("minimap HTML occlusion", () => {
    it("cuts the minimap out of a scaled and offset HTML layer", () => {
        const path = getMinimapDomClipPath(
            { x: 320, y: 520, width: 240, height: 190 },
            { x: 300, y: 0, width: 1000, height: 800 },
            { width: 500, height: 400 },
        );
        expect(path).toBe(
            "polygon(evenodd, 0px 0px, 500px 0px, 500px 400px, 0px 400px, 0px 0px, 10px 260px, 130px 260px, 130px 355px, 10px 355px, 10px 260px, 0px 0px)",
        );
    });
});
