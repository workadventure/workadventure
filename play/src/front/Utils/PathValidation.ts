/**
 * Returns the index of the first waypoint of `waypoints` that lands on a colliding tile of `grid`,
 * or -1 if the whole path is still walkable.
 *
 * Waypoints are expressed in the collider-adjusted space used by Character.pathToFollow (their y is
 * shifted up by the body offset), so `waypointYOffset` is added back before mapping to a tile.
 * Index 0 is the start of the current segment (the character's own position) and is never checked.
 */
export function findFirstBlockedWaypointIndex(
    waypoints: ReadonlyArray<{ x: number; y: number }>,
    grid: number[][],
    tileDimensions: { width: number; height: number },
    waypointYOffset: number,
    colliderTileType: number,
): number {
    for (let i = 1; i < waypoints.length; i += 1) {
        const tileX = Math.floor(waypoints[i].x / tileDimensions.width);
        const tileY = Math.floor((waypoints[i].y + waypointYOffset) / tileDimensions.height);
        if (grid[tileY]?.[tileX] === colliderTileType) {
            return i;
        }
    }
    return -1;
}
