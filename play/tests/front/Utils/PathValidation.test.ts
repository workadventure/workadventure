import { describe, expect, it } from "vitest";
import { findFirstBlockedWaypointIndex } from "../../../src/front/Utils/PathValidation";

const TILE = { width: 32, height: 32 };
const COLLIDER = 1;

// Waypoints as Character.pathToFollow stores them: tile centers shifted up by the body offset.
function waypoint(tileX: number, tileY: number, yOffset: number): { x: number; y: number } {
    return { x: tileX * 32 + 16, y: tileY * 32 + 16 - yOffset };
}

describe("findFirstBlockedWaypointIndex", () => {
    const yOffset = 24;

    it("returns -1 when the whole path is walkable", () => {
        const grid = [
            [0, 0, 0],
            [0, 0, 0],
        ];
        const path = [waypoint(0, 0, yOffset), waypoint(1, 0, yOffset), waypoint(2, 0, yOffset)];
        expect(findFirstBlockedWaypointIndex(path, grid, TILE, yOffset, COLLIDER)).toBe(-1);
    });

    it("returns the index of the first waypoint landing on a colliding tile", () => {
        const grid = [
            [0, 0, 0, 0],
            [0, 0, 1, 1],
        ];
        const path = [
            waypoint(0, 1, yOffset),
            waypoint(1, 1, yOffset),
            waypoint(2, 1, yOffset),
            waypoint(3, 1, yOffset),
        ];
        expect(findFirstBlockedWaypointIndex(path, grid, TILE, yOffset, COLLIDER)).toBe(2);
    });

    it("never checks index 0, which is the character's own position", () => {
        const grid = [[1, 0, 0]];
        const path = [waypoint(0, 0, yOffset), waypoint(1, 0, yOffset), waypoint(2, 0, yOffset)];
        expect(findFirstBlockedWaypointIndex(path, grid, TILE, yOffset, COLLIDER)).toBe(-1);
    });

    it("adds the body offset back before mapping a waypoint to its tile row", () => {
        // Adjusted y of tile row 1 is 24, which naively floors to row 0: only row 1 is blocked.
        const grid = [
            [0, 0],
            [0, 1],
        ];
        const path = [waypoint(0, 1, yOffset), waypoint(1, 1, yOffset)];
        expect(findFirstBlockedWaypointIndex(path, grid, TILE, yOffset, COLLIDER)).toBe(1);
        expect(findFirstBlockedWaypointIndex(path, grid, TILE, 0, COLLIDER)).toBe(-1);
    });

    it("treats non-collider special tiles as walkable", () => {
        // 2 = Exit, 4 = MeetingRoom in the pathfinding grid.
        const grid = [[0, 2, 4]];
        const path = [waypoint(0, 0, yOffset), waypoint(1, 0, yOffset), waypoint(2, 0, yOffset)];
        expect(findFirstBlockedWaypointIndex(path, grid, TILE, yOffset, COLLIDER)).toBe(-1);
    });
});
