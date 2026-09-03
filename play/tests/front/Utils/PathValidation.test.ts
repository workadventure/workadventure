import { describe, expect, it } from "vitest";
import { isWaypointBlocked } from "../../../src/front/Utils/PathValidation";

const TILE = { width: 32, height: 32 };
const COLLIDER = 1;
const Y_OFFSET = 24;

// Waypoints as Character.pathToFollow stores them: tile centers shifted up by the body offset.
function waypoint(tileX: number, tileY: number): { x: number; y: number } {
    return { x: tileX * 32 + 16, y: tileY * 32 + 16 - Y_OFFSET };
}

describe("isWaypointBlocked", () => {
    it("detects a waypoint landing on a colliding tile", () => {
        const grid = [
            [0, 0],
            [0, 1],
        ];
        expect(isWaypointBlocked(waypoint(1, 1), grid, TILE, Y_OFFSET, COLLIDER)).toBe(true);
        expect(isWaypointBlocked(waypoint(0, 1), grid, TILE, Y_OFFSET, COLLIDER)).toBe(false);
    });

    it("adds the body offset back before mapping the waypoint to its tile row", () => {
        // The adjusted y of tile row 1 naively floors to row 0: without the offset, nothing is blocked.
        const grid = [
            [0, 0],
            [0, 1],
        ];
        expect(isWaypointBlocked(waypoint(1, 1), grid, TILE, Y_OFFSET, COLLIDER)).toBe(true);
        expect(isWaypointBlocked(waypoint(1, 1), grid, TILE, 0, COLLIDER)).toBe(false);
    });

    it("treats non-collider special tiles as walkable", () => {
        // 2 = Exit, 4 = MeetingRoom in the pathfinding grid.
        const grid = [[0, 2, 4]];
        expect(isWaypointBlocked(waypoint(1, 0), grid, TILE, Y_OFFSET, COLLIDER)).toBe(false);
        expect(isWaypointBlocked(waypoint(2, 0), grid, TILE, Y_OFFSET, COLLIDER)).toBe(false);
    });

    it("treats a waypoint outside the grid as walkable", () => {
        const grid = [[0]];
        expect(isWaypointBlocked(waypoint(5, 5), grid, TILE, Y_OFFSET, COLLIDER)).toBe(false);
    });
});
